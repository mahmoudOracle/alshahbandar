Title: PHASE3: UX — Quick Add Product integration

Summary:

- Integrates `QuickAddProduct` into `pages/ProductList.tsx` for a faster mobile-first product add flow.
- Saves new products via `saveProduct(activeCompanyId, product)` and clears the tenant product cache (`services/repositories/products.clearProductCache`) to ensure fresh reads.
- Adds inline notifications and refreshes the product list after add.
- Minor lint fixes in `components/ui/DateInput.tsx` and `services/dataService.ts` to resolve ESLint errors.

Files changed:

- `pages/ProductList.tsx` — QuickAddProduct import, handler and layout changes.
- `components/QuickAddProduct.tsx` — (previously added) quick add UI.
- `components/ui/DateInput.tsx` — regex/lint fixes.
- `services/dataService.ts` — removed redundant try/catch to avoid useless-catch lint error.

Testing:

- `npm run build` completed successfully.
- `npm run lint` reports warnings only (0 errors).
- `npm test` passed (3 tests).

Notes / Next steps:

- Sweep remaining UI strings to `t()` for full i18n coverage.
- Consider adding an optimistic update to the product list on quick-add for snappier UX.
- I couldn't create the GitHub PR automatically because the `gh` CLI isn't installed in this environment. Open a PR using the compare URL below and paste this description as the PR body.

PR compare URL:
https://github.com/mahmoudOracle/alshahbandar/compare/master...phase3-ux?expand=1
