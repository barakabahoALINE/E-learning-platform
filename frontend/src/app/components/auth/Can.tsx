import type { ReactNode } from "react";
import { useAppSelector } from "../../../hooks/reduxHooks";
import { selectCurrentUser } from "../../../features/auth/authSelectors";
import { hasPermission } from "../../../features/auth/permissions";

type CanProps = {
  permission: string;
  children: ReactNode;
};

export function Can({ permission, children }: CanProps) {
  const user = useAppSelector(selectCurrentUser);

  if (!hasPermission(user, permission)) {
    return null;
  }

  return <>{children}</>;
}
