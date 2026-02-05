import React, { useState, useEffect, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, saveInvoice, getCustomers, getProducts } from '../services/dataService';
import { Invoice, InvoiceItem, Customer, Product, InvoiceStatus, PaymentType } from '../types';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import MobileNumericKeypad from '../components/MobileNumericKeypad';
import QuickAddProduct from '../components/QuickAddProduct';
import { clearProductCache } from '../services/repositories/products';
import { saveProduct } from '../services/dataService';
import { loadDraft, debounceSaveDraft, clearDraft } from '../src/utils/draftAutosave';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import SearchableSelect from '../components/ui/SearchableSelect';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';
import { getErrorMessage } from '../src/utils/errorMessage';
import { t } from '../src/i18n/t';

type State = Omit<Invoice, 'id' | 'subtotal' | 'total'>;

type Action =
  | { type: 'SET_INITIAL_INVOICE'; payload: State }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof State; value: unknown } }
  | { type: 'SET_CUSTOMER'; payload: { customer: Customer } }
  | { type: 'SET_PAYMENT_TYPE'; payload: { paymentType: PaymentType } }
  | { type: 'SET_DATE'; payload: { date: string } }
  | {
      type: 'UPDATE_ITEM';
      payload: { index: number; field: keyof InvoiceItem; value: unknown; products: Product[] };
    }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; payload: { index: number } };

const initialState: State = {
  invoiceNumber: '',
  customerId: '',
  customerName: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  items: [{ id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 }],
  paymentType: PaymentType.Credit,
  status: InvoiceStatus.Due,
  taxRate: 0,
  taxAmount: 0,
};

function invoiceFormReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_INITIAL_INVOICE':
      return action.payload;
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.payload.field]: action.payload.value as unknown as State[keyof State],
      };
    case 'SET_CUSTOMER':
      return {
        ...state,
        customerId: action.payload.customer.id,
        customerName: action.payload.customer.name,
      };
    case 'SET_PAYMENT_TYPE': {
      const paymentType = action.payload.paymentType;
      const status = paymentType === PaymentType.Cash ? InvoiceStatus.Paid : InvoiceStatus.Due;
      return { ...state, paymentType, status };
    }
    case 'SET_DATE': {
      const date = action.payload.date;
      return { ...state, date };
    }
    case 'ADD_ITEM':
      return {
        ...state,
        items: [
          ...state.items,
          { id: String(Date.now()), productId: '', productName: '', quantity: 1, price: 0 },
        ],
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
        const product = products.find((p) => p.id === value);
        if (product) {
          item.productId = product.id;
          item.productName = product.name;
          item.price = product.price;
          item.unitCost =
            typeof (product as any).averageCost === 'number'
              ? (product as any).averageCost
              : (product as any).defaultCost || 0;
        }
      } else {
        // assign with safe narrowing
        (item as Record<string, unknown>)[String(field)] =
          value as unknown as InvoiceItem[keyof InvoiceItem];
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
  const { companyId } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoice, dispatch] = useReducer(invoiceFormReducer, initialState);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keypadVisible, setKeypadVisible] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const [keypadIndex, setKeypadIndex] = useState<number | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickAddTargetIndex, setQuickAddTargetIndex] = useState<number | null>(null);
  const { settings, loading: settingsLoading } = useSettings();
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [draftData, setDraftData] = useState<unknown | null>(null);
  const draftKey = `draft:invoice:${companyId}:${id || 'new'}`;
  const [originalInvoice, setOriginalInvoice] = useState<Invoice | undefined>(undefined);

  useEffect(() => {
    if (!canWrite && id) {
      // Allow viewing existing invoices
    } else if (!canWrite) {
      // Disallow creating new ones
      addNotification(t('invoiceNoPermissionCreate'), 'error');
      navigate('/app/invoices');
    }
  }, [canWrite, id, navigate, addNotification]);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const [customersRes, productsRes] = await Promise.all([
          getCustomers(companyId),
          getProducts(companyId),
        ]);

        setCustomers(customersRes.data || []);
        setProducts(productsRes.data || []);

        if (id) {
          const invoiceRes = await getInvoiceById(companyId, id);
          if (invoiceRes) {
            setOriginalInvoice(invoiceRes); // Store original invoice
            // Keep taxRate and taxAmount if present
            const asObj = invoiceRes as unknown as Record<string, unknown>;
            const { id: _id, subtotal: _subtotal, total: _total, ...invoiceData } = asObj;
            void _id;
            void _subtotal;
            void _total;
            dispatch({ type: 'SET_INITIAL_INVOICE', payload: invoiceData as State });
          } else {
            addNotification(t('invoiceNotFound'), 'error');
          }
        }
        // Restore draft for new invoices
        if (!id) {
          try {
            const draftKey = `draft:invoice:${companyId}:new`;
            const draft = loadDraft(draftKey);
            if (draft) {
              setDraftAvailable(true);
              setDraftData(draft as unknown);
            }
          } catch (e) {
            void e;
          }
        }
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, companyId, addNotification]);

  // Autosave invoice draft to localStorage (debounced)
  useEffect(() => {
    if (!companyId) return;
    const key = `draft:invoice:${companyId}:${id || 'new'}`;
    // Save only for new or when editing without explicit save
    debounceSaveDraft(key, invoice);
    return () => {};
  }, [invoice, companyId, id]);

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

  // removed unused handler `handleCustomerSelect` (use `handleCustomerSearchSelect` instead)

  const handleCustomerSearchSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) dispatch({ type: 'SET_CUSTOMER', payload: { customer } });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: unknown) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { index, field, value, products } });
  };

  const addItem = () => dispatch({ type: 'ADD_ITEM' });
  const removeItem = (index: number) => dispatch({ type: 'REMOVE_ITEM', payload: { index } });

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = typeof invoice.taxRate === 'number' ? invoice.taxRate : 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const costTotal = invoice.items.reduce(
    (sum, item) => sum + (Number((item as any).unitCost) || 0) * (Number(item.quantity) || 0),
    0
  );
  const profit = Math.round((total - costTotal) * 100) / 100;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!invoice.customerId) newErrors.customerId = t('invoiceErrorsCustomer');
    if (!invoice.paymentType) newErrors.paymentType = t('invoiceErrorsPayment');
    if (!invoice.date) newErrors.date = t('invoiceErrorsDate');
    else if (isNaN(new Date(invoice.date).getTime())) newErrors.date = t('invoiceErrorsDateInvalid');
    if (invoice.items.length === 0) newErrors.items = t('invoiceErrorsItems');
    invoice.items.forEach((item, index) => {
      const productKey = `item_${index}_product`;
      const qtyKey = `item_${index}_quantity`;
      const priceKey = `item_${index}_price`;
      if (!item.productId) newErrors[productKey] = t('invoiceErrorsProduct');
      if (item.quantity <= 0) newErrors[qtyKey] = t('invoiceErrorsQuantity');
      if (item.price < 0) newErrors[priceKey] = t('invoiceErrorsPrice');
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRestoreDraft = () => {
    if (!draftData) return;
    dispatch({
      type: 'SET_INITIAL_INVOICE',
      payload: { ...invoice, ...(draftData as Record<string, unknown>) },
    });
    setDraftAvailable(false);
    setDraftData(null);
    addNotification(t('invoiceDraftRestored'), 'info');
  };

  const handleDiscardDraft = () => {
    try {
      clearDraft(draftKey);
    } catch (e) {
      // ignore
    }
    setDraftAvailable(false);
    setDraftData(null);
    addNotification(t('invoiceDraftDeleted'), 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification(t('invoiceNoPermissionSave'), 'error');
      return;
    }
    if (!validateForm()) {
      addNotification(t('invoiceCheckData'), 'error');
      return;
    }
    if (!companyId) {
      addNotification(t('invoiceNoCompany'), 'error');
      return;
    }
    setSaving(true);
    const invoiceToSave = { ...invoice, subtotal, total };
    try {
      const result = id
        ? await saveInvoice(companyId, { ...invoiceToSave, id }, originalInvoice)
        : await saveInvoice(companyId, invoiceToSave);
      if (result) {
        addNotification(id ? t('invoiceSaveSuccessEdit') : t('invoiceSaveSuccessNew'), 'success');
        navigate('/app/invoices');
      } else {
        addNotification(t('invoiceSaveError'), 'error');
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || settingsLoading)
    return (
      <Card>
        <FormSkeleton />
      </Card>
    );

  return (
    <div className="form-page">
      <div>
        <div className="form-title">{id ? t('invoiceFormTitleEdit') : t('invoiceFormTitleNew')}</div>
        <div className="form-subtitle">{t('invoiceFormSubtitle')}</div>
      </div>
      <form onSubmit={handleSubmit}>
      <Card>
        {draftAvailable && (
          <div className="mb-4 p-3 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <div className="flex justify-between items-center">
              <div>{t('invoiceDraftFound')}</div>
              <div className="flex gap-2">
                <Button type="button" onClick={handleRestoreDraft}>
                  {t('invoiceDraftRestore')}
                </Button>
                <Button type="button" variant="ghost" onClick={handleDiscardDraft}>
                  {t('invoiceDraftDiscard')}
                </Button>
              </div>
            </div>
          </div>
        )}
        <fieldset disabled={!canWrite} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SearchableSelect
              label={t('invoiceFormCustomer')}
              required
              value={invoice.customerId}
              onChange={handleCustomerSearchSelect}
              error={errors.customerId}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t('invoiceFormCustomerPlaceholder')}
              name="customer"
            />

            <Select
              label={t('invoiceFormPaymentType')}
              name="paymentType"
              required
              value={invoice.paymentType}
              onChange={handleInputChange}
              error={errors.paymentType}
              options={[
                { value: PaymentType.Credit, label: t('invoiceFormPaymentCredit') },
                { value: PaymentType.Cash, label: t('invoiceFormPaymentCash') },
              ]}
            />

            <DateInput
              label={t('invoiceFormDate')}
              name="date"
              required
              value={invoice.date}
              onChange={handleInputChange}
              error={errors.date}
            />

            <DateInput
              label={t('invoiceFormDueDate')}
              name="dueDate"
              value={invoice.dueDate}
              onChange={handleInputChange}
              disabled={!canWrite}
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">{t('invoiceFormItemsTitle')}</h3>
            {invoice.items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-4 p-4 border dark:border-gray-700 rounded-md"
              >
                {/* ROW 1: Product Select (full width on mobile, lg:4 on desktop) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('invoiceFormItemProduct')}
                  </label>
                  <SearchableSelect
                    value={item.productId}
                    onChange={(val) => handleItemChange(index, 'productId', val)}
                    error={errors[`item_${index}_product`]}
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${t('invoiceFormStockLabel')}: ${p.stock})`,
                    }))}
                    placeholder={t('invoiceFormProductPlaceholder')}
                    name={`product_${index}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddTargetIndex(index);
                      setQuickAddVisible(true);
                    }}
                    className="text-xs text-primary-600 hover:underline mt-1 inline-block"
                    title={t('invoiceFormQuickAddTitle')}
                  >
                    {t('invoiceFormQuickAddLabel')}
                  </button>
                </div>

                {/* ROW 1: Quantity (full width on mobile, md:2 col) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('invoiceFormItemQuantity')}
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    onFocus={() => {
                      setKeypadIndex(index);
                      setKeypadValue(String(item.quantity || ''));
                      setKeypadVisible(true);
                    }}
                    error={errors[`item_${index}_quantity`]}
                    className="text-center"
                  />
                </div>

                {/* ROW 1: Unit Cost Display (full width on mobile, md:2 col) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('invoiceFormItemUnitCost')}
                  </label>
                  <div className="text-center font-medium p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 min-h-[44px] flex items-center justify-center">
                    {(Number((item as any).unitCost) || 0).toFixed(2)} {settings?.currency}
                  </div>
                </div>

                {/* ROW 1: Price Input (full width on mobile, md:2 col) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('invoiceFormItemPrice')}
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                    error={errors[`item_${index}_price`]}
                    className="text-center"
                  />
                </div>

                {/* ROW 1: Line Total (full width on mobile, lg:1 col) */}
                <div className="col-span-1 lg:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('invoiceFormItemTotal')}
                  </label>
                  <div className="text-center font-bold p-2 bg-primary-50 dark:bg-primary-900/20 rounded min-h-[44px] flex items-center justify-center">
                    {(item.quantity * item.price).toFixed(2)} {settings?.currency}
                  </div>
                </div>

                {/* ROW 1: Delete Button (full width on mobile, lg:1 col) */}
                <div className="col-span-1 lg:col-span-1 flex items-end">
                  {canWrite && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => removeItem(index)}
                      aria-label={t('invoiceFormDeleteItem', { index: index + 1 })}
                      title={t('invoiceFormDeleteItem', { index: index + 1 })}
                    >
                      <TrashIcon className="h-5 w-5 text-danger-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {/* Mobile numeric keypad */}
            {keypadVisible && (
              <div className="md:hidden mt-4">
                <MobileNumericKeypad
                  value={keypadValue}
                  onChange={(v) => setKeypadValue(v)}
                  onConfirm={() => {
                    if (keypadIndex !== null) {
                      const val = keypadValue === '' ? 0 : Number(keypadValue);
                      handleItemChange(keypadIndex, 'quantity', Number.isNaN(val) ? 0 : val);
                    }
                    setKeypadVisible(false);
                    setKeypadIndex(null);
                  }}
                />
              </div>
            )}
            {canWrite && (
              <Button type="button" onClick={addItem} variant="secondary">
                <PlusIcon className="h-4 w-4 me-2" />
                {t('invoiceFormAddItem')}
              </Button>
            )}
            {errors.items && <p className="text-sm text-danger-600 mt-1">{errors.items}</p>}
            {/* Quick Add product panel (inline) */}
            {quickAddVisible && (
              <div className="mt-4">
                <QuickAddProduct
                  onAdd={async (p) => {
                    if (!companyId) return;
                    try {
                      const saved = await saveProduct(
                        companyId,
                        ({
                            name: p.name,
                            description: p.description || '',
                            price: p.price,
                            stock: p.stock,
                            reorderLevel: p.reorderLevel ?? 0,
                            sku: p.sku,
                          } as unknown) as Omit<import('../types').Product, 'id'>
                        );
                      // clear repo cache and refresh local list
                      try {
                        clearProductCache(companyId);
                      } catch (e) {
                        /* ignore */
                      }
                      const refreshed = await getProducts(companyId);
                      setProducts(
                        (refreshed as unknown as { data?: Product[] }).data || [
                          ...products,
                          saved as unknown as Product,
                        ]
                      );
                      // auto-select into the target item if present
                      if (quickAddTargetIndex !== null) {
                        handleItemChange(quickAddTargetIndex, 'productId', saved.id);
                      }
                      addNotification(t('productQuickAddSuccess'), 'success');
                    } catch (err: unknown) {
                      const msg = getErrorMessage(err, t('productQuickAddError'));
                      addNotification(msg, 'error');
                    } finally {
                      setQuickAddVisible(false);
                      setQuickAddTargetIndex(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
          {/* Taxes removed from invoice creation per request */}
        </fieldset>

        <div className="flex flex-col md:flex-row justify-end items-start gap-6 mt-6">
          <div className="w-full md:w-1/3 space-y-2 text-lg">
            <div className="flex justify-between">
              <span>{t('invoiceFormSubtotal')}</span>
              <span>
                {subtotal.toFixed(2)} {settings?.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('invoiceFormCostTotal')}</span>
              <span>
                {costTotal.toFixed(2)} {settings?.currency}
              </span>
            </div>
            <div className="flex justify-between font-bold text-xl border-t dark:border-gray-700 pt-2 mt-2">
              <span>{t('invoiceFormTotal')}</span>
              <span>
                {total.toFixed(2)} {settings?.currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('invoiceFormProfit')}</span>
              <span>
                {profit.toFixed(2)} {settings?.currency}
              </span>
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="form-actions">
            <Button type="submit" loading={saving} size="lg" disabled={saving}>
              {id ? t('invoiceFormSaveEdit') : t('invoiceFormSaveNew')}
            </Button>
          </div>
        )}
      </Card>
    </form>
    </div>
  );
};

export default InvoiceForm;



