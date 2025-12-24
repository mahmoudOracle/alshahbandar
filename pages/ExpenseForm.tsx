
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExpenseById, saveExpense, getExpenseCategories, saveExpenseCategory, getVendors, saveVendor } from '../services/dataService';
import { Expense, StoredExpenseCategory, StoredVendor } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

const ExpenseForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { activeCompanyId } = useAuth();
    const canWrite = useCanWrite('expenses');
    
    const [expense, setExpense] = useState<Omit<Expense, 'id'>>({
        date: new Date().toISOString().split('T')[0],
        category: '',
        vendor: '',
        description: '',
        amount: 0,
    });
    
    const [categories, setCategories] = useState<StoredExpenseCategory[]>([]);
    const [vendors, setVendors] = useState<StoredVendor[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingVendor, setIsAddingVendor] = useState(false);
    const [newVendor, setNewVendor] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!canWrite && id) { // allow viewing
        } else if (!canWrite) {
            addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
            navigate('/expenses');
        }
    }, [canWrite, id, navigate, addNotification]);

    const fetchDropdownData = async () => {
        if (!activeCompanyId) return;
        try {
            const [catsRes, vensRes] = await Promise.all([
                getExpenseCategories(activeCompanyId),
                getVendors(activeCompanyId)
            ]);
            setCategories(catsRes.data || []);
            setVendors(vensRes.data || []);
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }

    useEffect(() => {
        fetchDropdownData();
        if (id && activeCompanyId) {
            setLoading(true);
            getExpenseById(activeCompanyId, id).then(expenseData => {
                if (expenseData) setExpense(expenseData);
                else addNotification('لم يتم العثور على المصروف.', 'error');
                setLoading(false);
            }).catch(error => {
                addNotification(mapFirestoreError(error), 'error');
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [id, activeCompanyId, addNotification]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setExpense(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleAddNewCategory = async () => {
        if (!activeCompanyId || !newCategory.trim()) return;
        try {
            const result = await saveExpenseCategory(activeCompanyId, { name: newCategory.trim() });
            if (result) {
                addNotification('تمت إضافة الفئة بنجاح!', 'success');
                setNewCategory('');
                setIsAddingCategory(false);
                await fetchDropdownData();
                setExpense(prev => ({...prev, category: result.name}));
            } else {
                addNotification('فشل في إضافة الفئة.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }
    
    const handleAddNewVendor = async () => {
        if (!activeCompanyId || !newVendor.trim()) return;
        try {
            const result = await saveVendor(activeCompanyId, { name: newVendor.trim() });
            if (result) {
                addNotification('تمت إضافة المورد بنجاح!', 'success');
                setNewVendor('');
                setIsAddingVendor(false);
                await fetchDropdownData();
                setExpense(prev => ({...prev, vendor: result.name}));
            } else {
                addNotification('فشل في إضافة المورد.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }
    
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!expense.date) newErrors.date = 'هذا الحقل مطلوب.';
        if (!expense.category) newErrors.category = 'هذا الحقل مطلوب.';
        if (!expense.vendor.trim()) newErrors.vendor = 'هذا الحقل مطلوب.';
        if (expense.amount <= 0) newErrors.amount = 'المبلغ يجب أن يكون أكبر من صفر.';
        
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
            addNotification('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }
        if (!activeCompanyId) return;
        setSaving(true);
        try {
            const result = id
                ? await saveExpense(activeCompanyId, { ...expense, id })
                : await saveExpense(activeCompanyId, expense);
                
            if(result) {
                addNotification('تم حفظ المصروف بنجاح!', 'success');
                navigate('/expenses');
            } else {
                addNotification('فشل حفظ المصروف.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
        setSaving(false);
    };
    
    if (loading && id) return <Card><FormSkeleton /></Card>;

    return (
        <Card header={<h2 className="text-xl font-bold">{id ? 'عرض مصروف' : 'إضافة مصروف جديد'}</h2>}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={!canWrite} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="التاريخ" type="date" name="date" value={expense.date} onChange={handleInputChange} required error={errors.date} />
                        <Input label="المبلغ" type="number" name="amount" value={expense.amount} onChange={handleInputChange} step="0.01" required error={errors.amount} />
                    </div>
                    <div>
                        <Select label="الفئة" name="category" value={expense.category} onChange={handleInputChange} required error={errors.category}
                            options={categories.map(c => ({ value: c.name, label: c.name }))} placeholder="اختر فئة" />
                        {canWrite && !isAddingCategory ? (
                            <button type="button" onClick={() => setIsAddingCategory(true)} className="text-sm text-primary-600 hover:underline mt-2">➕ إضافة فئة جديدة</button>
                        ) : canWrite && (
                            <div className="flex gap-2 mt-2">
                                <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="اسم الفئة الجديدة" />
                                <Button type="button" onClick={handleAddNewCategory} size="sm">حفظ</Button>
                                <Button type="button" onClick={() => setIsAddingCategory(false)} variant="secondary" size="sm">إلغاء</Button>
                            </div>
                        )}
                    </div>
                    <div>
                        <Input label="البائع / المورد" name="vendor" list="vendors" value={expense.vendor} onChange={handleInputChange} required error={errors.vendor} />
                        <datalist id="vendors">
                            {vendors.map(ven => <option key={ven.id} value={ven.name} />)}
                        </datalist>
                         {canWrite && !isAddingVendor ? (
                            <button type="button" onClick={() => setIsAddingVendor(true)} className="text-sm text-primary-600 hover:underline mt-2">➕ إضافة مورد جديد</button>
                        ) : canWrite && (
                            <div className="flex gap-2 mt-2">
                                <Input value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder="اسم المورد الجديد" />
                                <Button type="button" onClick={handleAddNewVendor} size="sm">حفظ</Button>
                                <Button type="button" onClick={() => setIsAddingVendor(false)} variant="secondary" size="sm">إلغاء</Button>
                            </div>
                        )}
                    </div>
                    <Textarea label="الوصف" name="description" value={expense.description} onChange={handleInputChange} rows={3} />
                </fieldset>

                {canWrite && 
                    <div className="flex justify-start pt-4 border-t dark:border-gray-700">
                        <Button type="submit" loading={saving} size="lg">
                            حفظ المصروف
                        </Button>
                    </div>
                }
            </form>
        </Card>
    );
};

export default ExpenseForm;
