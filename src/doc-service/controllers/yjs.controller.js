import * as Y from "yjs";

export const getDocumentState = (mdb) => async (req, res) => {
  try {
    const { docName } = req.params;

    const persistedDoc = await mdb.getYDoc(docName);
    const state = Y.encodeStateAsUpdate(persistedDoc);

    res.set("Content-Type", "application/octet-stream");
    res.send(Buffer.from(state));
  } catch (err) {
    res.status(500).json({ error: "Failed to load Yjs document" });
  }
};

export const storeDocumentUpdate = (mdb) => async (req, res) => {
  try {
    const { docName } = req.params;
    const update = new Uint8Array(req.body);

    await mdb.storeUpdate(docName, update);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to store update" });
  }
};

export const getDocumentMeta = (mdb) => async (req, res) => {
  try {
    const meta = await mdb.getMeta(req.params.docName);
    res.json(meta || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to load metadata" });
  }
};
