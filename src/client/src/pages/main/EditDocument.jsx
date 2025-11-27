import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSupplier } from "../../context/supplierContext";
import { toast } from "react-toastify";
import Modal from "../../components/Modal";
import {
  addCollaboratorToDoc,
  getAllCollaborators,
} from "../../helpers/docs/doc.helper";
import { useAuth } from "../../context/authContext";
import { API } from "../../helpers/config";
import Editor from "./Editor.jsx";

const EditDocument = () => {
  const [currentUsers, setCurrentUsers] = useState([]); // Tạm thời để trống
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [isModified, setIsModified] = useState(false);

  const navigate = useNavigate();
  const { auth } = useAuth();
  const {
    currentDoc,
    loading,
    socket,
    setCurrentDoc,
    darkMode,
    triggerUpdate,
    quill,
    setLoading,
  } = useSupplier();
  const { id } = useParams();

  // --- XỬ LÝ THÊM COLLABORATOR (REST API) ---
  const handleAddCollaborator = async () => {
    setLoading(true);
    const res = await addCollaboratorToDoc(
      currentDoc?._id,
      collaboratorEmail,
      auth?.token
    ).finally(() => setLoading(false));

    if (res?.status === 200) {
      setCollaboratorEmail("");
      document.getElementById("closeTheModal").click();
      toast.success(res?.data?.message);
      triggerUpdate();
      return;
    }
    toast.error(res?.data?.message);
  };

  // --- THEO DÕI THAY ĐỔI ĐỂ LƯU (SAVE) ---
  // Lưu ý: Yjs tự động đồng bộ real-time, nhưng ta vẫn cần đánh dấu
  // để lưu bản snapshot vào DB (cho lần load sau hoặc hiển thị ở trang chủ).
  useEffect(() => {
    if (quill == null || !currentDoc?._id) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source === "user") {
        setIsModified(true);
      }
    };

    quill.on("text-change", handleTextChange);

    return () => {
      quill.off("text-change", handleTextChange);
    };
  }, [quill, currentDoc]);

  // --- AUTO SAVE (SNAPSHOT) ---
  useEffect(() => {
    if (quill == null) return;

    const interval = setInterval(() => {
      if (isModified) {
        // Gửi toàn bộ nội dung hiện tại để lưu đè vào DB
        socket.emit(
          "save-doc",
          { docId: currentDoc?._id, data: quill?.getContents() },
          (error) => {
            if (error) {
              console.error(error);
            } else {
              // toast.success("Auto-saved"); // Có thể bỏ comment nếu muốn thông báo
              setIsModified(false);
            }
          }
        );
      }
    }, 30000); // 30 giây lưu 1 lần

    return () => clearInterval(interval);
  }, [quill, isModified, currentDoc, socket]);

  // Hàm lưu ngay lập tức (khi bấm nút Back)
  const saveDocumentImmediately = () => {
    if (isModified) {
      socket.emit(
        "save-doc",
        { docId: currentDoc?._id, data: quill?.getContents() },
        (error) => {
          if (error) console.error(error);
          else {
            toast.success("Document saved successfully");
            setIsModified(false);
          }
        }
      );
    }
  };

  // --- KHỞI TẠO DỮ LIỆU BAN ĐẦU ---
  useEffect(() => {
    const fetchCollaborators = async () => {
      // setLoading(true); // Tắt loading để tránh flicker khi editor đang load
      const res = await getAllCollaborators(currentDoc?._id, auth?.token);
      if (res?.status === 200) {
        setCollaborators(res?.data?.collaborators);
      }
    };

    const resetCurrentDocStateOnReload = async () => {
      try {
        const fetchDoc = await fetch(`${API}/documents/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth?.token}`,
          },
        });
        const doc = await fetchDoc.json();
        setCurrentDoc(doc?.document);
      } catch (err) {
        console.error("Failed to fetch doc", err);
      }
    };

    // Nếu chưa có currentDoc (do reload trang), fetch lại từ API
    if (!currentDoc && auth?.token) {
      resetCurrentDocStateOnReload();
    }
    // Nếu đã có doc, fetch danh sách collaborator
    if (auth?.token && currentDoc?._id) {
      fetchCollaborators();
    }
  }, [auth, currentDoc, id, setCurrentDoc]);

  // --- RENDER ---
  return (
    <div
      className={`container-fluid ${
        darkMode ? "bg-dark text-light" : "bg-light text-dark"
      } vh-100`}
    >
      <div className="row h-100">
        {/* Sidebar */}
        <div
          className={`col-lg-3 col-md-4 col-12 p-3 ${
            darkMode ? "bg-dark text-light" : "bg-light text-dark"
          }`}
          style={{ minWidth: "280px" }}
        >
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h4 className="fw-bold">Collaborators</h4>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#addCollaborator"
            >
              <i className="bi bi-person-fill-add"></i> Add
            </button>
          </div>

          {/* Online Collaborators List (Tạm thời chưa có data từ Yjs Awareness) */}
          <ul className="list-group mb-4">
            <li
              className={`list-group-item ${
                darkMode ? "bg-dark text-light" : "bg-secondary text-dark"
              }`}
            >
              <i className="bi bi-people-fill"></i> Online (Yjs synced)
            </li>
            {/* Logic hiển thị user online sẽ được cập nhật sau khi tích hợp Awareness */}
          </ul>

          {/* All Collaborators List */}
          <ul className="list-group">
            <li
              className={`list-group-item ${
                darkMode ? "bg-dark text-light" : "bg-primary text-dark"
              }`}
            >
              <i className="bi bi-person-check-fill"></i> All Collaborators (
              {collaborators?.length})
            </li>
            {collaborators?.map((user, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
              >
                <i className="bi bi-person"></i>&nbsp;{user?.username}
              </li>
            ))}
          </ul>
        </div>

        {/* Main Editor Area */}
        <div className="col-lg-9 col-md-8 col-12 p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <button
              type="button"
              className={`btn btn-warning mb-2 mb-md-0 ${
                darkMode ? "text-light" : ""
              }`}
              onClick={() => {
                saveDocumentImmediately();
                navigate("/home");
              }}
            >
              <i className="bi bi-arrow-left"></i> Back
            </button>

            <h1
              className={`display-6 text-center ${
                darkMode ? "text-light" : "text-dark"
              } mb-2 mb-md-0`}
            >
              Document: <u>{currentDoc?.title}</u>
            </h1>

            <button
              type="button"
              className="btn btn-secondary"
              data-bs-toggle="modal"
              data-bs-target="#collaborators"
            >
              <i className="bi bi-eye-fill"></i> View Collaborators
            </button>
          </div>

          {/* Editor Component (Chứa logic Yjs) */}
          <div
            className="editor-container border rounded p-3"
            style={{ minHeight: "60vh" }}
          >
            <Editor />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        title="Add Collaborator"
        modalId="addCollaborator"
        content={
          <>
            <p className={`lead ${darkMode ? "text-light" : "text-dark"}`}>
              Enter email to add collaborator
            </p>
            <div className="input-group">
              <input
                type="email"
                value={collaboratorEmail}
                onChange={(e) => setCollaboratorEmail(e.target.value)}
                className={`form-control ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
                placeholder="Email"
              />
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddCollaborator}
              >
                Add
              </button>
            </div>
          </>
        }
      />

      <Modal
        title="Collaborators"
        modalId="collaborators"
        content={
          <ul
            className={`list-group ${
              darkMode ? "bg-dark text-light" : "bg-light text-dark"
            }`}
          >
            {collaborators?.map((user, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
              >
                <i className="bi bi-person"></i>&nbsp;{user?.username}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
};

export default EditDocument;
