
import React, { useState, useEffect, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, saveInvoice, getCustomers, getProducts } from '../services/dataService';
import { Invoice, InvoiceItem, Customer, Product, InvoiceStatus, PaymentType } from '../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

type State = Omit<Invoice, 'id' | 'subtotal' | 'total' | 'taxAmount' | 'taxRate'>;

type Action =
  | { type: 'SET_INITIAL_INVOICE'; payload: State }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof State; value: any } }
  | { type: 'SET_CUSTOMER'; payload: { customer: Customer } }
  | { type: 'SET_PAYMENT_TYPE'; payload: { paymentType: PaymentType } }
  | { type: 'SET_DATE'; payload: { date: string } }
  | { type: 'UPDATE_ITEM'; payload: { index: number; field: keyof InvoiceItem; value: any; products: Product[] } }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: { index: number } };

const initialState: State = {
  invoiceNumber: '',
  customerId: '',
  customerName: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  items: [{ id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }],
  paymentType: PaymentType.Credit,
  status: InvoiceStatus.Due,
};

function invoiceFormReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL_INVOICE':
      return action.payload;
    case 'UPDATE_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_CUSTOMER':
      return { ...state, customerId: action.payload.customer.id, customerName: action.payload.customer.name };
    case 'SET_PAYMENT_TYPE': {
      const paymentType = action.payload.paymentType;
      const status = paymentType === PaymentType.Cash ? InvoiceStatus.Paid : InvoiceStatus.Due;
      const dueDate = paymentType === PaymentType.Cash 
          ? state.date 
          : new Date(new Date(state.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { ...state, paymentType, status, dueDate };
    }
    case 'SET_DATE': {
      const date = action.payload.date;
      const dueDate = state.paymentType === PaymentType.Cash
          ? date
          : new Date(new Date(date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return { ...state, date, dueDate };
    }
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, { id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }],
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((_, i) => i !== action.payload.index),
      };
    case 'UPDATE_ITEM': {
      const { index, field, value, products } = action.payload;
      const newItems = [...state.items];
      const item = { ...newItems[index] };

      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          item.productId = product.id;
          item.productName = product.name;
          item.price = product.price;
        }
      } else {
        (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return { ...state, items: newItems };
    }
    default:
      return state;
  }
}

const InvoiceForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoice, dispatch] = useReducer(invoiceFormReducer, initialState);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    if (!canWrite && id) { // Allow viewing existing invoices
    } else if (!canWrite) { // Disallow creating new ones
      addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
      navigate('/invoices');
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
            const invoiceRes = await getInvoiceById(activeCompanyId, id);
            if(invoiceRes) {
                const { id: _id, subtotal: _subtotal, total: _total, taxAmount: _taxAmount, taxRate: _taxRate, ...invoiceData } = invoiceRes;
                dispatch({ type: 'SET_INITIAL_INVOICE', payload: invoiceData as State });
            } else {
               addNotification('Invoice not found', 'error');
            }
        }
      } catch (error: any) {
        addNotification(mapFirestoreError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, activeCompanyId, addNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'date') {
      dispatch({ type: 'SET_DATE', payload: { date: value } });
    } else if (name === 'paymentType') {
      dispatch({ type: 'SET_PAYMENT_TYPE', payload: { paymentType: value as PaymentType } });
    } else {
      dispatch({ type: 'UPDATE_FIELD', payload: { field: name as keyof State, value } });
    }
  };
  
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const customerId = e.target.value;
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
          dispatch({ type: 'SET_CUSTOMER', payload: { customer } });
      }
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { index, field, value, products } });
  };

  const addItem = () => dispatch({ type: 'ADD_ITEM' });
  const removeItem = (index: number) => dispatch({ type: 'REMOVE_ITEM', payload: { index } });
  
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = subtotal;

  const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!invoice.customerId) newErrors.customerId = 'العميل مطلوب.';
      if (!invoice.paymentType) newErrors.paymentType = 'نوع الفاتورة مطلوب.';
      if (!invoice.date) newErrors.date = 'تاريخ الفاتورة مطلوب.';
      if(invoice.items.length === 0) newErrors.items = 'يجب إضافة بند واحد على الأقل.';
      invoice.items.forEach((item, index) => {
          if(!item.productId) newErrors[`item_${index}_product`] = 'المنتج مطلوب.';
          if(item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'الكمية يجب أن تكون أكبر من صفر.';
          if(item.price < 0) newErrors[`item_${index}_price`] = 'السعر لا يمكن أن يكون سالب.';
      });

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification('صلاحية غير كافية.', 'error');
      return;
    }
    if (!validateForm()) {
        addNotification('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.', 'error');
        return;
    }
    if (!activeCompanyId) {
        addNotification('Authentication error. Cannot save invoice.', 'error');
        return;
    }
    setSaving(true);
    const invoiceToSave = { ...invoice, subtotal, total };
    
    try {
        const result = id ? await saveInvoice(activeCompanyId, { ...invoiceToSave, id }) : await saveInvoice(activeCompanyId, invoiceToSave);
        if(result) {
            addNotification(id ? 'تم تحديث الفاتورة بنجاح!' : 'تم إنشاء الفاتورة بنجاح!', 'success');
            navigate('/invoices');
        } else {
             addNotification('فشل حفظ الفاتورة.', 'error');
        }
    } catch (error: any) {
        addNotification(mapFirestoreError(error), 'error');
    }
    setSaving(false);
  };

  if (loading || settingsLoading) return <Card><FormSkeleton /></Card>;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <fieldset disabled={!canWrite} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Select label="العميل" required value={invoice.customerId} onChange={handleCustomerSelect} error={errors.customerId}
              options={customers.map(c => ({ value: c.id, label: c.name }))} placeholder="اختر عميل" />

            <Select label="نوع الفاتورة" name="paymentType" required value={invoice.paymentType} onChange={handleInputChange} error={errors.paymentType}
              options={[{value: PaymentType.Credit, label: "آجل"}, {value: PaymentType.Cash, label: "كاش"}]} />

            <Input type="date" label="تاريخ الفاتورة" name="date" required value={invoice.date} onChange={handleInputChange} error={errors.date} />
            
            <Input type="date" label="تاريخ الاستحقاق" name="dueDate" required value={invoice.dueDate} onChange={handleInputChange} disabled={invoice.paymentType === PaymentType.Cash || !canWrite} />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">بنود الفاتورة</h3>
            {invoice.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-3 p-3 border dark:border-gray-700 rounded-md items-center">
                <div className="md:col-span-4">
                    <Select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} error={errors[`item_${index}_product`]}
                        options={products.map(p => ({ value: p.id, label: `${p.name} (المتاح: ${p.stock})` }))} placeholder="اختر منتج" />
                </div>
                <div className="md:col-span-2">
                    <Input type="number" placeholder="الكمية" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} error={errors[`item_${index}_quantity`]} />
                </div>
                <div className="md:col-span-2">
                    <Input type="number" placeholder="السعر" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value))} error={errors[`item_${index}_price`]} />
                </div>
                <div className="md:col-span-3 text-lg font-medium text-right md:text-center">
                    <span className="md:hidden text-xs font-bold me-2">الإجمالي:</span>
                    {(item.quantity * item.price).toFixed(2)} {settings?.currency}
                </div>
                <div className="md:col-span-1 text-left md:text-center">
                    {canWrite && <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} aria-label={`حذف البند ${index + 1}`}><TrashIcon className="h-5 w-5 text-danger-600" /></Button>}
                </div>
              </div>
            ))}
            {canWrite && 
              <Button type="button" onClick={addItem} variant="secondary">
                  <PlusIcon className="h-4 w-4 me-2" />
                  إضافة بند
              </Button>
            }
            {errors.items && <p className="text-sm text-danger-600 mt-1">{errors.items}</p>}
          </div>
        </fieldset>

        <div className="flex flex-col md:flex-row justify-end items-start gap-6 mt-6">
          <div className="w-full md:w-1/3 space-y-2 text-lg">
            <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{subtotal.toFixed(2)} {settings?.currency}</span></div>
            <div className="flex justify-between font-bold text-xl border-t dark:border-gray-700 pt-2 mt-2"><span>الإجمالي:</span><span>{total.toFixed(2)} {settings?.currency}</span></div>
          </div>
        </div>
        
        {canWrite &&
          <div className="flex justify-start pt-6 border-t dark:border-gray-700 mt-6">
            <Button type="submit" loading={saving} size="lg">
              {id ? 'حفظ التعديلات' : 'إنشاء فاتورة'}
            </Button>
          </div>
        }
      </Card>
    </form>
  );
};

export default InvoiceForm;
