'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  isVisible: boolean;
  estimatedTime?: number; // in seconds
  label?: string;
}

export default function ProgressBar({ progress, isVisible, estimatedTime = 30, label }: ProgressBarProps) {
  if (!isVisible) return null;

  const remainingTime = Math.max(0, Math.ceil(estimatedTime * (100 - progress) / 100));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600">{label || 'Processing'}</span>
        <span className="text-slate-500">
          {progress < 100 ? `~${remainingTime}s remaining` : 'Completed!'}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
