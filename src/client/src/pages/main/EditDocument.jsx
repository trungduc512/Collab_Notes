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
import { SOCKET_URL } from "../../helpers/config.js";
import { io } from "socket.io-client";
const EditDocument = () => {
  const [currentUsers, setCurrentUsers] = useState([]);
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
    setSocket,
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
  // Tạo socket 1 lần
  // useEffect(() => {
  //   const s = io(`${SOCKET_URL}?roomId=${currentDoc._id}`, {
  //     path: "/ws/socket.io/",
  //     extraHeaders: {
  //       Authorization: `Bearer ${auth?.token}`,
  //     },
  //     transports: ["websocket", "polling"],
  //   });

  //   setSocket(s);

  //   s.on("connect", () => {
  //     console.log("WS connected:", s.id);
  //   });

  //   s.on("disconnect", (reason) => {
  //     console.log("WS disconnected:", reason);
  //   });

  //   s.on("auth-expired", () => {
  //     console.warn("WebSocket auth expired");
  //   });

  //   return () => {};
  //   // CHÚ Ý: dependency chỉ là [] để không tạo lại socket khi auth đổi
  // }, []);

  // Reconnect WebSocket mỗi khi đổi document (đúng cho sticky routing)
  useEffect(() => {
    if (!currentDoc?._id) {
      console.log("No currentDoc._id, not connecting WS");
      return;
    }
    console.log("Connecting WS for document:", currentDoc._id);

    // Tạo socket mới với roomId để Nginx route đúng instance
    document.cookie = `token=${auth?.token}; path=/`;
    const s = io(`${SOCKET_URL}?roomId=${currentDoc._id}`, {
      path: "/ws/socket.io/",
      auth: {
        username: auth?.user?.username || "Unknown",
      },
      transports: ["websocket"],
    });

    setSocket(s);

    s.on("connect", () => console.log("WS connected:", s.id));
    s.on("disconnect", (reason) => console.log("WS disconnected:", reason));

    return () => {
      s.disconnect();
    };
  }, [currentDoc?._id]);

  // Mỗi khi accessToken hoặc socket đổi -> gửi refresh-auth cho socket
  useEffect(() => {
    if (!socket) return;
    if (!auth?.token) return;

    const sendAuth = () => {
      console.log("Sending refresh-auth to WS");
      socket.emit("refresh-auth", { token: auth.token }, (err, res) => {
        if (err) {
          console.error("WS refresh-auth error:", err);
        } else {
          console.log("WS refresh-auth success:", res);
        }
      });
    };

    if (socket.connected) {
      sendAuth();
    } else {
      socket.once("connect", sendAuth);
    }

    return () => {
      socket.off("connect", sendAuth);
    };
  }, [socket, auth?.token]);

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
              {currentUsers?.length})
            </li>
            {currentUsers?.map((user, index) => (
              <li
                key={index}
                className={`list-group-item ${
                  darkMode ? "bg-dark text-light" : "bg-light text-dark"
                }`}
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
