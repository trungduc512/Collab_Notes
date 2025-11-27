import * as Y from "yjs";
// SỬA: Import thêm encodeAwarenessUpdate và applyAwarenessUpdate
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
} from "y-protocols/awareness";

export class SocketIOProvider {
  constructor(socket, doc, { roomId }) {
    this.socket = socket;
    this.doc = doc;
    this.roomId = roomId;
    this.awareness = new Awareness(doc);

    // 1. Lắng nghe thay đổi từ Yjs Doc -> Gửi lên Server
    this.doc.on("update", this.onDocUpdate);

    // 2. Lắng nghe thay đổi Awareness (con trỏ) -> Gửi lên Server
    this.awareness.on("update", this.onAwarenessUpdate);

    // 3. Lắng nghe sự kiện từ Server -> Áp dụng vào Client
    this.socket.on("yjs-update", this.onSocketYjsUpdate);
    this.socket.on("yjs-awareness", this.onSocketAwarenessUpdate);

    // Kết nối vào room
    this.connect();
  }

  connect() {
    this.socket.emit("join-yjs-room", { roomId: this.roomId });
  }

  // --- Handlers ---

  onDocUpdate = (update, origin) => {
    // Chỉ gửi nếu thay đổi xuất phát từ local (người dùng gõ)
    if (origin !== this) {
      this.socket.emit("yjs-update", {
        roomId: this.roomId,
        update: update, // Dữ liệu dạng Uint8Array
      });
    }
  };

  onAwarenessUpdate = ({ added, updated, removed }, origin) => {
    if (origin === "local") {
      // SỬA: Gọi hàm trực tiếp, không gọi qua Awareness.encode...
      const state = encodeAwarenessUpdate(
        this.awareness,
        added.concat(updated).concat(removed)
      );
      this.socket.emit("yjs-awareness", {
        roomId: this.roomId,
        update: state,
      });
    }
  };

  onSocketYjsUpdate = ({ update }) => {
    // Áp dụng update từ server, set origin là 'this' để tránh loop
    Y.applyUpdate(this.doc, new Uint8Array(update), this);
  };

  onSocketAwarenessUpdate = ({ update }) => {
    // SỬA: Gọi hàm trực tiếp, không gọi qua Awareness.apply...
    applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
  };

  destroy() {
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.socket.off("yjs-update", this.onSocketYjsUpdate);
    this.socket.off("yjs-awareness", this.onSocketAwarenessUpdate);
    this.awareness.destroy();
  }
}
