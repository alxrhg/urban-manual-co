'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CollectionCommentsProps {
  collectionId: string;
  isOwner?: boolean;
}

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user_profiles: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export function CollectionComments({ collectionId, isOwner }: CollectionCommentsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [collectionId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/collections/${collectionId}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: newComment.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        alert(data.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await fetch(`/api/collections/${collectionId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        alert('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-light">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-white dark:bg-dark-blue-900 border border-gray-200 dark:border-dark-blue-600 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white resize-none text-sm"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {!user && (
        <div className="p-4 border border-gray-200 dark:border-dark-blue-600 rounded-2xl text-center">
          <p className="text-sm text-gray-500 mb-3">Sign in to leave a comment</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-2xl hover:opacity-80 transition-opacity"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const canDelete = user && (user.id === comment.user_profiles.user_id || isOwner);

            return (
              <div
                key={comment.id}
                className="p-4 border border-gray-200 dark:border-dark-blue-600 rounded-2xl"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <button
                    onClick={() => router.push(`/user/${comment.user_profiles.username}`)}
                    className="flex-shrink-0"
                  >
                    {comment.user_profiles.avatar_url ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={comment.user_profiles.avatar_url}
                          alt={comment.user_profiles.display_name || comment.user_profiles.username}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-blue-700 flex items-center justify-center text-sm">
                        {(comment.user_profiles.display_name || comment.user_profiles.username)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => router.push(`/user/${comment.user_profiles.username}`)}
                        className="text-sm font-medium hover:underline"
                      >
                        {comment.user_profiles.display_name || comment.user_profiles.username}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {comment.comment_text}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
