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

    // Only connect if socket URL is explicitly configured
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.log(
        "Socket notifications disabled - NEXT_PUBLIC_SOCKET_URL not configured"
      );
      return;
    }

    const connectSocket = () => {
      try {
        const socket = io(socketUrl, {
          auth: {
            token: localStorage.getItem("authToken"),
          },
          timeout: 5000, // 5 second timeout
        });

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
          console.warn(
            "Socket connection failed (notifications disabled):",
            error.message
          );
          // Don't retry automatically - just log and move on
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
        });

        socketRef.current = socket;
      } catch (error) {
        console.warn("Failed to initialize socket notifications:", error);
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

/**
 * Hook for accessing notifications (placeholder implementation)
 * TODO: Implement proper notifications state management when Socket.IO is set up
 */
export const useNotifications = () => {
  const [notifications] = useState<Notification[]>([]);

  const markAsRead = (id: string) => {
    console.log("Mark notification as read:", id);
    // TODO: Implement when backend notifications API is ready
  };

  const markAllAsRead = () => {
    console.log("Mark all notifications as read");
    // TODO: Implement when backend notifications API is ready
  };

  return {
    notifications,
    markAsRead,
    markAllAsRead,
  };
};
