import React, { useState, useEffect, useMemo } from 'react';
import Loader from './common/Loader';
import { useForm, SubmitHandler } from 'react-hook-form';
import Card from './common/Card';
import Input from './common/Input';
import Button from './common/Button';
import AccountSelector from './common/AccountSelector';
import { Distributor, Store, TransactionType, EnrichedWalletTransaction, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatIndianCurrency, formatDateTimeDDMMYYYY } from '../utils/formatting';
import DateRangePicker from './common/DateRangePicker';
import { Wallet, CheckCircle, XCircle, Banknote, CreditCard, Building, Receipt } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface FormInputs {
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
  remarks: string;
  rechargeDate: string;
}

const paymentMethods: Array<{ id: FormInputs['paymentMethod']; label: string; icon: React.ReactNode }> = [
  { id: 'Cash', label: 'Cash', icon: <Banknote size={16} /> },
  { id: 'UPI', label: 'UPI', icon: <CreditCard size={16} /> },
  { id: 'Bank Transfer', label: 'Bank', icon: <Building size={16} /> },
  { id: 'Credit', label: 'Credit', icon: <Receipt size={16} /> },
];

const paymentDetails: Record<'UPI' | 'Bank Transfer', Record<string, string>> = {
  'UPI': { 'UPI ID': 'distributor-payments@examplebank' },
  'Bank Transfer': {
    'Account Name': 'Distributor Solutions Inc.',
    'Account Number': '987654321012',
    'Bank Name': 'Global Commerce Bank',
    'IFSC Code': 'GCB0001234',
  }
};

