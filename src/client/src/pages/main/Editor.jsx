// src/client/src/pages/main/Editor.jsx
import React, { useCallback, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import QuillCursors from "quill-cursors";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { useSupplier } from "../../context/supplierContext";
import { SocketIOProvider } from "../../helpers/yjs/SocketIOProvider"; // Import provider vừa tạo

Quill.register("modules/cursors", QuillCursors);

const Editor = () => {
  const { darkMode, setQuill, quill, getUserColor, socket, currentDoc } =
    useSupplier();
  const { id: documentId } = useParams();
  const { auth } = useAuth();

  // Ref để cleanup khi component unmount
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const ydocRef = useRef(null);

  // 1. Khởi tạo Quill
  const wrapperRef = useCallback(
    (wrapper) => {
      if (wrapper == null) return;
      wrapper.innerHTML = "";
      const editor = document.createElement("div");

      // Styling cơ bản
      editor.style.minHeight = "30em";
      editor.style.maxHeight = "80em";
      editor.style.borderRadius = "10px";
      if (darkMode) {
        editor.classList.add("bg-dark", "text-white");
      } else {
        editor.classList.add("bg-light", "text-black");
      }
      wrapper.append(editor);

      const q = new Quill(editor, {
        theme: "snow",
        modules: {
          cursors: true, // Bật module cursor
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline"],
            ["image", "code-block"],
          ],
          // QUAN TRỌNG: Tắt history native để Yjs quản lý Undo/Redo
          history: { userOnly: true },
        },
      });

      // Load nội dung ban đầu từ DB (nếu có) trước khi bind Yjs
      // Giả sử currentDoc.content là Delta JSON từ MongoDB
      if (currentDoc?.content) {
        q.setContents(currentDoc.content);
      }

      setQuill(q);
    },
    [darkMode, setQuill, currentDoc]
  );

  // 2. Kết nối Yjs
  useEffect(() => {
    if (!socket || !quill || !documentId || !auth?.user) return;

    // a. Tạo Yjs Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // b. Kết nối Socket.IO Provider
    const provider = new SocketIOProvider(socket, ydoc, { roomId: documentId });
    providerRef.current = provider;

    // c. Cấu hình Awareness (User info & color)
    const userColor = getUserColor(auth.user.username);
    provider.awareness.setLocalStateField("user", {
      name: auth.user.username,
      color: userColor,
    });

    // d. Binding: Kết nối Yjs Text với Quill Editor
    const ytext = ydoc.getText("quill");
    const binding = new QuillBinding(ytext, quill, provider.awareness);
    bindingRef.current = binding;

    return () => {
      // Cleanup: Hủy kết nối và binding khi rời trang
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [quill, documentId, socket, auth, getUserColor]);

  return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
