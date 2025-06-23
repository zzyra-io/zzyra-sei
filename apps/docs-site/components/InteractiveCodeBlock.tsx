"use client";

import { useState } from "react";
import { Copy, Check, Play, Terminal } from "lucide-react";

interface InteractiveCodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  description?: string;
  executable?: boolean;
  filename?: string;
}

export function InteractiveCodeBlock({
  code,
  language = "typescript",
  title,
  description,
  executable = false,
  filename,
}: InteractiveCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRun = () => {
    setIsRunning(true);
    setOutput("Running...");

    // Simulate execution
    setTimeout(() => {
      setIsRunning(false);
      setOutput(
        "✅ Execution completed successfully!\n\nWorkflow deployed to: https://app.zyra.io/workflows/abc123\nStatus: Active\nNext execution: 2024-01-15 10:00 UTC"
      );
    }, 2000);
  };

  return (
    <div className='card-elevated overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-border-primary bg-background-tertiary/50'>
        <div className='flex items-center gap-3'>
          <div className='icon-container'>
            <Terminal className='w-4 h-4' />
          </div>
          <div>
            {title && (
              <h3 className='font-semibold text-text-primary text-sm'>
                {title}
              </h3>
            )}
            {filename && (
              <p className='text-xs text-text-tertiary font-mono'>{filename}</p>
            )}
            {description && (
              <p className='text-xs text-text-secondary mt-1'>{description}</p>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {executable && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className='btn-primary btn-small'>
              <Play className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Running..." : "Run"}
            </button>
          )}

          <button onClick={handleCopy} className='btn-ghost btn-small'>
            {copied ? (
              <>
                <Check className='w-3 h-3 text-success' />
                <span className='text-success'>Copied!</span>
              </>
            ) : (
              <>
                <Copy className='w-3 h-3' />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className='relative'>
        <pre className='p-4 text-sm text-text-secondary bg-background-primary overflow-x-auto custom-scrollbar'>
          <code className={`language-${language}`}>{code}</code>
        </pre>

        {/* Language Badge */}
        <div className='absolute top-2 right-2'>
          <span className='badge-primary text-xs'>{language}</span>
        </div>
      </div>

      {/* Output Section */}
      {output && (
        <div className='border-t border-border-primary'>
          <div className='p-4 bg-background-secondary'>
            <div className='flex items-center gap-2 mb-2'>
              <Terminal className='w-4 h-4 text-text-tertiary' />
              <span className='text-sm font-medium text-text-secondary'>
                Output
              </span>
            </div>
            <pre className='text-sm text-text-secondary whitespace-pre-wrap font-mono'>
              {output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveCodeBlock;
