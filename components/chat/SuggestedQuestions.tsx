'use client';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'Romantic restaurants in Paris',
  'Best coffee shops in Tokyo',
  'Luxury hotels in New York',
  'Hidden gems in Barcelona',
  'Rooftop bars in Bangkok',
  'Michelin restaurants in London',
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          onClick={() => onSelect(question)}
          className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-full hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-gray-700 dark:text-gray-300"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
