import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { paths } from '../globals/paths';

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to={paths.signIn} replace />;
  return <>{children}</>;
}
