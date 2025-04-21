"use client";
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from './ui/dropdown-menu';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await fetch('/api/notifications');
    const data = await res.json();
    setNotifications(data || []);
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 font-medium">Notifications</div>
        {loading ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            You have no unread notifications.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-2 hover:bg-muted rounded flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-semibold">{n.event_type}</div>
                {n.payload?.message && <div className="text-xs text-muted-foreground">{n.payload.message}</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => markRead(n.id)}>
                ✓
              </Button>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
