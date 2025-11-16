'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface CategoryAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function CategoryAutocompleteInput({
  value,
  onChange,
  placeholder = 'Dining',
  required = false,
  className = '',
}: CategoryAutocompleteInputProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialValue, setInitialValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Track initial value when component mounts or value changes from external source (for editing mode)
  useEffect(() => {
    if (value && !initialValue) {
      setInitialValue(value);
    }
  }, [value, initialValue]);

  // Fetch existing categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          // Extract category names from the API response
          const categoryNames = (data.categories || []).map((cat: { name: string; count: number }) => cat.name);
          setCategories(categoryNames);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle input change and filter categories
  useEffect(() => {
    if (!value) {
      setFilteredCategories([]);
      setIsNewCategory(false);
      return;
    }

    const inputValue = value.toLowerCase().trim();
    const matches = categories.filter(category =>
      category.toLowerCase().includes(inputValue)
    );

    setFilteredCategories(matches);
    
    // Check if this is an exact match or a new category
    // Don't flag as new if it's the initial value (when editing) - it's an existing category
    const exactMatch = categories.some(category => category.toLowerCase() === inputValue);
    const isInitialValue = initialValue && value.toLowerCase().trim() === initialValue.toLowerCase().trim();
    setIsNewCategory(!exactMatch && !isInitialValue && inputValue.length > 0);
  }, [value, categories, initialValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectCategory = (category: string) => {
    onChange(category);
    setShowSuggestions(false);
    setIsNewCategory(false);
  };

  const handleInputFocus = () => {
    if (value && filteredCategories.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-3 border rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all duration-200 ease-in-out text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 ${
          isNewCategory
            ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/20'
            : 'border-gray-200 dark:border-gray-800'
        } ${className}`}
      />
      
      {isNewCategory && value && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-900 dark:text-orange-200">
            <strong>New Category:</strong> &quot;{value}&quot; will be created as a new category.
          </div>
        </div>
      )}

      {showSuggestions && filteredCategories.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-h-60 overflow-y-auto z-50"
        >
          {filteredCategories.slice(0, 10).map((category, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectCategory(category)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800"
            >
              {category}
            </button>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Loading categories...
        </div>
      )}
    </div>
  );
}

