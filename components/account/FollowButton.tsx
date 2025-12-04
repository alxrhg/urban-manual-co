'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'xs';
  showIcon?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  size = 'sm',
  showIcon = false,
  className,
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const { isFollowing, isLoading, toggleFollow, requiresAuth } = useFollow({
    targetUserId,
    initialIsFollowing,
  });

  const handleClick = async () => {
    if (requiresAuth) {
      router.push('/auth/login');
      return;
    }

    await toggleFollow();
    onFollowChange?.(!isFollowing);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      aria-pressed={isFollowing}
      className={cn('min-w-[100px] transition-all', className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && (
            isFollowing ? (
              <UserMinus className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )
          )}
          {isFollowing ? 'Following' : 'Follow'}
        </>
      )}
    </Button>
  );
}
