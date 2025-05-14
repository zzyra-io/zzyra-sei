/**
 * Email Authentication Pending View
 *
 * This component is shown when a user is completing email authentication
 * and provides instructions on checking their email for the Magic Link.
 */

import { Button } from "../ui/button";
import { Check, Mail } from "lucide-react";
import { useState } from "react";

interface EmailPendingViewProps {
  email: string;
  onCancel: () => void;
}

export function EmailPendingView({ email, onCancel }: EmailPendingViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='flex flex-col items-center p-6 space-y-6 text-center'>
      <div className='h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center'>
        <Mail className='h-10 w-10 text-primary' />
      </div>

      <h2 className='text-2xl font-semibold'>Check your email</h2>

      <p className='text-muted-foreground'>
        We've sent a magic link to <strong>{email}</strong>
      </p>

      <p className='text-sm text-muted-foreground'>
        Click the link in your email to complete the sign-in process. The email
        might take a minute to arrive and may be in your spam folder.
      </p>

      <div className='flex flex-col space-y-3 w-full'>
        <div className='flex items-center gap-2'>
          <div className='bg-muted p-2 rounded flex-1 text-left overflow-hidden text-ellipsis'>
            {email}
          </div>
          <Button
            variant='outline'
            size='sm'
            className='flex items-center gap-1'
            onClick={handleCopy}>
            {copied ? <Check className='h-4 w-4' /> : "Copy"}
          </Button>
        </div>

        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
