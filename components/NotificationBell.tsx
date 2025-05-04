"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notification/notification-socket-provider";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, typeof notifications> = {};

    notifications.forEach((notification) => {
      const date = new Date(notification.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey;

      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(notification);
    });

    return groups;
  }, [notifications]);

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;

    return notifications.filter((notification) => {
      const type = notification.content?.type || notification.type;
      return type === activeTab;
    });
  }, [notifications, activeTab]);

  // Auto mark as read when dropdown is open
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

  const getNotificationIcon = (type: string) => {
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
  };

  const formatNotificationMessage = (notification: any) => {
    // Get the message from either the content object or directly from the notification
    const message = notification.content?.message || notification.message;
    const workflowName =
      notification.content?.data?.workflow_name ||
      notification.data?.workflow_name ||
      "Unnamed Workflow";

    // If the message contains empty quotes, replace it with the workflow name
    if (message?.includes('""')) {
      return message.replace('""', `"${workflowName}"`);
    }
    return message;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = (notification: any) => {
    const data = notification.content?.data || notification.data;
    return data?.duration_ms
      ? `${(data.duration_ms / 1000).toFixed(1)}s`
      : null;
  };

  // Count notifications by type
  const typeCounts = useMemo(() => {
    const counts = { success: 0, error: 0, warning: 0, info: 0 };

    notifications.forEach((notification) => {
      const type = notification.content?.type || notification.type;
      if (counts[type as keyof typeof counts] !== undefined) {
        counts[type as keyof typeof counts]++;
      }
    });

    return counts;
  }, [notifications]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <Badge
              className='absolute -top-1 -right-1 px-1.5 py-0.5 text-xs'
              variant='destructive'>
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[380px] p-0'>
        <div className='flex items-center justify-between p-4 border-b'>
          <h3 className='font-medium'>Notifications</h3>
          {notifications.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-2 text-muted-foreground'
                    onClick={() => markAllAsRead()}>
                    <CheckCheck className='h-4 w-4 mr-1' />
                    <span className='text-xs'>Mark all as read</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark all notifications as read</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <Tabs
          defaultValue='all'
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full'>
          <div className='px-4 pt-2'>
            <TabsList className='w-full grid grid-cols-4'>
              <TabsTrigger value='all' className='text-xs'>
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value='success' className='text-xs'>
                <CheckCircle2 className='h-3 w-3 mr-1' />({typeCounts.success})
              </TabsTrigger>
              <TabsTrigger value='info' className='text-xs'>
                <Info className='h-3 w-3 mr-1' />({typeCounts.info})
              </TabsTrigger>
              <TabsTrigger value='error' className='text-xs'>
                <AlertCircle className='h-3 w-3 mr-1' />({typeCounts.error})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className='mt-0 p-0'>
            <ScrollArea className='max-h-[350px]'>
              {filteredNotifications.length === 0 ? (
                <div className='p-6 text-center text-sm text-muted-foreground'>
                  No notifications
                </div>
              ) : (
                <div className='py-2'>
                  {Object.entries(groupedNotifications).map(
                    ([date, dateNotifications]) => {
                      // Filter notifications for this date group based on active tab
                      const filteredDateNotifications =
                        dateNotifications.filter((notification) => {
                          if (activeTab === "all") return true;
                          const type =
                            notification.content?.type || notification.type;
                          return type === activeTab;
                        });

                      if (filteredDateNotifications.length === 0) return null;

                      return (
                        <div key={date} className='mb-2'>
                          <DropdownMenuLabel className='px-4 py-1 text-xs text-muted-foreground'>
                            {date}
                          </DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {filteredDateNotifications.map((notification) => {
                              const type =
                                notification.content?.type || notification.type;
                              const isRead =
                                notification.content?.read || notification.read;
                              const duration = getDuration(notification);

                              return (
                                <DropdownMenuItem
                                  key={notification.id}
                                  className={cn(
                                    "flex items-start gap-3 px-4 py-3 cursor-pointer",
                                    !isRead && "bg-muted/50"
                                  )}
                                  onClick={() =>
                                    handleNotificationClick(notification.id)
                                  }>
                                  <div className='flex-shrink-0 mt-0.5'>
                                    {getNotificationIcon(type)}
                                  </div>
                                  <div className='flex-1 min-w-0'>
                                    <div className='flex items-center justify-between'>
                                      <p className='font-medium text-sm truncate'>
                                        {notification.content?.title ||
                                          notification.title}
                                      </p>
                                      <span className='text-xs text-muted-foreground flex items-center ml-2 flex-shrink-0'>
                                        <Clock className='h-3 w-3 mr-1' />
                                        {formatTime(notification.created_at)}
                                      </span>
                                    </div>
                                    <p className='text-sm text-muted-foreground line-clamp-2'>
                                      {formatNotificationMessage(notification)}
                                    </p>
                                    <div className='flex items-center mt-1 gap-2'>
                                      {duration && (
                                        <span className='text-xs bg-muted px-1.5 py-0.5 rounded'>
                                          {duration}
                                        </span>
                                      )}
                                      <span className='text-xs text-muted-foreground'>
                                        {notification.content?.data
                                          ?.workflow_name ||
                                          notification.data?.workflow_name}
                                      </span>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-5 w-5 p-0 ml-auto'>
                                        <ArrowRight className='h-3 w-3' />
                                      </Button>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuGroup>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className='p-2 text-center'>
              <Button variant='outline' size='sm' className='w-full text-xs'>
                <Link href={"/notifications/logs"}>View all notifications</Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
