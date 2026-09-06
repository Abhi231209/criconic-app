// socketContext.js
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { apiUrl } from "@/utils/api";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initialize socket instance eagerly so it is never null when children mount
  if (!socketRef.current) {
    const socketUrl = (apiUrl || "https://devapi.criconic.com").replace(/\/+$/, "");
    console.log("🔌 [SocketProvider] Initializing Socket.IO to:", socketUrl);
    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    });
  }

  const [socket, setSocket] = useState(socketRef.current);

  useEffect(() => {
    const socketConn = socketRef.current;
    if (!socketConn) return;

    const onConnect = () => {
      console.log("✅ [Socket] Connected successfully:", socketConn.id);
      setIsConnected(true);
    };

    const onDisconnect = (reason) => {
      console.log("❌ [Socket] Disconnected:", reason);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.warn("⚠️ [Socket] Connection error:", error?.message || error);
    };

    const onReconnect = (attempt) => {
      console.log("🔄 [Socket] Reconnected after", attempt, "attempts");
      setIsConnected(true);
    };

    if (socketConn.connected) {
      setIsConnected(true);
    }

    socketConn.on("connect", onConnect);
    socketConn.on("disconnect", onDisconnect);
    socketConn.on("connect_error", onConnectError);
    socketConn.on("reconnect", onReconnect);

    return () => {
      socketConn.off("connect", onConnect);
      socketConn.off("disconnect", onDisconnect);
      socketConn.off("connect_error", onConnectError);
      socketConn.off("reconnect", onReconnect);
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      console.log(`📡 [Socket EMIT] ${event}:`, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn(`⚠️ [Socket EMIT] Failed, socket not initialized for ${event}`);
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const value = useMemo(
    () => ({
      socket: socketRef.current || socket,
      isConnected,
      emit,
      on,
      off,
    }),
    [socket, isConnected, emit, on, off]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return (
    context || {
      socket: null,
      isConnected: false,
      emit: () => {},
      on: () => {},
      off: () => {},
    }
  );
};

