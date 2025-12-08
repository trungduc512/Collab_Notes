import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  getLocalStorageWithExpiry,
  setLocalStorageWithExpiry,
} from "../helpers/auth/auth.helper.js";
import { AUTH_API } from "../helpers/config.js";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    token: "",
    refreshToken: "",
  });

  // Hàm refresh token
  const doRefreshToken = useCallback(async (currentRefreshToken) => {
    try {
      const res = await fetch(`${AUTH_API}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (res.status === 200) {
        const data = await res.json();
        // Lưu token mới vào localStorage
        setLocalStorageWithExpiry("auth", data, 60 * 24 * 7); // 7 ngày
        setAuth({
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
        });
        console.log("✅ Token refreshed successfully");
        return data.token;
      } else {
        // Refresh token cũng hết hạn -> logout
        console.log("❌ Refresh token expired, logging out...");
        localStorage.removeItem("auth");
        setAuth({ user: null, token: "", refreshToken: "" });
        return null;
      }
    } catch (err) {
      console.error("Refresh token error:", err);
      localStorage.removeItem("auth");
      setAuth({ user: null, token: "", refreshToken: "" });
      return null;
    }
  }, []);

  // Fetch user với auto refresh
  const fetchUserWithRefresh = useCallback(
    async (token, refreshTokenValue) => {
      try {
        const res = await fetch(`${AUTH_API}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 200) {
          const result = await res.json();
          setAuth({
            user: result.user,
            token: token,
            refreshToken: refreshTokenValue,
          });
          return true;
        } else if (res.status === 401) {
          // Token hết hạn -> thử refresh
          console.log("Token expired, attempting refresh...");
          const newToken = await doRefreshToken(refreshTokenValue);
          return newToken !== null;
        } else {
          localStorage.removeItem("auth");
          setAuth({ user: null, token: "", refreshToken: "" });
          return false;
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
        return false;
      }
    },
    [doRefreshToken]
  );

  // Khởi tạo auth từ localStorage
  useEffect(() => {
    const data = getLocalStorageWithExpiry("auth");
    if (data?.token) {
      fetchUserWithRefresh(data.token, data.refreshToken);
    }
  }, [fetchUserWithRefresh]);

  // Auto refresh token trước khi hết hạn (mỗi 10 phút)
  useEffect(() => {
    if (!auth.token || !auth.refreshToken) return;

    const interval = setInterval(() => {
      console.log("⏰ Auto refreshing token...");
      doRefreshToken(auth.refreshToken);
    }, 10 * 60 * 1000); // 10 phút

    return () => clearInterval(interval);
  }, [auth.token, auth.refreshToken, doRefreshToken]);

  return (
    <AuthContext.Provider
      value={{
        auth,
        setAuth,
        refreshToken: () => doRefreshToken(auth.refreshToken),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { useAuth, AuthProvider };
