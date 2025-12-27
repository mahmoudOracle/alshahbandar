import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import * as dataService from '../../services/dataService';
import { useNotification } from '../../contexts/NotificationContext';

const AdminAuditPage: React.FC = () => {
    const [actions, setActions] = useState<Record<string, unknown>[]>([]);
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
                            {actions.map(a => {
                                const rec = a as Record<string, unknown>;
                                const createdAtVal = rec['createdAt'];
                                const createdAtText = createdAtVal && (createdAtVal as { toDate?: () => Date }).toDate ? (createdAtVal as { toDate: () => Date }).toDate().toLocaleString() : '';
                                return (
                                    <tr key={String(rec['id'])}>
                                        <td className="px-4 py-2">{createdAtText}</td>
                                        <td className="px-4 py-2">{String(rec['adminUid'] ?? '')}</td>
                                        <td className="px-4 py-2">{String(rec['action'] ?? '')}</td>
                                        <td className="px-4 py-2">{String(rec['companyId'] ?? '')}</td>
                                        <td className="px-4 py-2">{String(rec['note'] ?? '')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {loading && <div className="p-4">جارٍ التحميل...</div>}
                </div>
            </Card>
        </div>
    );
};

export default AdminAuditPage;
