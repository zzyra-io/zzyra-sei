import React from "react";
import { Metadata } from "next";
import { SettingsHeader } from "@/components/settings/settings-header";
import { NotificationLogsTable } from "@/components/settings/notification-logs-table";

export const metadata: Metadata = {
  title: "Notification Logs - Zyra",
  description: "View your notification history",
};

export default function NotificationLogsPage() {
  return (
    <div className="container py-10">
      <SettingsHeader
        title="Notification Logs"
        description="View your notification history"
      />
      <div className="mt-6">
        <NotificationLogsTable />
      </div>
    </div>
  );
}
