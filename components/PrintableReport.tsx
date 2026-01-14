import React from 'react';

type SummaryItem = { label: string; value: string };

interface PrintableReportProps {
  reportTitle: string;
  companyName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  dateRangeLabel?: string;
  summaryItems?: SummaryItem[];
  children: React.ReactNode;
}

const PrintableReport: React.FC<PrintableReportProps> = ({
  reportTitle,
  companyName,
  logoUrl,
  address,
  phone,
  dateRangeLabel,
  summaryItems = [],
  children,
}) => {
  return (
    <div dir="rtl" className="bg-white text-gray-900 p-6 rounded-lg">
      <header className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-14 w-14 object-contain" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
              {companyName.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="text-lg font-bold">{companyName}</div>
            {address && <div className="text-sm text-gray-500">{address}</div>}
            {phone && <div className="text-sm text-gray-500">{phone}</div>}
          </div>
        </div>
        <div className="text-left">
          <div className="text-xl font-bold">{reportTitle}</div>
          {dateRangeLabel && <div className="text-sm text-gray-500 mt-1">{dateRangeLabel}</div>}
        </div>
      </header>

      {summaryItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{item.label}</div>
              <div className="text-lg font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">{children}</div>

      <footer className="mt-6 border-t border-gray-200 pt-3 text-xs text-gray-500 text-center">
        تم إنشاء التقرير بواسطة الشاهبندر لإدارة الأعمال
      </footer>
    </div>
  );
};

export default PrintableReport;
