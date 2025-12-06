// services/docLoader.service.js
import * as Y from "yjs";

export const loadDocFromService = async (docName) => {
  const baseUrl = process.env.DOC_SERVICE_URL || "http://localhost:3001";

  try {
    const res = await fetch(
      `${baseUrl}/docs/${encodeURIComponent(docName)}/state`
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.log(`ℹ️ [ws] Doc '${docName}' has no persisted state yet.`);
        return null;
      }
      throw new Error(`Doc service status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const stateUpdate = new Uint8Array(arrayBuffer);

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, stateUpdate);

    console.log(`📥 [ws] Loaded state for doc '${docName}' from doc-service`);
    return ydoc;
  } catch (err) {
    console.error(
      `❌ [ws] Failed to load doc '${docName}' from doc-service:`,
      err
    );
    return null;
  }
};
