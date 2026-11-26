import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCoverLetter } from '../../hooks/useAi';
import ResumeRequiredNotice from './ResumeRequiredNotice';

const TONES = [
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'ENTHUSIASTIC', label: 'Enthusiastic' },
  { value: 'CONCISE', label: 'Concise' },
];

const isResumeRequired = (err) =>
  err?.response?.data?.errors?.[0]?.code === 'RESUME_REQUIRED';

const getErrorMessage = (err) =>
  err?.response?.status === 429
    ? "You're doing that too fast — try again in a minute."
    : err?.response?.data?.message || 'Failed to write cover letter';

export default function CoverLetterAssistant({
  jobId,
  hasResume,
  existingText,
  onGenerated,
}) {
  const coverLetter = useCoverLetter();
  const [tone, setTone] = useState('PROFESSIONAL');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
  const [resumeRequired, setResumeRequired] = useState(false);

  const handleGenerate = () => {
    coverLetter.mutate(
      { jobId, tone, notes: notes.trim() || undefined },
      {
        onSuccess: (data) => {
          setResult(data);
          if (
            data?.coverLetter &&
            existingText &&
            !window.confirm(
              'This will replace the cover letter you already wrote. Continue?'
            )
          ) {
            return;
          }
          if (data?.coverLetter) {
            onGenerated?.(data.coverLetter);
          }
        },
        onError: (err) => {
          if (isResumeRequired(err)) {
            setResumeRequired(true);
          } else {
            toast.error(getErrorMessage(err));
          }
        },
      }
    );
  };

  if (!hasResume || resumeRequired) {
    return (
      <div className="mb-4">
        <ResumeRequiredNotice compact />
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 border border-indigo-100 bg-indigo-50/40 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-medium text-gray-800">
          Cover letter assistant
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          disabled={coverLetter.isPending}
          aria-label="Cover letter tone"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          {TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          disabled={coverLetter.isPending}
          placeholder="Anything to emphasize? (optional)"
          aria-label="Cover letter notes"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={coverLetter.isPending}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {coverLetter.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Writing… this can take up to a minute
          </span>
        ) : result ? (
          'Regenerate'
        ) : (
          '✨ Write with AI'
        )}
      </button>

      {result?.warnings?.length > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">Please review before sending:</p>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1">
            {result.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Review and edit before submitting — AI can make mistakes.
      </p>
    </div>
  );
}
