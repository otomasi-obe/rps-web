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
  
  // Calculate bidirectional progress: 0-50 goes left to right, 50-100 goes right to left
  const isFirstHalf = progress <= 50;
  const fillPercentage = isFirstHalf ? progress * 2 : (100 - progress) * 2;
  const alignment = isFirstHalf ? 'left' : 'right';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600">{label || 'Processing'}</span>
        <span className="text-slate-500">
          {progress < 100 ? `~${remainingTime}s remaining` : 'Completed!'}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-lg h-4 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-300 ${
            progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          }`}
          style={{
            width: `${Math.min(fillPercentage, 100)}%`,
            marginLeft: alignment === 'right' ? 'auto' : '0',
            marginRight: alignment === 'left' ? 'auto' : '0',
          }}
        />
      </div>
    </div>
  );
}
