

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    HomeIcon, DocumentTextIcon, UsersIcon, ArchiveBoxIcon, Cog6ToothIcon, DocumentPlusIcon, 
    ArrowPathIcon, CurrencyDollarIcon, ChartPieIcon, DocumentDuplicateIcon, MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import { getInvoices, getCustomers, getExpenses } from '../services/dataService';
import { Invoice, Customer, Expense } from '../types';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Spinner } from './Spinner';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StaticAction {
    id: string;
    title: string;
    category: 'Navigation' | 'Create';
    icon: React.ElementType;
    path: string;
}

interface SearchResultItem {
    id: string;
    title: string;
    category: 'Invoices' | 'Customers' | 'Expenses';
    icon: React.ElementType;
    path: string;
    subtitle?: string;
}

type ActionItem = StaticAction | SearchResultItem;

const fuzzyMatch = (text: string = '', query: string = '') => {
    text = (text || '').toLowerCase();
    query = (query || '').toLowerCase();
    let i = 0, j = 0;
    while(i < text.length && j < query.length) {
        if (text[i] === query[j]) j++;
        i++;
    }
    return j === query.length;
};

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { activeCompanyId } = useAuth();
    const canWriteInvoices = useCanWrite('invoices');
    const canWriteCustomers = useCanWrite('customers');
    const canWriteProducts = useCanWrite('products');
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);

    const staticActions: StaticAction[] = [
        { id: 'nav-1', title: 'ملخص', category: 'Navigation', icon: HomeIcon, path: '/' },
        { id: 'nav-2', title: 'كل الفواتير', category: 'Navigation', icon: DocumentTextIcon, path: '/invoices' },
        { id: 'nav-3', title: 'العملاء', category: 'Navigation', icon: UsersIcon, path: '/customers' },
        { id: 'nav-4', title: 'المنتجات', category: 'Navigation', icon: ArchiveBoxIcon, path: '/products' },
        ...(canWriteInvoices ? [{ id: 'create-1', title: 'فاتورة جديدة', category: 'Create' as const, icon: DocumentPlusIcon, path: '/invoices/new' }] : []),
        ...(canWriteCustomers ? [{ id: 'create-2', title: 'عميل جديد', category: 'Create' as const, icon: DocumentPlusIcon, path: '/customers/new' }] : []),
        ...(canWriteProducts ? [{ id: 'create-3', title: 'منتج جديد', category: 'Create' as const, icon: DocumentPlusIcon, path: '/products/new' }] : []),
    ];

    const filteredStaticActions = searchTerm
        ? staticActions.filter(action => fuzzyMatch(action.title, searchTerm))
        : staticActions;

    const allItems: ActionItem[] = searchTerm.length > 2 ? [...searchResults, ...filteredStaticActions] : filteredStaticActions;

    useEffect(() => {
        const performSearch = async () => {
            if (!activeCompanyId || searchTerm.length < 3) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const [invoicesData, customersData, expensesData] = await Promise.all([
                    getInvoices(activeCompanyId),
                    getCustomers(activeCompanyId),
                    getExpenses(activeCompanyId)
                ]);

                // FIX: Use .data property from paginated response
                const invoiceResults: SearchResultItem[] = (invoicesData.data || [])
                    .filter(i => fuzzyMatch(i.invoiceNumber, searchTerm) || fuzzyMatch(i.customerName, searchTerm))
                    .map(i => ({ id: `inv-${i.id}`, title: i.invoiceNumber, subtitle: i.customerName, category: 'Invoices', icon: DocumentTextIcon, path: `/invoices/${i.id}` }));

                const customerResults: SearchResultItem[] = (customersData.data || [])
                    .filter(c => fuzzyMatch(c.name, searchTerm))
                    .map(c => ({ id: `cus-${c.id}`, title: c.name, category: 'Customers', icon: UsersIcon, path: `/customers/${c.id}` }));
                
                const expenseResults: SearchResultItem[] = (expensesData.data || [])
                    .filter(e => fuzzyMatch(e.vendor, searchTerm) || fuzzyMatch(e.description, searchTerm))
                    .map(e => ({ id: `exp-${e.id}`, title: e.vendor, subtitle: e.description, category: 'Expenses', icon: CurrencyDollarIcon, path: `/expenses` }));

                setSearchResults([...invoiceResults, ...customerResults, ...expenseResults]);

            } catch (error) {
                console.error("Command bar search failed:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const handler = setTimeout(() => {
            performSearch();
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, activeCompanyId]);


    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            inputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % allItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = allItems[selectedIndex];
                if (selected) {
                    navigate(selected.path);
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, allItems, navigate, onClose]);
    
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLLIElement;
            selectedElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center pt-20"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute top-3.5 start-4 h-5 w-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for anything..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent px-12 py-4 border-b dark:border-slate-700 focus:outline-none"
                    />
                    {isSearching && <Spinner size="sm" className="absolute top-3.5 end-4" />}
                </div>

                <ul ref={resultsRef} className="max-h-96 overflow-y-auto p-2">
                    {allItems.length > 0 ? allItems.map((item, index) => (
                        <li
                            key={item.id}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => {
                                navigate(item.path);
                                onClose();
                            }}
                            className={`p-3 flex items-center justify-between rounded-md cursor-pointer ${
                                selectedIndex === index ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex items-center">
                                <item.icon className={`h-5 w-5 me-3 ${selectedIndex === index ? 'text-white' : 'text-gray-500'}`} />
                                <div>
                                    <span className="font-medium">{item.title}</span>
                                    {'subtitle' in item && item.subtitle && <span className={`text-sm ms-2 ${selectedIndex === index ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{item.subtitle}</span>}
                                </div>
                            </div>
                            <span className={`text-xs ${selectedIndex === index ? 'text-blue-200' : 'text-gray-400'}`}>{item.category}</span>
                        </li>
                    )) : (
                        <div className="text-center p-8 text-gray-500">
                           <p>No results found.</p>
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandBar;
