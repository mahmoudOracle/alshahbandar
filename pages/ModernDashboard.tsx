import React, { useEffect, useState } from 'react';
import { useDataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../src/i18n/t';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import PageContainer from '../src/layout/PageContainer';

const ModernDashboard: React.FC = () => {
  const { companyId } = useAuth();
  const dataService = useDataService();
  const { settings } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayExpenses: 0,
    totalProfit: 0,
    comparison: 0,
    recentInvoices: [] as any[],
    recentExpenses: [] as any[],
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load invoices for today
        const invoices = await dataService.listInvoices(companyId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayInvoices = invoices.filter(inv => {
          const invDate = inv.createdAt?.toDate?.() || new Date(inv.createdAt);
          invDate.setHours(0, 0, 0, 0);
          return invDate.getTime() === today.getTime();
        });
        
        const todaySales = todayInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        
        // Load expenses for today
        const expenses = await dataService.listExpenses(companyId);
        const todayExpenses = expenses
          .filter(exp => {
            const expDate = exp.createdAt?.toDate?.() || new Date(exp.createdAt);
            expDate.setHours(0, 0, 0, 0);
            return expDate.getTime() === today.getTime();
          })
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        const profit = todaySales - todayExpenses;
        
        setStats({
          todaySales,
          todayExpenses,
          totalProfit: profit,
          comparison: todaySales > 0 ? ((profit / todaySales) * 100).toFixed(1) : 0,
          recentInvoices: invoices.slice(0, 5),
          recentExpenses: expenses.slice(0, 5),
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) loadDashboardData();
  }, [companyId, dataService]);

  if (loading) {
    return (
      <PageContainer title={t('dashboardTitle')}>
        <div className="grid grid-3 gap-lg">
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton" style={{ height: '120px' }} />
          ))}
        </div>
      </PageContainer>
    );
  }

  const currencySymbol = settings?.currency?.symbol || 'ر.ع';

  return (
    <PageContainer 
      title={t('dashboardTitle')}
      subtitle={t('dashboardHelper')}
    >
      {/* KEY METRICS */}
      <div className="grid grid-3 mb-2xl">
        {/* Sales Card */}
        <div className="stat-card">
          <div className="stat-card-label">{t('dashboardSalesToday')}</div>
          <div className="stat-card-value">
            {currencySymbol} {stats.todaySales.toFixed(2)}
          </div>
          <div className="stat-card-change positive">
            <ArrowUpIcon style={{ width: '16px', height: '16px' }} />
            <span>↑ 12% vs yesterday</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="stat-card">
          <div className="stat-card-label">{t('dashboardExpensesToday')}</div>
          <div className="stat-card-value" style={{ color: 'var(--danger)' }}>
            {currencySymbol} {stats.todayExpenses.toFixed(2)}
          </div>
          <div className="stat-card-change negative">
            <ArrowDownIcon style={{ width: '16px', height: '16px' }} />
            <span>↓ 5% vs yesterday</span>
          </div>
        </div>

        {/* Profit Card */}
        <div className="stat-card">
          <div className="stat-card-label">{t('dashboardProfitToday')}</div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>
            {currencySymbol} {stats.totalProfit.toFixed(2)}
          </div>
          <div className="stat-card-change positive">
            <span>Margin: {stats.comparison}%</span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="grid grid-2 gap-xl">
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dashboardLatestInvoices')}</h3>
            <a href="/app/invoices" className="btn btn-sm btn-ghost">
              {t('commonViewAll')}
            </a>
          </div>
          <div className="card-body">
            {stats.recentInvoices.length > 0 ? (
              stats.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="list-row">
                  <div className="list-row-content">
                    <div className="list-row-title">Invoice #{invoice.invoiceNumber}</div>
                    <div className="list-row-subtitle">
                      {invoice.customerName} • {invoice.createdAt?.toDate?.().toLocaleDateString()}
                    </div>
                  </div>
                  <div className="list-row-value">
                    {currencySymbol} {(invoice.totalAmount || 0).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('dashboardNoInvoices')}
              </p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('dashboardLatestExpenses')}</h3>
            <a href="/app/expenses" className="btn btn-sm btn-ghost">
              {t('commonViewAll')}
            </a>
          </div>
          <div className="card-body">
            {stats.recentExpenses.length > 0 ? (
              stats.recentExpenses.map((expense) => (
                <div key={expense.id} className="list-row">
                  <div className="list-row-content">
                    <div className="list-row-title">{expense.description}</div>
                    <div className="list-row-subtitle">
                      {expense.category} • {expense.createdAt?.toDate?.().toLocaleDateString()}
                    </div>
                  </div>
                  <div className="list-row-value" style={{ color: 'var(--danger)' }}>
                    -{currencySymbol} {(expense.amount || 0).toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No recent expenses
              </p>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card mt-2xl">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <a href="/app/invoices/new" className="btn btn-primary">
              {t('dashboardNewInvoice')}
            </a>
            <a href="/app/expenses/new" className="btn btn-secondary">
              {t('dashboardNewExpense')}
            </a>
            <a href="/app/customers/new" className="btn btn-ghost">
              Add Customer
            </a>
            <a href="/app/products/new" className="btn btn-ghost">
              Add Product
            </a>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ModernDashboard;
