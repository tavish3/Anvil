import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useAiSearch } from '../../hooks/useAi';
import JobCard from './JobCard';

const EXAMPLES = [
  'remote react developer, 10+ LPA',
  'backend internship in Bengaluru',
  'data analyst, hybrid, python and sql',
  'junior devops engineer',
];

const LOCATION_TYPE_LABELS = {
  REMOTE: 'Remote',
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
};

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
};

const buildInterpretedChips = (interpreted) => {
  const chips = [];
  if (!interpreted) return chips;

  if (interpreted.semanticQuery) {
    chips.push({ key: 'semantic', label: interpreted.semanticQuery });
  }

  const filters = interpreted.filters || {};
  if (filters.locationType && LOCATION_TYPE_LABELS[filters.locationType]) {
    chips.push({ key: 'locationType', label: LOCATION_TYPE_LABELS[filters.locationType] });
  }
  if (filters.jobType && JOB_TYPE_LABELS[filters.jobType]) {
    chips.push({ key: 'jobType', label: JOB_TYPE_LABELS[filters.jobType] });
  }
  if (filters.location) {
    chips.push({ key: 'location', label: `Location: ${filters.location}` });
  }
  if (filters.salaryMin != null) {
    chips.push({ key: 'salaryMin', label: `Min ₹${filters.salaryMin.toLocaleString('en-IN')}` });
  }
  if (filters.salaryMax != null) {
    chips.push({ key: 'salaryMax', label: `Max ₹${filters.salaryMax.toLocaleString('en-IN')}` });
  }

  return chips;
};

export default function AiJobSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aq = searchParams.get('aq') || '';
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const [input, setInput] = useState(aq);
  const [lastAq, setLastAq] = useState(aq);
  if (aq !== lastAq) {
    setLastAq(aq);
    setInput(aq);
  }

  const { data, isLoading, isFetching, error } = useAiSearch(
    { q: aq, page, limit: 10 },
    !!aq
  );

  const submit = (text) => {
    const trimmed = (text || '').trim();
    if (trimmed.length < 2) return;
    setSearchParams({ mode: 'ai', aq: trimmed, page: '1' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(input);
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ mode: 'ai', aq, page: String(newPage) });
  };

  const interpretedChips = buildInterpretedChips(data?.interpreted);
  const jobs = data?.jobs || [];
  const errorMessage =
    error?.response?.data?.message || error?.message || 'AI search is unavailable right now.';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Describe the job you're looking for</h1>
        <p className="text-gray-500 mb-6">
          Use everyday language — mention the role, skills, location, work mode or salary.
        </p>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="e.g. remote react developer, 10+ LPA"
              aria-label="Describe the job you're looking for"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={input.trim().length < 2 || isFetching}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4" aria-hidden="true" />
              )}
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setInput(example);
                  submit(example);
                }}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {!aq && (
          <p className="text-gray-500 text-center py-8">
            Type a description above or try one of the examples to search with AI.
          </p>
        )}

        {aq && isLoading && (
          <div className="space-y-4" aria-live="polite">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="flex gap-2 mb-3">
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {aq && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => setSearchParams({ q: aq })}
              className="mt-3 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Search by keywords instead
            </button>
          </div>
        )}

        {aq && !isLoading && !error && data && (
          <>
            {interpretedChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">Understood as:</span>
                {interpretedChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="px-2 py-1 bg-indigo-50 text-indigo-700 text-sm rounded"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No matching jobs. Try rephrasing or removing a filter.
                </div>
              ) : (
                jobs.map((job) => <JobCard key={job.id} job={job} />)
              )}
            </div>

            {data.totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
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
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === data.totalPages || isFetching}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-400 mt-8">
          AI search understands meaning, not just keywords. Results may not be perfect.
        </p>
      </div>
    </div>
  );
}
