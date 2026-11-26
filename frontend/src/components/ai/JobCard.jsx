import { Link } from 'react-router-dom';

const formatBadgeText = (text) => {
  if (!text) return text;
  return text
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
};

export default function JobCard({ job, rank }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {rank != null && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded">
                #{rank}
              </span>
            )}
            <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
          </div>
          <p className="text-gray-600 mb-2">{job.employer?.name}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
              {job.location}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
              {formatBadgeText(job.locationType)}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
              {formatBadgeText(job.jobType)}
            </span>
          </div>
          {job.salaryMin && (
            <p className="text-gray-700 font-medium">
              ₹{job.salaryMin.toLocaleString()}
              {job.salaryMax && ` - ₹${job.salaryMax.toLocaleString()}`}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Posted: {new Date(job.createdAt).toLocaleDateString()}</p>
          {job.deadline && (
            <p>Deadline: {new Date(job.deadline).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
