import JobCard from './JobCard';
import { useAiStatus, useSimilarJobs } from '../../hooks/useAi';

export default function SimilarJobs({ jobId }) {
  const { data: aiStatus } = useAiStatus();
  const aiEnabled = aiStatus?.enabled === true;
  const { data } = useSimilarJobs(jobId, aiEnabled);

  const jobs = data?.ready ? data.jobs || [] : [];
  if (!aiEnabled || jobs.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar jobs</h2>
      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
