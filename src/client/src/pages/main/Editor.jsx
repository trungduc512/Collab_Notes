import React, { useCallback, useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useSupplier } from '../../context/supplierContext';
import QuillCursors from 'quill-cursors'; // Import the cursor plugin
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
Quill.register('modules/cursors', QuillCursors); // Register the cursors module
// Handle receiving cursor positions from other collaborators

const Editor = () => {
  const { darkMode, setQuill, socket, quill, currentDoc, getUserColor } =
    useSupplier();
  const { id: documentId } = useParams();
  const { auth } = useAuth();

  // Store remote cursors so we can transform them when applying incoming deltas
  const remoteCursorsRef = useRef({}); // { username: { index, length } }
  // Debounce timer for emitting cursor events
  const cursorEmitTimerRef = useRef(null);

  // useEffect(() => {
  //   if (socket == null || quill == null) return;

  //   // Request document from server
  //   socket.once('load-document', (document) => {
  //     quill.setContents(document);
  //     quill.enable();
  //   });

  //   socket.emit('get-doc', { docId: documentId });
  // }, [socket, quill, documentId]);
  // Emit cursor position changes to the server
  useEffect(() => {
    if (!quill || !currentDoc?._id) return;

    const handler = (range, oldRange, source) => {
      if (source !== 'user') return;

      // Debounce cursor emits to reduce network churn
      if (cursorEmitTimerRef.current) clearTimeout(cursorEmitTimerRef.current);
      cursorEmitTimerRef.current = setTimeout(() => {
        socket.emit('send-cursor', {
          username: auth?.user?.username,
          range,
          docId: currentDoc?._id,
        });
        cursorEmitTimerRef.current = null;
      }, 150);
    };

    quill.on('selection-change', handler);

    return () => quill.off('selection-change', handler);
  }, [quill, socket, currentDoc, auth?.user?.username]);
  // Listen for cursor updates from other collaborators
  useEffect(() => {
    if (!quill) return;

    const handleReceiveCursor = ({ username, range }) => {
      if (username === auth?.user?.username) return;

      const cursors = quill.getModule('cursors');
      const userColor = getUserColor(username);
      // store remote range so we can transform it later when other deltas arrive
      remoteCursorsRef.current[username] = range;
      cursors.createCursor(username, username, userColor);
      cursors.moveCursor(username, range);
    };

    socket.on('receive-cursor', handleReceiveCursor);

    return () => {
      socket.off('receive-cursor', handleReceiveCursor);
    };
  }, [quill, socket, auth?.user?.username, getUserColor]);
  // Add effect to load document and enable editor

  // Handle incoming text deltas and transform remote cursor positions
  useEffect(() => {
    if (!quill) return;

    const transformIndex = (index, delta) => {
      if (!delta || !delta.ops) return index;
      let pos = index;
      let curr = 0;
      for (const op of delta.ops) {
        if (op.retain) {
          curr += op.retain;
        } else if (op.insert) {
          // insertion at `curr` shifts indices at/after curr
          const len = typeof op.insert === 'string' ? op.insert.length : 1;
          if (curr <= pos) pos += len;
        } else if (op.delete) {
          const del = op.delete;
          if (curr < pos) {
            const removedBefore = Math.min(del, pos - curr);
            pos -= removedBefore;
          }
          // deletions remove text starting at curr; curr does not advance
        }
      }
      return Math.max(0, pos);
    };

    const handleReceiveChanges = (data) => {
      if (!data?.delta) return;
      // Transform stored remote cursor positions and update visuals
      const cursors = quill.getModule('cursors');
      Object.entries(remoteCursorsRef.current).forEach(([username, range]) => {
        try {
          const start = range.index ?? 0;
          const len = range.length ?? 0;
          const newStart = transformIndex(start, data.delta);
          const newEnd = transformIndex(start + len, data.delta);
          const newRange = {
            index: newStart,
            length: Math.max(0, newEnd - newStart),
          };
          remoteCursorsRef.current[username] = newRange;
          if (cursors) cursors.moveCursor(username, newRange);
        } catch (err) {
          console.error('Failed to transform cursor for', username, err);
        }
      });
    };

    socket.on('receive-changes', handleReceiveChanges);

    return () => {
      socket.off('receive-changes', handleReceiveChanges);
    };
  }, [socket, quill]);

  // Remove remote cursor on someoneLeft to keep UI clean
  useEffect(() => {
    if (!quill) return;

    const handleSomeoneLeft = (data) => {
      const username = data?.username;
      if (!username) return;
      const cursors = quill.getModule('cursors');
      delete remoteCursorsRef.current[username];
      try {
        if (cursors && cursors.removeCursor) cursors.removeCursor(username);
      } catch (err) {
        // ignore if method not present
      }
    };

    socket.on('someoneLeft', handleSomeoneLeft);
    return () => socket.off('someoneLeft', handleSomeoneLeft);
  }, [socket, quill]);

  const wrapperRef = useCallback(
    (wrapper) => {
      if (wrapper == null) return;
      wrapper.innerHTML = ''; // Clear the wrapper content

      const editor = document.createElement('div');
      editor.style.minHeight = '30em';
      editor.style.maxHeight = '80em';
      editor.style.borderRadius = '10px';

      // Apply dark or light theme styles dynamically based on darkMode
      if (darkMode) {
        editor.classList.add('bg-dark', 'text-white');
        editor.style.color = 'white';
      } else {
        editor.classList.add('bg-light', 'text-black');
        editor.style.color = 'black';
      }

      wrapper.append(editor);

      // Initialize Quill with the cursor module
      const q = new Quill(editor, {
        theme: 'snow',
        modules: {
          cursors: true, // Enable the cursor module
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
          ],
        },
      });

      // Set the Quill instance in context
      q.disable();
      q.setText('Loading...');
      setQuill(q);
    },
    [darkMode, setQuill]
  );

  return <div className="container" ref={wrapperRef}></div>;
};

export default Editor;
