import { createContext, useContext, useEffect, useState } from "react";
import {
  getLocalStorageWithExpiry,
  setLocalStorageWithExpiry,
  refreshAccessToken,
} from "../helpers/auth/auth.helper.js";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    token: "",
  });

  // Lần load đầu tiên → nếu có token thì gọi /users/me
  useEffect(() => {
    const data = getLocalStorageWithExpiry("auth");
    if (!data?.token) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_APP_BACKEND_URL}/users/me`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`, // <--- SỬA ĐÚNG
            },
          }
        );

        const result = await res.json();

        if (res.status === 200) {
          setAuth({
            user: result.user,
            token: data.token,
          });
        } else if (res.status === 401) {
          // Token hết hạn → thử refresh
          const newToken = await refreshAccessToken();
          if (newToken) {
            setAuth((prev) => ({
              user: prev.user, // giữ user cũ
              token: newToken,
            }));
            setLocalStorageWithExpiry(
              "auth",
              { user: data.user, token: newToken },
              60
            );
          }
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchUser();
  }, []);

  // Tự động refresh token mỗi 1 phút để đảm bảo token không hết hạn
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = getLocalStorageWithExpiry("auth");
      if (!data?.token) return;

      console.log("🔄 Refreshing access token...");

      const newToken = await refreshAccessToken();

      if (newToken) {
        setAuth((prev) => ({ ...prev, token: newToken }));
        setLocalStorageWithExpiry("auth", { ...data, token: newToken }, 60);
      }
    }, 1 * 60 * 1000); // Refresh mỗi 1 phút

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export { AuthProvider };
