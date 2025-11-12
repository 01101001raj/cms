import { useState, useMemo, useCallback } from 'react';

export interface SortConfig<T> {
  key: keyof T;
  direction: 'ascending' | 'descending';
}

export const useSortableData = <T extends object>(items: T[], config: SortConfig<T> | null = null) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
           return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Fallback for other types (e.g., dates)
        const aStr = String(aValue);
        const bStr = String(bValue);
        
        return sortConfig.direction === 'ascending'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = useCallback((key: keyof T) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  return { items: sortedItems, requestSort, sortConfig };
};
