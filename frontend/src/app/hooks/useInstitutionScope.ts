import { selectCurrentUser } from '../../features/auth/authSelectors';
import { useAppSelector } from '../../hooks/reduxHooks';

export const useInstitutionScope = () => {
  const user = useAppSelector(selectCurrentUser);

  const isViewUnrestricted = !user ? false : (
    user.is_superuser ||
    user.role === 'admin' || user.groups?.includes('Admin') ||
    user.role === 'viewer' || user.groups?.includes('Viewer')
  );
  const isManageUnrestricted = !user ? false : (
    user.is_superuser ||
    user.role === 'admin' || user.groups?.includes('Admin')
  );

  const filterByInstitution = <T extends { institution?: string }>(items: T[]): T[] => {
    if (!user) return items;
    if (isViewUnrestricted) return items;
    if (!user.institution) return [];
    return items.filter(item => item.institution === user.institution);
  };

  const getInstitutionQueryParams = () => {
    if (!user) return {};
    if (isViewUnrestricted) return {};
    if (!user.institution) return { institution: null };
    return { institution: user.institution };
  };

  const canManageItem = (itemInstitution?: string): boolean => {
    if (!user) return false;
    if (isManageUnrestricted) return true;
    if (!user.institution || !itemInstitution) return user.institution === itemInstitution;
    return user.institution === itemInstitution;
  };

  return {
    currentInstitution: user?.institution,
    isSuperAdmin: isManageUnrestricted,
    filterByInstitution,
    getInstitutionQueryParams,
    canManageItem,
  };
};

export const addInstitutionFilter = (
  params: Record<string, any>,
  isSuperAdmin: boolean,
  userInstitution?: string
) => {
  if (isSuperAdmin) return params;
  if (userInstitution) return { ...params, institution: userInstitution };
  return params;
};
