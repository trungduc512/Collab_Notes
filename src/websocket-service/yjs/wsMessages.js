// yjs/wsMessages.js
import { refreshAccessToken } from "../services/authRefresh.service.js";

export const attachWsMessageHandlers = (ws) => {
  ws.on("message", async (raw) => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      // không phải JSON → bỏ qua (y-websocket sẽ xử lý phần binary update)
      return;
    }

    if (msg.type === "refresh" && msg.refreshToken) {
      const newAccessToken = await refreshAccessToken(msg.refreshToken);

      if (!newAccessToken) {
        ws.send(
          JSON.stringify({
            type: "token-error",
            message: "Failed to refresh access token",
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "token",
            accessToken: newAccessToken,
          })
        );
      }
    }
  });
};
