
import React, { ReactNode, PropsWithChildren } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

type RoleGateProps = { 
  allow: UserRole[]; 
  fallback?: ReactNode; 
};

// Fix: Use PropsWithChildren to correctly type the component and resolve the missing 'children' prop error.
export default function RoleGate({ allow, children, fallback = null }: PropsWithChildren<RoleGateProps>) {
  const { role } = useAuth();
  if (!role) return <>{fallback}</>;
  return allow.includes(role) ? <>{children}</> : <>{fallback}</>;
}