'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, PieChart, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Progress } from '@/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import type { TripBudget, BudgetItem, CreateBudgetItemInput } from '@/types/features';

interface BudgetOverviewProps {
  tripId: string;
  currency?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-500',
  accommodation: 'bg-blue-500',
  transport: 'bg-green-500',
  activities: 'bg-purple-500',
  shopping: 'bg-pink-500',
  other: 'bg-gray-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  accommodation: 'Accommodation',
  transport: 'Transport',
  activities: 'Activities',
  shopping: 'Shopping',
  other: 'Other',
};

export function BudgetOverview({ tripId, currency = 'USD' }: BudgetOverviewProps) {
  const [budget, setBudget] = useState<TripBudget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<{
    total_estimated: number;
    total_actual: number;
    remaining: number | null;
    by_category: Record<string, { estimated: number; actual: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');

  // New item form state
  const [newItem, setNewItem] = useState<CreateBudgetItemInput>({
    category: 'food',
    description: '',
    estimated_cost: undefined,
    actual_cost: undefined,
  });

  // Fetch budget data
  const fetchBudget = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/budget`);
      if (res.ok) {
        const data = await res.json();
        setBudget(data.budget);
        setItems(data.items);
        setSummary(data.summary);
        if (data.budget?.total_budget) {
          setBudgetAmount(data.budget.total_budget.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch budget:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Save budget
  const saveBudget = async () => {
    try {
      await fetch(`/api/trips/${tripId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_budget: parseFloat(budgetAmount) || undefined,
          currency,
        }),
      });
      setEditingBudget(false);
      fetchBudget();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  // Add item
  const addItem = async () => {
    try {
      await fetch(`/api/trips/${tripId}/budget/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      setShowAddItem(false);
      setNewItem({ category: 'food', description: '', estimated_cost: undefined, actual_cost: undefined });
      fetchBudget();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  // Delete item
  const deleteItem = async (itemId: string) => {
    try {
      await fetch(`/api/trips/${tripId}/budget/items/${itemId}`, {
        method: 'DELETE',
      });
      fetchBudget();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading budget...</div>;
  }

  const budgetUsedPercent = budget?.total_budget && summary
    ? Math.min((summary.total_actual / budget.total_budget) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Budget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <h3 className="font-semibold">Trip Budget</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditingBudget(true)}>
          <Edit2 className="h-4 w-4 mr-1" /> Set Budget
        </Button>
      </div>

      {/* Budget Progress */}
      {budget?.total_budget && summary && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Spent</span>
            <span className="font-semibold">
              {formatCurrency(summary.total_actual)} / {formatCurrency(budget.total_budget)}
            </span>
          </div>
          <Progress value={budgetUsedPercent} className="h-3" />
          <div className="flex justify-between mt-2 text-sm">
            <span className={summary.remaining && summary.remaining > 0 ? 'text-green-600' : 'text-red-600'}>
              {summary.remaining && summary.remaining > 0
                ? `${formatCurrency(summary.remaining)} remaining`
                : `${formatCurrency(Math.abs(summary.remaining || 0))} over budget`}
            </span>
            <span className="text-gray-500">{Math.round(budgetUsedPercent)}% used</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && Object.keys(summary.by_category).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="text-sm font-medium">By Category</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.by_category).map(([category, data]) => (
              <div
                key={category}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                  <span className="text-sm">{CATEGORY_LABELS[category]}</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(data.actual)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Expenses</span>
          <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No expenses added yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[item.category]}`} />
                  <div>
                    <p className="text-sm font-medium">{item.description || CATEGORY_LABELS[item.category]}</p>
                    <p className="text-xs text-gray-500">{CATEGORY_LABELS[item.category]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {item.actual_cost && (
                      <p className="text-sm font-medium">{formatCurrency(item.actual_cost)}</p>
                    )}
                    {item.estimated_cost && !item.actual_cost && (
                      <p className="text-sm text-gray-500">~{formatCurrency(item.estimated_cost)}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set Budget Dialog */}
      <Dialog open={editingBudget} onOpenChange={setEditingBudget}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Trip Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Total Budget ({currency})</Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
            </div>
            <Button onClick={saveBudget} className="w-full">
              Save Budget
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={newItem.category}
                onValueChange={(v) => setNewItem({ ...newItem, category: v as BudgetItem['category'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="e.g., Dinner at Restaurant"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated ({currency})</Label>
                <Input
                  type="number"
                  value={newItem.estimated_cost || ''}
                  onChange={(e) =>
                    setNewItem({ ...newItem, estimated_cost: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Actual ({currency})</Label>
                <Input
                  type="number"
                  value={newItem.actual_cost || ''}
                  onChange={(e) =>
                    setNewItem({ ...newItem, actual_cost: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={addItem} className="w-full">
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
