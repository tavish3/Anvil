import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyApplications, useWithdrawApplication } from '../../hooks/useApplications';
import toast from 'react-hot-toast';
import ViewApplication from '../../components/ViewApplication';
import { Eye, LogOut, Loader2 } from 'lucide-react';

const statusColors = {
  APPLIED: 'bg-blue-100 text-blue-800',
  REVIEWING: 'bg-yellow-100 text-yellow-800',
  INTERVIEW: 'bg-purple-100 text-purple-800',
  OFFERED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  APPLIED: 'Applied',
  REVIEWING: 'Reviewing',
  INTERVIEW: 'Interview',
  OFFERED: 'Offered',
  REJECTED: 'Rejected',
};

export default function MyApplications() {
  const { data: applications, isLoading, error, refetch } = useMyApplications();
  const withdrawMutation = useWithdrawApplication();
  const [withdrawId, setWithdrawId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWithdrawClick = (id) => {
    setWithdrawId(id);
    setShowConfirm(true);
  };

  const handleConfirmWithdraw = async () => {
    try {
      await withdrawMutation.mutateAsync(withdrawId);
      toast.success('Application withdrawn successfully');
      setShowConfirm(false);
      setWithdrawId(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to withdraw application');
    }
  };

  const handleCancelWithdraw = () => {
    setShowConfirm(false);
    setWithdrawId(null);
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplication(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Applications</h1>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200"></div>
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 border-t border-gray-100"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Applications</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Failed to load applications. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Applications</h1>

        {!applications || applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No applications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start browsing jobs and apply to positions that match your skills.
            </p>
            <Link
              to="/jobs"
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/jobs/${application.jobId}`}
                          state={{ hideApply: true }}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          {application.jobTitle}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{application.companyName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusColors[application.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusLabels[application.status] || application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleViewApplication(application)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="View Application"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {application.status === 'APPLIED' && (
                          <button
                            onClick={() => handleWithdrawClick(application.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            disabled={withdrawMutation.isLoading}
                            title="Withdraw Application"
                          >
                            {withdrawMutation.isLoading && withdrawId === application.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <LogOut className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Withdraw Application
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to withdraw this application? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelWithdraw}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={withdrawMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWithdraw}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  disabled={withdrawMutation.isLoading}
                >
                  {withdrawMutation.isLoading ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Application Modal */}
        <ViewApplication
          applicant={selectedApplication}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}
