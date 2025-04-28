import React from "react";
import { Metadata } from "next";
import { SettingsHeader } from "@/components/settings/settings-header";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export const metadata: Metadata = {
  title: "Notification Settings - Zyra",
  description: "Manage your notification preferences",
};

export default function NotificationSettingsPage() {
  return (
    <div className="container py-10">
      <SettingsHeader
        title="Notification Settings"
        description="Manage your notification preferences and channels"
      />
      <div className="mt-6">
        <NotificationPreferencesForm />
      </div>
    </div>
  );
}
