import { useSearchParams } from 'react-router-dom';
import { useAiStatus } from '../../hooks/useAi';
import KeywordJobs from './KeywordJobs';
import AiJobSearch from '../../components/ai/AiJobSearch';

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const aiMode = searchParams.get('mode') === 'ai' && aiEnabled;

  const tabClass = (active) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-4 border-b border-gray-200" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!aiMode}
            onClick={() => setSearchParams({})}
            className={tabClass(!aiMode)}
          >
            Keyword search
          </button>
          {aiEnabled && (
            <button
              type="button"
              role="tab"
              aria-selected={aiMode}
              onClick={() => setSearchParams({ mode: 'ai' })}
              className={tabClass(aiMode)}
            >
              ✨ AI search
            </button>
          )}
        </div>
      </div>
      {aiMode ? <AiJobSearch /> : <KeywordJobs />}
    </div>
  );
}
