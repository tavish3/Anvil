import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAiStatus, useRecommendations } from '../../hooks/useAi';
import JobCard from '../../components/ai/JobCard';
import ResumeRequiredNotice from '../../components/ai/ResumeRequiredNotice';

const PAGE_SIZE = 10;

export default function Recommended() {
  const [page, setPage] = useState(1);
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const { data, isLoading, isFetching, error } = useRecommendations(
    { page, limit: PAGE_SIZE },
    aiEnabled
  );

  const jobs = data?.ready ? data.jobs || [] : [];
  const errorMessage =
    error?.response?.data?.message ||
    error?.message ||
    'Recommendations are unavailable right now.';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recommended for you</h1>
        <p className="text-gray-500 mb-8">
          Ranked by how closely each job matches your resume.
        </p>

        {!aiEnabled && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            AI features are not enabled.
          </div>
        )}

        {aiEnabled && isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading recommendations…
          </div>
        )}

        {aiEnabled && !isLoading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}

        {aiEnabled && !isLoading && !error && data && data.resumeStatus === 'NONE' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <ResumeRequiredNotice />
          </div>
        )}

        {aiEnabled && !isLoading && !error && data && data.resumeStatus === 'PENDING' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            We're analyzing your resume — recommendations will appear shortly.
          </div>
        )}

        {aiEnabled && !isLoading && !error && data && data.resumeStatus === 'FAILED' && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">
              We couldn't analyze your resume. Please replace it and try again.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              Go to profile
            </Link>
          </div>
        )}

        {aiEnabled && !isLoading && !error && data?.ready && (
          <>
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                  No open jobs match your resume right now.
                </div>
              ) : (
                jobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    rank={(page - 1) * PAGE_SIZE + index + 1}
                  />
                ))
              )}
            </div>

            {data.totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-700">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === data.totalPages || isFetching}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
