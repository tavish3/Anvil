import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAiStatus, useJobInsights, useRegenerateInsights } from '../../hooks/useAi';

const EXPERIENCE_LEVEL_LABELS = {
  INTERN: 'Intern',
  ENTRY: 'Entry',
  MID: 'Mid',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

export default function JobAiSummary({ jobId, isOwner }) {
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const { data } = useJobInsights(jobId, { enabled: aiEnabled });
  const regenerate = useRegenerateInsights(jobId);

  if (!aiEnabled || !data) return null;

  const { status, summary, highlights } = data;

  if (status === 'NONE' || status === 'FAILED') {
    if (!isOwner) return null;
    return (
      <div className="mb-8 p-4 border border-dashed border-gray-300 rounded-lg flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {status === 'FAILED' ? 'AI summary failed.' : 'No AI summary yet.'}
        </p>
        <button
          type="button"
          onClick={() =>
            regenerate.mutate(undefined, {
              onError: (err) =>
                toast.error(
                  err.response?.data?.message || 'Failed to start AI summary'
                ),
            })
          }
          disabled={regenerate.isPending}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {regenerate.isPending
            ? 'Starting...'
            : status === 'FAILED'
              ? 'Retry'
              : 'Generate AI summary'}
        </button>
      </div>
    );
  }

  if (status === 'PENDING' && !summary) {
    return (
      <div
        className="mb-8 p-4 border border-gray-200 rounded-lg flex items-center gap-2 text-sm text-gray-500"
        aria-live="polite"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating AI summary…
      </div>
    );
  }

  const h = highlights || {};
  const experienceLevel = h.experienceLevel;
  const responsibilities = h.responsibilities || [];
  const requirements = h.requirements || [];
  const niceToHave = h.niceToHave || [];
  const perks = h.perks || [];

  return (
    <div className="mb-8 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-800">AI summary</h3>
        {status === 'PENDING' && (
          <span className="text-xs text-gray-500">(updating…)</span>
        )}
      </div>

      {summary && <p className="text-gray-700 text-sm mb-3">{summary}</p>}

      {experienceLevel && experienceLevel !== 'UNSPECIFIED' && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 mr-2">
            Experience level
          </span>
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
            {EXPERIENCE_LEVEL_LABELS[experienceLevel] || experienceLevel}
          </span>
        </div>
      )}

      {responsibilities.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-1">
            Key responsibilities
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {responsibilities.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {requirements.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-1">
            Requirements
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {requirements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {(niceToHave.length > 0 || perks.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {niceToHave.map((item, i) => (
            <span
              key={`nice-${i}`}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
            >
              {item}
            </span>
          ))}
          {perks.map((item, i) => (
            <span
              key={`perk-${i}`}
              className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        AI-generated — may contain mistakes. See the full description below.
      </p>
    </div>
  );
}
