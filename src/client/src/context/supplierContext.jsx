import { createContext, useContext, useState } from "react";
import { io } from "socket.io-client";

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [quill, setQuill] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const socket = io(
    import.meta.env.VITE_APP_SOCKET_URL || "http://localhost:8080"
  );

  const triggerUpdate = () => {
    setShouldUpdate((prev) => !prev);
  };
  // Helper function to generate a color based on username
  const getUserColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 70%, 50%)`;
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
        getUserColor,
      }}
    >
      {children}
    </SupplierContext.Provider>
  );
};

export const useSupplier = () => useContext(SupplierContext);