const RechargeWallet: React.FC = () => {
  const location = useLocation();
  const { currentUser, portal } = useAuth();

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  const { register, handleSubmit, formState: { errors, isValid }, watch, reset, setValue } = useForm<FormInputs>({
    mode: 'onChange',
    defaultValues: {
      amount: undefined,
      paymentMethod: 'Cash',
      remarks: '',
      rechargeDate: getTodayDate(),
    }
  });

  const [accountType, setAccountType] = useState<'distributor' | 'store'>('distributor');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(location.state?.distributorId || '');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [allTransactions, setAllTransactions] = useState<EnrichedWalletTransaction[]>([]);

  const getInitialDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(to.getMonth() - 1);
    to.setHours(23, 59, 59, 999);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  };

  const [dateRange, setDateRange] = useState(getInitialDateRange());

  const paymentMethod = watch('paymentMethod');
  const amount = watch('amount');

  const selectedAccount = useMemo(() => {
    if (accountType === 'distributor') {
      return distributors.find(d => d.id === selectedAccountId);
    }
    return stores.find(s => s.id === selectedAccountId);
  }, [distributors, stores, selectedAccountId, accountType]);

  const remarksConfig = useMemo(() => {
    switch (paymentMethod) {
      case 'UPI': return { label: 'UPI Transaction ID', placeholder: 'Enter UPI reference number', required: true };
      case 'Bank Transfer': return { label: 'UTR Number', placeholder: 'Enter bank transaction UTR', required: true };
      case 'Credit': return { label: 'Reference / Remarks', placeholder: 'e.g., Credit note, adjustment reason', required: true };
      default: return { label: 'Remarks (Optional)', placeholder: 'e.g., Cash deposited by...', required: false };
    }
  }, [paymentMethod]);

  useEffect(() => {
    setSelectedAccountId('');
    reset({ amount: undefined, paymentMethod: 'Cash', remarks: '', rechargeDate: getTodayDate() });
  }, [accountType, reset]);

  useEffect(() => {
    if (!portal) return;
    const fetchData = async () => {
      const [distributorData, storeData, allTxs] = await Promise.all([
        api.getDistributors(portal),
        api.getStores(),
        api.getAllWalletTransactions(portal, dateRange)
      ]);
      setDistributors(distributorData);
      setStores(storeData);
      setAllTransactions(allTxs);
    };
    fetchData();
  }, [portal, dateRange]);

  const filteredRecharges = useMemo(() => {
    return allTransactions
      .filter(tx => tx.type === TransactionType.RECHARGE)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Show only recent 10
  }, [allTransactions]);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    const accountName = selectedAccount?.name;

    if (window.confirm(`Are you sure you want to add ${formatIndianCurrency(Number(data.amount))} to ${accountName}'s wallet?`)) {
      setIsLoading(true);
      setStatusMessage(null);
      try {
        const rechargeDate = new Date(data.rechargeDate).toISOString();

        if (accountType === 'distributor') {
          await api.rechargeWallet(selectedAccountId, Number(data.amount), currentUser!.username, data.paymentMethod, data.remarks, rechargeDate, portal);
        } else {
          await api.rechargeStoreWallet(selectedAccountId, Number(data.amount), currentUser!.username, data.paymentMethod, data.remarks, rechargeDate);
        }

        setStatusMessage({ type: 'success', text: `${formatIndianCurrency(data.amount)} added to ${accountName}'s account.` });

        const [updatedDistributors, updatedStores, allTxs] = await Promise.all([
          api.getDistributors(portal),
          api.getStores(),
          api.getAllWalletTransactions(portal)
        ]);
        setDistributors(updatedDistributors);
        setStores(updatedStores);
        setAllTransactions(allTxs);

        reset({ amount: undefined, paymentMethod: 'Cash', remarks: '', rechargeDate: getTodayDate() });
        setSelectedAccountId('');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setStatusMessage({ type: 'error', text: `Failed to recharge: ${errorMessage}` });
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

  const canSubmit = isValid && selectedAccountId && amount && amount > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Wallet size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recharge Wallet</h2>
                <p className="text-sm text-slate-500">Add funds to distributor or store account</p>
              </div>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-xl">
                <Loader text="Processing..." />
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative">
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Account
                </label>
                <AccountSelector
                  accountType={accountType}
                  onAccountTypeChange={currentUser?.role === UserRole.PLANT_ADMIN ? setAccountType : undefined}
                  showTypeToggle={currentUser?.role === UserRole.PLANT_ADMIN}
                  distributors={distributors}
                  stores={stores}
                  selectedId={selectedAccountId}
                  onSelect={setSelectedAccountId}
                  disabled={isLoading}
                />
              </div>

              {/* Recharge Details */}
              {selectedAccountId && (
                <div className="space-y-5 pt-5 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      id="amount"
                      label="Amount (₹)"
                      type="number"
                      placeholder="Enter amount"
                      {...register('amount', {
                        required: 'Amount is required',
                        valueAsNumber: true,
                        min: { value: 1, message: 'Amount must be greater than zero' }
                      })}
                      error={errors.amount?.message}
                    />
                    <Input
                      id="rechargeDate"
                      label="Date"
                      type="date"
                      min={getMinDate()}
                      max={getTodayDate()}
                      {...register('rechargeDate', { required: 'Date is required' })}
                      error={errors.rechargeDate?.message}
                    />
                  </div>

                  {/* Payment Method Pills */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setValue('paymentMethod', method.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all ${paymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                            }`}
                        >
                          {method.icon}
                          <span className="text-xs font-medium">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details (UPI/Bank) */}
                  {(paymentMethod === 'UPI' || paymentMethod === 'Bank Transfer') && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        Payment Details for {paymentMethod}:
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(paymentDetails[paymentMethod]).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-amber-700">{key}:</span>
                            <span className="font-mono font-semibold text-amber-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <Input
                    id="remarks"
                    label={remarksConfig.label}
                    placeholder={remarksConfig.placeholder}
                    {...register('remarks', {
                      required: remarksConfig.required ? `${remarksConfig.label} is required` : false,
                    })}
                    error={errors.remarks?.message}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    disabled={!canSubmit}
                    className="w-full h-12 text-base font-semibold"
                  >
                    <Wallet size={18} />
                    Recharge {amount ? formatIndianCurrency(amount) : 'Wallet'}
                  </Button>
                </div>
              )}

              {/* Status Message */}
              {statusMessage && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${statusMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span className="text-sm font-medium">{statusMessage.text}</span>
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* Recent Recharges - 1/3 width */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent Recharges</h3>
            </div>

            <div className="mb-4">
              <DateRangePicker
                label=""
                value={dateRange}
                onChange={setDateRange}
              />
            </div>

            {filteredRecharges.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredRecharges.map(tx => (
                  <div key={tx.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm text-slate-800 truncate flex-1 pr-2">
                        {tx.accountName}
                      </p>
                      <span className="font-bold text-green-600 text-sm whitespace-nowrap">
                        +{formatIndianCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">
                        {tx.paymentMethod}
                      </span>
                      <span>{formatDateTimeDDMMYYYY(tx.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recharges found</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RechargeWallet;