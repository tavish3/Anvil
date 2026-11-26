import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useResumeTips } from '../../hooks/useAi';
import ResumeRequiredNotice from './ResumeRequiredNotice';

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const PRIORITIES = {
  HIGH: { label: 'High', classes: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Medium', classes: 'bg-amber-100 text-amber-700' },
  LOW: { label: 'Low', classes: 'bg-gray-100 text-gray-600' },
};

const SECTION_LABELS = {
  SUMMARY: 'Summary',
  SKILLS: 'Skills',
  EXPERIENCE: 'Experience',
  EDUCATION: 'Education',
  PROJECTS: 'Projects',
  FORMATTING: 'Formatting',
  OTHER: 'Other',
};

const formatSection = (section) =>
  SECTION_LABELS[section] ||
  (section || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const isResumeRequired = (err) =>
  err?.response?.data?.errors?.[0]?.code === 'RESUME_REQUIRED';

const getErrorMessage = (err) =>
  err?.response?.status === 429
    ? "You're doing that too fast — try again in a minute."
    : err?.response?.data?.message || 'Failed to get resume tips';

export default function ResumeTipsCard({ jobId }) {
  const getTips = useResumeTips();
  const [result, setResult] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [resumeRequired, setResumeRequired] = useState(false);

  const handleGetTips = () => {
    getTips.mutate(jobId, {
      onSuccess: (data) => {
        setResult(data);
        setCollapsed(false);
      },
      onError: (err) => {
        if (isResumeRequired(err)) {
          setResumeRequired(true);
        } else {
          toast.error(getErrorMessage(err));
        }
      },
    });
  };

  if (resumeRequired) {
    return (
      <div className="mb-4">
        <ResumeRequiredNotice compact />
      </div>
    );
  }

  const tips = (result?.tips || [])
    .slice()
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a?.priority] ?? 3) - (PRIORITY_ORDER[b?.priority] ?? 3)
    );
  const keywords = result?.keywordsToConsider || [];

  return (
    <div className="mb-4 p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-800">Resume tips</h3>
        </div>
        <button
          type="button"
          onClick={handleGetTips}
          disabled={getTips.isPending}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getTips.isPending ? 'Analyzing…' : 'Get resume tips for this job'}
        </button>
      </div>

      {getTips.isPending && (
        <div
          className="flex items-center gap-2 text-sm text-gray-500"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Reviewing your resume against this job…
        </div>
      )}

      {result && (
        <div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 mb-2"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                Show tips <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Hide tips <ChevronUp className="w-3 h-3" />
              </>
            )}
          </button>

          {!collapsed && (
            <div className="space-y-4">
              {result.summary && (
                <p className="text-sm text-gray-700">{result.summary}</p>
              )}

              {tips.length > 0 && (
                <div className="space-y-3">
                  {tips.map((tip, i) => {
                    const priority = PRIORITIES[tip?.priority] || PRIORITIES.LOW;
                    return (
                      <div
                        key={i}
                        className="p-3 border border-gray-100 rounded-md bg-gray-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.classes}`}
                          >
                            {priority.label}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                            {formatSection(tip?.section)}
                          </span>
                        </div>
                        {tip?.suggestion && (
                          <p className="text-sm text-gray-700">{tip.suggestion}</p>
                        )}
                        {tip?.reason && (
                          <p className="text-xs text-gray-500 mt-1">{tip.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-1">
                    Keywords to consider
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Only add what you genuinely have experience with.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                AI-generated suggestions based only on your saved resume. Review
                before applying them.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
