interface LineItem {
  label: string;
  value: string | number;
  isSubtotal?: boolean;
}

interface FinancialSummaryProps {
  items: LineItem[];
  total?: {
    label: string;
    value: string | number;
  };
  currency?: string;
  className?: string;
}

/**
 * FinancialSummary - Order details view
 * Lovably style: gray background, clean rows, serif total
 */
export default function FinancialSummary({
  items,
  total,
  currency = '$',
  className = '',
}: FinancialSummaryProps) {
  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return `${currency}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value;
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-900/50 p-6 rounded-sm space-y-4 ${className}`}>
      {/* Line Items */}
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`
            flex justify-between text-sm
            ${item.isSubtotal ? 'pt-4 border-t border-gray-200 dark:border-gray-800' : ''}
          `}
        >
          <span className="text-gray-600 dark:text-gray-400">
            {item.label}
          </span>
          <span className={`
            ${item.isSubtotal
              ? 'font-medium text-gray-900 dark:text-white'
              : 'text-gray-900 dark:text-white'
            }
          `}>
            {formatValue(item.value)}
          </span>
        </div>
      ))}

      {/* Total */}
      {total && (
        <div className="flex justify-between text-lg font-serif border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
          <span className="text-gray-900 dark:text-white">
            {total.label}
          </span>
          <span className="text-gray-900 dark:text-white">
            {formatValue(total.value)}
          </span>
        </div>
      )}
    </div>
  );
}
