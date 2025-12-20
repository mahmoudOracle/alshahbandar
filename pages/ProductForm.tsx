
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, saveProduct } from '../services/dataService';
import { Product } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

const ViewMode: React.FC<{ product: Omit<Product, 'id'> }> = ({ product }) => (
    <div className="space-y-4">
        <div>
            <p className="block text-sm font-medium text-gray-500 dark:text-gray-400">اسم المنتج</p>
            <p className="mt-1 text-lg">{product.name}</p>
        </div>
        <div>
            <p className="block text-sm font-medium text-gray-500 dark:text-gray-400">الوصف</p>
            <p className="mt-1 text-base whitespace-pre-wrap">{product.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p className="block text-sm font-medium text-gray-500 dark:text-gray-400">السعر</p>
                <p className="mt-1 text-lg">{product.price}</p>
            </div>
            <div>
                <p className="block text-sm font-medium text-gray-500 dark:text-gray-400">الكمية في المخزون</p>
                <p className="mt-1 text-lg">{product.stock}</p>
            </div>
        </div>
    </div>
);

const ProductForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { activeCompanyId } = useAuth();
    const canWrite = useCanWrite('products');
    const [product, setProduct] = useState<Omit<Product, 'id'>>({
        name: '',
        description: '',
        price: 0,
        stock: 0,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!canWrite && id) { // allow viewing
        } else if (!canWrite) {
            addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
            navigate('/products');
        }
    }, [canWrite, id, navigate, addNotification]);

    useEffect(() => {
        if (id && activeCompanyId) {
            setLoading(true);
            getProductById(activeCompanyId, id).then(productData => {
                if (productData) setProduct(productData);
                else addNotification('لم يتم العثور على المنتج.', 'error');
                setLoading(false);
            }).catch(error => {
                addNotification(mapFirestoreError(error), 'error');
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [id, activeCompanyId, addNotification]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setProduct(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!product.name.trim()) newErrors.name = 'اسم المنتج مطلوب.';
        if (product.price <= 0) newErrors.price = 'السعر يجب أن يكون أكبر من صفر.';
        if (product.stock < 0) newErrors.stock = 'الكمية لا يمكن أن تكون أقل من صفر.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            addNotification('صلاحية غير كافية.', 'error');
            return;
        }
        if (!validateForm()) {
            addNotification('يرجى تصحيح الأخطاء في النموذج.', 'error');
            return;
        }
        if (!activeCompanyId) return;
        setSaving(true);
        console.log('🟢 [PRODUCT] Saving product', { companyId: activeCompanyId, id: id || null, product });
        try {
            const result = id
                ? await saveProduct(activeCompanyId, { ...product, id })
                : await saveProduct(activeCompanyId, product);

            if (result) {
                console.log('🟢 [PRODUCT] Product saved', result);
                addNotification('تم حفظ المنتج بنجاح!', 'success');
                navigate('/products');
            } else {
                console.warn('🟡 [PRODUCT] saveProduct returned falsy', result);
                addNotification('فشل حفظ المنتج.', 'error');
            }
        } catch (error: any) {
             console.error('🔴 [PRODUCT] saveProduct error', error);
             addNotification(mapFirestoreError(error), 'error');
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) return <Card><FormSkeleton /></Card>;

    return (
        <Card header={<h2 className="text-xl font-bold">{id ? (canWrite ? 'تعديل منتج' : 'عرض منتج') : 'إضافة منتج جديد'}</h2>}>
            {!canWrite && id ? (
                <ViewMode product={product} />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset disabled={!canWrite} className="space-y-6">
                        <Input label="اسم المنتج" name="name" value={product.name} onChange={handleInputChange} required error={errors.name} />
                        <Textarea label="الوصف" name="description" value={product.description} onChange={handleInputChange} rows={3} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="السعر" type="number" name="price" value={product.price} onChange={handleInputChange} step="0.01" required error={errors.price} />
                            <Input label="الكمية في المخزون" type="number" name="stock" value={product.stock} onChange={handleInputChange} step="1" required error={errors.stock} />
                        </div>
                    </fieldset>
                    {canWrite &&
                        <div className="flex justify-start pt-4 border-t dark:border-gray-700">
                            <Button type="submit" loading={saving} size="lg" disabled={saving}>
                                حفظ المنتج
                            </Button>
                        </div>
                    }
                </form>
            )}
        </Card>
    );
};

export default ProductForm;
