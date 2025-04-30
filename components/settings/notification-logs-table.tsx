"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface NotificationLog {
  id: string;
  user_id: string;
  notification_type: string;
  channel: string;
  content: any;
  status: "success" | "failed";
  error_message?: string;
  created_at: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function NotificationLogsTable() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, typeFilter, channelFilter, statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

      if (typeFilter) params.append("type", typeFilter);
      if (channelFilter) params.append("channel", channelFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `/api/notification-logs?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notification logs");
      }

      const data = await response.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Error",
        description: "Failed to load notification logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getNotificationTypeLabel = (type: string): string => {
    switch (type) {
      case "workflow_started":
        return "Workflow Started";
      case "workflow_completed":
        return "Workflow Completed";
      case "workflow_failed":
        return "Workflow Failed";
      case "node_error":
        return "Node Error";
      case "quota_alert":
        return "Quota Alert";
      case "system_alert":
        return "System Alert";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getChannelLabel = (channel: string): string => {
    switch (channel) {
      case "email":
        return "Email";
      case "telegram":
        return "Telegram";
      case "discord":
        return "Discord";
      case "in_app":
        return "In-App";
      default:
        return channel;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className='bg-green-500'>Success</Badge>;
      case "failed":
        return <Badge className='bg-red-500'>Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <CardTitle>Notification History</CardTitle>
          <Button variant='outline' size='sm' onClick={fetchLogs}>
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
        </div>
        <div className='flex flex-wrap gap-4 mt-4'>
          <div className='w-full sm:w-auto'>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='w-full sm:w-[200px]'>
                <SelectValue placeholder='Filter by type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Types</SelectItem>
                <SelectItem value='workflow_started'>
                  Workflow Started
                </SelectItem>
                <SelectItem value='workflow_completed'>
                  Workflow Completed
                </SelectItem>
                <SelectItem value='workflow_failed'>Workflow Failed</SelectItem>
                <SelectItem value='node_error'>Node Error</SelectItem>
                <SelectItem value='quota_alert'>Quota Alert</SelectItem>
                <SelectItem value='system_alert'>System Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='w-full sm:w-auto'>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className='w-full sm:w-[200px]'>
                <SelectValue placeholder='Filter by channel' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Channels</SelectItem>
                <SelectItem value='email'>Email</SelectItem>
                <SelectItem value='telegram'>Telegram</SelectItem>
                <SelectItem value='discord'>Discord</SelectItem>
                <SelectItem value='in_app'>In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='w-full sm:w-auto'>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full sm:w-[200px]'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Statuses</SelectItem>
                <SelectItem value='success'>Success</SelectItem>
                <SelectItem value='failed'>Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='flex justify-center p-8'>
            Loading notification logs...
          </div>
        ) : logs.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No notification logs found
          </div>
        ) : (
          <>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className='font-medium'>
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        {getNotificationTypeLabel(log.notification_type)}
                      </TableCell>
                      <TableCell>{getChannelLabel(log.channel)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        {log.status === "failed" && log.error_message ? (
                          <span className='text-red-500'>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className='text-sm text-muted-foreground'>
                            {log.content && typeof log.content === "object"
                              ? log.content.title ||
                                log.content.subject ||
                                "Notification sent"
                              : "Notification sent"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className='flex items-center justify-end space-x-2 py-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}>
                  <ChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <div className='text-sm text-muted-foreground'>
                  Page {pagination.page} of {pagination.pages}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}>
                  Next
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
