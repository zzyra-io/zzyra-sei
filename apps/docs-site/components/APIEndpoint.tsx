"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface APIEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  description: string;
  example?: string;
  response?: string;
}

export function APIEndpoint({
  method,
  endpoint,
  description,
  example,
  response,
}: APIEndpointProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"example" | "response">("example");

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const methodClass = `badge-${method.toLowerCase()}`;

  return (
    <div className='card-elevated'>
      <div className='flex items-center gap-3 mb-4'>
        <span className={methodClass}>{method}</span>
        <code className='text-accent-primary font-mono text-sm bg-background-tertiary px-2 py-1 rounded'>
          {endpoint}
        </code>
      </div>

      <p className='text-text-secondary mb-6 leading-relaxed'>{description}</p>

      {(example || response) && (
        <div>
          <div className='flex gap-2 mb-4 border-b border-border-primary'>
            {example && (
              <button
                onClick={() => setActiveTab("example")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "example"
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}>
                Example
              </button>
            )}
            {response && (
              <button
                onClick={() => setActiveTab("response")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "response"
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}>
                Response
              </button>
            )}
          </div>

          <div className='relative'>
            <pre className='p-4 bg-background-primary border border-border-primary rounded-lg text-sm text-text-secondary overflow-x-auto custom-scrollbar'>
              <code>{activeTab === "example" ? example : response}</code>
            </pre>

            <button
              onClick={() =>
                handleCopy(
                  activeTab === "example" ? example || "" : response || ""
                )
              }
              className='absolute top-2 right-2 btn-ghost btn-small'>
              {copied ? (
                <Check className='w-3 h-3 text-success' />
              ) : (
                <Copy className='w-3 h-3' />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default APIEndpoint;
