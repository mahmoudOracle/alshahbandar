
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, getInvoices, getProducts } from '../services/dataService';
import { Customer, Invoice, Product } from '../types';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult {
    customers: Customer[];
    invoices: Invoice[];
    products: Product[];
}

const GlobalSearch: React.FC = () => {
    const { companyId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef<HTMLDivElement>(null);

    const performSearch = useCallback(async (term: string) => {
        if (term.length < 2 || !companyId) {
            setResults(null);
            setIsOpen(false);
            return;
        }
        setLoading(true);
        const [customersData, invoicesData, productsData] = await Promise.all([
            getCustomers(companyId),
            getInvoices(companyId),
            getProducts(companyId)
        ]);

        const lowerCaseTerm = (term || '').toLowerCase();
        // FIX: Access the .data property from the paginated response before filtering.
        const filteredCustomers = (customersData?.data || []).filter(c => ((c.name || '').toLowerCase().includes(lowerCaseTerm)));
        const filteredInvoices = (invoicesData?.data || []).filter(i => ((i.invoiceNumber || '').toLowerCase().includes(lowerCaseTerm) || (i.customerName || '').toLowerCase().includes(lowerCaseTerm)));
        const filteredProducts = (productsData?.data || []).filter(p => ((p.name || '').toLowerCase().includes(lowerCaseTerm)));
        
        setResults({ customers: filteredCustomers, invoices: filteredInvoices, products: filteredProducts });
        setIsOpen(true);
        setLoading(false);
    }, [companyId]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            performSearch(searchTerm);
        }, 300); // Debounce
        return () => clearTimeout(handler);
    }, [searchTerm, performSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        setSearchTerm('');
        navigate(path);
    };
    
    const clearSearch = () => {
        setSearchTerm('');
        setResults(null);
        setIsOpen(false);
    }

    const hasResults = results && (results.customers.length > 0 || results.invoices.length > 0 || results.products.length > 0);

    return (
        <div ref={searchRef} className="relative w-full sm:w-64">
            <div className="relative">
                 <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                 <input
                    type="text"
                    placeholder="بحث شامل..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm && performSearch(searchTerm)}
                    className="w-full ps-10 pe-10 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchTerm && (
                    <button onClick={clearSearch} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <XMarkIcon className="h-5 w-5"/>
                    </button>
                )}
            </div>
           
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    {loading && <div className="p-4 text-center text-gray-500">جاري البحث...</div>}
                    {!loading && !hasResults && searchTerm.length > 1 && <div className="p-4 text-center text-gray-500">لا توجد نتائج.</div>}
                    {!loading && hasResults && (
                        <div>
                            {results.invoices.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-400 p-3 border-b dark:border-gray-700">الفواتير</h3>
                                    <ul>{results.invoices.map(i => <li key={i.id} onClick={() => handleNavigate(`/invoices/${i.id}`)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{i.invoiceNumber} <span className="text-sm text-gray-500">({i.customerName})</span></li>)}</ul>
                                </div>
                            )}
                             {results.customers.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-400 p-3 border-b dark:border-gray-700">العملاء</h3>
                                    <ul>{results.customers.map(c => <li key={c.id} onClick={() => handleNavigate(`/customers/${c.id}`)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{c.name}</li>)}</ul>
                                </div>
                            )}
                            {results.products.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-400 p-3 border-b dark:border-gray-700">المنتجات</h3>
                                    <ul>{results.products.map(p => <li key={p.id} onClick={() => handleNavigate(`/products`)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{p.name}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
