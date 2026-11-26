import { useRef } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import {
  useMyResume,
  useUploadResume,
  useDeleteResume,
  useReprocessResume,
} from '../../hooks/useResume';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

const isPdfFile = (file) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const ResumeCard = () => {
  const fileInputRef = useRef(null);
  const { data: resume, isLoading } = useMyResume();
  const uploadResume = useUploadResume();
  const deleteResume = useDeleteResume();
  const reprocessResume = useReprocessResume();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_RESUME_SIZE) {
      toast.error('Resume must be 5MB or smaller');
      return;
    }
    if (!isPdfFile(file)) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    uploadResume.mutate(formData, {
      onSuccess: () => toast.success('Resume uploaded. We are analyzing it now.'),
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Failed to upload resume'),
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        'Delete your saved resume? This removes your job recommendations, fit checks and cover letters.'
      )
    ) {
      return;
    }
    deleteResume.mutate(undefined, {
      onSuccess: () => toast.success('Resume deleted'),
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Failed to delete resume'),
    });
  };

  const handleReprocess = () => {
    reprocessResume.mutate(undefined, {
      onSuccess: () => toast.success('Resume reprocessing started'),
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Failed to reprocess resume'),
    });
  };

  const pickFile = () => fileInputRef.current?.click();

  if (isLoading) return null;

  const profile = resume?.profile || {};
  const skills = Array.isArray(profile.skills) ? profile.skills.slice(0, 12) : [];
  const years = profile.totalYearsExperience;
  const busy = uploadResume.isPending || deleteResume.isPending || reprocessResume.isPending;

  return (
    <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800">My resume</h2>
      </div>

      {!resume && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload a PDF once to get job recommendations, fit checks, resume tips
            and AI cover letters, and apply faster with your saved resume.
          </p>
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </button>
        </div>
      )}

      {resume?.status === 'PENDING' && (
        <div className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing your resume…
        </div>
      )}

      {resume?.status === 'FAILED' && (
        <div className="space-y-4">
          <p className="text-sm text-red-600">We couldn't analyze your resume.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReprocess}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <button
              type="button"
              onClick={pickFile}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              <Upload className="h-4 w-4" />
              Replace
            </button>
          </div>
        </div>
      )}

      {resume && resume.status !== 'PENDING' && resume.status !== 'FAILED' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{resume.fileName}</span>
            {resume.fileUrl && (
              <a
                href={resume.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View PDF
              </a>
            )}
            {resume.wordCount != null && <span>{resume.wordCount} words</span>}
            {resume.updatedAt && (
              <span>Updated {format(new Date(resume.updatedAt), 'MMM d, yyyy')}</span>
            )}
          </div>

          {profile.headline && (
            <p className="text-sm font-medium text-slate-700">{profile.headline}</p>
          )}

          {years != null && (
            <p className="text-sm text-slate-600">
              ~{years} {years === 1 ? 'year' : 'years'} of experience
            </p>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={pickFile}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
            >
              <Upload className="h-4 w-4" />
              Replace
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Your resume text is sent to Google's Gemini API to power these features.
        On Google's free tier it may be used to improve Google products. Delete
        it any time.
      </p>
    </div>
  );
};

export default ResumeCard;
