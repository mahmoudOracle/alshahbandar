# Platform Bootstrap (Dev Only)

Goal: allow the currently logged-in user to become a platform admin in development without manual Firestore edits.

## Requirements
- Run Functions Emulator, or set `ALLOW_PLATFORM_BOOTSTRAP=true` for Functions.
- Use the web app in development (`import.meta.env.DEV`).
- Emulators are used only when `VITE_USE_EMULATORS=true` in DEV.
- The bootstrap callable runs on Functions Emulator or on deployed Functions with `ALLOW_PLATFORM_BOOTSTRAP=true`.

## Steps
1) Start the Functions Emulator or set `ALLOW_PLATFORM_BOOTSTRAP=true`.
2) Log in normally.
3) Open any page that shows "غير مصرح" (e.g. `/#/platform`).
4) Click "تفعيل حساب المالك (Dev)".
5) Reload happens automatically.
6) Open `/#/platform`.

## Environment variables
- `FUNCTIONS_EMULATOR=true` (emulator) OR `ALLOW_PLATFORM_BOOTSTRAP=true` (explicit override).

## Expected result
- A document is written to `platformUsers/{uid}` with:
  - `uid`, `platformAdmin: true`, `email`, `name`, `createdAt`, `updatedAt` (merge).
- Access to `/#/platform` works in development.

## Final auth flow (platform vs tenant)
- Platform admin path:
  - `checkIfPlatformAdmin(uid)` runs first.
  - If true, the app sets platform admin state and skips tenant/company resolution.
  - `/#/platform` works even if no company is linked.
- Normal user path:
  - Existing tenant/company resolution runs unchanged.
  - If no company is linked, the original "لم يتم العثور على شركة مرتبطة بحسابك" message is shown.

## UI behavior
- `authLoading` stays true until the platform admin check completes.
- No transient "no company" flicker.
- No redirects were added.
- Platform admins are not forced into tenant routes.
- Normal users are not redirected to platform routes.

## Security / rules
- `platformUsers/{uid}`: read is allowed only for the same authenticated `uid`.
- Client writes are blocked (`allow write: if false`); only Functions can write.
