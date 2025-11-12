'use client';

import React, { useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  slug?: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

interface TripPackingListProps {
  destination: string;
  days: DayItinerary[];
  startDate: string;
  endDate: string;
}

interface PackingItem {
  id: number;
  name: string;
  category: string;
  packed: boolean;
}

export function TripPackingList({
  destination,
  days,
  startDate,
  endDate,
}: TripPackingListProps) {
  const [items, setItems] = useState<PackingItem[]>([
    {
      id: 1,
      name: 'Passport',
      category: 'Documents',
      packed: false,
    },
    {
      id: 2,
      name: 'Travel Insurance',
      category: 'Documents',
      packed: false,
    },
    {
      id: 3,
      name: 'Phone Charger',
      category: 'Electronics',
      packed: false,
    },
    {
      id: 4,
      name: 'Camera',
      category: 'Electronics',
      packed: false,
    },
    {
      id: 5,
      name: 'Comfortable Walking Shoes',
      category: 'Clothing',
      packed: false,
    },
    {
      id: 6,
      name: 'Light Jacket',
      category: 'Clothing',
      packed: false,
    },
    {
      id: 7,
      name: 'Sunscreen',
      category: 'Toiletries',
      packed: false,
    },
    {
      id: 8,
      name: 'Medications',
      category: 'Toiletries',
      packed: false,
    },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Essentials');

  const togglePacked = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              packed: !item.packed,
            }
          : item
      )
    );
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newItemName,
        category: newItemCategory,
        packed: false,
      },
    ]);
    setNewItemName('');
  };

  const categories = Array.from(new Set(items.map((item) => item.category)));
  const packedCount = items.filter((item) => item.packed).length;
  const totalCount = items.length;
  const percentPacked = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-3">
          Packing List
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {destination} • {days.length} days
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {packedCount} / {totalCount} packed
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="h-2 bg-neutral-100 dark:bg-neutral-800 overflow-hidden mb-2">
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all"
            style={{
              width: `${percentPacked}%`,
            }}
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
          {percentPacked.toFixed(0)}% complete
        </p>
      </div>

      {/* Add Item */}
      <div className="mb-8 p-4 border border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add item..."
            className="flex-1 px-0 py-2 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
          />
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 bg-white dark:bg-gray-900 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
          >
            <option>Essentials</option>
            <option>Documents</option>
            <option>Electronics</option>
            <option>Clothing</option>
            <option>Toiletries</option>
          </select>
          <button
            onClick={addItem}
            className="px-4 py-2 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items by Category */}
      <div className="space-y-8">
        {categories.map((category) => {
          const categoryItems = items.filter(
            (item) => item.category === category
          );
          const packedInCategory = categoryItems.filter(
            (item) => item.packed
          ).length;
          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                  {category}
                </h4>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {packedInCategory} / {categoryItems.length}
                </span>
              </div>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => togglePacked(item.id)}
                    className="w-full flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-left"
                  >
                    <div
                      className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                        item.packed
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100'
                          : 'border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      {item.packed && (
                        <CheckIcon className="w-3 h-3 text-white dark:text-neutral-900" />
                      )}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        item.packed
                          ? 'text-neutral-400 dark:text-neutral-500 line-through'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

