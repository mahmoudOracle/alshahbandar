import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import * as dataService from '../../../services/dataService';
import { useNotification } from '../../../contexts/NotificationContext';
import { auth } from '../../../services/firebase';

interface Props {
  isOpen: boolean;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onComplete: () => void;
}

const ApproveCompanyModal: React.FC<Props> = ({ isOpen, companyId, companyName, onClose, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const { addNotification } = useNotification();

  if (!isOpen) return null;

  const handleAction = async (approve: boolean) => {
    setLoading(true);
      try {
      await dataService.updateCompanyStatus(companyId, approve);
      await dataService.logAdminAction({
        adminUid: auth.currentUser ? auth.currentUser.uid : 'unknown',
        companyId,
        action: approve ? 'approve_company' : 'reject_company',
        note: note || (approve ? 'Approved via admin UI' : 'Rejected via admin UI'),
      });
      addNotification('تم تحديث حالة الشركة.', 'success');
      onComplete();
    } catch (err) {
      console.error(err);
      addNotification('فشل تحديث حالة الشركة.', 'error');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <Card>
        <h3 className="text-lg font-bold">مراجعة الشركة</h3>
        <p className="mt-2">الشركة: <strong>{companyName}</strong></p>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full mt-3 p-2 border rounded" />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => handleAction(false)} variant="ghost" disabled={loading}>رفض</Button>
          <Button onClick={() => handleAction(true)} loading={loading}>الموافقة</Button>
        </div>
      </Card>
    </div>
  );
};

export default ApproveCompanyModal;
