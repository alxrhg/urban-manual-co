'use client';

import { useEffect, useMemo, useState } from 'react';
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

export interface PlannerBlockCardBaseProps {
  dayId: string;
  block: PlannerBlock;
  draggable?: boolean;
  dragPayload?: unknown;
  onUpdate?: (updates: Partial<Pick<PlannerBlock, 'title' | 'description' | 'time'>>) => void;
  onRemove?: () => void;
  onAddAttachment?: (attachment: { label: string; url?: string; type?: PlannerBlock['attachments'][number]['type'] }) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onAddComment?: (message: string) => Promise<void> | void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  showCommentComposer?: boolean;
}

export function PlannerBlockCardBase({
  dayId,
  block,
  draggable = true,
  dragPayload,
  onUpdate,
  onRemove,
  onAddAttachment,
  onRemoveAttachment,
  onAddComment,
  onDragStart,
  showCommentComposer = true,
}: PlannerBlockCardBaseProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(block.title);
  const [draftDescription, setDraftDescription] = useState(block.description || '');
  const [draftTime, setDraftTime] = useState(block.time || '');
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    setDraftTitle(block.title);
    setDraftDescription(block.description || '');
    setDraftTime(block.time || '');
  }, [block.id, block.title, block.description, block.time]);

  const canModify = Boolean(onUpdate);
  const canComment = Boolean(onAddComment) || block.comments.length > 0;

  const payload = useMemo(() => {
    if (dragPayload) return dragPayload;
    return { type: 'block', blockId: block.id, dayId };
  }, [dragPayload, block.id, dayId]);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        title: draftTitle,
        description: draftDescription,
        time: draftTime,
      });
    }
    setIsEditing(false);
  };

  const handleAddAttachment = () => {
    if (!onAddAttachment) return;
    const url = window.prompt('Attachment URL');
    if (!url) return;
    const label = window.prompt('Attachment label', block.title);
    onAddAttachment({
      label: label || block.title,
      url,
      type: 'link',
    });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!onRemoveAttachment) return;
    onRemoveAttachment(attachmentId);
  };

  const handleAddComment = async () => {
    if (!onAddComment || !commentDraft.trim()) return;
    await onAddComment(commentDraft);
    setCommentDraft('');
  };

  return (
    <div
      className="group rounded-2xl border border-neutral-200/70 bg-white/90 p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/70"
      draggable={draggable}
      onDragStart={event => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify(payload));
        onDragStart?.(event);
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
              disabled={!canModify}
            />
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} disabled={!canModify} />
              <Textarea
                value={draftDescription}
                onChange={event => setDraftDescription(event.target.value)}
                className="min-h-[90px]"
                disabled={!canModify}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{block.title}</h3>
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
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  disabled={!onRemoveAttachment}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2 text-left text-[11px] text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300"
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="size-3.5" />
                    {attachment.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.2em]">{onRemoveAttachment ? 'Remove' : 'Linked'}</span>
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
          {canModify && (
            <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(value => !value)}>
              <Pencil className="size-4" />
            </Button>
          )}
          {onAddAttachment && (
            <Button variant="ghost" size="icon-sm" onClick={handleAddAttachment}>
              <Paperclip className="size-4" />
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="icon-sm" onClick={() => onRemove()} className="text-red-500 hover:text-red-600">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {canComment && showCommentComposer && (
        <div className="mt-3 flex items-center gap-2">
          <Textarea
            value={commentDraft}
            onChange={event => setCommentDraft(event.target.value)}
            placeholder="Add a collaborator note"
            className="min-h-[60px] flex-1 text-xs"
            disabled={!onAddComment}
          />
          <Button variant="ghost" size="sm" onClick={handleAddComment} disabled={!onAddComment}>
            <MessageCircle className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PlannerBlockCard({ dayId, block }: PlannerBlockCardProps) {
  const { updateBlock, removeBlock, addAttachment, removeAttachment, addComment } = usePlanner();

  return (
    <PlannerBlockCardBase
      dayId={dayId}
      block={block}
      onUpdate={updates => updateBlock(dayId, block.id, updates)}
      onRemove={() => removeBlock(dayId, block.id)}
      onAddAttachment={attachment => addAttachment(dayId, { blockId: block.id }, attachment)}
      onRemoveAttachment={attachmentId => removeAttachment(dayId, attachmentId, block.id)}
      onAddComment={message => addComment(dayId, block.id, message)}
    />
  );
}

export default PlannerBlockCard;
