import { getDocThroughSocket } from './doc.controller.js';
import DocumentModel from '../models/documents.model.js';
import { getRedisClient } from '../utils/redisConnect.js';
import {
  scheduleDocumentSave,
  forceSaveDocument,
} from '../utils/documentSaveScheduler.js';
import Delta from 'quill-delta';

const roomUsers = {};

export const socketCtrl = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.id;
    handleConnection(socket, io, userId);
  });
};

const handleConnection = async (socket, io, userId) => {
  socket.on('joinRoom', (data, callback) => {
    try {
      const docId = data.docId;
      socket.join(docId);

      if (!roomUsers[docId]) {
        roomUsers[docId] = [];
      }

      roomUsers[docId].push({ username: data.username, userId });

      io.to(docId).emit('someoneJoined', {
        username: data.username,
        roomUsers: roomUsers[docId],
      });

      callback(null);
    } catch (error) {
      console.error('Error in joinRoom:', error);
      callback('Error joining room');
    }
  });

  socket.on('leaveRoom', (data, callback) => {
    try {
      const docId = data.docId;
      socket.leave(docId);

      if (roomUsers[docId]) {
        roomUsers[docId] = roomUsers[docId].filter(
          (user) => user.username !== data.username
        );

        io.to(docId).emit('someoneLeft', {
          username: data.username,
          roomUsers: roomUsers[docId],
        });
      }

      callback(null);
    } catch (error) {
      console.error('Error in leaveRoom:', error);
      callback('Error leaving room');
    }
  });

  socket.on('send-cursor', (data) => {
    socket.to(data.docId).emit('receive-cursor', {
      username: data.username,
      range: data.range,
    });
  });

  socket.on('send-changes', async (data, callback) => {
    try {
      const docId = data.docId;
      // Broadcast changes to all users in the room
      io.to(docId).emit('receive-changes', {
        delta: data.delta,
        username: data.username,
      });

      // Update Redis cache with the delta using Quill Delta composition
      if (data.delta && data.docId) {
        const redisClient = getRedisClient();
        const cacheKey = `document:${data.docId}:content`;

        // Get current content from Redis
        let currentContentStr = await redisClient.get(cacheKey);
        let currentContent;

        if (currentContentStr) {
          currentContent = JSON.parse(currentContentStr);
        } else {
          // If not in cache, get from database
          const curr_doc = await getDocThroughSocket(data.docId);
          currentContent = curr_doc.content || { ops: [] };
        }

        // Ensure currentContent has ops array (Quill Delta format)
        let contentOps = currentContent?.ops || [];
        if (typeof currentContent === 'string') {
          // Handle edge case where content might be a plain string
          contentOps = currentContent ? [{ insert: currentContent }] : [];
        }

        // Apply delta using Quill Delta composition
        const docDelta = new Delta(contentOps);
        const changeDelta = new Delta(data.delta);
        const newContent = docDelta.compose(changeDelta);

        // Save updated content to Redis (store as { ops: [...] })
        // console.log(newContent);
        await redisClient.set(cacheKey, JSON.stringify(newContent), {
          EX: 3600,
        });
        // console.log(`✅ Document ${data.docId} updated in Redis cache`);

        // Schedule periodic save to database
        scheduleDocumentSave(data.docId);
      }

      if (callback) callback(null);
    } catch (error) {
      console.error('Error in send-changes:', error);
      if (callback) callback('Error sending changes');
    }
  });

  socket.on('get-doc', async (data) => {
    try {
      const redisClient = getRedisClient();
      const cacheKey = `document:${data.docId}:content`;

      // Try to get from Redis first
      let content = await redisClient.get(cacheKey);

      if (content) {
        console.log(
          `✅ Document ${data.docId} loaded from Redis cache socket.controller`
        );
        content = JSON.parse(content);
      } else {
        // If not in cache, get from database
        const curr_doc = await getDocThroughSocket(data.docId);
        content = curr_doc.content || '';

        // Cache it for future use
        if (content) {
          await redisClient.set(cacheKey, JSON.stringify(content));
          console.log(
            `✅ Document ${data.docId} cached to Redis from DB socket.controller`
          );
        }
      }

      io.to(data.docId).emit('load-document', content);
    } catch (error) {
      console.error('Error in get-doc:', error);
    }
  });
  /// New cursor handling code
  // socket.on("send-cursor", (data) => {
  //   socket.to(data.roomId).emit("receive-cursor", data);
  // });

  socket.on('save-doc', async (data, callback) => {
    try {
      if (!data.docId) return;

      // Force immediate save (no debounce)
      const result = await forceSaveDocument(data.docId);

      callback(result.success ? null : result.error);
    } catch (error) {
      console.error('Error in save-doc:', error);
      callback('Error saving doc');
    }
  });

  socket.on('disconnect', () => {
    try {
      let username;
      let docId;

      Object.keys(roomUsers).forEach((currentDocId) => {
        username = roomUsers[currentDocId].find(
          (user) => user.userId === userId
        )?.username;
        roomUsers[currentDocId] = roomUsers[currentDocId].filter(
          (user) => user.userId !== userId
        );
        docId = currentDocId;
      });

      if (username && docId) {
        socket.leave(docId);
        io.to(docId).emit('someoneLeft', {
          username,
          roomUsers: roomUsers[docId],
        });

        // Force save when last user leaves
        // if (roomUsers[docId] && roomUsers[docId].length === 0) {
        //   forceSaveDocument(docId).catch((err) =>
        //     console.error('Error saving on disconnect:', err)
        //   );
        // }
      }
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
};
