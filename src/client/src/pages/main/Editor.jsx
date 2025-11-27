import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useSupplier } from "../../context/supplierContext";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";

Quill.register("modules/cursors", QuillCursors);

const Editor = ({ ydoc, provider }) => {
  const { darkMode } = useSupplier();
  const [quill, setQuill] = useState();
  const [binding, setBinding] = useState();

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
    if (quill && ydoc && provider) {
      const ytext = ydoc.getText("quill");
      const newBinding = new QuillBinding(ytext, quill, provider.awareness);
      setBinding(newBinding);
    }

    return () => {
      if (binding) {
        binding.destroy();
      }
    };
  }, [quill, ydoc, provider]);

  return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
