"use client";

import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notification/notification-socket-provider";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, unreadCount, markAllAsRead]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-500 text-green-700";
      case "error":
        return "bg-red-100 border-red-500 text-red-700";
      case "warning":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";
      default:
        return "bg-blue-100 border-blue-500 text-blue-700";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onOpenChange={setOpen}>
        <Button variant="ghost" className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 border-l-2 ${getNotificationColor(
                  notification.type
                )}`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="font-medium">{notification.title}</div>
                <div className="text-sm text-muted-foreground">
                  {notification.message}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </DropdownMenuItem>
            ))}
            {notifications.length > 0 && (
              <DropdownMenuItem
                className="flex justify-center text-sm text-primary hover:text-primary"
                onClick={() => markAllAsRead()}
              >
                Mark all as read
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
