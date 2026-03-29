import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns permission helpers based on the user's app-level role.
 * - admin:  full access (create, edit, delete, export)
 * - user:   create + edit, no delete/export
 * - viewer: read-only (no create/edit/delete/export)
 */
export function usePermission() {
  const { role } = useAuth();

  const isAdmin   = role === 'admin' || role === 'reseller';
  const isUser    = role === 'user';
  const isViewer  = role === 'viewer';

  return {
    canCreate: isAdmin || isUser,
    canEdit:   isAdmin || isUser,
    canDelete: isAdmin,
    canExport: isAdmin,
    isAdmin,
    isViewer,
    role,
  };
}
