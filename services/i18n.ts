const resources: Record<string, Record<string, string>> = {
  ar: {
    app_name: 'الشاهبندر',
    welcome_back: 'مرحباً بعودتك! قم بتسجيل الدخول للمتابعة.',
    login_button: 'تسجيل الدخول',
    no_account: 'ليس لديك حساب؟',
    create_account: 'أنشئ حساباً جديداً',
  },
  en: {
    app_name: 'Alshahbandar',
    welcome_back: 'Welcome back! Sign in to continue.',
    login_button: 'Sign in',
    no_account: "Don't have an account?",
    create_account: 'Create an account',
  }
};

export const t = (key: string, lang: 'ar' | 'en' = 'ar') => {
  return (resources[lang] && resources[lang][key]) || resources['ar'][key] || key;
};
