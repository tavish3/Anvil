import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useJob } from '../../hooks/useJobs';
import { useApplyToJob } from '../../hooks/useApplications';
import { useAiStatus } from '../../hooks/useAi';
import { useMyResume } from '../../hooks/useResume';
import useAuthStore from '../../store/authStore';
import JobAiSummary from '../../components/ai/JobAiSummary';
import SimilarJobs from '../../components/ai/SimilarJobs';
import FitAnalysisCard from '../../components/ai/FitAnalysisCard';
import ResumeTipsCard from '../../components/ai/ResumeTipsCard';
import CoverLetterAssistant from '../../components/ai/CoverLetterAssistant';
import ResumeRequiredNotice from '../../components/ai/ResumeRequiredNotice';
import toast from 'react-hot-toast';

const formatBadgeText = (text) => {
  if (!text) return text;
  return text
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
};

export default function JobDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { data, isLoading, error } = useJob(id);
  const applyToJob = useApplyToJob();
  const user = useAuthStore((state) => state.user);
  const hideApplySection = location.state?.hideApply;
  
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    resume: null,
    coverLetter: '',
  });

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleApply = (e) => {
    e.preventDefault();

    if (!usingSaved && !formData.resume) {
      toast.error('Please upload your resume (PDF)');
      return;
    }

    const formDataToSend = new FormData();
    if (usingSaved) {
      formDataToSend.append('useSavedResume', 'true');
    } else {
      formDataToSend.append('resume', formData.resume);
    }
    if (formData.coverLetter) {
      formDataToSend.append('coverLetter', formData.coverLetter);
    }

    applyToJob.mutate(
      { jobId: id, formData: formDataToSend },
      {
        onSuccess: () => {
          toast.success('Application submitted successfully!');
          setShowApplyModal(false);
          setFormData({ resume: null, coverLetter: '' });
          setUseSaved(true);
          queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Failed to apply');
        },
      }
    );
  };

  const isApplicant = user?.role === 'APPLICANT';
  const isDeadlinePassed = data?.deadline && new Date(data.deadline) < new Date();

  const queryClient = useQueryClient();
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const { data: savedResume } = useMyResume({ enabled: aiEnabled && isApplicant });
  const [useSaved, setUseSaved] = useState(true);
  const usingSaved = aiEnabled && isApplicant && !!savedResume && useSaved;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error loading job: {error.message}
          </div>
        </div>
      </div>
    );
  }

  const job = data;

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-gray-500">Job not found</div>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === 'EMPLOYER' && user?.id === job.employer?.id;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/jobs" className="text-indigo-600 hover:text-indigo-500 mb-4 inline-block">
          ← Back to Jobs
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            {job.employer?.avatarUrl && (
              <img
                src={job.employer.avatarUrl}
                alt={job.employer.name}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="text-lg font-medium text-gray-900">{job.employer?.name}</p>
              <p className="text-sm text-gray-500">Posted {new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              📍 {job.location}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {formatBadgeText(job.locationType)}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              {formatBadgeText(job.jobType)}
            </span>
            {job.salaryMin && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                💰 ₹{job.salaryMin.toLocaleString()}
                {job.salaryMax && ` - ₹${job.salaryMax.toLocaleString()}`}
              </span>
            )}
          </div>

          {job.deadline && (
            <div className="mb-6">
              <p className={`text-sm ${isDeadlinePassed ? 'text-red-600' : 'text-gray-600'}`}>
                Application Deadline: {new Date(job.deadline).toLocaleDateString()}
                {isDeadlinePassed && ' (Passed)'}
              </p>
            </div>
          )}

          <div className="mb-8">
            <JobAiSummary jobId={id} isOwner={isOwner} />
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isApplicant && !hideApplySection && !isDeadlinePassed && aiEnabled && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                AI tools for this job
              </h2>
              {savedResume === null ? (
                <ResumeRequiredNotice />
              ) : (
                <>
                  <FitAnalysisCard key={id} jobId={id} />
                  <ResumeTipsCard key={id} jobId={id} />
                </>
              )}
            </div>
          )}

          {!hideApplySection && (
            <>
              {isApplicant && !isDeadlinePassed && (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Apply Now
                </button>
              )}

              {!isApplicant && (
                <p className="text-gray-500 text-sm">
                  {isDeadlinePassed ? 'Application deadline has passed.' : 'Log in as an applicant to apply for this job.'}
                </p>
              )}
            </>
          )}
        </div>

        <SimilarJobs jobId={id} />

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Apply for {job.title}</h2>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>


              <form onSubmit={handleApply}>
                {aiEnabled && isApplicant && savedResume && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resume
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="resume-choice"
                          checked={useSaved}
                          onChange={() => setUseSaved(true)}
                        />
                        Use my saved resume ({savedResume.fileName})
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="resume-choice"
                          checked={!useSaved}
                          onChange={() => setUseSaved(false)}
                        />
                        Upload a different PDF
                      </label>
                    </div>
                  </div>
                )}

                {!usingSaved && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resume (PDF)*
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required={!usingSaved}
                    />
                  </div>
                )}

                {aiEnabled && isApplicant && (
                  <CoverLetterAssistant
                    jobId={id}
                    hasResume={!!savedResume}
                    existingText={formData.coverLetter}
                    onGenerated={(text) =>
                      setFormData((f) => ({ ...f, coverLetter: text }))
                    }
                  />
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Letter (Optional)
                  </label>
                  <textarea
                    value={formData.coverLetter}
                    onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Tell us why you're a great fit..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applyToJob.isPending}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyToJob.isPending ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
