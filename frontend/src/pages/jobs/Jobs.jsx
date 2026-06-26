import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useJobs } from '../../hooks/useJobs';

const formatBadgeText = (text) => {
  if (!text) return text;
  return text
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
};

const toApiFilters = (filters) => {
  const result = {};
  Object.entries(filters).forEach(([key, value]) => {
    result[key] = value === '' ? undefined : value;
  });
  return result;
};

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [localFilters, setLocalFilters] = useState({
    q: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    locationType: searchParams.get('locationType') || '',
    jobType: searchParams.get('jobType') || '',
    salaryMin: searchParams.get('salaryMin') || '',
    salaryMax: searchParams.get('salaryMax') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
  });

  const [appliedFilters, setAppliedFilters] = useState(() => toApiFilters(localFilters));

  const { data, isLoading, error } = useJobs(appliedFilters);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const updateURL = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const updatedLocal = { ...localFilters, page: newPage };
    const updatedApi = { ...appliedFilters, page: newPage };
    setLocalFilters(updatedLocal);
    setAppliedFilters(updatedApi);
    updateURL(updatedApi);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const updatedLocal = { ...localFilters, page: 1 };
    const updatedApi = toApiFilters(updatedLocal);
    setLocalFilters(updatedLocal);
    setAppliedFilters(updatedApi);
    updateURL(updatedApi);
  };

  const handleClear = () => {
    const clearedLocal = {
      q: '',
      location: '',
      locationType: '',
      jobType: '',
      salaryMin: '',
      salaryMax: '',
      sortBy: 'newest',
      page: 1,
      limit: 10,
    };
    const clearedApi = toApiFilters(clearedLocal);
    setLocalFilters(clearedLocal);
    setAppliedFilters(clearedApi);
    updateURL(clearedApi);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Jobs</h1>
          
          {/* Filter skeletons */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-20"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Job card skeletons */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error loading jobs: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Jobs</h1>
        
        {/* Filters */}
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                name="q"
                value={localFilters.q}
                onChange={handleFilterChange}
                placeholder="Keywords"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={localFilters.location}
                onChange={handleFilterChange}
                placeholder="City, State"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Type</label>
              <select
                name="locationType"
                value={localFilters.locationType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                <option value="REMOTE">Remote</option>
                <option value="ONSITE">On-site</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                name="jobType"
                value={localFilters.jobType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
              <input
                type="number"
                name="salaryMin"
                value={localFilters.salaryMin}
                onChange={handleFilterChange}
                placeholder="Min"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
              <input
                type="number"
                name="salaryMax"
                value={localFilters.salaryMax}
                onChange={handleFilterChange}
                placeholder="Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                name="sortBy"
                value={localFilters.sortBy}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="newest">Newest</option>
                <option value="salaryAsc">Salary: Low to High</option>
                <option value="salaryDesc">Salary: High to Low</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        {/* Job Cards */}
        <div className="space-y-4">
          {data?.jobs?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No jobs found matching your criteria.</div>
          ) : (
            data?.jobs?.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h2>
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
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-2">
            <button
              onClick={() => handlePageChange(appliedFilters.page - 1)}
              disabled={appliedFilters.page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-700">
              Page {appliedFilters.page} of {data.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(appliedFilters.page + 1)}
              disabled={appliedFilters.page === data.totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}