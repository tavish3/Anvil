import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAnalyzeFit } from '../../hooks/useAi';
import ResumeRequiredNotice from './ResumeRequiredNotice';

const VERDICTS = {
  STRONG_FIT: { label: 'Strong fit', classes: 'bg-green-100 text-green-700' },
  GOOD_FIT: { label: 'Good fit', classes: 'bg-blue-100 text-blue-700' },
  PARTIAL_FIT: { label: 'Partial fit', classes: 'bg-amber-100 text-amber-700' },
  WEAK_FIT: { label: 'Weak fit', classes: 'bg-red-100 text-red-700' },
};

const isResumeRequired = (err) =>
  err?.response?.data?.errors?.[0]?.code === 'RESUME_REQUIRED';

const getErrorMessage = (err) =>
  err?.response?.status === 429
    ? "You're doing that too fast — try again in a minute."
    : err?.response?.data?.message || 'Failed to analyze fit';

const ScoreRing = ({ score }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
        {clamped}
      </span>
    </div>
  );
};

export default function FitAnalysisCard({ jobId }) {
  const analyzeFit = useAnalyzeFit();
  const [result, setResult] = useState(null);
  const [resumeRequired, setResumeRequired] = useState(false);

  const handleCheck = () => {
    analyzeFit.mutate(jobId, {
      onSuccess: (data) => setResult(data),
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

  const analysis = result?.analysis;
  const verdict = VERDICTS[analysis?.verdict];
  const matchedSkills = analysis?.matchedSkills || [];
  const missingSkills = analysis?.missingSkills || [];
  const strengths = analysis?.strengths || [];
  const gaps = analysis?.gaps || [];

  return (
    <div className="mb-4 p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-800">Fit analysis</h3>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={analyzeFit.isPending}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzeFit.isPending ? 'Analyzing…' : 'Check my fit'}
        </button>
      </div>

      {analyzeFit.isPending && (
        <div
          className="flex items-center gap-2 text-sm text-gray-500"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing your resume against this job…
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={analysis.score} />
            {verdict && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${verdict.classes}`}
              >
                {verdict.label}
              </span>
            )}
          </div>

          {analysis.summary && (
            <p className="text-sm text-gray-700">{analysis.summary}</p>
          )}

          {matchedSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">
                Matched skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {missingSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">
                Missing skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">
                Strengths
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {gaps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Gaps</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {gaps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendation && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Recommendation:</span>{' '}
              {analysis.recommendation}
            </p>
          )}

          <p className="text-xs text-gray-400">
            AI-generated assessment based only on your saved resume. Use it as
            guidance, not a verdict.
          </p>
        </div>
      )}
    </div>
  );
}
