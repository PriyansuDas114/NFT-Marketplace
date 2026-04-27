import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * useSocket — creates a single socket connection per component lifecycle.
 * Previously used a module-level `let socket` which caused memory leaks
 * (the old socket would never be cleaned up on re-renders).
 *
 * @param {Function} onMetricsUpdate - Callback for 'metricsUpdate' events
 */
const useSocket = (onMetricsUpdate) => {
  const socketRef     = useRef(null);
  const callbackRef   = useRef(onMetricsUpdate);

  // Keep callback ref current without re-running effect
  useEffect(() => {
    callbackRef.current = onMetricsUpdate;
  }, [onMetricsUpdate]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.info('[Socket] Connected:', socket.id);
    });

    socket.on('metricsUpdate', (data) => {
      callbackRef.current?.(data);
    });

    socket.on('disconnect', (reason) => {
      console.info('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Intentionally no deps — socket lives for component lifetime

  return socketRef;
};

export default useSocket;
