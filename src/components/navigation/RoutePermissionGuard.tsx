import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

export const RoutePermissionGuard = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { canAccessPath, defaultRoute } = usePermissions();

  if (!canAccessPath(pathname)) {
    return <Redirect href={defaultRoute as never} />;
  }

  return children;
};
