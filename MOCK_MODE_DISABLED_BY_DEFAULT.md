# Mock Data Mode - Development Only

**Status:** ✅ Disabled by default | ⚠️ Dev-only feature | 🛑 Blocked in production

---

## Overview

The application **now uses real Firestore by default**. Mock data mode is:

- **Disabled** in normal development (`npm run dev`)
- **Disabled** in production builds (blocked by `import.meta.env.PROD`)
- **Only enabled** when explicitly configured with `VITE_USE_MOCK=true`
- **Development-only** - cannot be enabled in production

This ensures you always connect to real data unless you explicitly choose mock mode for testing.

---

## Why Disable Mock by Default?

### Previous Issue
- Mock data was opt-out (had to set `VITE_USE_MOCK=false` to disable)
- Easy to accidentally commit with `VITE_USE_MOCK=true`
- Users might think they're testing real data when actually using mocks
- Production deployments could not include mock service at all

### New Approach
- **Real Firestore is opt-in** (default behavior)
- Mock is opt-**in** (must explicitly enable with `VITE_USE_MOCK=true`)
- Production builds cannot use mock (enforced by `import.meta.env.PROD` check)
- Clear console warnings when mock mode is active

---

## Enable Mock Mode (Development Only)

### Option 1: Environment Variable

```bash
# Terminal - set env var for current command only
VITE_USE_MOCK=true npm run dev

# Or on Windows PowerShell:
$env:VITE_USE_MOCK='true'; npm run dev
```

### Option 2: .env.local File

Create or edit `.env.local` in project root:

```env
# .env.local
VITE_USE_MOCK=true
```

Then run normally:
```bash
npm run dev
```

### Option 3: Verify Mock is Enabled

After starting dev server, check console for warnings:

```
[DEV WARNING] Using mock data service (VITE_USE_MOCK=true). This is development-only mode.
[DEV WARNING] Real Firestore data will be IGNORED. To use real data, set VITE_USE_MOCK=false or unset it.
[MOCK] Seeding mock data for company: mock-company-id. This is for development/testing only.
```

---

## Disable Mock Mode (Default)

### Option 1: Remove .env.local

If you added `VITE_USE_MOCK=true` to `.env.local`, delete that file or remove the line.

### Option 2: Explicitly Set to False

```bash
# Terminal - explicitly set to false
VITE_USE_MOCK=false npm run dev
```

### Option 3: Verify Real Firestore is Active

After starting dev server, check console:

```
[PRODUCTION] Using real Firestore data service
```

(This message appears even in dev, just indicates you're using real Firebase)

---

## Mock Data Features

When mock mode is enabled, you get:

- ✅ In-memory data store (no Firebase needed)
- ✅ Sample customers, invoices, products, expenses
- ✅ Full CRUD operations on mock data
- ✅ Instant operations (no network latency)
- ✅ Perfect for UI testing without Firebase setup
- ✅ Works offline

### What's NOT Available in Mock Mode

- ❌ Real user authentication (mock user always logged in)
- ❌ Real Firestore rules validation
- ❌ Real Cloud Functions
- ❌ Multi-user/multi-tenant features
- ❌ Production-like security rules
- ❌ Real data persistence (resets on page reload)

---

## Testing with Mock Data

### Unit Tests

Tests automatically use mock service:

```typescript
import * as mockService from '../../services/mockService';
import { setDataServiceImpl } from '../../services/dataService';

describe('My Feature', () => {
  beforeEach(() => {
    // Explicitly set mock service for test
    setDataServiceImpl(mockService as any, 'mock');
  });

  it('should work with mock data', async () => {
    const result = await mockService.saveInvoice('test-company', {...});
    expect(result).toBeDefined();
  });
});
```

### Manual Testing

```bash
# Terminal 1: Start with mock data
VITE_USE_MOCK=true npm run dev

# Terminal 2: Run tests (they use mock automatically)
npm test
```

---

## Migration: Mock → Real

### Process

1. **Stop dev server**
   ```bash
   # Stop current dev server (Ctrl+C)
   ```

2. **Disable mock mode**
   ```bash
   # Option A: Remove VITE_USE_MOCK from .env.local
   # Option B: Set it to false
   VITE_USE_MOCK=false npm run dev
   ```

3. **Verify Firestore connection**
   - Check console for: `Using real Firestore data service`
   - Ensure Firebase is initialized (check browser console for errors)
   - Verify network tab shows Firestore API calls

4. **Check data appears**
   - Navigate to pages that load data (Dashboard, Invoices, etc.)
   - Verify real data loads from your Firestore
   - Check network tab for Firestore requests

---

## Production Deployment

### Safety Guarantee

Mock mode **cannot** run in production builds:

```typescript
// bootstrapApp.tsx
const canUseMock = !import.meta.env.PROD; // ← Blocks in production

if (useMock && canUseMock) {
  // Only runs in development builds (import.meta.env.PROD = false)
  setDataServiceImpl(mockService, 'mock');
} else {
  // Always runs in production (real Firestore)
  setDataServiceImpl(firestoreService, 'firestore');
}
```

### Build Verification

```bash
# Build for production
npm run build

# Check build - mock service won't be loaded
ls -la dist/assets/ | grep -i mock  # Should return nothing
```

The mock service might still be in the bundle as unused code, but it will **never be initialized** due to the `import.meta.env.PROD` check.

---

## Troubleshooting

### Problem: "Data service has not been initialized"

**Cause:** Service wasn't initialized before use (should not happen in normal flow)

**Solution:**
1. Check `bootstrapApp.tsx` was called
2. Verify no errors in browser console during startup
3. Hard refresh browser (Ctrl+Shift+R)

### Problem: Mock data not appearing

**Cause:** `VITE_USE_MOCK` not set to exactly `'true'`

**Solution:**
```bash
# Check current setting
echo $VITE_USE_MOCK  # Should output: true

# Re-set it
VITE_USE_MOCK=true npm run dev
```

### Problem: Real data not appearing after disabling mock

**Cause:** Still using old mock data from memory

**Solution:**
1. Stop dev server
2. Hard refresh browser
3. Restart dev server with `VITE_USE_MOCK=false` or unset
4. Wait for Firestore to load (check Network tab)

### Problem: "Using real Firestore" but no data shows

**Cause:** Firestore rules or authentication issue

**Solution:**
1. Check Firebase credentials in `services/firebase.ts`
2. Verify Firestore rules allow reads
3. Verify user is authenticated
4. Check browser console for Firebase errors

---

## Architecture

### Data Service Design

```
bootstrapApp.tsx
    ↓
    ├─→ Check: is production build? (import.meta.env.PROD)
    │   ├─→ YES: Always use Firestore
    │   └─→ NO: Check VITE_USE_MOCK flag
    │
    └─→ VITE_USE_MOCK === 'true'?
        ├─→ YES: Load mockService + seedData()
        └─→ NO: Load firestoreService (real Firestore)
        
           ↓
        setDataServiceImpl(service, name)
        
           ↓
        dataService.ts (proxy)
        
           ↓
        firestoreService OR mockService
        
           ↓
        Application uses data transparently
```

### Key Files

| File | Purpose |
|------|---------|
| `bootstrapApp.tsx` | Initializes data service (mock/firestore) |
| `services/dataService.ts` | Proxy that exposes data functions |
| `services/firestoreService.ts` | Real Firestore implementation |
| `services/mockService.ts` | In-memory mock implementation |
| `.env.local` | Stores `VITE_USE_MOCK=true` flag (optional) |

---

## Environment Variables

### VITE_USE_MOCK

- **Default:** Not set (uses Firestore)
- **Valid values:** `'true'`, `'false'`, or unset
- **Scope:** Development only (blocked in production)
- **Type:** String (must be exactly `'true'`)

```env
# .env.local

# Enable mock data
VITE_USE_MOCK=true

# Disable mock data (explicit)
VITE_USE_MOCK=false

# Or just delete this line to use default (Firestore)
```

---

## Console Messages

### Real Firestore (Default)
```
[PRODUCTION] Using real Firestore data service
```

### Mock Mode Enabled
```
[DEV WARNING] Using mock data service (VITE_USE_MOCK=true). This is development-only mode.
[DEV WARNING] Real Firestore data will be IGNORED. To use real data, set VITE_USE_MOCK=false or unset it.
[MOCK] Seeding mock data for company: mock-company-id. This is for development/testing only.
```

### Data Logged
```
[DEV] POST: saveInvoice
[DEV] GET: getInvoices
...
```

---

## FAQ

**Q: Can mock mode run in production?**  
A: No. `import.meta.env.PROD` check blocks it. Production always uses real Firestore.

**Q: Does mock data persist?**  
A: No. It's stored in memory only. Refreshing the page clears it.

**Q: Should I commit `VITE_USE_MOCK=true` to git?**  
A: No. If using `.env.local`, add it to `.gitignore`. Environment variable in CI/CD is fine.

**Q: How do I know which service is active?**  
A: Check browser console for warning/info messages at startup.

**Q: Can I switch between mock and real without restarting?**  
A: No. Stop dev server, change `VITE_USE_MOCK`, and restart.

**Q: What if I forget to disable mock before deploying?**  
A: Production build checks `import.meta.env.PROD` and auto-switches to Firestore. You're safe.

**Q: Can I use both mock and real data simultaneously?**  
A: No. It's one or the other. Tests can use mock, but app uses one service globally.

---

## Related Documentation

- [USE_MOCK_MODE.md](./USE_MOCK_MODE.md) - Original guide (archived)
- [services/mockService.ts](./services/mockService.ts) - Mock implementation
- [services/firestoreService.ts](./services/firestoreService.ts) - Real Firestore
- [bootstrapApp.tsx](./bootstrapApp.tsx) - Service initialization

---

**Last Updated:** Feb 3, 2026  
**Status:** ✅ Active - Mock disabled by default, opt-in only  
**Safety:** 🛑 Production-blocked, dev-only
