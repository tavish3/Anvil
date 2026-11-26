import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout } from '../api/auth';
import NotificationBell from './NotificationBell';
import { useAiStatus } from '../hooks/useAi';
import anvilLogo from '../assets/Anvil.webp';

const Navbar = () => {
  const { user, accessToken, clearAuth } = useAuthStore();
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to logout');
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Jobs link */}
          <div className="flex items-center">
            <Link to="/jobs" className="flex items-center space-x-2">
              <img src={anvilLogo} alt="Anvil" className="h-20 w-20" />
              <span className="text-xl font-bold text-gray-900">Anvil</span>
            </Link>
          </div>

          {/* Navigation links */}
          <div className="flex items-center space-x-4">
            {accessToken ? (
              <>
                {/* Role-specific links */}
                {user?.role === 'APPLICANT' && (
                  <>
                    {aiEnabled && (
                      <Link
                        to="/recommended"
                        className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                      >
                        Recommended
                      </Link>
                    )}
                    <Link
                      to="/my-applications"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                    >
                      My Applications
                    </Link>
                  </>
                )}
                
                {user?.role === 'EMPLOYER' && (
                  <>
                    <Link
                      to="/my-listings"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                    >
                      My Listings
                    </Link>
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                    >
                      Dashboard
                    </Link>
                  </>
                )}

                {/* Notification Bell - only shown when logged in */}
                <NotificationBell />

                {/* Profile link */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  <img
                    src={user?.avatarUrl || 'https://res.cloudinary.com/ddrs5egnk/image/upload/v1782471845/pfp_b0yuaz.png'}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:inline">{user?.name}</span>
                </Link>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition disabled:opacity-50"
                >
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
