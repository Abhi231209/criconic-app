// socketContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const apiUrl = "https://devapi.criconic.com/"; // 🔹 Replace with your backend
    const socketConn = io(apiUrl, { transports: ["websocket"] });

    socketRef.current = socketConn;

    // Connected
    socketConn.on("connect", () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
    });

    // Disconnected
    socketConn.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    });

    return () => {
      socketConn.disconnect();
    };
  }, []);

  // 🔹 Emit wrapper
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  // 🔹 On wrapper
  const on = (event, callback) => {
    console.log("inside onn" , event)
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  // 🔹 Off wrapper (for cleanup)
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
