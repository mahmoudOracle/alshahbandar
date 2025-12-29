import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PurchaseForm from '../../pages/PurchaseForm';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Mock dataService functions used by the component
const createPurchaseMock = vi.fn(async () => ({}));
const getSuppliersMock = vi.fn(async () => ({ data: [{ id: 's1', supplierName: 'Sup A' }] }));
const getProductsMock = vi.fn(async () => ({ data: [{ id: 'p1', name: 'Prod A' }] }));

vi.mock('../../services/dataService', () => ({
  createPurchase: (...args: any[]) => createPurchaseMock(...args),
  getSuppliers: (...args: any[]) => getSuppliersMock(...args),
  getProducts: (...args: any[]) => getProductsMock(...args),
}));

// Mock auth and notification hooks
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ activeCompanyId: 'mock-company' }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotification: () => ({ addNotification: vi.fn() }) }));

describe('PurchaseForm', () => {
  beforeEach(() => {
    createPurchaseMock.mockClear();
    getSuppliersMock.mockClear();
    getProductsMock.mockClear();
  });

  it('renders and submits a purchase', async () => {
    const { getByText, getByRole, getByDisplayValue } = render(<PurchaseForm />);

    // Wait for lookups to load
    await waitFor(() => expect(getSuppliersMock).toHaveBeenCalled());

    // add a row and select product
    fireEvent.click(getByText('أضف صف'));
    await waitFor(() => getByRole('combobox'));
    const selects = document.querySelectorAll('select');
    // first select is supplier, second is product in row
    fireEvent.change(selects[0], { target: { value: 's1' } });
    fireEvent.change(selects[1], { target: { value: 'p1' } });

    // set quantity and unit price
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '2' } });
    fireEvent.change(inputs[1], { target: { value: '9.5' } });

    // submit
    fireEvent.click(getByText('إنشاء أمر الشراء'));

    await waitFor(() => expect(createPurchaseMock).toHaveBeenCalled());
    const callArgs = createPurchaseMock.mock.calls[0];
    expect(callArgs[0]).toBe('mock-company');
    expect(callArgs[1].items[0].productId).toBe('p1');
  });
});
