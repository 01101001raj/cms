import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import Card from './common/Card';
import Select from './common/Select';
import Input from './common/Input';
import Button from './common/Button';
import { Distributor, WalletTransaction, TransactionType, EnrichedWalletTransaction, Store, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Copy, Check, Wallet, Users, Building2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { formatIndianCurrency, formatDateTimeDDMMYYYY } from '../utils/formatting';
import DateRangePicker from './common/DateRangePicker';

interface FormInputs {
  accountId: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
  remarks: string;
  rechargeDate: string;
}

const RechargeWallet: React.FC = () => {
  const location = useLocation();
  const { currentUser, portal } = useAuth();
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { register, handleSubmit, formState: { errors, isValid }, watch, reset, setValue } = useForm<FormInputs>({
    mode: 'onBlur',
    defaultValues: {
      accountId: location.state?.distributorId || '',
      amount: undefined,
      paymentMethod: 'Cash',
      remarks: '',
      rechargeDate: getTodayDate(),
    }
  });

  const [accountType, setAccountType] = useState<'distributor' | 'store'>('distributor');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [allTransactions, setAllTransactions] = useState<EnrichedWalletTransaction[]>([]);
  
  const getInitialDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(to.getMonth() - 1); // Default to last 1 month
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());

  const selectedAccountId = watch('accountId');
  const paymentMethod = watch('paymentMethod');
  
  const selectedAccount = useMemo(() => {
    if (accountType === 'distributor') {
        return distributors.find(d => d.id === selectedAccountId);
    }
    return stores.find(s => s.id === selectedAccountId);
  }, [distributors, stores, selectedAccountId, accountType]);

  const isRemarksRequired = paymentMethod !== 'Cash';
  
  const remarksConfig = useMemo(() => {
    switch (paymentMethod) {
        case 'UPI':
            return { label: 'UPI Transaction ID', placeholder: 'Enter UPI reference number', requiredMessage: 'UPI Transaction ID is required' };
        case 'Bank Transfer':
            return { label: 'UTR Number', placeholder: 'Enter bank transaction UTR', requiredMessage: 'UTR Number is required' };
        case 'Credit':
            return { label: 'Reference / Remarks', placeholder: 'e.g., Credit note, adjustment reason', requiredMessage: 'Reference or remarks are required' };
        case 'Cash':
        default:
            return { label: 'Remarks (Optional)', placeholder: 'e.g., Cash deposited by...', requiredMessage: '' };
    }
  }, [paymentMethod]);
  
  const paymentDetails: Record<'UPI' | 'Bank Transfer', Record<string, string>> = {
    'UPI': { 'UPI ID': 'distributor-payments@examplebank' },
    'Bank Transfer': {
        'Account Name': 'Distributor Solutions Inc.',
        'Account Number': '987654321012',
        'Bank Name': 'Global Commerce Bank',
        'IFSC Code': 'GCB0001234',
    }
  };

  const paymentMethods: Array<'Cash' | 'UPI' | 'Bank Transfer' | 'Credit'> = ['Cash', 'UPI', 'Bank Transfer', 'Credit'];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedValue(text);
        setTimeout(() => setCopiedValue(null), 2000); // Reset after 2 seconds
    });
  };

  useEffect(() => {
      reset({ accountId: '', amount: undefined, paymentMethod: 'Cash', remarks: '', rechargeDate: getTodayDate() });
  }, [accountType, reset]);

  useEffect(() => {
    if (!portal) return;
    const fetchData = async () => {
        const [distributorData, storeData, allTxs] = await Promise.all([
            api.getDistributors(portal),
            api.getStores(),
            api.getAllWalletTransactions(portal)
        ]);
        setDistributors(distributorData);
        setStores(storeData);
        setAllTransactions(allTxs);
    };
    fetchData();
  }, [portal]);
  
  const filteredRecharges = useMemo(() => {
    return allTransactions
        .filter(tx => {
            if (tx.type !== TransactionType.RECHARGE) return false;
            const txDate = new Date(tx.date);
            if (dateRange.from && txDate < dateRange.from) return false;
            if (dateRange.to && txDate > dateRange.to) return false;
            return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, dateRange]);


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    const accountName = selectedAccount?.name;

    if (window.confirm(`Are you sure you want to add ${formatIndianCurrency(Number(data.amount))} to ${accountName}'s wallet? This action cannot be undone.`)) {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        const rechargeDate = new Date(data.rechargeDate).toISOString();

        if (accountType === 'distributor') {
            await api.rechargeWallet(data.accountId, Number(data.amount), currentUser!.username, data.paymentMethod, data.remarks, rechargeDate, portal);
        } else {
            await api.rechargeStoreWallet(data.accountId, Number(data.amount), currentUser!.username, data.paymentMethod, data.remarks, rechargeDate);
        }
        
        setStatusMessage({ type: 'success', text: `${formatIndianCurrency(data.amount)} successfully added to ${accountName}'s account.` });
        
        const [updatedDistributors, updatedStores, allTxs] = await Promise.all([
          api.getDistributors(portal),
          api.getStores(),
          api.getAllWalletTransactions(portal)
        ]);
        setDistributors(updatedDistributors);
        setStores(updatedStores);
        setAllTransactions(allTxs);

        reset({ accountId: '', amount: undefined, paymentMethod: 'Cash', remarks: '', rechargeDate: getTodayDate() });
      } catch (error) {
        // FIX: The 'error' object from a catch block is of type 'unknown'. It must be type-checked before its properties can be accessed.
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setStatusMessage({ type: 'error', text: `Failed to recharge wallet: ${errorMessage}` });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  if (!currentUser?.permissions?.includes('/recharge-wallet')) {
      return (
          <Card className="text-center">
              <p className="text-contentSecondary">You do not have permission to recharge wallets.</p>
          </Card>
      );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-content">Recharge Wallet</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-contentSecondary mb-1">Account Type</label>
                {currentUser?.role === UserRole.PLANT_ADMIN ? (
                    <div className="flex gap-1 p-1 bg-background rounded-lg border border-border">
                        <Button type="button" variant={accountType === 'distributor' ? 'primary' : 'secondary'} size="md" onClick={() => setAccountType('distributor')} className={`w-1/2 ${accountType !== 'distributor' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}><Users size={16}/> Distributor</Button>
                        <Button type="button" variant={accountType === 'store' ? 'primary' : 'secondary'} size="md" onClick={() => setAccountType('store')} className={`w-1/2 ${accountType !== 'store' ? '!bg-transparent border-none shadow-none !text-contentSecondary hover:!bg-slate-200' : 'shadow'}`}><Building2 size={16}/> Store</Button>
                    </div>
                ) : (
                    <div className="p-2 border rounded-lg bg-slate-100 text-contentSecondary flex items-center justify-center h-[44px]">
                        <Users size={16} className="mr-2"/> Distributor
                    </div>
                )}
            </div>

            <Select
              id="accountId"
              label={`Select ${accountType === 'distributor' ? 'Distributor' : 'Store'}`}
              {...register('accountId', { required: `Please select a ${accountType}` })}
              error={errors.accountId?.message}
            >
              <option value="">-- Choose Account --</option>
              {accountType === 'distributor' 
                ? distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                : stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              }
            </Select>
            
            {selectedAccount && (
                <div className="bg-primary/10 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-contentSecondary">Current Wallet Balance:</span>
                        <span className="font-bold text-content text-lg">{formatIndianCurrency(selectedAccount.walletBalance)}</span>
                    </div>
                </div>
            )}

            <Input
              id="amount"
              label="Recharge Amount"
              type="number"
              {...register('amount', {
                required: 'Amount is required',
                valueAsNumber: true,
                min: { value: 1, message: 'Amount must be greater than zero' }
              })}
              error={errors.amount?.message}
            />

            <Input
              id="rechargeDate"
              label="Recharge Date"
              type="date"
              max={getTodayDate()}
              {...register('rechargeDate', {
                required: 'Date is required'
              })}
              error={errors.rechargeDate?.message}
            />

            <div>
              <label className="block text-sm font-medium text-contentSecondary mb-2">Payment Method</label>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method}
                    type="button"
                    onClick={() => setValue('paymentMethod', method, { shouldValidate: true })}
                    variant={paymentMethod === method ? 'primary' : 'secondary'}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
            
            {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                    <p className="font-semibold text-blue-800">
                        Please use the following details for your {paymentMethod} payment:
                    </p>
                    {Object.entries(paymentDetails[paymentMethod]).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                            <span className="text-contentSecondary">{key}:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-content">{value}</span>
                                <button type="button" onClick={() => handleCopy(value)} title={`Copy ${key}`} className="p-1 rounded hover:bg-blue-200 text-blue-700">
                                    {copiedValue === value ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Input
              id="remarks"
              label={remarksConfig.label}
              placeholder={remarksConfig.placeholder}
              {...register('remarks', {
                required: isRemarksRequired ? remarksConfig.requiredMessage : false,
              })}
              error={errors.remarks?.message}
            />

            <div className="pt-4">
              <Button type="submit" isLoading={isLoading} disabled={!isValid} className="w-full">
                Recharge Wallet
              </Button>
            </div>

            {statusMessage && (
              <div className={`flex items-center p-3 rounded-md mt-4 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {statusMessage.type === 'success' ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
                  {statusMessage.text}
              </div>
            )}
          </form>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
            <h3 className="text-xl font-bold mb-4 text-content flex items-center gap-2"><Wallet size={20}/>Recharge History</h3>
            <div className="mb-4">
                <DateRangePicker
                    label="Filter by Date"
                    value={dateRange}
                    onChange={setDateRange}
                />
            </div>
            {filteredRecharges.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredRecharges.map(tx => (
                        <div key={tx.id} className="p-3 bg-slate-50 rounded-lg text-sm border border-border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-content truncate pr-2">{tx.accountName}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${tx.accountType === 'Distributor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{tx.accountType}</span>
                                </div>
                                <p className="font-bold text-green-600 shrink-0">{formatIndianCurrency(tx.amount)}</p>
                            </div>
                            <div className="flex justify-between items-center text-xs text-contentSecondary mt-2">
                                <span className="font-medium">{tx.paymentMethod}</span>
                                <span className="shrink-0">{formatDateTimeDDMMYYYY(tx.date)}</span>
                            </div>
                            {tx.remarks && (
                                <p className="text-xs text-contentSecondary mt-1 italic">"{tx.remarks}"</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-contentSecondary text-center py-8">No recharges found for the selected date range.</p>
            )}
        </Card>
      </div>
    </div>
  );
};

export default RechargeWallet;