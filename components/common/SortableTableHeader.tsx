import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '../../hooks/useSortableData';

interface SortableTableHeaderProps<T> {
  label: string;
  sortKey: keyof T;
  requestSort: (key: keyof T) => void;
  sortConfig: SortConfig<T> | null;
  className?: string;
}

const SortableTableHeader = <T extends object>({
  label,
  sortKey,
  requestSort,
  sortConfig,
  className = '',
}: SortableTableHeaderProps<T>) => {
  const isSorted = sortConfig?.key === sortKey;
  const isAscending = sortConfig?.direction === 'ascending';

  // Extract text alignment from className
  const textAlignmentClass = className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : 'justify-start';

  return (
    <th className={`p-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => requestSort(sortKey)}
        className={`flex items-center gap-1 hover:text-content transition-colors w-full ${textAlignmentClass} ${isSorted ? 'text-primary' : 'text-contentSecondary'}`}
      >
        {label}
        {isSorted ? (
          isAscending ? <ArrowUp size={14} /> : <ArrowDown size={14} />
        ) : (
          <div className="w-[14px] h-[14px]"></div> // Placeholder for alignment
        )}
      </button>
    </th>
  );
};

export default SortableTableHeader;
