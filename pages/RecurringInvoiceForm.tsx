
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecurringInvoiceById, saveRecurringInvoice, getCustomers, getProducts } from '../services/dataService';
import { RecurringInvoice, InvoiceItem, Customer, Product, Frequency } from '../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import { FormSkeleton } from '../components/ui/FormSkeleton';

const RecurringInvoiceForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { activeCompanyId } = useAuth();
    const canWrite = useCanWrite('recurring');
    
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { settings } = useSettings();

    const [recInvoice, setRecInvoice] = useState<Omit<RecurringInvoice, 'id'>>({
        customerId: '',
        customerName: '',
        items: [{ id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }],
        frequency: Frequency.Monthly,
        startDate: new Date().toISOString().split('T')[0],
        nextDueDate: new Date().toISOString().split('T')[0],
        endDate: '',
        taxRate: 0,
        autoSend: false,
    });

    useEffect(() => {
        if (!canWrite && id) {
             // allow viewing
        } else if (!canWrite) {
            addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
            navigate('/recurring');
        }
    }, [canWrite, id, navigate, addNotification]);

    useEffect(() => {
        const fetchData = async () => {
            if (!activeCompanyId) return;
            setLoading(true);
            try {
                const [customersRes, productsRes] = await Promise.all([
                    getCustomers(activeCompanyId),
                    getProducts(activeCompanyId),
                ]);
                setCustomers(customersRes.data || []);
                setProducts(productsRes.data || []);

                if (id) {
                    const data = await getRecurringInvoiceById(activeCompanyId, id);
                    if (data) {
                        const { id: _id, ...rest } = data;
                        setRecInvoice(rest);
                    } else {
                        addNotification('الفاتورة المتكررة غير موجودة.', 'error');
                        navigate('/recurring');
                    }
                }
            } catch (error) {
                addNotification(mapFirestoreError(error), 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, activeCompanyId, addNotification, navigate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let finalValue: any = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        }
        if (type === 'number') {
            const parsed = parseFloat(value);
            finalValue = Number.isFinite(parsed) ? parsed : 0;
        }

        setRecInvoice(prev => {
            const newState = { ...prev, [name]: finalValue };
            if (name === 'startDate') {
                newState.nextDueDate = value; // Set next due date to start date initially
            }
            return newState;
        });
    };

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const customerId = e.target.value;
        const customer = customers.find(c => c.id === customerId);
        if(customer) {
            setRecInvoice(prev => ({...prev, customerId: customer.id, customerName: customer.name}));
        }
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...recInvoice.items];
        const item = { ...newItems[index] };

        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                item.productId = product.id;
                item.productName = product.name;
                item.price = product.price;
            } else {
                item.productId = '';
                item.productName = '';
                item.price = 0;
            }
        } else if (field === 'quantity' || field === 'price') {
            const parsed = Number(value);
            (item as any)[field] = Number.isFinite(parsed) ? parsed : 0;
        } else {
            (item as any)[field] = value;
        }

        newItems[index] = item;
        setRecInvoice(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setRecInvoice(prev => ({
            ...prev,
            items: [...prev.items, { id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setRecInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const validateInvoice = () => {
        if (!recInvoice.customerId) {
            addNotification('الرجاء اختيار عميل.', 'error');
            return false;
        }
        if (!recInvoice.items || recInvoice.items.length === 0) {
            addNotification('يجب إضافة بند واحد على الأقل.', 'error');
            return false;
        }
        for (const it of recInvoice.items) {
            if (!it.productId) {
                addNotification('جميع البنود يجب أن تحتوي على منتج.', 'error');
                return false;
            }
            if (!(Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0)) {
                addNotification('كمية البنود يجب أن تكون أكبر من صفر.', 'error');
                return false;
            }
            if (!(Number.isFinite(Number(it.price)) && Number(it.price) >= 0)) {
                addNotification('سعر البنود غير صالح.', 'error');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite || !activeCompanyId) return;
        if (saving) return; // prevent double submit

        if (!validateInvoice()) return;

        setSaving(true);
        try {
            console.debug('[RecurringInvoice] saving', { id, company: activeCompanyId });
            const payload = id ? { ...recInvoice, id } : recInvoice;
            const result = await saveRecurringInvoice(activeCompanyId, payload as any);

            if (result) {
                addNotification('تم حفظ الفاتورة المتكررة بنجاح!', 'success');
                navigate('/recurring');
            } else {
                throw new Error('Save operation did not return a result.');
            }
        } catch (error) {
            console.error('[RecurringInvoice] save error', error);
            addNotification(mapFirestoreError(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Card><FormSkeleton /></Card>;

    const subtotal = recInvoice.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    const taxAmount = subtotal * ((recInvoice.taxRate || 0) / 100);
    const total = subtotal + taxAmount;

    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={!canWrite} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Select label="العميل" value={recInvoice.customerId} onChange={handleCustomerChange} required
                            options={customers.map(c => ({ value: c.id, label: c.name }))} placeholder="اختر العميل" />
                         <Select label="التكرار" name="frequency" value={recInvoice.frequency} onChange={handleInputChange} required
                            options={Object.values(Frequency).map(f => ({ value: f, label: f }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DateInput label="تاريخ البدء" name="startDate" value={recInvoice.startDate} onChange={handleInputChange} required />
                        <DateInput label="تاريخ الانتهاء (اختياري)" name="endDate" value={recInvoice.endDate || ''} onChange={handleInputChange} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">البنود</h3>
                        {recInvoice.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-3 p-3 border dark:border-gray-700 rounded-md items-center">
                                <div className="md:col-span-4">
                                    <Select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} 
                                        options={products.map(p => ({ value: p.id, label: p.name }))} placeholder="اختر المنتج" />
                                </div>
                                <div className="md:col-span-2">
                                    <Input type="number" placeholder="الكمية" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                                </div>
                                <div className="md:col-span-2">
                                    <Input type="number" placeholder="السعر" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value))} />
                                </div>
                                <div className="md:col-span-3 text-lg font-medium text-right md:text-center">
                                    {(Number(item.quantity) * Number(item.price)).toFixed(2)} {settings?.currency}
                                </div>
                                <div className="md:col-span-1 text-left md:text-center">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}><TrashIcon className="h-5 w-5 text-danger-600" /></Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" onClick={addItem} variant="secondary">
                            <PlusIcon className="h-4 w-4 me-2" /> إضافة بند
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <div className="w-full md:w-1/3 space-y-2 text-lg">
                           <div className="flex justify-between font-bold text-xl border-t dark:border-gray-700 pt-2 mt-2"><span>الإجمالي:</span><span>{total.toFixed(2)} {settings?.currency}</span></div>
                        </div>
                    </div>
                </fieldset>
                
                {canWrite &&
                    <div className="flex justify-start pt-6 border-t dark:border-gray-700 mt-6">
                        <Button type="submit" loading={saving} size="lg" disabled={saving || loading}>
                            {id ? 'حفظ التعديلات' : 'إنشاء جدول'}
                        </Button>
                    </div>
                }
            </form>
        </Card>
    );
};

export default RecurringInvoiceForm;
