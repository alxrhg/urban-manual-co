'use client';

import { Search } from 'lucide-react';

interface IntelligenceSearchProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: () => void;
    placeholder?: string;
}

export function IntelligenceSearch({
    query,
    onQueryChange,
    onSearch,
    placeholder = "Ask me anything about travel..."
}: IntelligenceSearchProps) {
    return (
        <div className="relative w-full max-w-4xl mx-auto">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onSearch();
                        }
                    }}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all"
                />
            </div>
        </div>
    );
}
