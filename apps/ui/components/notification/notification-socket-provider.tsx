"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Socket, io } from "socket.io-client";
import { IsBrowser } from "@dynamic-labs/sdk-react-core";
import useAuthStore from "@/lib/store/auth-store";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId: string;
}

export const NotificationSocketProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<unknown>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);

  // Client-side auth store access
  useEffect(() => {
    setIsClient(true);
    const authStore = useAuthStore.getState();
    setIsAuthenticated(authStore.isAuthenticated);
    setUser(authStore.user);
  }, []);

  // Subscribe to auth store changes
  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = useAuthStore.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
    });

    return unsubscribe;
  }, [isClient]);

  // Socket connection logic
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const connectSocket = () => {
      try {
        const socket = io(
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
          {
            auth: {
              token: localStorage.getItem("authToken"),
            },
          }
        );

        socket.on("connect", () => {
          console.log("Socket connected");
          reconnectAttempts.current = 0;
        });

        socket.on("notification", (notification: Notification) => {
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        });

        socket.on("disconnect", () => {
          console.log("Socket disconnected");
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          if (reconnectAttempts.current < 5) {
            setTimeout(
              () => {
                reconnectAttempts.current += 1;
                connectSocket();
              },
              1000 * Math.pow(2, reconnectAttempts.current)
            );
          }
        });

        socketRef.current = socket;
      } catch (error) {
        console.error("Failed to connect socket:", error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, user, toast]);

  return <IsBrowser>{children}</IsBrowser>;
};
