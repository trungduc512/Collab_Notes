// services/authRefresh.service.js
export const refreshAccessToken = async (refreshToken) => {
  const baseUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3002";

  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      console.error(
        "❌ [ws] Refresh token request failed with status",
        res.status
      );
      return null;
    }

    const data = await res.json();
    return data.accessToken || data.token || null;
  } catch (err) {
    console.error("❌ [ws] Error refreshing access token:", err);
    return null;
  }
};
