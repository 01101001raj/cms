import React from 'react';
import { Skeleton as ShadcnSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface SkeletonProps {
    className?: string;
    width?: string;
    height?: string;
}

// Base skeleton with pulse animation
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width = 'w-full',
    height = 'h-4'
}) => (
    <ShadcnSkeleton
        className={cn(width, height, className)}
    />
);

// Skeleton for table rows
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
    <tr className="border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="py-4 px-4">
                <Skeleton height="h-4" width={i === 0 ? 'w-32' : 'w-20'} />
            </td>
        ))}
    </tr>
);

// Skeleton for full table
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
    rows = 5,
    columns = 5
}) => (
    <div className="overflow-x-auto">
        <table className="w-full">
            <thead>
                <tr className="border-b border-border">
                    {Array.from({ length: columns }).map((_, i) => (
                        <th key={i} className="py-3 px-4 text-left">
                            <Skeleton height="h-4" width="w-20" />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={columns} />
                ))}
            </tbody>
        </table>
    </div>
);

// Skeleton for cards (like distributor cards, stat cards)
export const CardSkeleton: React.FC = () => (
    <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
            <Skeleton className="rounded-full" width="w-10" height="h-10" />
            <div className="flex-1 space-y-2">
                <Skeleton height="h-4" width="w-32" />
                <Skeleton height="h-3" width="w-24" />
            </div>
        </div>
        <Skeleton height="h-4" width="w-full" />
        <Skeleton height="h-4" width="w-3/4" />
    </Card>
);

// Skeleton for stat cards on dashboard
export const StatCardSkeleton: React.FC = () => (
    <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
            <Skeleton height="h-4" width="w-24" />
            <Skeleton className="rounded-lg" width="w-10" height="h-10" />
        </div>
        <Skeleton height="h-8" width="w-32" className="mb-2" />
        <Skeleton height="h-3" width="w-20" />
    </Card>
);

// Skeleton for page header
export const PageHeaderSkeleton: React.FC = () => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <Skeleton className="rounded-xl" width="w-12" height="h-12" />
            <div className="space-y-2">
                <Skeleton height="h-6" width="w-40" />
                <Skeleton height="h-4" width="w-28" />
            </div>
        </div>
        <Skeleton className="rounded-lg" width="w-28" height="h-10" />
    </div>
);

// Grid of card skeletons
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
);

export default Skeleton;
