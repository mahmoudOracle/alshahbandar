import React, { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const applyTheme = (t: Theme) => {
            if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => applyTheme(theme);

        if (theme === 'system') {
            mediaQuery.addEventListener('change', handleChange);
        }

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [theme]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        setIsMenuOpen(false);
    };

    const themeIcons: Record<Theme, React.ReactNode> = {
        light: <SunIcon className="h-5 w-5" />,
        dark: <MoonIcon className="h-5 w-5" />,
        system: <ComputerDesktopIcon className="h-5 w-5" />,
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                aria-label="Change theme"
            >
                {themeIcons[theme]}
            </button>
            {isMenuOpen && (
                <div className="absolute start-0 sm:end-0 sm:start-auto mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                    <ul className="py-1">
                        <li>
                            <button onClick={() => selectTheme('light')} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <SunIcon className="h-5 w-5 me-3" />
                                فاتح
                            </button>
                        </li>
                        <li>
                            <button onClick={() => selectTheme('dark')} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <MoonIcon className="h-5 w-5 me-3" />
                                داكن
                            </button>
                        </li>
                        <li>
                            <button onClick={() => selectTheme('system')} className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <ComputerDesktopIcon className="h-5 w-5 me-3" />
                                النظام
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ThemeToggle;
