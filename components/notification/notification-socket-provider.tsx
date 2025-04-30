"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  data?: {
    originalType?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationSocketProvider"
    );
  }
  return context;
};

export const NotificationSocketProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let socketInstance: Socket | null = null;
    let isMounted = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        socketInstance = io(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/notifications`,
          { auth: { userId: user.id }, transports: ["websocket"], reconnectionAttempts: 5, reconnectionDelay: 1000 }
        );

        socketInstance.on("connect", () => console.log("Notification socket connected"));
        socketInstance.on("disconnect", () => console.log("Notification socket disconnected"));
        socketInstance.on("error", (err) => console.error("Socket error:", err));
        socketInstance.on("notification", (notification: Notification) => {
          if (!isMounted) return;
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          toast({ title: notification.title, description: notification.message, variant: getVariantForType(notification.type) });
        });

        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = (await res.json()) as Notification[];
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.read).length);
        }
      } catch (e) {
        console.error("Error in notification socket setup:", e);
      }
    })();

    return () => {
      isMounted = false;
      socketInstance?.disconnect();
    };
  }, [toast]);

  const getVariantForType = (type: string) => {
    switch (type) {
      case "error":
        return "destructive" as const;
      case "warning":
        return "default" as const; 
      case "success":
        return "default" as const;
      default:
        return "default" as const;
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetchNotifications: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
