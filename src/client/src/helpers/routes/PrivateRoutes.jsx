// src/helpers/PrivateRoutes.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/authContext.jsx";
import { getLocalStorageWithExpiry } from "../auth/auth.helper.js";

const PrivateRoutes = () => {
  const token = getLocalStorageWithExpiry("auth")?.token;
  const { auth } = useAuth();

  return token || auth?.user ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoutes;
