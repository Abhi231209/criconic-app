// socketContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { AppState } from "react-native";
import { io } from "socket.io-client";
import { SOCKET_URL } from "@/config";

const SocketContext = createContext(null);

const SOCKET_OPTIONS = {
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const currentUrlRef = useRef(null);

  // Helper to create and wire up a socket instance
  const initSocket = useCallback((url) => {
    if (!url) {
      console.warn("⚠️ [SocketProvider] SOCKET_URL is empty or undefined");
      return null;
    }

    // Clean up existing socket if URL changed
    if (socketRef.current) {
      console.log(
        "🔌 [SocketProvider] URL changed from",
        currentUrlRef.current,
        "to",
        url,
        "— disconnecting previous socket"
      );
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (e) {
        console.warn("⚠️ [SocketProvider] Error disconnecting old socket:", e);
      }
      socketRef.current = null;
      setIsConnected(false);
    }

    console.log("🔌 [SocketProvider] Initializing Socket.IO connection to:", url);
    const socketConn = io(url, SOCKET_OPTIONS);
    socketRef.current = socketConn;
    currentUrlRef.current = url;
    return socketConn;
  }, []);

  // Eagerly initialize on first render or whenever SOCKET_URL changes
  if (!socketRef.current || currentUrlRef.current !== SOCKET_URL) {
    initSocket(SOCKET_URL);
  }

  const [socket, setSocket] = useState(socketRef.current);

  useEffect(() => {
    const socketConn = socketRef.current;
    if (!socketConn) return;

    // Keep state in sync with current socket instance
    setSocket(socketConn);

    const onConnect = () => {
      const transportName = socketConn.io?.engine?.transport?.name || "unknown";
      console.log("✅ [Socket] Connected successfully:", socketConn.id, "to", currentUrlRef.current, `(transport: ${transportName})`);
      setIsConnected(true);
    };

    const onUpgrade = (transport) => {
      console.log("🚀 [Socket] Transport upgraded to:", transport?.name);
    };

    const onDisconnect = (reason) => {
      console.log("❌ [Socket] Disconnected from", currentUrlRef.current, "Reason:", reason);
      setIsConnected(false);
      // When server forcibly disconnects, Socket.IO does not auto-reconnect
      if (reason === "io server disconnect") {
        console.log("🔄 [Socket] Server initiated disconnect, reconnecting manually...");
        socketConn.connect();
      }
    };

    const onConnectError = (error) => {
      console.warn("⚠️ [Socket] Connection error details:", {
        url: currentUrlRef.current,
        message: error?.message || String(error),
        description: error?.description,
        type: error?.type,
        context: error?.context?.status || error?.context,
      });
      setIsConnected(false);
    };

    const onReconnect = (attempt) => {
      console.log("🔄 [Socket] Reconnected after", attempt, "attempts to", currentUrlRef.current);
      setIsConnected(true);
    };

    const onReconnectAttempt = (attempt) => {
      console.log(`🔄 [Socket] Reconnection attempt #${attempt} to:`, currentUrlRef.current);
    };

    if (socketConn.connected) {
      setIsConnected(true);
    }

    socketConn.on("connect", onConnect);
    socketConn.on("disconnect", onDisconnect);
    socketConn.on("connect_error", onConnectError);
    socketConn.on("reconnect", onReconnect);
    socketConn.on("reconnect_attempt", onReconnectAttempt);
    socketConn.io?.engine?.on("upgrade", onUpgrade);

    // Reconnect socket when app returns to foreground
    const appStateSub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        if (socketRef.current && !socketRef.current.connected) {
          console.log("📱 [Socket] App resumed, reconnecting socket to:", currentUrlRef.current);
          socketRef.current.connect();
        }
      }
    });

    return () => {
      appStateSub?.remove();
      socketConn.off("connect", onConnect);
      socketConn.off("disconnect", onDisconnect);
      socketConn.off("connect_error", onConnectError);
      socketConn.off("reconnect", onReconnect);
      socketConn.off("reconnect_attempt", onReconnectAttempt);
      socketConn.io?.engine?.off("upgrade", onUpgrade);
    };
  }, [SOCKET_URL]);

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      console.log(`📡 [Socket EMIT] ${event}`);
      if (typeof callback === "function") {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    } else {
      console.warn(`⚠️ [Socket EMIT] Failed, socket not initialized for ${event}`);
      if (typeof callback === "function") {
        callback({ success: false, message: "Socket not initialized" });
      }
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

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("🔄 [Socket] Manual reconnect triggered for:", currentUrlRef.current);
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  const value = useMemo(
    () => ({
      socket: socketRef.current || socket,
      isConnected,
      emit,
      on,
      off,
      reconnect,
    }),
    [socket, isConnected, emit, on, off, reconnect]
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
      reconnect: () => {},
    }
  );
};

