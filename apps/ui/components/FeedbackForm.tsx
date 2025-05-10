"use client";
import React, { useState } from 'react';

interface FeedbackFormProps {
  workflowId?: string;
  onSuccess?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ workflowId, onSuccess }) => {
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, message, workflowId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage('');
      setRating(5);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-medium">Send Feedback</h3>
      <div className="flex items-center">
        {[1,2,3,4,5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            className={
              `text-2xl ${i <= rating ? 'text-yellow-400' : 'text-gray-300'} `
            }
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full border border-gray-300 rounded p-2"
        rows={4}
        placeholder="Your comments (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Feedback'}
      </button>
    </form>
  );
};
