import { createContext, useContext, useEffect, useState } from "react";
import { getLocalStorageWithExpiry } from "../helpers/auth/auth.helper.js";
import { AUTH_API } from "../helpers/config.js";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    token: "",
  });

  useEffect(() => {
    const data = getLocalStorageWithExpiry("auth");
    const fetchUser = async () => {
      try {
        const res = await fetch(`${AUTH_API}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data?.token}`,
          },
        });

        const result = await res.json();
        if (res.status === 200) {
          setAuth({
            user: result.user,
            token: data.token,
          });
        }
      } catch (err) {
        console.log("Auth fetch error:", err);
      }
    };
    if (data?.token) {
      fetchUser();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { useAuth, AuthProvider };
