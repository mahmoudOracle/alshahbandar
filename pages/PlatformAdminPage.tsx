import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';
import {
  getPlatformSummary,
  platformCreateCompany,
  platformListCompanies,
  setCompanyActive,
} from '../services/dataService';
import NotAuthorizedPage from './NotAuthorizedPage';

type PlatformCompanyRow = {
  id: string;
  name: string | null;
  createdAt: unknown;
  isActive: boolean;
  plan: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  contactPersonName: string | null;
  contactPersonTitle: string | null;
};

type PlatformSummary = {
  companiesCount: number;
  usersCount: number;
  invoicesCount: number;
  latestCompanies: PlatformCompanyRow[];
};

const PlatformAdminPage: React.FC = () => {
  const auth = useAuth(););
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<PlatformCompanyRow[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    ownerUid: '',
    contactEmail: '',
    phone: '',
    address: '',
    city: '',
    country: 'Egypt',
    contactPersonName: '',
    contactPersonTitle: '',
    plan: 'free',
    notes: '',
    taxId: '',
    commercialReg: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  }, [formMessage]);

  // Platform admin page - not available in single-tenant mode
  return <NotAuthorizedPage />;
};

  const formatDate = (value: unknown) => {
    if (!value) return '-';
    try {
      if (typeof value === 'object' && value !== null && 'toDate' in value) {
        const dateValue = (value as { toDate: () => Date }).toDate();
        return dateValue.toISOString().slice(0, 10);
      }
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      const parsed = new Date(value as string);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    } catch {
      return '-';
    }
    return '-';
  };

  const summaryCards = useMemo(() => {
    const companiesCount = summary?.companiesCount ?? 0;
    const usersCount = summary?.usersCount ?? 0;
    const invoicesCount = summary?.invoicesCount ?? 0;
    return [
      { label: 'الشركات', value: companiesCount },
      { label: 'المستخدمون', value: usersCount },
      { label: 'الفواتير', value: invoicesCount },
    ];
  }, [summary]);

  const refreshSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await getPlatformSummary();
      setSummary(res);
    } catch (err) {
      setSummaryError('تعذر تحميل ملخص المنصة.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const refreshCompanies = async () => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const res = await platformListCompanies(200);
      setCompanies(res.companies || []);
    } catch (err) {
      setCompaniesError('تعذر تحميل قائمة الشركات.');
    } finally {
      setCompaniesLoading(false);
    }
  };

  useEffect(() => {
    refreshSummary().catch(() => {});
    refreshCompanies().catch(() => {});
  }, []);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const requiredFields = [
      'name',
      'ownerUid',
      'contactEmail',
      'phone',
      'address',
      'city',
      'country',
      'contactPersonName',
      'contactPersonTitle',
    ];
    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData] || !String(formData[field as keyof typeof formData]).trim()) {
        errors[field] = 'هذا الحقل مطلوب.';
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    setFormMessage(null);
    try {
      const res = await platformCreateCompany({
        name: formData.name.trim(),
        ownerUid: formData.ownerUid.trim(),
        contactEmail: formData.contactEmail.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        contactPersonName: formData.contactPersonName.trim(),
        contactPersonTitle: formData.contactPersonTitle.trim(),
        plan: formData.plan,
        notes: formData.notes || undefined,
        taxId: formData.taxId || undefined,
        commercialReg: formData.commercialReg || undefined,
      });
      if (!res || !res.companyId) throw new Error('Create company failed');
      setFormMessage('تم إنشاء الشركة بنجاح');
      setFormData({
        name: '',
        ownerUid: '',
        contactEmail: '',
        phone: '',
        address: '',
        city: '',
        country: 'Egypt',
        contactPersonName: '',
        contactPersonTitle: '',
        plan: 'free',
        notes: '',
        taxId: '',
        commercialReg: '',
      });
      setShowForm(false);
      await refreshSummary();
      await refreshCompanies();
    } catch (err) {
      setFormMessage('حدث خطأ أثناء إنشاء الشركة.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleCompany = async (company: PlatformCompanyRow) => {
    setActionMessage(null);
    setActionLoadingId(company.id);
    try {
      await setCompanyActive(company.id, !company.isActive);
      setActionMessage(
        company.isActive
          ? '\u062a\u0645\u0020\u0625\u064a\u0642\u0627\u0641\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u0628\u0646\u062c\u0627\u062d\u002e'
          : '\u062a\u0645\u0020\u0625\u0639\u0627\u062f\u0629\u0020\u062a\u0641\u0639\u064a\u0644\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u0628\u0646\u062c\u0627\u062d\u002e'
      );
      await refreshSummary();
      await refreshCompanies();
    } catch {
      setActionMessage('\u062a\u0639\u0630\u0631\u0020\u062a\u062d\u062f\u064a\u062b\u0020\u062d\u0627\u0644\u0629\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u002e');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            لوحة إدارة المنصة
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ملخص وإدارة الشركات في المنصة.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className="p-4">
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-bold mt-2">{card.value}</div>
            </Card>
          ))}
        </section>

        <section>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                آخر الشركات
              </h2>
              <Button variant="secondary" onClick={() => refreshSummary()}>
                تحديث
              </Button>
            </div>

            {summaryLoading && (
              <div className="mt-4 text-sm text-gray-500">
                جاري تحميل البيانات...
              </div>
            )}
            {summaryError && <div className="mt-4 text-sm text-danger-600">{summaryError}</div>}

            {!summaryLoading && summary && summary.latestCompanies.length === 0 && (
              <div className="mt-4 text-sm text-gray-500">
                لا توجد شركات حالياً.
              </div>
            )}

            {!summaryLoading && summary && summary.latestCompanies.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-right py-2">الشركة</th>
                      <th className="text-right py-2">تاريخ الإنشاء</th>
                      <th className="text-right py-2">الحالة</th>
                      <th className="text-right py-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.latestCompanies.map((company) => (
                      <tr key={company.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2">{company.name || 'شركة'}</td>
                        <td className="py-2">{formatDate(company.createdAt)}</td>
                        <td className="py-2">
                          {company.isActive
                            ? 'مفعلة'
                            : 'متوقفة'}
                        </td>
                        <td className="py-2">
                          <Button
                            variant="secondary"
                            disabled={actionLoadingId === company.id}
                            onClick={() => handleToggleCompany(company)}
                          >
                            {company.isActive
                              ? 'إيقاف الشركة'
                              : 'إعادة تفعيل الشركة'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {actionMessage && <div className="mt-4 text-sm text-gray-600">{actionMessage}</div>}
          </Card>
        </section>

        <section>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                قائمة الشركات
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => refreshCompanies()}>
                  تحديث
                </Button>
                <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
                  إضافة شركة
                </Button>
              </div>
            </div>

            {companiesLoading && (
              <div className="mt-4 text-sm text-gray-500">
                جاري تحميل الشركات...
              </div>
            )}
            {companiesError && <div className="mt-4 text-sm text-danger-600">{companiesError}</div>}

            {!companiesLoading && companies.length === 0 && (
              <div className="mt-4 text-sm text-gray-500">
                لا توجد شركات حالياً.
              </div>
            )}

            {!companiesLoading && companies.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-right py-2">الشركة</th>
                      <th className="text-right py-2">البيانات</th>
                      <th className="text-right py-2">الحالة</th>
                      <th className="text-right py-2">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-3">
                          <div className="font-semibold">{company.name || 'شركة'}</div>
                          <div className="text-xs text-gray-500">{company.plan || 'free'}</div>
                        </td>
                        <td className="py-3 text-xs text-gray-500">
                          <div>{company.contactEmail || '-'}</div>
                          <div>{company.phone || '-'}</div>
                          <div>
                            {company.city || '-'} {company.country ? `- ${company.country}` : ''}
                          </div>
                          <div>
                            {company.contactPersonName || '-'}{' '}
                            {company.contactPersonTitle ? `(${company.contactPersonTitle})` : ''}
                          </div>
                        </td>
                        <td className="py-3">
                          {company.isActive
                            ? 'مفعلة'
                            : 'متوقفة'}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="secondary"
                            disabled={actionLoadingId === company.id}
                            onClick={() => handleToggleCompany(company)}
                          >
                            {company.isActive
                              ? 'إيقاف الشركة'
                              : 'إعادة تفعيل الشركة'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {showForm && (
          <section>
            <Card className="p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="اسم الشركة"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    error={formErrors.name}
                  />
                  <Input
                    label="معرّف مالك الشركة (UID)"
                    value={formData.ownerUid}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ownerUid: e.target.value }))}
                    required
                    error={formErrors.ownerUid}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="بريد التواصل"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    required
                    error={formErrors.contactEmail}
                  />
                  <Input
                    label="الهاتف"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                    error={formErrors.phone}
                  />
                </div>

                <Input
                  label="العنوان"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  required
                  error={formErrors.address}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="المدينة"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    required
                    error={formErrors.city}
                  />
                  <Input
                    label="الدولة"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    required
                    error={formErrors.country}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="اسم شخص التواصل"
                    value={formData.contactPersonName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPersonName: e.target.value }))
                    }
                    required
                    error={formErrors.contactPersonName}
                  />
                  <Input
                    label="مسمى شخص التواصل"
                    value={formData.contactPersonTitle}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPersonTitle: e.target.value }))
                    }
                    required
                    error={formErrors.contactPersonTitle}
                  />
                </div>

                <Select
                  label="الباقة"
                  value={formData.plan}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormData((prev) => ({ ...prev, plan: e.target.value }))
                  }
                  options={[
                    { value: 'free', label: 'free' },
                    { value: 'pro', label: 'pro' },
                    { value: 'enterprise', label: 'enterprise' },
                  ]}
                />

                <Input
                  label="رقم ضريبي"
                  value={formData.taxId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                />
                <Input
                  label="سجل تجاري"
                  value={formData.commercialReg}
                  onChange={(e) => setFormData((prev) => ({ ...prev, commercialReg: e.target.value }))}
                />
                <Input
                  label="ملاحظات"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />

                {formMessage && <div className="text-sm text-gray-600">{formMessage}</div>}

                <Button type="submit" disabled={formLoading}>
                  {formLoading
                    ? 'جاري إنشاء الشركة...'
                    : 'إنشاء الشركة'}
                </Button>
              </form>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

export default PlatformAdminPage;
