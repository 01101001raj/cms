import React, { useState, useEffect } from 'react';
import { Product, ProductType, ProductStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { Plus, Edit, Trash2, Package, DollarSign, Info, History } from 'lucide-react';
import { formatIndianCurrency } from '../utils/formatting';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loader from './common/Loader';

const ProductManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'discontinued'>('active');

    // Form state
    const [formData, setFormData] = useState<Partial<Product>>({
        id: '',
        name: '',
        category: '',
        productType: ProductType.VOLUME,
        unitsPerCarton: 1,
        unitSize: 1000,
        cartonSize: 0,
        hsnCode: '',
        gstPercentage: 18,
        priceNetCarton: 0,
        priceGrossCarton: 0,
        price: 0,
        status: ProductStatus.ACTIVE,
    });

    useEffect(() => {
        loadProducts();
    }, []);

    // Auto-generate SKU based on product details
    useEffect(() => {
        // Don't auto-generate if editing existing product
        if (editingProduct) return;

        if (formData.category && formData.unitSize && formData.unitsPerCarton) {
            // Generate category abbreviation (first 3-4 letters, uppercase, remove spaces)
            const categoryAbbr = formData.category
                .replace(/[^a-zA-Z0-9]/g, '')
                .substring(0, 4)
                .toUpperCase();

            // Convert unit size to display format
            const unitSizeDisplay = formData.productType === ProductType.VOLUME
                ? `${formData.unitSize >= 1000 ? formData.unitSize / 1000 : formData.unitSize}${formData.unitSize >= 1000 ? 'L' : 'ML'}`
                : `${formData.unitSize >= 1000 ? formData.unitSize / 1000 : formData.unitSize}${formData.unitSize >= 1000 ? 'KG' : 'G'}`;

            // Generate SKU: CATEGORY-SIZE-UNITS
            const sku = `${categoryAbbr}-${unitSizeDisplay}-${formData.unitsPerCarton}PK`;

            setFormData(prev => ({ ...prev, id: sku }));
        }
    }, [formData.category, formData.unitSize, formData.unitsPerCarton, formData.productType, editingProduct]);

    // Auto-calculate carton size when units or unit size changes
    useEffect(() => {
        if (formData.unitsPerCarton && formData.unitSize) {
            const totalSize = (formData.unitsPerCarton * formData.unitSize) / 1000; // Convert to L or kg
            setFormData(prev => ({ ...prev, cartonSize: parseFloat(totalSize.toFixed(2)) }));
        }
    }, [formData.unitsPerCarton, formData.unitSize]);

    // Auto-calculate net price and gross price based on GST
    useEffect(() => {
        if (formData.priceGrossCarton && formData.gstPercentage) {
            const netPrice = formData.priceGrossCarton / (1 + formData.gstPercentage / 100);
            setFormData(prev => ({
                ...prev,
                priceNetCarton: parseFloat(netPrice.toFixed(2)),
                price: formData.priceGrossCarton // For backward compatibility
            }));
        }
    }, [formData.priceGrossCarton, formData.gstPercentage]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getSKUs();
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData(product);
        } else {
            setEditingProduct(null);
            setFormData({
                id: '',
                name: '',
                category: '',
                productType: ProductType.VOLUME,
                unitsPerCarton: 1,
                unitSize: 1000,
                cartonSize: 0,
                hsnCode: '',
                gstPercentage: 18,
                priceNetCarton: 0,
                priceGrossCarton: 0,
                price: 0,
                status: ProductStatus.ACTIVE,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            setLoading(true);
            if (editingProduct) {
                await api.updateSKU(formData as Product, currentUser.role);
            } else {
                await api.addSKU(formData as Product, currentUser.role);
            }
            handleCloseModal();
            await loadProducts();
        } catch (error) {
            console.error('Failed to save product:', error);
            alert(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        if (!currentUser) return;

        try {
            setLoading(true);
            await api.deleteSKU(productId, currentUser.role);
            await loadProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-content">Product Management</h1>
                        <p className="text-contentSecondary mt-1">Manage your product catalog with detailed specifications</p>
                    </div>
                    {activeTab === 'active' && (
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={20} /> Add New Product
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'active'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-contentSecondary hover:text-content'
                            }`}
                    >
                        Active Products
                    </button>
                    <button
                        onClick={() => setActiveTab('discontinued')}
                        className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${activeTab === 'discontinued'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-contentSecondary hover:text-content'
                            }`}
                    >
                        <History size={16} /> Discontinued Products
                    </button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs h-12 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">SKU</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Category</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Carton Size</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">HSN Code</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">GST %</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Net Price</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-500">Gross Price</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products
                                .filter(product =>
                                    activeTab === 'active'
                                        ? product.status !== ProductStatus.DISCONTINUED
                                        : product.status === ProductStatus.DISCONTINUED
                                )
                                .map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.id}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.category || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.productType || '-'}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {product.cartonSize ? `${product.cartonSize} ${product.productType === ProductType.VOLUME ? 'L' : 'kg'}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{product.hsnCode || '-'}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{product.gstPercentage}%</td>
                                        <td className="px-4 py-3 text-right text-slate-600">{formatIndianCurrency(product.priceNetCarton || 0)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">{formatIndianCurrency(product.priceGrossCarton || product.price)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${product.status === ProductStatus.ACTIVE ? 'bg-green-100 text-green-700' :
                                                product.status === ProductStatus.DISCONTINUED ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {product.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(product)}
                                                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-blue-600"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    {loading && <div className="flex justify-center p-12"><Loader text="Loading products..." /></div>}
                    {!loading && products.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <Package size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No products found. Add your first product to get started.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={handleCloseModal}>
                    <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-content">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-contentSecondary hover:text-content">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                            <div className="p-6 space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info size={20} className="text-primary" />
                                        Basic Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Product SKU/ID (Auto-generated)"
                                            value={formData.id}
                                            placeholder="Auto-generated from product details"
                                            readOnly
                                            className="bg-background"
                                        />
                                        <Input
                                            label="Product Name *"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Mineral Water (1L)"
                                            required
                                        />
                                        <Input
                                            label="Category *"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Packaged Drinking Water"
                                            required
                                        />
                                        <Select
                                            label="Product Type *"
                                            value={formData.productType}
                                            onChange={(e) => setFormData({ ...formData, productType: e.target.value as ProductType })}
                                            required
                                        >
                                            <option value={ProductType.VOLUME}>Volume (Liters)</option>
                                            <option value={ProductType.MASS}>Mass (Grams/Kg)</option>
                                        </Select>
                                    </div>
                                </div>

                                {/* Packaging Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Package size={20} className="text-primary" />
                                        Packaging Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label="Units per Carton *"
                                            type="number"
                                            value={formData.unitsPerCarton}
                                            onChange={(e) => setFormData({ ...formData, unitsPerCarton: parseInt(e.target.value) || 0 })}
                                            placeholder="12"
                                            min="1"
                                            required
                                        />
                                        <Input
                                            label={`Unit Size (${formData.productType === ProductType.VOLUME ? 'mL' : 'g'}) *`}
                                            type="number"
                                            value={formData.unitSize}
                                            onChange={(e) => setFormData({ ...formData, unitSize: parseFloat(e.target.value) || 0 })}
                                            placeholder="1000"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                        <Input
                                            label={`Total Carton Size (${formData.productType === ProductType.VOLUME ? 'L' : 'kg'})`}
                                            type="number"
                                            value={formData.cartonSize}
                                            readOnly
                                            className="bg-background"
                                        />
                                    </div>
                                </div>

                                {/* Tax Information */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <DollarSign size={20} className="text-primary" />
                                        Tax & Pricing Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="HSN Code *"
                                            value={formData.hsnCode}
                                            onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                            placeholder="22019090"
                                            required
                                        />
                                        <Input
                                            label="GST Rate (%) *"
                                            type="number"
                                            value={formData.gstPercentage}
                                            onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                                            placeholder="18"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            required
                                        />
                                        <Input
                                            label="Gross Price per Carton (₹) *"
                                            type="number"
                                            value={formData.priceGrossCarton}
                                            onChange={(e) => setFormData({ ...formData, priceGrossCarton: parseFloat(e.target.value) || 0 })}
                                            placeholder="180.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                        <Input
                                            label="Net Price per Carton (₹)"
                                            type="number"
                                            value={formData.priceNetCarton}
                                            readOnly
                                            className="bg-background"
                                        />
                                        <Select
                                            label="Status *"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
                                            required
                                        >
                                            <option value={ProductStatus.ACTIVE}>Active</option>
                                            <option value={ProductStatus.DISCONTINUED}>Discontinued</option>
                                            <option value={ProductStatus.OUT_OF_STOCK}>Out of Stock</option>
                                        </Select>
                                    </div>
                                </div>

                            </div>

                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
