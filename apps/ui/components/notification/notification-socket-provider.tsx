"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useToast } from "@/components/ui/use-toast";
import { io, Socket } from "socket.io-client";
import api from "@/lib/services/api";
import useAuthStore from "@/lib/store/auth-store";

// Define Notification type if not imported
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: unknown;
  createdAt?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationSocketProvider"
    );
  }
  return context;
};

export const NotificationSocketProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    try {
      const response = await api.get("/notifications");
      const data = response.data;
      const notificationData = Array.isArray(data)
        ? data
        : data.data && Array.isArray(data.data)
          ? data.data
          : [];
      setNotifications(notificationData as Notification[]);
      setUnreadCount(
        notificationData.filter((n: Notification) => !n.read).length
      );
    } catch (error: unknown) {
      // Silent fail
    }
  }, [isAuthenticated, user]);

  const refetchNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch("/notifications", { id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    }
  }, [fetchNotifications, isAuthenticated, user]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    // Connect to the worker's notification socket
    const socket = io(
      process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL ||
        "http://localhost:3007/notifications",
      {
        auth: { userId: user.id },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }
    );
    socketRef.current = socket;

    socket.on("connect", () => {
      reconnectAttempts.current = 0;
    });

    socket.on("disconnect", () => {
      // Exponential backoff reconnect
      if (reconnectAttempts.current < 5) {
        setTimeout(
          () => {
            socket.connect();
          },
          Math.pow(2, reconnectAttempts.current) * 1000
        );
        reconnectAttempts.current += 1;
      }
    });

    socket.on("notification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === "error" ? "destructive" : "default",
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [toast, isAuthenticated, user]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
