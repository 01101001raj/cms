import React, { useState, useMemo } from 'react';
import { Distributor, Store } from '../../types';
import { Search, User, Phone, MapPin, Wallet, CreditCard, Building2, Users, X, Check, ChevronsUpDown } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatting';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type AccountType = 'distributor' | 'store';

interface AccountSelectorProps {
    accountType: AccountType;
    onAccountTypeChange?: (type: AccountType) => void;
    showTypeToggle?: boolean;
    distributors: Distributor[];
    stores: Store[];
    selectedId: string;
    onSelect: (id: string) => void;
    disabled?: boolean;
    error?: string | null;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
    accountType,
    onAccountTypeChange,
    showTypeToggle = false,
    distributors,
    stores,
    selectedId,
    onSelect,
    disabled = false,
    error
}) => {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("") // Used for internal command state if needed, but we rely on selectedId

    const selectedAccount = useMemo(() => {
        if (selectedId) {
            if (accountType === 'distributor') {
                return distributors.find(d => d.id === selectedId);
            }
            return stores.find(s => s.id === selectedId);
        }
        return null;
    }, [accountType, distributors, stores, selectedId]);

    const handleClearSelection = () => {
        onSelect('');
    };

    return (
        <div className="space-y-4">
            {/* Account Type Toggle */}
            {showTypeToggle && onAccountTypeChange && !selectedAccount && (
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => onAccountTypeChange('distributor')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${accountType === 'distributor'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Users size={16} /> Distributor
                    </button>
                    <button
                        type="button"
                        onClick={() => onAccountTypeChange('store')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${accountType === 'store'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Building2 size={16} /> Store
                    </button>
                </div>
            )}

            {/* Selected Account Card */}
            {selectedAccount ? (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <User size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">{selectedAccount.name}</p>
                                {accountType === 'distributor' && (selectedAccount as Distributor).agentCode && (
                                    <p className="text-xs text-blue-700 font-medium">
                                        {(selectedAccount as Distributor).agentCode}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="p-1.5 rounded-full hover:bg-blue-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="Clear selection"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {accountType === 'distributor' && (
                            <>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={14} />
                                    <span>{(selectedAccount as Distributor).phone || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <MapPin size={14} />
                                    <span>{(selectedAccount as Distributor).area || 'N/A'}</span>
                                </div>
                            </>
                        )}
                        <div className="flex items-center gap-2">
                            <Wallet size={14} className="text-green-600" />
                            <span className="font-semibold text-green-700">
                                {formatIndianCurrency(selectedAccount.walletBalance)}
                            </span>
                        </div>
                        {accountType === 'distributor' && (
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-orange-600" />
                                <span className="font-semibold text-orange-700">
                                    {formatIndianCurrency((selectedAccount as Distributor).creditLimit)}
                                </span>
                            </div>
                        )}
                    </div>

                    {accountType === 'distributor' && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Available Funds</span>
                                <span className="font-bold text-blue-700 text-lg">
                                    {formatIndianCurrency(
                                        selectedAccount.walletBalance + (selectedAccount as Distributor).creditLimit
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            aria-label={`Select ${accountType}`}
                            className="w-full justify-between h-12 text-base font-normal"
                            disabled={disabled}
                        >
                            <span className="text-muted-foreground">
                                {accountType === 'distributor' ? 'Search distributor by name or code...' : 'Search store by name...'}
                            </span>
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={`Search ${accountType}...`} />
                            <CommandList>
                                <CommandEmpty>No {accountType} found.</CommandEmpty>
                                <CommandGroup>
                                    {accountType === 'distributor' ? (
                                        distributors.map((d) => (
                                            <CommandItem
                                                key={d.id}
                                                value={d.name + (d.agentCode ? ` ${d.agentCode}` : '')}
                                                onSelect={() => {
                                                    onSelect(d.id)
                                                    setOpen(false)
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{d.name}</span>
                                                    {d.agentCode && <span className="text-xs text-muted-foreground">Code: {d.agentCode}</span>}
                                                </div>
                                                <Check
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        selectedId === d.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))
                                    ) : (
                                        stores.map((s) => (
                                            <CommandItem
                                                key={s.id}
                                                value={s.name}
                                                onSelect={() => {
                                                    onSelect(s.id)
                                                    setOpen(false)
                                                }}
                                            >
                                                {s.name}
                                                <Check
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        selectedId === s.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))
                                    )}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                    {error}
                </p>
            )}
        </div>
    );
};

export default AccountSelector;
