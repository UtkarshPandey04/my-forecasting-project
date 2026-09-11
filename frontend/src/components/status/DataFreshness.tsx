'use client';

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface DataFreshnessProps {
  lastUpdated: string | null;
}

export default function DataFreshness({ lastUpdated }: DataFreshnessProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const normalized = lastUpdated.endsWith('Z') || lastUpdated.includes('+') ? lastUpdated : `${lastUpdated}Z`;
      let updated = new Date(normalized);
      if (isNaN(updated.getTime())) {
        updated = new Date(lastUpdated);
      }
      const diffInSeconds = Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 1000));

      if (diffInSeconds < 60) {
        setTimeAgo('just now');
      } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${mins} min${mins > 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!lastUpdated) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Clock size={12} />
      <span>Last updated: {timeAgo || lastUpdated}</span>
    </div>
  );
}
