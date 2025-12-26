const resources: Record<string, Record<string, string>> = {
  ar: {
    app_name: 'الشاهبندر',
    welcome_back: 'مرحباً بعودتك! قم بتسجيل الدخول للمتابعة.',
    login_button: 'تسجيل الدخول',
    no_account: 'ليس لديك حساب؟',
    create_account: 'أنشئ حساباً جديداً',
    logout: 'تسجيل الخروج',
    dashboard: 'ملخص',
    invoices: 'الفواتير',
    purchases: 'المشتريات',
    quotes: 'عروض الأسعار',
    recurring: 'الفواتير المتكررة',
    expenses: 'المصروفات',
    customers: 'العملاء',
    products: 'المنتجات',
    suppliers: 'الموردون',
    receipts: 'سندات الاستلام',
    warehouse: 'المخزن',
    reports: 'التقارير',
    settings: 'الإعدادات',
  },
  en: {
    app_name: 'Alshahbandar',
    welcome_back: 'Welcome back! Sign in to continue.',
    login_button: 'Sign in',
    no_account: "Don't have an account?",
    create_account: 'Create an account',
    logout: 'Sign out',
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    purchases: 'Purchases',
    quotes: 'Quotes',
    recurring: 'Recurring',
    expenses: 'Expenses',
    customers: 'Customers',
    products: 'Products',
    suppliers: 'Suppliers',
    receipts: 'Receipts',
    warehouse: 'Warehouse',
    reports: 'Reports',
    settings: 'Settings',
  }
};

export const t = (key: string, lang: 'ar' | 'en' = 'ar') => {
  return (resources[lang] && resources[lang][key]) || resources['ar'][key] || key;
};
