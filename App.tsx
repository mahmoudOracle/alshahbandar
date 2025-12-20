
import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, matchPath } from 'react-router-dom';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import Sidebar from './components/Sidebar';
import { SettingsProvider } from './contexts/SettingsContext';
import ThemeToggle from './components/ThemeToggle';
import CommandBar from './components/CommandBar';
import { FullPageSpinner } from './components/Spinner';
import OfflineBanner from './components/OfflineBanner';
import OnboardingBanner from './components/OnboardingBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { routes } from '@/src/routes';

const AppRoutes: React.FC = () => (
    <Routes>
        {routes.map(({ path, component: Component }) => (
            <React.Fragment key={path}>
                <Route path={path} element={<Component />} />
            </React.Fragment>
        ))}
    </Routes>
);

const getPageTitle = (pathname: string): string => {
    const matchedRoute = routes.find(route => matchPath(route.path, pathname));
    return matchedRoute ? matchedRoute.title : 'Alshabandar';
};

function App() {
    const location = useLocation();
    const [pageTitle, setPageTitle] = useState('ملخص');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    
    useEffect(() => {
        setPageTitle(getPageTitle(location.pathname));
    }, [location]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsCommandBarOpen(o => !o);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                    <div className="w-full">
                        <OfflineBanner />
                        <div className="mt-3"><OnboardingBanner /></div>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                        <button 
                            onClick={() => setSidebarOpen(true)} 
                            className="md:hidden text-gray-500 dark:text-gray-400 focus:outline-none me-4"
                            aria-controls="sidebar"
                            aria-expanded={isSidebarOpen}
                            aria-label="Open sidebar"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <h1 className="text-2xl font-bold">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsCommandBarOpen(true)}
                            className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Open command bar"
                        >
                           <MagnifyingGlassIcon className="h-5 w-5" />
                           <span className="hidden sm:inline">بحث وتنقل سريع...</span>
                           <kbd className="hidden sm:inline text-xs font-sans border dark:border-gray-500 rounded px-1.5 py-1">⌘K</kbd>
                        </button>
                        <ThemeToggle />
                    </div>
                </header>
                <div id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">
                    <Suspense fallback={<FullPageSpinner />}>
                        <div key={location.pathname} className="page-transition">
                           <AppRoutes />
                        </div>
                    </Suspense>
                </div>
            </main>
        </div>
    )
}

const AppWrapper: React.FC = () => {
    return (
        <HashRouter>
            <SettingsProvider>
                <ErrorBoundary>
                    <App />
                </ErrorBoundary>
            </SettingsProvider>
        </HashRouter>
    )
}


export default AppWrapper;
