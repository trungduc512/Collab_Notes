import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSupplier } from "../../context/supplierContext.jsx";
import { toast } from "react-toastify";
import Modal from "../../components/Modal.jsx";
import {
  addCollaboratorToDoc,
  getAllCollaborators,
} from "../../helpers/docs/doc.helper";
import { useAuth } from "../../context/authContext.jsx";
import { WS_URL } from "../../helpers/config.js";
import Editor from "./Editor.jsx";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const EditDocument = () => {
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [provider, setProvider] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const navigate = useNavigate();
  const { auth } = useAuth();
  const {
    currentDoc,
    setCurrentDoc,
    darkMode,
    triggerUpdate,
    setLoading,
    setYDoc,
    yDoc,
  } = useSupplier();
  const { id } = useParams();

  // Khởi tạo Y.Doc + WebSocket (có token)
  useEffect(() => {
    if (!auth?.token) return;

    const doc = new Y.Doc();
    setYDoc(doc);

    const websocketProvider = new WebsocketProvider(WS_URL, id, doc, {
      params: { token: auth.token },
    });

    websocketProvider.on("status", (event) => {
      console.log("[WS status]", event.status);
    });

    websocketProvider.on("connection-error", (event) => {
      console.error("[WS connection-error]", event);
    });

    websocketProvider.on("connection-close", (event) => {
      console.log("[WS connection-close]", event);
    });

    // Lắng nghe khi sync hoàn tất
    websocketProvider.on("sync", (isSynced) => {
      if (isSynced) {
        console.log("[WS] Document synced from server");
      }
    });

    setProvider(websocketProvider);

    return () => {
      console.log("[WS] Destroying provider...");
      websocketProvider.destroy();
    };
  }, [id, setYDoc, auth?.token]);

  // Lắng nghe danh sách online
  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const handleChange = () => {
      const states = Array.from(awareness.getStates().values());
      setOnlineUsers(states.map((state) => state.user));
    };

    awareness.on("change", handleChange);

    return () => {
      awareness.off("change", handleChange);
    };
  }, [provider]);

  // Set thông tin user cho awareness
  useEffect(() => {
    if (provider && auth.user) {
      provider.awareness.setLocalStateField("user", {
        name: auth.user.username,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      });
    }
  }, [provider, auth.user]);

  const handleAddCollaborator = async () => {
    setLoading(true);
    const res = await addCollaboratorToDoc(
      currentDoc?._id || id,
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

  // Chỉ fetch metadata document (title, collaborators) - không fetch content
  useEffect(() => {
    const fetchDocumentMetadata = async () => {
      if (!auth?.token || !id) return;

      setLoading(true);
      try {
        const res = await getDocumentById(id, auth.token);
        if (res?.status === 200) {
          setCurrentDoc(res.data.document);
        }
      } catch (err) {
        console.error("Failed to fetch document metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchCollaborators = async () => {
      if (!currentDoc?._id || !auth?.token) return;

      const res = await getAllCollaborators(currentDoc._id, auth.token);
      if (res?.status === 200) {
        setCollaborators(res.data.collaborators);
      }
    };

    // Fetch metadata nếu chưa có
    if (!currentDoc || currentDoc._id !== id) {
      fetchDocumentMetadata();
    }

    // Fetch collaborators khi có currentDoc
    if (currentDoc?._id) {
      fetchCollaborators();
    }
  }, [auth?.token, id, currentDoc, setCurrentDoc, setLoading]);

  return (
    <div
      className={`container-fluid ${
        darkMode ? "bg-dark text-light" : "bg-light text-dark"
      } vh-100`}
    >
      <div className="row h-100">
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

          <ul className="list-group mb-4">
            <li
              className={`list-group-item ${
                darkMode ? "bg-dark text-light" : "bg-secondary text-dark"
              }`}
            >
              <i className="bi bi-people-fill"></i> Online Collaborators (
              {onlineUsers?.length})
            </li>
            {onlineUsers?.map((user, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
                style={{ color: user?.color }}
              >
                <i className="bi bi-person"></i>&nbsp;{user?.name}{" "}
                {user?.name === auth?.user?.username && "(You)"}
              </li>
            ))}
          </ul>

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

        <div className="col-lg-9 col-md-8 col-12 p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            <button
              type="button"
              className={`btn btn-warning mb-2 mb-md-0 ${
                darkMode ? "text-light" : ""
              }`}
              onClick={() => {
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
              Document Title: <u>{currentDoc?.title || "Loading..."}</u>
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

          <div
            className="editor-container border rounded p-3"
            style={{ minHeight: "60vh" }}
          >
            {yDoc && provider && <Editor ydoc={yDoc} provider={provider} />}
          </div>
        </div>
      </div>

      <Modal
        title="Add Collaborator"
        modalId="addCollaborator"
        content={
          <>
            <p className={`lead ${darkMode ? "text-light" : "text-dark"}`}>
              Enter the email of the user you want to add as a collaborator
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
