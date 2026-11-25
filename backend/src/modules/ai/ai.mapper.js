// Row -> JobCard DTO (AI spec §11.1). Pure: no prisma/redis imports, so it can be unit-tested.
const mapJobRow = (row) => ({
  id: row.id,
  title: row.title,
  location: row.location,
  locationType: row.locationType,
  jobType: row.jobType,
  salaryMin: row.salaryMin,
  salaryMax: row.salaryMax,
  createdAt: row.createdAt,
  deadline: row.deadline,
  employer: {
    id: row.employerId,
    name: row.employerName,
    avatarUrl: row.employerAvatarUrl
  },
  score: Math.round((row.score ?? 0) * 10000) / 10000
});

module.exports = { mapJobRow };
