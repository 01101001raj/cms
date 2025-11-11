
import React, { useEffect, useState } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import { api } from '../services/api';
import { SKU, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, Edit, Save, X } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { formatIndianCurrency } from '../utils/formatting';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';

type SkuFormInputs = Omit<SKU, 'id'> & { id?: string; priceWithGst?: number | string };

const ManageSKUs: React.FC = () => {
  const { userRole } = useAuth();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch } = useForm<SkuFormInputs>({
    mode: 'onBlur'
  });

  const { items: sortedSkus, requestSort, sortConfig } = useSortableData<SKU>(skus, { key: 'name', direction: 'ascending' });
  const currentGstPercentage = watch('gstPercentage');

  const fetchSKUs = () => {
      setLoading(true);
      api.getSKUs().then(data => {
          setSkus(data);
          setLoading(false);
      });
  };

  useEffect(() => {
    fetchSKUs();
  }, []);
  
  const handleEdit = (sku: SKU) => {
    setEditingSkuId(sku.id);
    const price = sku.price || 0;
    const gstRate = (sku.gstPercentage || 0) / 100;
    const priceWithGst = price > 0 ? parseFloat((price * (1 + gstRate)).toFixed(2)) : '';
    reset({ ...sku, priceWithGst });
  };
  
  const handleCancel = () => {
    setEditingSkuId(null);
    reset({ name: '', price: 0, hsnCode: '', priceWithGst: '', gstPercentage: 0 });
  };

  const onSave: SubmitHandler<SkuFormInputs> = async (formData) => {
    if (!userRole) return;
    setLoading(true);

    const { priceWithGst, ...skuDataToSave } = formData;

    try {
        const payload: Omit<SKU, 'id'> = {
            name: skuDataToSave.name!,
            price: Number(skuDataToSave.price) || 0,
            hsnCode: skuDataToSave.hsnCode,
            gstPercentage: Number(skuDataToSave.gstPercentage) || 0,
        };

        if(editingSkuId === 'new'){
            await api.addSKU(payload, userRole);
        } else {
            await api.updateSKU({ ...payload, id: editingSkuId! }, userRole);
        }
        fetchSKUs();
        handleCancel();
    } catch(err) {
        console.error("Failed to save SKU:", err);
    } finally {
        setLoading(false);
    }
  };
  
  const handleAddNew = () => {
      setEditingSkuId('new');
      reset({ name: '', price: 0, hsnCode: '', priceWithGst: '', gstPercentage: 0 });
  }

  const { onChange: onBasePriceNativeChange, ...basePriceRegister } = register('price', {
    required: 'Price is required',
    valueAsNumber: true,
    min: { value: 0, message: 'Price cannot be negative' },
  });

  const { onChange: onMrpNativeChange, ...mrpRegister } = register('priceWithGst', {
    valueAsNumber: true,
    min: { value: 0, message: 'Price cannot be negative' },
  });

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onBasePriceNativeChange(e);
      const basePrice = parseFloat(e.target.value);
      const gstRate = (currentGstPercentage || 0) / 100;
      if (!isNaN(basePrice)) {
          const mrp = basePrice * (1 + gstRate);
          setValue('priceWithGst', basePrice >= 0 ? parseFloat(mrp.toFixed(2)) : 0, { shouldValidate: true });
      } else {
          setValue('priceWithGst', 0, { shouldValidate: true });
      }
  };

  const handleMrpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onMrpNativeChange(e);
      const mrp = parseFloat(e.target.value);
      const gstRate = (currentGstPercentage || 0) / 100;
      if (!isNaN(mrp)) {
          const basePrice = mrp / (1 + gstRate);
          setValue('price', mrp >= 0 ? parseFloat(basePrice.toFixed(2)) : 0, { shouldValidate: true });
      } else {
          setValue('price', 0, { shouldValidate: true });
      }
  };

  const EditForm = () => (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <Input
        label="Product Name"
        id="name"
        {...register('name', { required: 'Name is required' })}
        error={errors.name?.message}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Price (w/o GST)"
          id="price"
          type="number"
          step="0.01"
          {...basePriceRegister}
          onChange={handleBasePriceChange}
          error={errors.price?.message}
        />
        <Input
          label="Price (incl. GST)"
          id="priceWithGst"
          type="number"
          step="0.01"
          {...mrpRegister}
          onChange={handleMrpChange}
          error={errors.priceWithGst?.message}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
            label="GST %"
            id="gstPercentage"
            type="number"
            step="0.01"
            {...register('gstPercentage', { 
                required: 'GST % is required',
                valueAsNumber: true,
                min: { value: 0, message: 'Cannot be negative' }
            })}
            error={errors.gstPercentage?.message}
        />
        <Input
            label="HSN Code"
            id="hsnCode"
            {...register('hsnCode')}
            error={errors.hsnCode?.message}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="secondary"><X size={16}/> Cancel</Button>
        <Button type="submit" variant="primary" isLoading={loading} disabled={!isValid}><Save size={16} /> Save</Button>
      </div>
    </form>
  );

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Manage Products (SKUs)</h2>
        <Button onClick={handleAddNew} disabled={!!editingSkuId} className="w-full sm:w-auto"><PlusCircle size={14}/> Add New SKU</Button>
      </div>

      {editingSkuId === 'new' && <Card className="bg-primary/5 mb-4"><EditForm /></Card>}
      
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left min-w-[900px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <SortableTableHeader label="SKU ID" sortKey="id" requestSort={requestSort} sortConfig={sortConfig} />
              <SortableTableHeader label="Product Name" sortKey="name" requestSort={requestSort} sortConfig={sortConfig} />
              <SortableTableHeader label="Price (w/o GST)" sortKey="price" requestSort={requestSort} sortConfig={sortConfig} />
              <th className="p-3 font-semibold text-contentSecondary">Price (incl. GST)</th>
              <SortableTableHeader label="GST %" sortKey="gstPercentage" requestSort={requestSort} sortConfig={sortConfig} />
              <SortableTableHeader label="HSN Code" sortKey="hsnCode" requestSort={requestSort} sortConfig={sortConfig} />
              <th className="p-3 font-semibold text-contentSecondary text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSkus.map(sku => (
              editingSkuId === sku.id ? (
                <tr key={`${sku.id}-edit`} className="bg-primary/5">
                  <td colSpan={7} className="p-4">
                    <EditForm />
                  </td>
                </tr>
              ) : (
                <tr key={sku.id} className="border-b border-border hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs text-contentSecondary">{sku.id}</td>
                  <td className="p-3">{sku.name}</td>
                  <td className="p-3">{formatIndianCurrency(sku.price)}</td>
                  <td className="p-3 font-semibold">{formatIndianCurrency(sku.price * (1 + sku.gstPercentage / 100))}</td>
                  <td className="p-3">{sku.gstPercentage}%</td>
                  <td className="p-3">{sku.hsnCode || 'N/A'}</td>
                  <td className="p-3 text-right">
                    <Button onClick={() => handleEdit(sku)} variant="secondary" size="sm" className="p-2" disabled={!!editingSkuId}><Edit size={16}/></Button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedSkus.map(sku => (
          editingSkuId === sku.id ? (
            <Card key={`${sku.id}-edit`} className="bg-primary/5"><EditForm /></Card>
          ) : (
            <Card key={sku.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-content">{sku.name}</p>
                  <p className="font-mono text-xs text-contentSecondary">{sku.id}</p>
                </div>
                <Button onClick={() => handleEdit(sku)} variant="secondary" size="sm" className="p-2 -mr-2 -mt-2" disabled={!!editingSkuId}><Edit size={16}/></Button>
              </div>
              <div className="mt-4 pt-4 border-t text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-contentSecondary">Base Price:</span>
                  <span className="font-semibold">{formatIndianCurrency(sku.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-contentSecondary">MRP (incl. {sku.gstPercentage}% GST):</span>
                  <span className="font-bold text-primary">{formatIndianCurrency(sku.price * (1 + sku.gstPercentage / 100))}</span>
                </div>
                 <div className="flex justify-between">
                  <span className="text-contentSecondary">HSN Code:</span>
                  <span className="font-mono">{sku.hsnCode || 'N/A'}</span>
                </div>
              </div>
            </Card>
          )
        ))}
      </div>

    </Card>
  );
};

export default ManageSKUs;
