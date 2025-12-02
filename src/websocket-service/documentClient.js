// websocket-service/utils/documentClient.js
const DOCUMENT_SERVICE_URL =
  process.env.DOCUMENT_SERVICE_URL || "http://document-service:5002";

/**
 * Gọi sang document-service để lấy 1 document
 */
export async function fetchDocument(docId, userId) {
  const res = await fetch(`${DOCUMENT_SERVICE_URL}/documents/${docId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId, // OK
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || `Failed to fetch document: ${res.status}`;
    throw new Error(msg);
  }

  if (!data.document || !data.document.content) {
    console.error("❌ ERROR: document-service returned:", data);
    throw new Error("Invalid document content received from document-service");
  }

  return data.document;
}

/**
 * Gọi sang document-service để lưu nội dung document
 */
export async function saveDocument(docId, userId, content) {
  const res = await fetch(`${DOCUMENT_SERVICE_URL}/documents/${docId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId,
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || `Failed to save document: ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.document;
}
