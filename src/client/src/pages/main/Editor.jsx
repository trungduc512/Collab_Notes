import React, { useCallback, useEffect } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useSupplier } from "../../context/supplierContext";
import QuillCursors from "quill-cursors"; // Import the cursor plugin
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/authContext";
Quill.register("modules/cursors", QuillCursors); // Register the cursors module
// Handle receiving cursor positions from other collaborators

const Editor = () => {
  const { darkMode, setQuill, socket, quill, currentDoc, getUserColor } =
    useSupplier();
  const { id: documentId } = useParams();
  const { auth } = useAuth();

  // Emit cursor position changes to the server
  useEffect(() => {
    if (!quill || !currentDoc?._id) return;

    const handler = (range, oldRange, source) => {
      if (source !== "user") return;

      socket.emit("send-cursor", {
        username: auth?.user?.username,
        range,
        roomId: currentDoc?._id,
      });
    };

    quill.on("selection-change", handler);

    return () => quill.off("selection-change", handler);
  }, [quill, socket, currentDoc, auth?.user?.username]);
  // Listen for cursor updates from other collaborators
  useEffect(() => {
    if (!quill) return;

    const handleReceiveCursor = ({ username, range }) => {
      if (username === auth?.user?.username) return;

      const cursors = quill.getModule("cursors");
      const userColor = getUserColor(username);
      cursors.createCursor(username, username, userColor);
      cursors.moveCursor(username, range);
    };

    socket.on("receive-cursor", handleReceiveCursor);

    return () => {
      socket.off("receive-cursor", handleReceiveCursor);
    };
  }, [quill, socket, auth?.user?.username]);
  // Add effect to load document and enable editor
  useEffect(() => {
    if (socket == null || quill == null) return;

    // Request document from server
    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  const wrapperRef = useCallback(
    (wrapper) => {
      if (wrapper == null) return;
      wrapper.innerHTML = ""; // Clear the wrapper content

      const editor = document.createElement("div");
      editor.style.minHeight = "30em";
      editor.style.maxHeight = "80em";
      editor.style.borderRadius = "10px";

      // Apply dark or light theme styles dynamically based on darkMode
      if (darkMode) {
        editor.classList.add("bg-dark", "text-white");
        editor.style.color = "white";
      } else {
        editor.classList.add("bg-light", "text-black");
        editor.style.color = "black";
      }

      wrapper.append(editor);

      // Initialize Quill with the cursor module
      const q = new Quill(editor, {
        theme: "snow",
        modules: {
          cursors: true, // Enable the cursor module
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline"],
            ["image", "code-block"],
          ],
        },
      });

      // Set the Quill instance in context
      q.disable();
      q.setText("Loading...");
      setQuill(q);
    },
    [darkMode, setQuill]
  );

  return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
