import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { getMe, updateMe, updateAvatar } from '../../api/users';

const Profile = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
  });

  // Sync name state when profile data changes
  useEffect(() => {
    if (profile?.name && !isEditingName) {
      setName(profile.name);
    }
    if (profile?.avatarUrl && !avatarFile) {
      setAvatarPreview(profile.avatarUrl);
    }
  }, [profile, isEditingName, avatarFile]);

  const updateNameMutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      const { setAuth } = useAuthStore.getState();
      setAuth(data, useAuthStore.getState().accessToken);
      toast.success('Name updated successfully');
      setIsEditingName(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update name');
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: updateAvatar,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      const { setAuth } = useAuthStore.getState();
      setAuth(data, useAuthStore.getState().accessToken);
      toast.success('Avatar updated successfully');
      setAvatarFile(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update avatar');
      setAvatarPreview(profile?.avatarUrl || null);
      setAvatarFile(null);
    },
  });

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      updateNameMutation.mutate({ name });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Avatar must be less than 2MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Avatar must be JPEG or PNG');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarSubmit = (e) => {
    e.preventDefault();
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      updateAvatarMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="animate-pulse">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-xl w-1/4 mb-8"></div>
              <div className="flex items-center space-x-6 mb-8">
                <div className="h-28 w-28 bg-gradient-to-br from-gray-200 to-gray-100 rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/3"></div>
                  <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayProfile = profile || user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
            Profile
          </h1>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-lg opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <img
                src={avatarPreview || 'https://res.cloudinary.com/ddrs5egnk/image/upload/v1782471845/pfp_b0yuaz.png'}
                alt="Avatar"
                className="relative h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <label className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            {avatarFile && (
              <div className="flex space-x-3">
                <button
                  onClick={handleAvatarSubmit}
                  disabled={updateAvatarMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  {updateAvatarMutation.isPending ? 'Uploading...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(displayProfile?.avatarUrl || null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Name Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Name</label>
            {isEditingName ? (
              <form onSubmit={handleNameSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={updateNameMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  {updateNameMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setName(displayProfile?.name || '');
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between group">
                <p className="text-xl font-medium text-slate-800">{displayProfile?.name}</p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Email</label>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl">
                <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg text-slate-800">{displayProfile?.email}</p>
            </div>
          </div>

          {/* Role Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">Role</label>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {displayProfile?.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
