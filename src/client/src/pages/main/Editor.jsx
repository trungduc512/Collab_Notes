import React, { useCallback, useEffect, useState, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useSupplier } from "../../context/supplierContext";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";

Quill.register("modules/cursors", QuillCursors);

const Editor = ({ ydoc, provider }) => {
  const { darkMode } = useSupplier();
  const [quill, setQuill] = useState(null);
  const bindingRef = useRef(null);

  const wrapperRef = useCallback(
    (wrapper) => {
      if (wrapper == null) return;
      wrapper.innerHTML = "";

      const editor = document.createElement("div");
      editor.style.minHeight = "30em";
      editor.style.maxHeight = "80em";
      editor.style.borderRadius = "10px";

      if (darkMode) {
        editor.classList.add("bg-dark", "text-white");
        editor.style.color = "white";
      } else {
        editor.classList.add("bg-light", "text-black");
        editor.style.color = "black";
      }

      wrapper.append(editor);

      const q = new Quill(editor, {
        theme: "snow",
        modules: {
          cursors: true,
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline"],
            ["image", "code-block"],
          ],
        },
      });

      setQuill(q);
    },
    [darkMode]
  );

  useEffect(() => {
    if (!quill || !ydoc || !provider) return;

    const ytext = ydoc.getText("quill");

    const handleSync = (isSynced) => {
      if (isSynced) {
        // Destroy previous binding if exists
        if (bindingRef.current) {
          bindingRef.current.destroy();
        }
        const newBinding = new QuillBinding(ytext, quill, provider.awareness);
        bindingRef.current = newBinding;
      }
    };

    provider.on("sync", handleSync);

    return () => {
      provider.off("sync", handleSync);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [quill, ydoc, provider]);

  return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
