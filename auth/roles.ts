import { UserRole } from '../types';

// Role presets mapping for UI and permissions
export const RolePresets = {
  Admin: UserRole.Owner,
  Accountant: UserRole.Manager,
  Cashier: UserRole.Employee,
  Viewer: UserRole.Viewer,
} as const;

export function isRoleAtLeast(role: UserRole | null, required: UserRole): boolean {
  if (!role) return false;
  const order = [UserRole.Viewer, UserRole.Employee, UserRole.Manager, UserRole.Owner];
  const idx = order.indexOf(role);
  const reqIdx = order.indexOf(required);
  return idx >= 0 && reqIdx >= 0 && idx >= reqIdx;
}

export function normalizeRole(name: string): UserRole | null {
  const key = String(name || '').toLowerCase();
  switch (key) {
    case 'admin':
    case 'owner':
      return UserRole.Owner;
    case 'accountant':
    case 'manager':
      return UserRole.Manager;
    case 'cashier':
    case 'employee':
      return UserRole.Employee;
    case 'viewer':
      return UserRole.Viewer;
    default:
      return null;
  }
}
