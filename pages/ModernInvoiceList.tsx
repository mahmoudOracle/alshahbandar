import React, { useEffect, useState } from 'react';
import { useDataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../src/i18n/t';
import { useSettings } from '../contexts/SettingsContext';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import PageContainer from '../src/layout/PageContainer';

const ModernInvoiceList: React.FC = () => {
  const { companyId } = useAuth();
  const dataService = useDataService();
  const { settings } = useSettings();
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await dataService.listInvoices(companyId);
        setInvoices(data.sort((a, b) => 
          (b.createdAt?.toDate?.() || new Date(b.createdAt)).getTime() - 
          (a.createdAt?.toDate?.() || new Date(a.createdAt)).getTime()
        ));
      } catch (err) {
        console.error('Invoice load error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) loadInvoices();
  }, [companyId, dataService]);

  const currencySymbol = settings?.currency?.symbol || 'ر.ع';
  
  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === filter);

  const getStatusBadge = (status: string) => {
    const badgeClass = {
      paid: 'badge-success',
      pending: 'badge-warning',
      overdue: 'badge-danger',
      draft: 'badge-secondary',
    }[status] || 'badge-secondary';

    return (
      <span className={`badge ${badgeClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <PageContainer 
      title={t('navInvoices')}
      subtitle="Manage all your invoices in one place"
    >
      {/* FILTERS & ACTIONS */}
      <div className="card mb-xl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            {['all', 'paid', 'pending', 'overdue'].map(s => (
              <button 
                key={s}
                className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <a href="/app/invoices/new" className="btn btn-primary btn-lg">
            + New Invoice
          </a>
        </div>
      </div>

      {/* INVOICES TABLE/LIST */}
      {loading ? (
        <div className="card skeleton" style={{ height: '400px' }} />
      ) : filteredInvoices.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>#Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold">{invoice.invoiceNumber}</td>
                  <td>{invoice.customerName}</td>
                  <td>{invoice.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</td>
                  <td className="font-bold" style={{ color: 'var(--primary)' }}>
                    {currencySymbol} {(invoice.totalAmount || 0).toFixed(2)}
                  </td>
                  <td>{getStatusBadge(invoice.status || 'draft')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                      <a 
                        href={`/app/invoices/${invoice.id}`}
                        className="btn btn-sm btn-ghost"
                        title="View"
                      >
                        <EyeIcon style={{ width: '16px', height: '16px' }} />
                      </a>
                      <a 
                        href={`/app/invoices/edit/${invoice.id}`}
                        className="btn btn-sm btn-ghost"
                        title="Edit"
                      >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                      </a>
                      <button 
                        className="btn btn-sm btn-danger"
                        title="Delete"
                        onClick={() => {
                          if (confirm('Delete this invoice?')) {
                            dataService.deleteInvoice(invoice.id).then(() => {
                              setInvoices(invoices.filter(i => i.id !== invoice.id));
                            });
                          }
                        }}
                      >
                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            No invoices found
          </p>
          <a href="/app/invoices/new" className="btn btn-primary">
            Create First Invoice
          </a>
        </div>
      )}

      {/* PAGINATION */}
      {filteredInvoices.length > 10 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-2xl)' }}>
          <button className="btn btn-secondary">{t('commonPrev')}</button>
          <span style={{ padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            Page 1 of {Math.ceil(filteredInvoices.length / 10)}
          </span>
          <button className="btn btn-secondary">{t('commonNext')}</button>
        </div>
      )}
    </PageContainer>
  );
};

export default ModernInvoiceList;
