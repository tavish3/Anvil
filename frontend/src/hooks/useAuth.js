import { useMutation } from '@tanstack/react-query';
import { register, login, logout, forgotPassword, resetPassword } from '../api/auth';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const useRegister = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('Registration successful');
      if (data.user.role === 'EMPLOYER') {
        navigate('/my-listings');
      } else {
        navigate('/jobs');
      }
    },
  });
};

export const useLogin = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('Login successful');
      if (data.user.role === 'EMPLOYER') {
        navigate('/my-listings');
      } else {
        navigate('/jobs');
      }
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      navigate('/login');
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
  });
};

export const useResetPassword = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success('Password reset successful');
      navigate('/login');
    },
  });
};
