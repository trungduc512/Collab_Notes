import { createContext, useContext, useState } from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./authContext";
import { SOCKET_URL } from "../helpers/config.js";

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const { auth } = useAuth();

  const [shouldUpdate, setShouldUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [quill, setQuill] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [yDoc, setYDoc] = useState(null);
  const [socket, setSocket] = useState(null);

  // Tạo socket 1 lần
  useEffect(() => {
    const s = io(SOCKET_URL, {
      path: "/ws/socket.io/",
      extraHeaders: {
        Authorization: `Bearer ${auth?.token}`,
      },
      transports: ["websocket", "polling"],
    });

    setSocket(s);

    s.on("connect", () => {
      console.log("WS connected:", s.id);
    });

    s.on("disconnect", (reason) => {
      console.log("WS disconnected:", reason);
    });

    s.on("auth-expired", () => {
      console.warn("WebSocket auth expired");
    });

    return () => {};
    // CHÚ Ý: dependency chỉ là [] để không tạo lại socket khi auth đổi
  }, []);

  // Mỗi khi accessToken đổi -> gửi refresh-auth cho socket
  useEffect(() => {
    if (!socket) return;
    if (!auth?.token) return;

    const sendAuth = () => {
      console.log("Sending refresh-auth to WS");
      socket.emit("refresh-auth", { token: auth.token }, (err, res) => {
        if (err) {
          console.error("WS refresh-auth error:", err);
        } else {
          console.log("WS refresh-auth success:", res);
        }
      });
    };

    if (socket.connected) {
      sendAuth();
    } else {
      socket.once("connect", sendAuth);
    }

    return () => {
      socket.off("connect", sendAuth);
    };
  }, [socket, auth?.token]);

  const triggerUpdate = () => {
    setShouldUpdate((prev) => !prev);
  };

  return (
    <SupplierContext.Provider
      value={{
        darkMode,
        setDarkMode,
        shouldUpdate,
        triggerUpdate,
        loading,
        quill,
        setQuill,
        setLoading,
        currentDoc,
        setCurrentDoc,
        yDoc,
        setYDoc,
        socket,
      }}
    >
      {children}
    </SupplierContext.Provider>
  );
};

export const useSupplier = () => useContext(SupplierContext);
