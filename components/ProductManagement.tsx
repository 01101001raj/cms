import React, { useState, useEffect } from 'react';
import { Product, ProductType, ProductStatus } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import { Plus, Edit, Trash2, Package, DollarSign, Info } from 'lucide-react';
import { formatIndianCurrency } from '../utils/formatting';
import { api } from '../services/api';

const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);

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
        cogsPerCarton: 0,
        priceNetCarton: 0,
        priceGrossCarton: 0,
        price: 0,
        status: ProductStatus.ACTIVE,
    });

    useEffect(() => {
        loadProducts();
    }, []);

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
                cogsPerCarton: 0,
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
        try {
            setLoading(true);
            if (editingProduct) {
                // await api.updateSKU(formData as Product);
                alert('Update functionality coming soon!');
            } else {
                // await api.createSKU(formData as Product);
                alert('Create functionality coming soon!');
            }
            handleCloseModal();
            loadProducts();
        } catch (error) {
            console.error('Failed to save product:', error);
            alert('Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            setLoading(true);
            // await api.deleteSKU(productId);
            alert('Delete functionality coming soon!');
            loadProducts();
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('Failed to delete product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-content">Product Management</h1>
                    <p className="text-contentSecondary mt-1">Manage your product catalog with detailed specifications</p>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Add New Product
                </Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-3 text-left font-semibold text-contentSecondary">SKU</th>
                                <th className="p-3 text-left font-semibold text-contentSecondary">Product Name</th>
                                <th className="p-3 text-left font-semibold text-contentSecondary">Category</th>
                                <th className="p-3 text-left font-semibold text-contentSecondary">Type</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">Carton Size</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">HSN Code</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">GST %</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">COGS</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">Net Price</th>
                                <th className="p-3 text-right font-semibold text-contentSecondary">Gross Price</th>
                                <th className="p-3 text-left font-semibold text-contentSecondary">Status</th>
                                <th className="p-3 text-center font-semibold text-contentSecondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-contentSecondary">
                                        <Package size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>No products found. Add your first product to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="border-b border-border hover:bg-background">
                                        <td className="p-3 font-mono text-sm">{product.id}</td>
                                        <td className="p-3 font-medium">{product.name}</td>
                                        <td className="p-3 text-sm">{product.category || '-'}</td>
                                        <td className="p-3 text-sm">{product.productType || '-'}</td>
                                        <td className="p-3 text-right text-sm">
                                            {product.cartonSize ? `${product.cartonSize} ${product.productType === ProductType.VOLUME ? 'L' : 'kg'}` : '-'}
                                        </td>
                                        <td className="p-3 text-right text-sm font-mono">{product.hsnCode || '-'}</td>
                                        <td className="p-3 text-right text-sm">{product.gstPercentage}%</td>
                                        <td className="p-3 text-right text-sm">{formatIndianCurrency(product.cogsPerCarton || 0)}</td>
                                        <td className="p-3 text-right text-sm">{formatIndianCurrency(product.priceNetCarton || 0)}</td>
                                        <td className="p-3 text-right font-medium">{formatIndianCurrency(product.priceGrossCarton || product.price)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                product.status === ProductStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                                                product.status === ProductStatus.DISCONTINUED ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {product.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(product)}
                                                    className="p-1 hover:bg-background rounded"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} className="text-primary" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1 hover:bg-background rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} className="text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                                            label="Product SKU/ID *"
                                            value={formData.id}
                                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                            placeholder="WB-1L-12PK"
                                            required
                                            disabled={!!editingProduct}
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
                                            label="COGS per Carton (₹) *"
                                            type="number"
                                            value={formData.cogsPerCarton}
                                            onChange={(e) => setFormData({ ...formData, cogsPerCarton: parseFloat(e.target.value) || 0 })}
                                            placeholder="80.00"
                                            min="0"
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

                                {/* Profit Margin Calculation Display */}
                                {formData.cogsPerCarton > 0 && formData.priceNetCarton > 0 && (
                                    <div className="bg-primary/10 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2">Profit Analysis</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-contentSecondary">COGS</p>
                                                <p className="font-semibold">{formatIndianCurrency(formData.cogsPerCarton)}</p>
                                            </div>
                                            <div>
                                                <p className="text-contentSecondary">Net Price</p>
                                                <p className="font-semibold">{formatIndianCurrency(formData.priceNetCarton)}</p>
                                            </div>
                                            <div>
                                                <p className="text-contentSecondary">Gross Profit</p>
                                                <p className="font-semibold text-green-600">
                                                    {formatIndianCurrency(formData.priceNetCarton - formData.cogsPerCarton)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-contentSecondary">Margin %</p>
                                                <p className="font-semibold text-green-600">
                                                    {(((formData.priceNetCarton - formData.cogsPerCarton) / formData.priceNetCarton) * 100).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
