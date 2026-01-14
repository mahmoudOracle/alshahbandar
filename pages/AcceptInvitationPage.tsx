import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/Button';
import * as dataService from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';
import { UserRole } from '../types';

const AcceptInvitationPage: React.FC = () => {
  const { firebaseUser, authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryToken = queryParams.get('token');
  const queryInviteId = queryParams.get('inviteId');
  const params = useParams();
  const paramToken = params.token;
  const paramInviteId = params.inviteId;
  const paramCompanyId = params.companyId;

  const token = paramToken || queryToken;
  const inviteId = paramInviteId || queryInviteId;

  useEffect(() => {
    if (token && inviteId) {
      console.log(
        '[DEBUG][InviteAccept] token from URL:',
        token,
        'inviteId:',
        inviteId,
        'companyId:',
        paramCompanyId
      );
      sessionStorage.setItem('pendingInvitationToken', token);
      sessionStorage.setItem('pendingInvitationId', inviteId);
      if (paramCompanyId) sessionStorage.setItem('pendingInvitationCompanyId', paramCompanyId);
    }
  }, [token, inviteId]);

  useEffect(() => {
    if (firebaseUser) {
      console.log(
        '[DEBUG][InviteAccept] user is logged in, redirecting to dashboard so auth flow can accept the invite.'
      );
      navigate('/', { replace: true });
    }
  }, [firebaseUser, navigate]);

  if (!token || !inviteId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">
            رابط الدعوة غير صالح
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            الرابط ناقص بعض البيانات. تأكد من صحة الرابط أو تواصل مع صاحب الشركة.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">جارٍ تسجيل الدخول...</p>
      </div>
    );
  }
  const { onboardingError } = useAuth();
  const { addNotification } = useNotification();

  const handleResend = async () => {
    try {
      const companyId = paramCompanyId || sessionStorage.getItem('pendingInvitationCompanyId');
      if (!companyId) {
        addNotification('لم يتم العثور على الشركة لإعادة إرسال الدعوة.', 'error');
        return;
      }

      if (!firebaseUser?.email || !firebaseUser.uid) {
        addNotification('يرجى تسجيل الدخول أولًا لإعادة إرسال الدعوة.', 'error');
        return;
      }

      await dataService.inviteUser(companyId, firebaseUser.email, UserRole.Employee, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      });
      addNotification('تم إرسال الدعوة مرة أخرى إلى البريد الإلكتروني.', 'success');
    } catch (err) {
      console.error(err);
      addNotification('تعذر إعادة إرسال الدعوة. حاول مرة أخرى.', 'error');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          لديك دعوة للانضمام
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          لإكمال الدعوة، يرجى إنشاء حساب أو تسجيل الدخول بنفس البريد الإلكتروني.
        </p>

        {onboardingError && (
          <div className="mb-6 text-right">
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 p-4 rounded">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-line">
                {onboardingError}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(onboardingError);
                    addNotification('تم نسخ الرسالة', 'success');
                  }}
                >
                  نسخ الرسالة
                </Button>
                <Button variant="primary" onClick={handleResend}>
                  إعادة إرسال الدعوة
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/register" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              إنشاء حساب
            </Button>
          </Link>
          <Link to="/" className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
