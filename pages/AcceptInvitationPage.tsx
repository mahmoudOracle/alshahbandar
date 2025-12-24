
import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// FIX: Use firebaseUser and authLoading from useAuth instead of non-existent AuthStatus
import { useAuth } from '../contexts/AuthContext';
// FIX: Changed to a named import for Spinner
import { Spinner } from '../components/Spinner';
import { signInWithGoogle } from '../services/authService';

const AcceptInvitationPage: React.FC = () => {
    const { firebaseUser, authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const token = queryParams.get('token');
    const inviteId = queryParams.get('inviteId');
    
    useEffect(() => {
        if (token && inviteId) {
            sessionStorage.setItem('pendingInvitationToken', token);
            sessionStorage.setItem('pendingInvitationId', inviteId);
        }
    }, [token, inviteId]);

    // If the user is already logged in, redirect them to the dashboard.
    // The AuthContext will handle the invitation acceptance on the next load.
    useEffect(() => {
        if (firebaseUser) {
            navigate('/', { replace: true });
        }
    }, [firebaseUser, navigate]);

    if (!token || !inviteId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">Invalid Invitation Link</h1>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">The invitation link is missing required information. Please check the link and try again, or contact support.</p>
                </div>
            </div>
        );
    }
    
    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Spinner size="lg" />
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Signing you in...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center max-w-md w-full">
                <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">You're Invited!</h1>
                <p className="mb-6 text-gray-600 dark:text-gray-400">You have been invited to join Al Shahbandar. Sign in with Google to accept.</p>
                <button
                    onClick={signInWithGoogle}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    Sign In With Google to Accept
                </button>
            </div>
        </div>
    );
};

export default AcceptInvitationPage;
