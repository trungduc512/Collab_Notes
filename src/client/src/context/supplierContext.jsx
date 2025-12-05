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
  const [socket, setSocket] = useState(null);

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
        socket,
        setSocket,
      }}
    >
      {children}
    </SupplierContext.Provider>
  );
};

export const useSupplier = () => useContext(SupplierContext);
