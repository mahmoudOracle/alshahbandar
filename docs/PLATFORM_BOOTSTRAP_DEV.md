# Platform Bootstrap (Dev Only)
Goal: allow the currently logged-in user to become a platform admin in development without manual Firestore edits.

## Requirements
- Functions Emulator is running OR `ALLOW_PLATFORM_BOOTSTRAP=true` is set.
- Web app runs in development mode (`import.meta.env.DEV`).
- Emulators are used only when `VITE_USE_EMULATORS=true` in DEV.
- The bootstrap callable runs on Functions Emulator or on deployed Functions with `ALLOW_PLATFORM_BOOTSTRAP=true`.

## Steps
1) Start the Functions Emulator or set `ALLOW_PLATFORM_BOOTSTRAP=true`.
2) Log in normally.
3) Open a page that shows "غير مصرح" (e.g. `/#/platform`).
4) Click "تفعيل حساب المالك (Dev)".
5) Page reloads automatically.
6) Open `/#/platform`.

## Expected result
- Firestore document is written at `platformUsers/{uid}` with:
  - `uid`
  - `platformAdmin: true`
  - `email`
  - `name`
  - `createdAt`
  - `updatedAt`
  - (merge write; no overwrites)
- Access to `/#/platform` works in development.
