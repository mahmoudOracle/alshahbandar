import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const decodeUnicode = (str: string | undefined | null): string => {
  if (!str) return '';
  const normalizedStr = str.replace(/\\\\u/g, '\\u');
  const decoded = normalizedStr.replace(/\\\u([\dA-F]{4})/gi, (_, grp) =>
    String.fromCharCode(parseInt(grp, 16))
  );
  return decoded;
};

interface FatalErrorPageProps {
  title?: string;
  message?: string;
  showRetry?: boolean;
}

const FatalErrorPage: React.FC<FatalErrorPageProps> = ({
  title,
  message,
  showRetry = true,
}) => {
  const navigate = useNavigate();

  const defaultTitle = 'غير مصرح';
  const defaultMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';

  const decodedTitle = decodeUnicode(title || defaultTitle);
  const decodedMessage = decodeUnicode(message || defaultMessage);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
          <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          {decodedTitle}
        </h1>
        <div className="mt-3 text-gray-600 dark:text-gray-400">
          <p className="whitespace-pre-line">{decodedMessage}</p>
        </div>
        {showRetry && (
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => navigate('/')}
              className="w-full"
            >
              {decodeUnicode('العودة إلى الصفحة الرئيسية')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FatalErrorPage;