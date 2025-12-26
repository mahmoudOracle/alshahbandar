import '@testing-library/jest-dom';

// Place any global test setup here (mocking window APIs, polyfills, etc.)
// Polyfill window.matchMedia for jsdom test environment (some components use it)
if (typeof window !== 'undefined' && typeof (window as any).matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: (query: string) => {
			return {
				matches: false,
				media: query,
				onchange: null,
				addEventListener: (_: string, __: EventListener) => {},
				removeEventListener: (_: string, __: EventListener) => {},
				addListener: (_: any) => {},
				removeListener: (_: any) => {},
				dispatchEvent: (_: Event) => false,
			} as unknown as MediaQueryList;
		}
	});
}
