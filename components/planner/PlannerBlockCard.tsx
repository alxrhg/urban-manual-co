'use client';

import { useState } from 'react';
import {
  Clock3,
  MessageCircle,
  Paperclip,
  Pencil,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import type { PlannerBlock } from '@/contexts/PlannerContext';

interface PlannerBlockCardProps {
  dayId: string;
  block: PlannerBlock;
}

export function PlannerBlockCard({ dayId, block }: PlannerBlockCardProps) {
  const { updateBlock, removeBlock, addAttachment, removeAttachment, addComment } = usePlanner();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(block.title);
  const [draftDescription, setDraftDescription] = useState(block.description || '');
  const [draftTime, setDraftTime] = useState(block.time || '');
  const [commentDraft, setCommentDraft] = useState('');

  const handleSave = () => {
    updateBlock(dayId, block.id, {
      title: draftTitle,
      description: draftDescription,
      time: draftTime,
    });
    setIsEditing(false);
  };

  const handleAddAttachment = () => {
    const url = window.prompt('Attachment URL');
    if (!url) return;
    const label = window.prompt('Attachment label', block.title);
    addAttachment(dayId, { blockId: block.id }, {
      label: label || block.title,
      url,
      type: 'link',
    });
  };

  const handleAddComment = async () => {
    if (!commentDraft.trim()) return;
    await addComment(dayId, block.id, commentDraft);
    setCommentDraft('');
  };

  return (
    <div
      className="group rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/70"
      draggable
      onDragStart={event => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
          'application/json',
          JSON.stringify({ type: 'block', blockId: block.id, dayId }),
        );
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Clock3 className="size-3" />
            <input
              value={draftTime}
              onChange={event => setDraftTime(event.target.value)}
              onBlur={handleSave}
              placeholder="Time"
              className="w-24 bg-transparent text-xs font-medium outline-none"
            />
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} />
              <Textarea
                value={draftDescription}
                onChange={event => setDraftDescription(event.target.value)}
                className="min-h-[90px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {block.title}
              </h3>
              {block.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{block.description}</p>
              )}
            </div>
          )}

          {block.notes && !isEditing && (
            <div className="rounded-xl bg-neutral-100/80 p-3 text-[11px] text-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-300">
              <StickyNote className="mr-2 inline size-3" />
              {block.notes}
            </div>
          )}

          {block.attachments.length > 0 && (
            <div className="space-y-1">
              {block.attachments.map(attachment => (
                <button
                  key={attachment.id}
                  onClick={() => removeAttachment(dayId, attachment.id, block.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2 text-left text-[11px] text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="size-3.5" />
                    {attachment.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em]">Remove</span>
                </button>
              ))}
            </div>
          )}

          {block.comments.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-neutral-200/60 bg-neutral-50/70 p-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300">
              {block.comments.map(comment => (
                <div key={comment.id} className="space-y-1 border-b border-dashed border-neutral-200/60 pb-2 last:border-none last:pb-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
                    <MessageCircle className="size-3" />
                    {comment.authorName || 'Collaborator'}
                    <span className="text-[9px] font-normal lowercase">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">{comment.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 opacity-0 transition group-hover:opacity-100">
          <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(value => !value)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleAddAttachment}>
            <Paperclip className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => removeBlock(dayId, block.id)} className="text-red-500 hover:text-red-600">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Textarea
          value={commentDraft}
          onChange={event => setCommentDraft(event.target.value)}
          placeholder="Add a collaborator note"
          className="min-h-[60px] flex-1 text-xs"
        />
        <Button variant="ghost" size="sm" onClick={handleAddComment}>
          <MessageCircle className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default PlannerBlockCard;
