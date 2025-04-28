"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";

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

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300); // Allow animation to complete
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  // Get background color based on notification type
  const getBgColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-100 border-green-500";
      case "warning":
        return "bg-yellow-100 border-yellow-500";
      case "error":
        return "bg-red-100 border-red-500";
      case "info":
      default:
        return "bg-blue-100 border-blue-500";
    }
  };

  // Get icon color based on notification type
  const getIconColor = () => {
    switch (notification.type) {
      case "success":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      case "info":
      default:
        return "text-blue-500";
    }
  };

  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return "✓";
      case "warning":
        return "⚠";
      case "error":
        return "✗";
      case "info":
      default:
        return "ℹ";
    }
  };

  return (
    <div
      className={`${getBgColor()} border-l-4 p-4 rounded shadow-md mb-3 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}>
      <div className='flex items-start'>
        <div className={`${getIconColor()} text-xl mr-3`}>{getIcon()}</div>
        <div className='flex-1'>
          <h4 className='font-semibold text-gray-800'>{notification.title}</h4>
          <p className='text-gray-600'>{notification.message}</p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='h-6 w-6 p-0'
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(notification.id), 300);
          }}>
          <X className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
};

export const NotificationToastContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Only show the 3 most recent notifications
        setNotifications(data.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading || notifications.length === 0) return null;

  return (
    <div className='fixed top-4 right-4 z-50 w-80 space-y-2'>
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={markAsRead}
        />
      ))}
    </div>
  );
};
