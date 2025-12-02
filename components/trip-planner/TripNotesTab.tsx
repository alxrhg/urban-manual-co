'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ListChecks, StickyNote, Plus, X } from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface TripNotesTabProps {
  tripId: string;
}

export function TripNotesTab({ tripId }: TripNotesTabProps) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [tripNotes, setTripNotes] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedChecklist = localStorage.getItem(`trip-checklist-${tripId}`);
    const savedNotes = localStorage.getItem(`trip-notes-${tripId}`);

    if (savedChecklist) {
      try {
        setChecklistItems(JSON.parse(savedChecklist));
      } catch {
        // Ignore parse errors
      }
    }

    if (savedNotes) {
      setTripNotes(savedNotes);
    }
  }, [tripId]);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem(`trip-checklist-${tripId}`, JSON.stringify(checklistItems));
  }, [checklistItems, tripId]);

  useEffect(() => {
    localStorage.setItem(`trip-notes-${tripId}`, tripNotes);
  }, [tripNotes, tripId]);

  const addChecklistItem = () => {
    if (!newItemText.trim()) return;

    setChecklistItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        text: newItemText.trim(),
        checked: false,
      },
    ]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const completedCount = checklistItems.filter((item) => item.checked).length;
  const totalCount = checklistItems.length;

  return (
    <div className="space-y-6">
      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Checklist
            </CardTitle>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount} completed
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Add Item Input */}
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              placeholder="Add an item (press Enter)"
              className="flex-1"
            />
            <Button
              variant="default"
              size="icon"
              onClick={addChecklistItem}
              disabled={!newItemText.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Checklist Items */}
          {checklistItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              No items yet. Add packing items, reminders, or tasks.
            </p>
          ) : (
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <label
                    htmlFor={item.id}
                    className={`flex-1 text-sm cursor-pointer ${
                      item.checked
                        ? 'text-gray-400 dark:text-gray-500 line-through'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.text}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Clear Completed */}
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setChecklistItems((prev) => prev.filter((item) => !item.checked))
              }
              className="mt-4 text-xs text-gray-500"
            >
              Clear completed items
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Free-form Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={tripNotes}
            onChange={(e) => setTripNotes(e.target.value)}
            placeholder="Add notes for your trip... reservations, reminders, tips, etc."
            className="min-h-[200px] resize-y"
          />
          <p className="text-xs text-gray-400 mt-2">
            Notes are saved automatically
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
