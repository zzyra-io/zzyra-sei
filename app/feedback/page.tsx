import React, { useEffect, useState } from 'react';
import { FeedbackForm } from '../../components/FeedbackForm';

export default function FeedbackPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEntries = async () => {
    setLoading(true);
    const res = await fetch('/api/feedback');
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Your Feedback</h1>
      <FeedbackForm onSuccess={fetchEntries} />
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {entries.map((fb) => (
            <li key={fb.id} className="p-4 bg-gray-50 rounded">
              <div className="flex justify-between">
                <div><strong>{fb.rating} ★</strong> on {new Date(fb.submitted_at).toLocaleString()}</div>
                <span className="capitalize">{fb.status}</span>
              </div>
              {fb.message && <p className="mt-2">{fb.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
