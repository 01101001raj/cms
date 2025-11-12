

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Helper function to format dates as DD/MM/YYYY
const formatDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB');
};

interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    label: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value.from || new Date());
    const [view, setView] = useState<'days' | 'months' | 'years'>('days');
    const pickerRef = useRef<HTMLDivElement>(null);

    const closePicker = () => {
        setIsOpen(false);
        setView('days'); // Reset view on close
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                closePicker();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDayClick = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0); // Normalize date to the start of the day

        if (!value.from || (value.from && value.to)) {
            // Start a new selection
            onChange({ from: date, to: null });
        } else if (date < value.from) {
            // If a date before the start date is selected, start a new selection
            onChange({ from: date, to: null });
        } else {
            // Complete the range
            const toDate = new Date(date);
            toDate.setHours(23, 59, 59, 999);
            onChange({ ...value, to: toDate });
            closePicker(); // Close picker after selecting a range
        }
    };

    const handleQuickRangeSelect = (rangeType: 'last1Month' | 'last3Months' | 'last6Months' | 'last1Year') => {
        const today = new Date();
        let from = new Date();
        let to = new Date();
        today.setHours(23, 59, 59, 999);
        from.setHours(0, 0, 0, 0);

        switch (rangeType) {
            case 'last1Month':
                from.setMonth(today.getMonth() - 1);
                to = today;
                break;
            case 'last3Months':
                from.setMonth(today.getMonth() - 3);
                to = today;
                break;
            case 'last6Months':
                from.setMonth(today.getMonth() - 6);
                to = today;
                break;
            case 'last1Year':
                from.setFullYear(today.getFullYear() - 1);
                to = today;
                break;
        }
        onChange({ from, to });
        closePicker();
    };
    
    const handleMonthSelect = (monthIndex: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
        setView('days');
    };

    const handleYearSelect = (year: number) => {
        setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
        setView('months');
    };

    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const renderCalendar = () => {
        const quickRanges = [
            { label: 'Last Month', key: 'last1Month' },
            { label: 'Last 3 Months', key: 'last3Months' },
            { label: 'Last 6 Months', key: 'last6Months' },
            { label: 'Last Year', key: 'last1Year' },
        ];
        
        const renderDayView = () => {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, month, 1).getDay();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const leadingBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => null);
            
             return (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-background"><ChevronLeft size={20} /></button>
                        <button type="button" onClick={() => setView('months')} className="font-semibold text-content hover:underline">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</button>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-background"><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-contentSecondary">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="font-medium">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2">
                        {leadingBlanks.map((_, i) => <div key={`blank-${i}`} />)}
                        {days.map(day => {
                            const date = new Date(year, month, day);
                            date.setHours(0, 0, 0, 0);
                            
                            const toDateNormalized = value.to ? new Date(value.to) : null;
                            if (toDateNormalized) toDateNormalized.setHours(0, 0, 0, 0);
                            
                            const isFrom = value.from && date.getTime() === value.from.getTime();
                            const isTo = toDateNormalized && date.getTime() === toDateNormalized.getTime();
                            const isInRange = value.from && value.to && date > value.from && date < value.to;
                            const isToday = date.getTime() === today.getTime();

                            const baseClasses = 'h-8 w-8 rounded-full text-sm transition-colors flex items-center justify-center';
                            let stateClasses = '';

                            if (isFrom || isTo) {
                                stateClasses = 'bg-primary text-white font-semibold hover:bg-primary/90';
                            } else if (isInRange) {
                                stateClasses = 'bg-blue-100 rounded-none hover:bg-blue-200';
                            } else if (isToday) {
                                stateClasses = 'border border-primary hover:bg-blue-200';
                            } else {
                                stateClasses = 'hover:bg-blue-200'
                            }
                            
                            if (isFrom && value.to) stateClasses += ' rounded-r-none';
                            if (isTo) stateClasses += ' rounded-l-none';

                            return (
                                <button
                                    type="button"
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    className={`${baseClasses} ${stateClasses}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </>
            );
        };

        const renderMonthView = () => {
            const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'short' }));
            return (
                 <>
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))} className="p-1 rounded-full hover:bg-background"><ChevronLeft size={20} /></button>
                        <button type="button" onClick={() => setView('years')} className="font-semibold text-content hover:underline">{currentMonth.getFullYear()}</button>
                        <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))} className="p-1 rounded-full hover:bg-background"><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {months.map((month, index) => (
                             <button
                                key={month}
                                onClick={() => handleMonthSelect(index)}
                                className="p-2 rounded-lg text-sm hover:bg-background transition-colors"
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                 </>
            );
        };

        const renderYearView = () => {
            const startYear = Math.floor(currentMonth.getFullYear() / 10) * 10;
            const years = Array.from({ length: 12 }, (_, i) => startYear - 1 + i);
            return (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear() - 10, 1, 1))} className="p-1 rounded-full hover:bg-background"><ChevronLeft size={20} /></button>
                        <span className="font-semibold text-content">{startYear} - {startYear + 9}</span>
                        <button type="button" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear() + 10, 1, 1))} className="p-1 rounded-full hover:bg-background"><ChevronRight size={20} /></button>
                    </div>
                     <div className="grid grid-cols-4 gap-2 mt-2">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => handleYearSelect(year)}
                                className={`p-2 rounded-lg text-sm hover:bg-background transition-colors ${year < startYear || year > startYear + 9 ? 'text-contentSecondary' : ''}`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </>
            );
        };


        return (
            <div className="absolute top-full left-0 mt-2 bg-card rounded-lg shadow-lg border border-border z-10 flex w-auto">
                <div className="p-4 border-r border-border w-40">
                    <h4 className="text-sm font-semibold text-content mb-2">Quick Ranges</h4>
                    <div className="flex flex-col gap-1">
                        {quickRanges.map(range => (
                            <button
                                key={range.key}
                                type="button"
                                onClick={() => handleQuickRangeSelect(range.key as any)}
                                className="text-left text-sm p-2 rounded-md hover:bg-background text-contentSecondary hover:text-content transition-colors"
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 w-80">
                    {view === 'days' && renderDayView()}
                    {view === 'months' && renderMonthView()}
                    {view === 'years' && renderYearView()}
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full" ref={pickerRef}>
             <label className="block text-sm font-medium text-contentSecondary mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 border rounded-lg shadow-sm bg-white border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
                <span className="text-content">
                    {value.from ? formatDate(value.from) : 'Select Start Date'}
                    {value.to ? ` - ${formatDate(value.to)}` : ''}
                </span>
                <Calendar size={16} className="text-contentSecondary" />
            </button>
            {isOpen && renderCalendar()}
        </div>
    );
};

export default DateRangePicker;
