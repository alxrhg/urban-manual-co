'use client';

import { memo } from 'react';
import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import type { Achievement } from '@/types/features';

interface AchievementBadgeProps {
  achievement: Achievement & { is_earned?: boolean; progress?: number };
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

export const AchievementBadge = memo(function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = false,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  const isLocked = achievement.is_secret && !achievement.is_earned;
  const isEarned = achievement.is_earned;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center gap-1">
          <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
              isEarned
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg'
                : isLocked
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'bg-gray-200 dark:bg-gray-800 opacity-50'
            }`}
          >
            {isLocked ? (
              <Lock className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-gray-500`} />
            ) : (
              <span>{achievement.icon || '🏆'}</span>
            )}
          </div>

          {size !== 'sm' && (
            <p
              className={`text-center font-medium ${
                size === 'md' ? 'text-xs' : 'text-sm'
              } ${!isEarned && 'text-gray-500'}`}
            >
              {achievement.name}
            </p>
          )}

          {showProgress && !isEarned && achievement.progress !== undefined && (
            <div className="w-full max-w-[60px]">
              <Progress value={achievement.progress} className="h-1" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-xs">
          <p className="font-semibold">{achievement.name}</p>
          <p className="text-sm text-gray-500">{achievement.description}</p>
          {!isEarned && achievement.progress !== undefined && (
            <p className="text-xs mt-1">
              Progress: {Math.round(achievement.progress)}%
            </p>
          )}
          {isEarned && (
            <p className="text-xs text-yellow-500 mt-1">
              ✓ Earned • +{achievement.points} points
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
