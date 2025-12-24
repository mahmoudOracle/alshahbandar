
export function mapFirestoreError(e: any): string {
  const code = String(e?.code || '').toLowerCase();
  const msg = String(e?.message || '');
  if (code === 'forbidden-role') {
    return 'صلاحية غير كافية لإتمام العملية.';
  }
  if (code.includes('permission-denied') || msg.includes('permission-denied')) {
    return 'الصلاحيات غير كافية للوصول إلى قاعدة البيانات (Firestore Rules).';
  }
  return 'حدث خطأ غير متوقع أثناء الوصول إلى قاعدة البيانات.';
}