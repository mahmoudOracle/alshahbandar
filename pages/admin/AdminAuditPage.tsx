import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import * as dataService from '../../services/dataService';
import { useNotification } from '../../contexts/NotificationContext';

const AdminAuditPage: React.FC = () => {
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const list = await dataService.getAdminActions(200);
                setActions(list);
            } catch (err) {
                console.error(err);
                addNotification('فشل جلب سجلات الإدارة.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">سجل إجراءات المشرف</h1>
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">التاريخ</th>
                                <th className="px-4 py-2">المشرف</th>
                                <th className="px-4 py-2">الإجراء</th>
                                <th className="px-4 py-2">شركة</th>
                                <th className="px-4 py-2">ملاحظة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {actions.map(a => (
                                <tr key={a.id}>
                                    <td className="px-4 py-2">{a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : ''}</td>
                                    <td className="px-4 py-2">{a.adminUid}</td>
                                    <td className="px-4 py-2">{a.action}</td>
                                    <td className="px-4 py-2">{a.companyId}</td>
                                    <td className="px-4 py-2">{a.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <div className="p-4">جارٍ التحميل...</div>}
                </div>
            </Card>
        </div>
    );
};

export default AdminAuditPage;
