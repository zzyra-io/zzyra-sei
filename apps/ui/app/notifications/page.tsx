"use client";

import React, { useMemo, useState } from "react";
import {
  NotificationSocketProvider,
  useNotifications,
} from "@/components/notification/notification-socket-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Local Notification type for this page
type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: unknown;
  createdAt?: string;
};

const NOTIFICATION_TYPES = [
  { type: "all", label: "All", icon: <Bell className='h-4 w-4' /> },
  {
    type: "success",
    label: "Success",
    icon: <CheckCircle2 className='h-4 w-4 text-green-500' />,
  },
  {
    type: "error",
    label: "Error",
    icon: <AlertCircle className='h-4 w-4 text-red-500' />,
  },
  {
    type: "warning",
    label: "Warning",
    icon: <AlertTriangle className='h-4 w-4 text-amber-500' />,
  },
  {
    type: "info",
    label: "Info",
    icon: <Info className='h-4 w-4 text-blue-500' />,
  },
  {
    type: "unread",
    label: "Unread",
    icon: <Bell className='h-4 w-4 text-primary' />,
  },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case "success":
      return <CheckCircle2 className='h-5 w-5 text-green-500' />;
    case "error":
      return <AlertCircle className='h-5 w-5 text-red-500' />;
    case "warning":
      return <AlertTriangle className='h-5 w-5 text-amber-500' />;
    case "info":
    default:
      return <Info className='h-5 w-5 text-blue-500' />;
  }
}

function groupByDate(
  notifications: Notification[]
): Record<string, Notification[]> {
  const groups: { [key: string]: Notification[] } = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  notifications.forEach((n: Notification) => {
    const date = n.createdAt ? new Date(n.createdAt) : null;
    let groupKey = "Older";
    if (date) {
      if (date.toDateString() === today.toDateString()) groupKey = "Today";
      else if (date.toDateString() === yesterday.toDateString())
        groupKey = "Yesterday";
      else
        groupKey = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(n);
  });
  return groups;
}

function NotificationsList({ filter }: { filter: string }) {
  const { notifications, markAsRead } = useNotifications();

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread")
      return notifications.filter((n: Notification) => !n.read);
    return notifications.filter((n: Notification) => n.type === filter);
  }, [notifications, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (!filtered.length) {
    return (
      <div className='flex flex-col items-center justify-center p-12 min-h-[300px]'>
        <Bell className='h-10 w-10 text-muted-foreground mb-4' />
        <p className='text-lg font-medium text-muted-foreground'>
          No notifications
        </p>
        <p className='text-sm text-muted-foreground'>
          You&apos;re all caught up!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className='max-h-[70vh]'>
      {Object.entries(grouped).map(([date, group]) => (
        <div key={date} className='mb-6'>
          <div className='text-xs font-semibold text-muted-foreground mb-2 px-2'>
            {date}
          </div>
          <ul className='divide-y divide-border rounded-md border bg-background'>
            {group.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/50 outline-none",
                  !n.read && "bg-accent/10 border-l-4 border-primary"
                )}
                onClick={() => !n.read && markAsRead(n.id)}
                aria-label={n.title}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    !n.read && markAsRead(n.id);
                  }
                }}>
                <div className='flex-shrink-0 mt-1'>
                  {getNotificationIcon(n.type)}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={cn("font-medium", !n.read && "text-primary")}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <span className='ml-2 rounded bg-primary px-2 py-0.5 text-xs text-white'>
                        New
                      </span>
                    )}
                    <Badge
                      variant='outline'
                      className='ml-2 text-xs capitalize'>
                      {n.type}
                    </Badge>
                  </div>
                  <div className='text-sm text-muted-foreground mt-1'>
                    {n.message}
                  </div>
                  <div className='text-xs text-muted-foreground mt-1'>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </ScrollArea>
  );
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  return (
    <NotificationSocketProvider>
      <div className='flex flex-col gap-6 max-w-2xl mx-auto py-8'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Notifications</h1>
          <div className='flex items-center gap-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href='/settings/notifications'>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label='Notification preferences'>
                      <Bell className='h-5 w-5' />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Notification preferences</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <TabsList className='mb-4'>
            {NOTIFICATION_TYPES.map((t) => (
              <TabsTrigger
                key={t.type}
                value={t.type}
                className='flex items-center gap-1'>
                {t.icon}
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {NOTIFICATION_TYPES.map((t) => (
            <TabsContent key={t.type} value={t.type}>
              <NotificationsList filter={t.type} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </NotificationSocketProvider>
  );
}
