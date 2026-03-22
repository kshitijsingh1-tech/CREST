/**
 * CREST — useSocket Hook
 * Real-time Socket.IO connection to the CREST backend.
 * Listens for queue_updated and new_complaint events,
 * then triggers React state refresh via callbacks.
 */

"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SocketEvents {
  onQueueUpdated?:  (data: unknown) => void;
  onNewComplaint?:  (data: { id: string; severity: number; category: string }) => void;
}

export function useSocket({ onQueueUpdated, onNewComplaint }: SocketEvents) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports:        ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("[CREST] Socket connected:", socket.id);
    });

    socket.on("queue_updated", (data) => {
      onQueueUpdated?.(data);
    });

    socket.on("new_complaint", (data) => {
      onNewComplaint?.(data);
    });

    socket.on("disconnect", (reason) => {
      console.warn("[CREST] Socket disconnected:", reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef.current;
}
