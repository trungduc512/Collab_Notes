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
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const EditDocument = () => {
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [provider, setProvider] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

const EditDocument = () => {
  const [currentUsers, setCurrentUsers] = useState([]);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [isModified, setIsModified] = useState(false);

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

  useEffect(() => {
    const doc = new Y.Doc();
    setYDoc(doc);
    const websocketProvider = new WebsocketProvider(
      import.meta.env.VITE_APP_YJS_WEBSOCKET_URL || "ws://localhost:8080",
      id,
      doc
    );

    websocketProvider.on("status", (event) => {
      console.log(event.status); // logs "connected" or "disconnected"
    });

    setProvider(websocketProvider);

    return () => {
      websocketProvider.destroy();
    };
  }, [id, setYDoc]);

  useEffect(() => {
    if (!provider) return;

    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().values());
      setOnlineUsers(states.map((state) => state.user));
    });
  }, [provider]);

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

  useEffect(() => {
    const fetchCollaborators = async () => {
      setLoading(true);
      const res = await getAllCollaborators(
        currentDoc?._id,
        auth?.token
      ).finally(() => setLoading(false));
      if (res?.status === 200) {
        setCollaborators(res?.data?.collaborators);
      }
    };

    const resetCurrentDocStateOnReload = async () => {
      const fetchDoc = await fetch(`${API}/documents/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth?.token}`,
        },
      });
      const doc = await fetchDoc.json();
      setCurrentDoc(doc?.document);
    };

    if (!currentDoc && auth?.token) {
      resetCurrentDocStateOnReload();
    }
    if (auth?.token && currentDoc?._id) {
      fetchCollaborators();
    }
  }, [auth, currentDoc, id, setCurrentDoc, setLoading]);
    loading,
    socket,
    setCurrentDoc,
    darkMode,
    triggerUpdate,
    quill,
    setLoading,
  } = useSupplier();
  const { id } = useParams();

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

  useEffect(() => {
    if (!quill || !socket || !currentDoc?._id) return;

    socket.emit("get-doc", { docId: currentDoc._id });

    const handleLoad = (content) => {
      console.log("LOAD DOCUMENT FROM WS:", content);
      if (!content) return;
      quill.setContents(content);
      quill.enable();
    };

    socket.once("load-document", handleLoad);

    return () => {
      socket.off("load-document", handleLoad);
    };
  }, [quill, socket, currentDoc?._id]);

  // Register document modifications and mark as modified
  useEffect(() => {
    if (!quill || !currentDoc?._id) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source === "user") {
        setIsModified(true);
      }
    };

    quill.on("text-change", handleTextChange);

    return () => {
      quill.off("text-change", handleTextChange);
    };
  }, [quill, currentDoc?._id]);

  // Check and save only if there are modifications
  useEffect(() => {
    if (!quill || !socket || !currentDoc?._id) return;

    const interval = setInterval(() => {
      if (!isModified) return;

      toast.info("Saving document...");
      socket.emit(
        "save-doc",
        {
          docId: currentDoc._id,
          content: quill.getContents(), // 🔥 dùng đúng key
        },
        (error) => {
          if (error) {
            console.error(error);
          } else {
            toast.success("Document saved successfully");
            setIsModified(false);
          }
        }
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [quill, socket, currentDoc?._id, isModified]);

  // Function to save immediately when necessary (can be called when leaving the page, for example)
  const saveDocumentImmediately = () => {
    if (isModified) {
      socket.emit(
        "save-doc",
        {
          docId: currentDoc?._id,
          content: quill.getContents(), // 🔥 đúng key backend nhận
        },
        (error) => {
          if (error) {
            console.error(error);
          } else {
            toast.success("Document saved successfully");
            setIsModified(false); // After saving, mark as not modified
          }
        }
      );
    }
  };

  // Other collaborator and room functionalities
  useEffect(() => {
    const fetchCollaborators = async () => {
      setLoading(true);
      const res = await getAllCollaborators(
        currentDoc?._id,
        auth?.token
      ).finally(() => setLoading(false));
      if (res?.status === 200) {
        setCollaborators(res?.data?.collaborators);
      }
    };

    const resetCurrentDocStateOnReload = async () => {
      const fetchDoc = await fetch(`${API}/documents/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth?.token}`,
        },
      });
      const doc = await fetchDoc.json();
      setCurrentDoc(doc?.document);
    };

    if (!currentDoc && auth?.token) {
      resetCurrentDocStateOnReload();
    }
    if (auth?.token && currentDoc?._id) {
      fetchCollaborators();
    }
  }, [auth, currentDoc]);

  useEffect(() => {
    if (!quill || !socket || !currentDoc?._id) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;

      socket.emit("send-changes", {
        delta,
        roomId: currentDoc._id,
        username: auth?.user?.username,
      });
    };

    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [quill, socket, currentDoc?._id, auth?.user?.username]);

  useEffect(() => {
    if (!socket || !currentDoc?._id) return;

    const handleSomeoneJoined = (data) => {
      setCurrentUsers(data?.roomUsers || []);
    };

    const handleSomeoneLeft = (data) => {
      setCurrentUsers(data?.roomUsers || []);
    };

    socket.emit(
      "joinRoom",
      { roomId: currentDoc._id, username: auth?.user?.username },
      (error) => {
        if (error) {
          console.error("Error joining room:", error);
        }
      }
    );

    socket.on("someoneJoined", handleSomeoneJoined);
    socket.on("someoneLeft", handleSomeoneLeft);

    return () => {
      if (quill) quill.disable();

      socket.emit(
        "leaveRoom",
        { roomId: currentDoc._id, username: auth?.user?.username },
        (error) => {
          if (error) {
            console.error("Error leaving room:", error);
          }
        }
      );

      socket.off("someoneJoined", handleSomeoneJoined);
      socket.off("someoneLeft", handleSomeoneLeft);
      setCurrentUsers([]);
    };
  }, [socket, currentDoc?._id, auth?.user?.username, quill]);

  useEffect(() => {
    if (!socket || !quill || !currentDoc?._id) return;

    const handleReceive = (data) => {
      if (data?.username === auth?.user?.username) return;
      if (!data?.delta) return;
      quill.updateContents(data.delta);
    };

    socket.on("receive-changes", handleReceive);

    return () => {
      socket.off("receive-changes", handleReceive);
    };
  }, [socket, quill, currentDoc?._id, auth?.user?.username]);

  return (
    <div
      className={`container-fluid ${
        darkMode ? "bg-dark text-light" : "bg-light text-dark"
      } vh-100`}
    >
      <div className="row h-100">
        {/* Sidebar - collapses on smaller screens */}
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

          {/* Online Collaborators List */}
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
              {currentUsers?.length})
            </li>
            {currentUsers?.map((user, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
                style={{ color: user?.color }}
              >
                <i className="bi bi-person"></i>&nbsp;{user?.name}{" "}
                {user?.name === auth?.user?.username && "(You)"}
              >
                <i className="bi bi-person"></i>&nbsp;{user?.username}{" "}
                {user?.username === auth?.user?.username && "(You)"}
              </li>
            ))}
          </ul>

          {/* Available Collaborators List */}
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
        {/* Main Editor Container - expands on smaller screens */}
        <div className="col-lg-9 col-md-8 col-12 p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
            {/* Back Button */}
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

            {/* Document Title */}
            <h1
              className={`display-6 text-center ${
                darkMode ? "text-light" : "text-dark"
              } mb-2 mb-md-0`}
            >
              Document Title: <u>{currentDoc?.title}</u>
            </h1>

            {/* View Collaborators Button */}
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-toggle="modal"
              data-bs-target="#collaborators"
            >
              <i className="bi bi-eye-fill"></i> View Collaborators
            </button>
          </div>

          {/* Quill Editor */}
          <div
            className="editor-container border rounded p-3"
            style={{ minHeight: "60vh" }}
          >
            {yDoc && provider && <Editor ydoc={yDoc} provider={provider} />}
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
