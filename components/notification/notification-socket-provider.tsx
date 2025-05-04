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
import { createClient } from "@/lib/supabase/client";
import { io, Socket } from "socket.io-client";

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
  const retryCountRef = useRef<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      console.log("Fetching notifications from API");
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        console.error("Failed to fetch notifications:", response.statusText);
        return;
      }

      const data = await response.json();
      const notificationData = Array.isArray(data)
        ? data
        : data.data && Array.isArray(data.data)
        ? data.data
        : [];
      console.log(`Received ${notificationData.length} notifications`);
      setNotifications(notificationData as Notification[]);
      setUnreadCount(
        notificationData.filter((n: Notification) => !n.read).length
      );
    } catch (error: unknown) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  const refetchNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const getVariantForType = useCallback((type: string) => {
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
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      console.log(`Marking notification ${id} as read`);
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        console.error(
          "Failed to mark notification as read:",
          response.statusText
        );
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: unknown) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      console.log("Marking all notifications as read");
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error(
          "Failed to mark all notifications as read:",
          response.statusText
        );
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error: unknown) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  useEffect(() => {
    let socketInstance: Socket | null = null;
    let isMounted = true;
    let connectionAttemptInProgress = false;
    const maxRetries = 5;

    const connectSocket = async () => {
      if (connectionAttemptInProgress) return;
      connectionAttemptInProgress = true;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("No authenticated user found");
          connectionAttemptInProgress = false;
          return;
        }

        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
        const socketUrl = apiBaseUrl.replace(/^(http|https):/, "ws");
        console.log(`Connecting to notification socket at ${socketUrl}`);

        socketInstance = io(socketUrl, {
          auth: { userId: user.id },
          transports: ["websocket"],
          reconnection: false,
          timeout: 10000,
          forceNew: true,
          autoConnect: false,
        });

        if (!socketInstance) {
          console.error("Failed to create socket instance");
          connectionAttemptInProgress = false;
          return;
        }

        const connectWithRetry = () => {
          if (retryCountRef.current >= maxRetries) {
            console.error("Max retries reached, stopping connection attempts");
            connectionAttemptInProgress = false;
            return;
          }

          const backoffTime = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          console.log(`Attempting to connect to WebSocket... Retry ${retryCountRef.current + 1}, backoff: ${backoffTime}ms`);

          socketInstance?.connect();

          const timeout = setTimeout(() => {
            console.log("WebSocket connection timed out");
            socketInstance?.disconnect();
            retryCountRef.current++;
            connectWithRetry();
          }, backoffTime);

          socketInstance?.on("connect", () => {
            clearTimeout(timeout);
            console.log("WebSocket connected successfully");
            setSocketConnected(true);
            retryCountRef.current = 0;
            connectionAttemptInProgress = false;
          });

          socketInstance?.on("connect_error", (error) => {
            clearTimeout(timeout);
            console.error("WebSocket connection error:", error);
            socketInstance?.disconnect();
            setTimeout(() => {
              retryCountRef.current++;
              connectWithRetry();
            }, Math.min(1000 * Math.pow(2, retryCountRef.current), 30000));
          });

          socketInstance?.on("disconnect", () => {
            console.log("WebSocket disconnected");
            setSocketConnected(false);
            if (isMounted) {
              setTimeout(connectWithRetry, 5000);
            }
          });

          socketInstance?.on(
            "notification",
            (notification: Notification | undefined) => {
              if (!notification || !isMounted) return;
              console.log("New notification received:", notification);
              setNotifications((prev) => [notification, ...prev]);
              if (!notification.read) {
                setUnreadCount((prev) => prev + 1);
              }
              toast({
                title: notification.title,
                description: notification.message,
                variant: getVariantForType(notification.type),
              });
            }
          );
        };

        connectWithRetry();
      } catch (error: unknown) {
        console.error("Error in notification socket setup:", error);
        connectionAttemptInProgress = false;
      }
    };

    connectSocket();
    fetchNotifications();

    return () => {
      isMounted = false;
      if (socketInstance) {
        console.log("Disconnecting notification socket");
        socketInstance.disconnect();
        socketInstance.off("connect");
        socketInstance.off("disconnect");
        socketInstance.off("connect_error");
        socketInstance.off("notification");
      }
    };
  }, [toast, fetchNotifications, getVariantForType]);

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
