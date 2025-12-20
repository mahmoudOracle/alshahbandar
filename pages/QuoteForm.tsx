
import React, { useState, useEffect, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuoteById, saveQuote, getCustomers, getProducts } from '../services/dataService';
import { Quote, QuoteItem, Customer, Product, QuoteStatus } from '../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';

type State = Omit<Quote, 'id' | 'subtotal' | 'total' | 'taxAmount'>;

type Action =
  | { type: 'SET_INITIAL_QUOTE'; payload: State }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof State; value: any } }
  | { type: 'SET_CUSTOMER'; payload: { customer: Customer } }
  | { type: 'SET_TAX'; payload: { taxRate: number } }
  | { type: 'UPDATE_ITEM'; payload: { index: number; field: keyof QuoteItem; value: any; products: Product[] } }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: { index: number } };

const initialState: State = {
  quoteNumber: '',
  customerId: '',
  customerName: '',
  date: new Date().toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  items: [{ id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }],
  status: QuoteStatus.Draft,
  taxRate: 0,
};

function quoteFormReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL_QUOTE':
      return action.payload;
    case 'UPDATE_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_CUSTOMER':
      return { ...state, customerId: action.payload.customer.id, customerName: action.payload.customer.name };
    case 'SET_TAX':
        return { ...state, taxRate: action.payload.taxRate };
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

const QuoteForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('quotes');
  const [quote, dispatch] = useReducer(quoteFormReducer, initialState);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    if (!canWrite && id) {
        // Allow viewing
    } else if (!canWrite) {
        addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
        navigate('/quotes');
    }
  }, [canWrite, id, navigate, addNotification]);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const [customersData, productsData] = await Promise.all([getCustomers(activeCompanyId), getProducts(activeCompanyId)]);
        setCustomers(customersData.data || []);
        setProducts(productsData.data || []);
        if (id) {
          const existingQuote = await getQuoteById(activeCompanyId, id);
          if (existingQuote) {
              const { id: _id, subtotal: _sub, total: _t, taxAmount: _ta, ...quoteData } = existingQuote;
              dispatch({ type: 'SET_INITIAL_QUOTE', payload: quoteData });
          }
        }
      } catch (error: any) {
        addNotification(mapFirestoreError(error), 'error');
      }
      setLoading(false);
    };
    fetchData();
  }, [id, activeCompanyId, addNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'taxRate') {
      dispatch({ type: 'SET_TAX', payload: { taxRate: parseFloat(value) } });
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

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { index, field, value, products } });
  };

  const addItem = () => dispatch({ type: 'ADD_ITEM' });
  const removeItem = (index: number) => dispatch({ type: 'REMOVE_ITEM', payload: { index } });
  
  const subtotal = quote.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = subtotal * ((quote.taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !canWrite) return;
    setLoading(true);
    try {
        const quoteToSave = { ...quote, subtotal, total, taxAmount };
        if (id) {
            await saveQuote(activeCompanyId, { ...quoteToSave, id });
        } else {
            await saveQuote(activeCompanyId, quoteToSave);
        }
        addNotification(id ? 'تم تحديث عرض السعر بنجاح!' : 'تم إنشاء عرض السعر بنجاح!', 'success');
        navigate('/quotes');
    } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
    } finally {
        setLoading(false);
    }
  };

  if (!canWrite && id) return <div>لا يمكنك تعديل هذا.</div>;
  if ((loading && !customers.length) || settingsLoading) return <div>جاري التحميل...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العميل</label>
          <select value={quote.customerId} onChange={handleCustomerSelect} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
            <option value="">اختر عميل</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ العرض</label>
          <input type="date" name="date" value={quote.date} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الانتهاء</label>
          <input type="date" name="expiryDate" value={quote.expiryDate} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">البنود</h3>
        {quote.items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-3 p-3 border rounded-md items-center">
             <div className="md:col-span-4">
                <label className="md:hidden text-xs font-bold">المنتج</label>
                <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">اختر منتج</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="md:hidden text-xs font-bold">الكمية</label>
                <input type="number" placeholder="الكمية" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="md:col-span-2">
                <label className="md:hidden text-xs font-bold">السعر</label>
                <input type="number" placeholder="السعر" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div className="md:col-span-3 text-lg font-medium text-right md:text-center">
                <span className="md:hidden text-xs font-bold me-2">الإجمالي:</span>
                {(item.quantity * item.price).toFixed(2)} {settings?.currency}
            </div>
            <div className="md:col-span-1 text-left md:text-center">
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="h-5 w-5" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} className="flex items-center mt-4 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-gray-700">
            <PlusIcon className="h-4 w-4 me-2" />
            إضافة بند
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
         <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الضريبة</label>
            <select name="taxRate" value={quote.taxRate} onChange={handleInputChange} className="mt-1 block w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600">
                <option value="0">بدون ضريبة</option>
                {settings?.taxes.filter(t => t.rate > 0).map(tax => (
                    <option key={tax.id} value={tax.rate}>{tax.name} ({tax.rate}%)</option>
                ))}
            </select>
        </div>
        <div className="w-full md:w-1/3 space-y-2 text-lg">
          <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{subtotal.toFixed(2)} {settings?.currency}</span></div>
          <div className="flex justify-between"><span>الضريبة ({quote.taxRate || 0}%):</span><span>{taxAmount.toFixed(2)} {settings?.currency}</span></div>
          <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2"><span>الإجمالي:</span><span>{total.toFixed(2)} {settings?.currency}</span></div>
        </div>
      </div>
      
      <div className="flex justify-start pt-6 border-t">
        <button type="submit" disabled={loading} className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
          {loading ? 'جاري الحفظ...' : id ? 'حفظ التعديلات' : 'إنشاء عرض السعر'}
        </button>
      </div>
    </form>
  );
};

export default QuoteForm;
