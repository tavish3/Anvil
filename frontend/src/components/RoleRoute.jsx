import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function RoleRoute({ children, allowedRole }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
