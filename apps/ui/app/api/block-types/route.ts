import { NextResponse } from "next/server";

// Define a simple BlockMetadata interface for this route
interface BlockMetadata {
  type: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  defaultConfig: Record<string, any>;
}

// Hardcode a few basic block types for the API response
const blockTypes: BlockMetadata[] = [
  {
    type: "WEBHOOK",
    label: "Webhook",
    description: "Trigger or respond to webhook events",
    category: "TRIGGER",
    icon: "webhook",
    defaultConfig: {
      url: "",
      method: "POST",
      headers: {}
    }
  },
  {
    type: "CUSTOM",
    label: "Custom Block",
    description: "Create your custom logic block",
    category: "ACTION",
    icon: "puzzle",
    defaultConfig: {
      customBlockId: "",
      inputs: {}
    }
  },
  {
    type: "EMAIL",
    label: "Email",
    description: "Send email notifications",
    category: "ACTION",
    icon: "mail",
    defaultConfig: {
      to: "",
      subject: "",
      body: ""
    }
  }
];

export async function GET() {
  // Return the hardcoded block types
  return NextResponse.json(blockTypes);
}
