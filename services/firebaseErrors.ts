export function mapFirestoreError(e: any): string {
  const code = String(e?.code || '').toLowerCase();
  const msg = String(e?.message || '');
  
  // Handle Cloud Function errors first
  if (code.startsWith('functions/')) {
    const functionError = code.replace('functions/', '');
    switch(functionError) {
        case 'unauthenticated':
            return 'يجب تسجيل الدخول لتنفيذ هذا الإجراء.';
        case 'permission-denied':
            return 'صلاحية غير كافية لتنفيذ هذا الإجراء.';
        case 'already-exists':
            return 'هذا العنصر موجود بالفعل أو المعرف مستخدم.';
        case 'invalid-argument':
            return 'البيانات المدخلة غير صحيحة أو ناقصة.';
        case 'failed-precondition':
             return 'فشل شرط مسبق، قد تكون خدمة البريد الإلكتروني غير مهيأة.';
        case 'internal':
             return 'حدث خطأ في الخادم. السبب الأكثر شيوعاً هو عدم تفعيل خطة الفوترة (Blaze) للمشروع. يرجى تفعيل الفوترة ثم المحاولة مرة أخرى. إذا استمرت المشكلة، يرجى مراجعة سجلات الوظائف السحابية (Cloud Function logs).';
        default:
            return `حدث خطأ غير معروف في الخادم (${functionError}). يرجى مراجعة سجلات الوظائف السحابية.`;
    }
  }

  if (code === 'forbidden-role') {
    return 'صلاحية غير كافية لإتمام العملية.';
  }
  if (code.includes('permission-denied') || msg.includes('permission-denied')) {
    return 'الصلاحيات غير كافية للوصول إلى قاعدة البيانات (Firestore Rules).';
  }
  return 'حدث خطأ غير متوقع أثناء الوصول إلى قاعدة البيانات.';
}