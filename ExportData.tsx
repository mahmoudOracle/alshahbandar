import React, { useState } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path if needed
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed

const ExportData: React.FC = () => {
  const { companyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    // Get headers
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    // Format values
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    // Add BOM for Arabic Excel support
    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCollection = async (collectionName: string, dateFilter = false) => {
    if (!companyId) return;
    setLoading(true);
    try {
      let q = query(collection(db, 'companies', companyId, collectionName));

      if (dateFilter && startDate && endDate) {
        // Convert ISO date strings to Timestamps for Firestore comparison
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        
        q = query(
          collection(db, 'companies', companyId, collectionName),
          where('date', '>=', Timestamp.fromDate(startDateObj)),
          where('date', '<', Timestamp.fromDate(endDateObj)),
          orderBy('date')
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        // Flatten or format specific fields if necessary
        return {
          id: doc.id,
          ...d,
          // Convert timestamps to readable strings
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
          date: d.date instanceof Timestamp ? d.date.toDate().toISOString().split('T')[0] : d.date,
        };
      });

      downloadCSV(data, `${collectionName}-${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Export failed', error);
      alert('حدث خطأ أثناء التصدير: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-right">تصدير البيانات</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-right">الفواتير</h2>
        <div className="flex flex-col md:flex-row gap-4 justify-end items-end mb-4">
          <div className="flex flex-col text-right">
            <label className="text-sm text-gray-600 mb-1">إلى تاريخ</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <div className="flex flex-col text-right">
            <label className="text-sm text-gray-600 mb-1">من تاريخ</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
        </div>
        <button 
          onClick={() => exportCollection('invoices', true)}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'جاري التصدير...' : 'تصدير الفواتير (CSV)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'العملاء', coll: 'customers' },
          { label: 'المنتجات', coll: 'products' },
          { label: 'الموردين', coll: 'suppliers' },
          { label: 'المدفوعات', coll: 'payments' },
        ].map(item => (
          <div key={item.coll} className="bg-white p-6 rounded-lg shadow text-right">
            <h2 className="text-xl font-semibold mb-4">{item.label}</h2>
            <button 
              onClick={() => exportCollection(item.coll)}
              disabled={loading}
              className="w-full bg-gray-800 text-white p-2 rounded hover:bg-gray-900 disabled:opacity-50"
            >
              تصدير {item.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportData;