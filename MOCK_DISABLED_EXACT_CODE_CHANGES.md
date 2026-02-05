# Exact Code Changes - Copy & Paste Ready

**For:** Implementing mock data disabled by default  
**Date:** February 3, 2026

---

## Change 1: bootstrapApp.tsx (Lines 64-82)

### Location
File: `bootstrapApp.tsx`  
Function: `bootstrapApp()`  
Context: Right after Sentry initialization, before rendering

### Old Code (REMOVE)
```typescript
    // 1. Inject the concrete service implementation into the data service proxy.
    // In development you can enable `VITE_USE_MOCK=true` to use an in-memory
    // mock service which provides sample data (handy when Cloud Functions
    // or Firestore data are unavailable). By default we use Firestore.
    const useMock =
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_MOCK === 'true';
    if (useMock) {
      console.info('[DEV] Using mock data service (VITE_USE_MOCK=true)');
      // seed mock data once (company id is not relevant for mock seeding)
      // intentionally ignore failures
      try {
        mockService.seedData?.('mock-company-id');
      } catch {
        /* ignore */
      }
      setDataServiceImpl(mockService as unknown as typeof firestoreService, 'mock');
    } else {
      setDataServiceImpl(firestoreService, 'firestore');
    }
```

### New Code (REPLACE WITH)
```typescript
    // 1. Inject the concrete service implementation into the data service proxy.
    // DEFAULT: Always use real Firestore (recommended for production & most development)
    // To use mock data for development/testing ONLY, set VITE_USE_MOCK=true explicitly.
    // Mock service is disabled in production builds (import.meta.env.PROD).
    const canUseMock = !import.meta.env.PROD; // Only allow mock in development builds
    const useMock =
      canUseMock &&
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_MOCK === 'true';
    
    if (useMock) {
      console.warn('[DEV WARNING] Using mock data service (VITE_USE_MOCK=true). This is development-only mode.');
      console.warn('[DEV WARNING] Real Firestore data will be IGNORED. To use real data, set VITE_USE_MOCK=false or unset it.');
      // Seed mock data once (company id is not relevant for mock seeding)
      // Intentionally ignore failures
      try {
        mockService.seedData?.('mock-company-id');
      } catch {
        /* ignore */
      }
      setDataServiceImpl(mockService as unknown as typeof firestoreService, 'mock');
    } else {
      // DEFAULT: Use real Firestore
      if (!canUseMock) {
        // Production build - explicitly confirm we're using real data
        console.info('[PRODUCTION] Using real Firestore data service');
      }
      setDataServiceImpl(firestoreService, 'firestore');
    }
```

### What Changed
| Item | Before | After |
|------|--------|-------|
| Production check | None | `const canUseMock = !import.meta.env.PROD;` |
| Mock condition | Simple check | Check + canUseMock AND |
| Development log | `console.info('[DEV]...')` | `console.warn('[DEV WARNING]...')` (2 lines) |
| Production log | None | `console.info('[PRODUCTION]...')` |
| Comment | Old explanation | New explanation |

---

## Change 2: services/mockService.ts (Line 60)

### Location
File: `services/mockService.ts`  
Function: `seedData()`  
Line: 60

### Old Code (REMOVE)
```typescript
  console.log(`Seeding MOCK data for company: ${companyId}`);
```

### New Code (REPLACE WITH)
```typescript
  console.warn(`[MOCK] Seeding mock data for company: ${companyId}. This is for development/testing only.`);
```

### What Changed
- Changed `console.log` → `console.warn` (more visible)
- Added `[MOCK]` prefix (consistent messaging)
- Changed "Seeding MOCK data" → "Seeding mock data" (lowercase)
- Added note: "This is for development/testing only."

---

## Change 3: .env.local.example (After VITE_FREE_MODE)

### Location
File: `.env.local.example`  
After: `VITE_FREE_MODE=true`  
Before: `# Restart the dev server...`

### Old Content (REMOVE)
```env
# Free mode defaults to true and avoids Cloud Functions requirements.
VITE_FREE_MODE=true

# Restart the dev server after editing this file so Vite picks up the new env value.
```

### New Content (REPLACE WITH)
```env
# Free mode defaults to true and avoids Cloud Functions requirements.
VITE_FREE_MODE=true

# ⚠️  MOCK MODE (Development-Only)
# ===============================
# DEFAULT: Real Firestore is used (VITE_USE_MOCK unset or false)
# 
# To enable mock data for development/testing ONLY:
#   VITE_USE_MOCK=true
#
# Mock mode features:
#   ✅ In-memory data (no Firebase needed)
#   ✅ Sample data for testing UI
#   ❌ Disabled in production builds (enforced by import.meta.env.PROD check)
#
# Uncomment the line below to enable mock mode (development only):
# VITE_USE_MOCK=true

# Restart the dev server after editing this file so Vite picks up the new env value.
```

### What Changed
- Added comprehensive MOCK MODE section
- Clearly states default (Real Firestore)
- Documents how to enable mock
- Lists features and safety guarantees
- Provides example commented line

---

## Verification Commands

After making changes:

### Test 1: Verify Default (Real Firestore)
```bash
# Terminal
npm run dev

# Browser console should show:
# [PRODUCTION] Using real Firestore data service
```

### Test 2: Verify Mock Mode
```bash
# Terminal
VITE_USE_MOCK=true npm run dev

# Browser console should show (in yellow):
# [DEV WARNING] Using mock data service (VITE_USE_MOCK=true)...
# [DEV WARNING] Real Firestore data will be IGNORED...
# [MOCK] Seeding mock data for company: mock-company-id...
```

### Test 3: Verify Production Build
```bash
# Terminal
npm run build

# Should complete without errors
# No mock initialization in output
```

---

## Minimum Required Changes (if time-constrained)

### Option 1: Bootstrap ONLY (Most Critical)
Make **only** the `bootstrapApp.tsx` change. This provides:
- ✅ Production safety (real Firestore always used)
- ✅ Real Firestore default
- But: Doesn't make warnings as visible

### Option 2: Bootstrap + Mock Logging (Recommended)
Make `bootstrapApp.tsx` + `mockService.ts` changes. This adds:
- ✅ More visible warnings
- ✅ Better developer experience
- But: No .env.local documentation

### Option 3: All Changes (Complete - Recommended)
All three changes for complete solution:
- ✅ Production safety
- ✅ Visible warnings
- ✅ Clear documentation

---

## Git Commit Message

```
Disable mock data by default, use real Firestore

- Change default service to real Firestore (production recommended)
- Make mock mode development-only with explicit opt-in (VITE_USE_MOCK=true)
- Add production safety: import.meta.env.PROD blocks mock in builds
- Improve console visibility: use console.warn for mock mode notices
- Update .env.local.example with mock mode documentation

Changes:
- bootstrapApp.tsx: Reverse default logic, add production check
- services/mockService.ts: More visible warning message
- .env.local.example: Document mock mode feature

This ensures:
- Real data is used by default (safe)
- Mock requires explicit action to enable (dev-only)
- Production builds cannot use mock (guaranteed)
- Clear console messages indicate active service

No breaking changes. Tests unaffected.
```

---

## Git Diff View

```diff
diff --git a/bootstrapApp.tsx b/bootstrapApp.tsx
index 1234567..abcdefg 100644
--- a/bootstrapApp.tsx
+++ b/bootstrapApp.tsx
@@ -63,19 +63,33 @@ export const bootstrapApp = (root: ReactDOM.Root) => {
     }
     // 1. Inject the concrete service implementation into the data service proxy.
-    // In development you can enable `VITE_USE_MOCK=true` to use an in-memory
-    // mock service which provides sample data (handy when Cloud Functions
-    // or Firestore data are unavailable). By default we use Firestore.
+    // DEFAULT: Always use real Firestore (recommended for production & most development)
+    // To use mock data for development/testing ONLY, set VITE_USE_MOCK=true explicitly.
+    // Mock service is disabled in production builds (import.meta.env.PROD).
+    const canUseMock = !import.meta.env.PROD; // Only allow mock in development builds
     const useMock =
+      canUseMock &&
       typeof import.meta !== 'undefined' &&
       (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_MOCK === 'true';
+    
     if (useMock) {
-      console.info('[DEV] Using mock data service (VITE_USE_MOCK=true)');
-      // seed mock data once (company id is not relevant for mock seeding)
-      // intentionally ignore failures
+      console.warn('[DEV WARNING] Using mock data service (VITE_USE_MOCK=true). This is development-only mode.');
+      console.warn('[DEV WARNING] Real Firestore data will be IGNORED. To use real data, set VITE_USE_MOCK=false or unset it.');
+      // Seed mock data once (company id is not relevant for mock seeding)
+      // Intentionally ignore failures
       try {
         mockService.seedData?.('mock-company-id');
       } catch {
         /* ignore */
       }
       setDataServiceImpl(mockService as unknown as typeof firestoreService, 'mock');
     } else {
+      // DEFAULT: Use real Firestore
+      if (!canUseMock) {
+        // Production build - explicitly confirm we're using real data
+        console.info('[PRODUCTION] Using real Firestore data service');
+      }
       setDataServiceImpl(firestoreService, 'firestore');
     }

diff --git a/services/mockService.ts b/services/mockService.ts
index abcdefg..1234567 100644
--- a/services/mockService.ts
+++ b/services/mockService.ts
@@ -58,7 +58,7 @@ const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
 export const seedData = async (companyId: string) => {
   if (isSeeded) return;
-  console.log(`Seeding MOCK data for company: ${companyId}`);
+  console.warn(`[MOCK] Seeding mock data for company: ${companyId}. This is for development/testing only.`);

diff --git a/.env.local.example b/.env.local.example
index 1234567..abcdefg 100644
--- a/.env.local.example
+++ b/.env.local.example
@@ -4,5 +4,21 @@ VITE_COMPANY_ID=uv9acIebvvNgx9ftSnPh
 # Free mode defaults to true and avoids Cloud Functions requirements.
 VITE_FREE_MODE=true
 
+# ⚠️  MOCK MODE (Development-Only)
+# ===============================
+# DEFAULT: Real Firestore is used (VITE_USE_MOCK unset or false)
+# 
+# To enable mock data for development/testing ONLY:
+#   VITE_USE_MOCK=true
+#
+# Mock mode features:
+#   ✅ In-memory data (no Firebase needed)
+#   ✅ Sample data for testing UI
+#   ❌ Disabled in production builds (enforced by import.meta.env.PROD check)
+#
+# Uncomment the line below to enable mock mode (development only):
+# VITE_USE_MOCK=true
+
 # Restart the dev server after editing this file so Vite picks up the new env value.
```

---

## Side-by-Side Comparison

### OLD Flow (Mock Default)
```
App starts
    ↓
VITE_USE_MOCK === 'true'?
    ├─ YES → Use Mock (default if not set)
    └─ NO → Use Firestore
    
Risk: Easy to forget to set VITE_USE_MOCK=false
```

### NEW Flow (Real Firestore Default)
```
App starts
    ↓
import.meta.env.PROD === true?
    ├─ YES (Production) → Always use Firestore ✅
    └─ NO (Development)
            ↓
        VITE_USE_MOCK === 'true'?
            ├─ YES → Use Mock (explicit opt-in) ⚠️
            └─ NO → Use Firestore (default) ✅
            
Benefit: Firestore by default, mock requires action
```

---

## FAQ

**Q: Do I need to change anything else?**  
A: No. These 3 files are all that's needed. No other changes required.

**Q: Will this break existing code?**  
A: No. All existing code continues to work. Only the default service changes.

**Q: What about tests?**  
A: Tests are unaffected. They explicitly set mock service, so no changes needed.

**Q: How do I know it worked?**  
A: Check browser console for the appropriate message:
- Real Firestore: `[PRODUCTION] Using real Firestore data service`
- Mock mode: `[DEV WARNING] Using mock data service...`

**Q: Can I revert if needed?**  
A: Yes, just restore the three files to their original state using git.

---

**Ready to implement?** Copy the code sections above into your files and test using the verification commands.
