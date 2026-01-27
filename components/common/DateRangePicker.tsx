import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
    value: { from: Date | null; to: Date | null };
    onChange: (range: { from: Date | null; to: Date | null }) => void;
    label: string;
    className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
    value,
    onChange,
    label,
    className,
}) => {
    // Adapter to convert between our {from, to} interface and react-day-picker's DateRange
    const range: DateRange | undefined = {
        from: value.from || undefined,
        to: value.to || undefined,
    };

    const handleSelect = (selectedRange: DateRange | undefined) => {
        onChange({
            from: selectedRange?.from || null,
            to: selectedRange?.to || null,
        });
    };

    const handleQuickRangeSelect = (rangeType: 'last1Month' | 'last3Months' | 'last6Months' | 'last1Year') => {
        const today = new Date();
        let from = new Date();
        const to = new Date(); // Today

        switch (rangeType) {
            case 'last1Month':
                from.setMonth(today.getMonth() - 1);
                break;
            case 'last3Months':
                from.setMonth(today.getMonth() - 3);
                break;
            case 'last6Months':
                from.setMonth(today.getMonth() - 6);
                break;
            case 'last1Year':
                from.setFullYear(today.getFullYear() - 1);
                break;
        }
        
        onChange({ from, to });
    };

    return (
        <div className={cn("grid gap-2", className)}>
             <label className="block text-sm font-medium text-contentSecondary">{label}</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !value.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value.from ? (
                            value.to ? (
                                <>
                                    {format(value.from, "LLL dd, y")} -{" "}
                                    {format(value.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(value.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                         <div className="border-r p-2 space-y-2 w-36">
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-2 pt-2">Quick Ranges</h4>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleQuickRangeSelect('last1Month')}>Last Month</Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleQuickRangeSelect('last3Months')}>Last 3 Months</Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleQuickRangeSelect('last6Months')}>Last 6 Months</Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleQuickRangeSelect('last1Year')}>Last Year</Button>
                        </div>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={value.from || undefined}
                            selected={range}
                            onSelect={handleSelect}
                            numberOfMonths={2}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default DateRangePicker;
