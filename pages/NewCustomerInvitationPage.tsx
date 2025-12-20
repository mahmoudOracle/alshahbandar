
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
// FIX: Import from dataService to maintain consistency and abstraction.
import { createCustomerInvitation } from '../services/dataService';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { UserRole } from '../types';

const NewCustomerInvitationPage: React.FC = () => {
    // FIX: Replaced non-existent 'isManager' with a proper role check.
    const { activeRole } = useAuth();
    const isManager = activeRole === UserRole.Owner || activeRole === UserRole.Manager;
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    const [email, setEmail] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isManager) {
            addNotification('You do not have permission to access this page.', 'error');
            navigate('/');
        }
    }, [isManager, navigate, addNotification]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCustomerInvitation(email, companyName, notes);
            addNotification(`Invitation email sent successfully to ${email}!`, 'success');
            // Clear form for next invitation
            setEmail('');
            setCompanyName('');
            setNotes('');
        } catch (error: any) {
            console.error(error);
            let errorMessage = 'An unexpected error occurred. Please try again.';
            if (error.code === 'functions/failed-precondition') {
                 errorMessage = 'Email service is not configured on the backend. Please contact your administrator.';
            } else if (error.code === 'internal') {
                errorMessage = 'A server error occurred while sending the invitation. Please check the function logs or contact support.';
            } else if (error.message) {
                errorMessage = `Failed to send invitation: ${error.message}`;
            }
            addNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isManager) {
        return null; // or a loading spinner while redirecting
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <div className="flex items-center mb-6">
                    <UserPlusIcon className="h-8 w-8 text-blue-500 me-3"/>
                    <h2 className="text-2xl font-bold">Invite New Customer</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create a new, separate company account for a customer. An invitation email will be sent to them directly.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Company Name</label>
                        <input
                            type="text"
                            id="companyName"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                            placeholder="e.g. FutureTech Inc."
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Owner's Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                            placeholder="customer@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Internal notes about this customer, e.g., plan type, contact person."
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                            {loading ? 'Sending Invitation...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewCustomerInvitationPage;
