// prisma/seed.js
// Run: npx prisma db seed
// Requires: npm install --save-dev @faker-js/faker

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  employers: 30,
  applicants: 200,
  jobsPerEmployer: { min: 3, max: 8 },
  applicantsPerJob: 50,         // target — may be less if pool is exhausted
  expiredJobRatio: 0.1,         // 10% of jobs have past deadlines
  deletedJobRatio: 0.05,        // 5% of jobs are soft-deleted
  noSalaryRatio: 0.15,          // 15% of jobs omit salary
  noCoverLetterRatio: 0.3,      // 30% of applications have no cover letter
  HASH_ROUNDS: 10,
  DEMO_PASSWORD: 'Password123!',
};

// ─── Static data ──────────────────────────────────────────────────────────────

const CITIES = [
  'Bengaluru, India', 'Mumbai, India', 'Delhi, India', 'Hyderabad, India',
  'Pune, India', 'Chennai, India', 'Kolkata, India', 'Ahmedabad, India',
  'Jaipur, India', 'Noida, India', 'Gurugram, India', 'Kochi, India',
  'Remote', 'Remote', 'Remote', // weighted higher
];

const LOCATION_TYPES = ['REMOTE', 'ONSITE', 'HYBRID'];
const JOB_TYPES      = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
const STATUSES       = ['APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFERED', 'REJECTED'];

// Status weights — most apps stay early-stage, few reach OFFERED
const STATUS_WEIGHTS = [35, 30, 20, 5, 10]; // must sum to 100

const JOB_TITLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'React Developer', 'Node.js Developer', 'DevOps Engineer',
  'Data Analyst', 'Data Scientist', 'Machine Learning Engineer',
  'Mobile Developer (React Native)', 'Android Developer', 'iOS Developer',
  'UI/UX Designer', 'Product Manager', 'QA Engineer',
  'Site Reliability Engineer', 'Cloud Architect', 'Security Engineer',
  'Database Administrator', 'Technical Writer', 'Scrum Master',
  'Solutions Architect', 'Blockchain Developer', 'AI Engineer',
  'Platform Engineer', 'Embedded Systems Engineer', 'Game Developer',
];

const ALL_SKILLS = [
  'React', 'Vue.js', 'Angular', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Vite', 'Redux', 'GraphQL',
  'Node.js', 'Express', 'NestJS', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'REST APIs', 'Prisma',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'GitHub Actions', 'Jenkins', 'Linux',
  'Python', 'Pandas', 'NumPy', 'SQL', 'Power BI', 'Tableau', 'Spark', 'Kafka', 'Airflow',
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'Expo',
  'Figma', 'Adobe XD', 'Sketch', 'User Research', 'Prototyping', 'Wireframing',
  'Git', 'Agile', 'Jira', 'System Design', 'Communication', 'Problem Solving',
];

const JOB_DESCRIPTIONS = [
  (t) => `We are looking for a talented ${t} to join our growing engineering team. You will work on exciting products used by millions of users, collaborate with cross-functional teams, and take ownership of features end-to-end.`,
  (t) => `As a ${t} at our company, you will design, build, and maintain scalable systems. You will partner with product managers and designers to ship high-quality software on time.`,
  (t) => `Join us as a ${t} and help shape the future of our platform. We value clean code, strong communication, and a bias for action. Remote-friendly culture with great benefits.`,
  (t) => `We need an experienced ${t} who thrives in fast-paced startup environments. You will have the opportunity to make architectural decisions and mentor junior team members.`,
  (t) => `Our team is hiring a ${t} to help us scale our infrastructure and improve developer experience. You will work on challenging problems with a small, high-output team.`,
];

const COVER_LETTERS = [
  'I have been following your company for a while and I am excited about this opportunity. My experience aligns well with the requirements and I am confident I can contribute from day one.',
  'This role is a perfect match for my skills and career goals. I have spent the last few years working on similar problems and I am eager to bring that expertise to your team.',
  'I am passionate about building great products and your company mission resonates deeply with me. I would love to discuss how I can contribute to your team.',
  'With a strong background in the required technologies and a track record of delivering results, I believe I would be a great addition to your engineering team.',
  'I am excited to apply for this position. I enjoy solving complex problems and working in collaborative environments, both of which seem central to this role.',
  'Your job posting caught my attention because it matches exactly what I have been doing and where I want to grow. I look forward to the opportunity to discuss further.',
];

// ─── Demo accounts (always created, stable credentials) ───────────────────────

const DEMO_ACCOUNTS = {
  employers: [
    { name: 'Demo Employer One', email: 'employer1@demo.com' },
    { name: 'Demo Employer Two', email: 'employer2@demo.com' },
  ],
  applicants: [
    { name: 'Demo Applicant One', email: 'applicant1@demo.com' },
    { name: 'Demo Applicant Two', email: 'applicant2@demo.com' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  return faker.helpers.arrayElements(arr, n);
}

function weightedStatus() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i];
    if (roll < cumulative) return STATUSES[i];
  }
  return STATUSES[0];
}

function randomSalaryRange() {
  if (Math.random() < CONFIG.noSalaryRatio) return { salaryMin: null, salaryMax: null };
  const bases = [300000, 400000, 500000, 600000, 700000, 800000, 1000000, 1200000, 1500000];
  const base = pick(bases);
  const bump = pick([200000, 300000, 400000, 500000, 600000]);
  return { salaryMin: base, salaryMax: base + bump };
}

function randomDeadline(isExpired) {
  const d = new Date();
  if (isExpired) {
    d.setMonth(d.getMonth() - Math.floor(Math.random() * 12 + 1));
  } else {
    d.setMonth(d.getMonth() + Math.floor(Math.random() * 12 + 1));
  }
  return d;
}

function fakeResumeUrl(name) {
  const slug = name.toLowerCase().replace(/\s+/g, '_');
  return `https://res.cloudinary.com/ddrs5egnk/image/upload/v1782485291/sample_pdf_nn7g54.pdf`;
}

function progress(label, current, total) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '░');
  process.stdout.write(`\r  ${label}: [${bar}] ${pct}% (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║        Job Board — Database Seeder       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── Clear ──────────────────────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data...');
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  console.log('   Done.\n');

  const demoPasswordHash = await bcrypt.hash(CONFIG.DEMO_PASSWORD, CONFIG.HASH_ROUNDS);
  const usedEmails = new Set([
    ...DEMO_ACCOUNTS.employers.map(d => d.email),
    ...DEMO_ACCOUNTS.applicants.map(d => d.email),
  ]);

  // ── Seed Employers ─────────────────────────────────────────────────────────
  const totalEmployers = CONFIG.employers + DEMO_ACCOUNTS.employers.length;
  console.log(`👔 Seeding ${totalEmployers} employers...`);
  const createdEmployers = [];

  for (const demo of DEMO_ACCOUNTS.employers) {
    const user = await prisma.user.create({
      data: { name: demo.name, email: demo.email, passwordHash: demoPasswordHash, role: 'EMPLOYER', avatarUrl: `https://i.pravatar.cc/150?u=${demo.email}` },
    });
    createdEmployers.push(user);
  }

  let ei = 0;
  while (ei < CONFIG.employers) {
    const name  = faker.person.fullName();
    const email = faker.internet.email().toLowerCase();
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const user = await prisma.user.create({
      data: { name, email, passwordHash: demoPasswordHash, role: 'EMPLOYER', avatarUrl: `https://i.pravatar.cc/150?u=${email}` },
    });
    createdEmployers.push(user);
    ei++;
    progress('Employers', ei, CONFIG.employers);
  }

  // ── Seed Applicants ────────────────────────────────────────────────────────
  const totalApplicants = CONFIG.applicants + DEMO_ACCOUNTS.applicants.length;
  console.log(`\n👤 Seeding ${totalApplicants} applicants...`);
  const createdApplicants = [];

  for (const demo of DEMO_ACCOUNTS.applicants) {
    const user = await prisma.user.create({
      data: { name: demo.name, email: demo.email, passwordHash: demoPasswordHash, role: 'APPLICANT', avatarUrl: `https://i.pravatar.cc/150?u=${demo.email}` },
    });
    createdApplicants.push(user);
  }

  let ai = 0;
  while (ai < CONFIG.applicants) {
    const name  = faker.person.fullName();
    const email = faker.internet.email().toLowerCase();
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const user = await prisma.user.create({
      data: { name, email, passwordHash: demoPasswordHash, role: 'APPLICANT', avatarUrl: `https://i.pravatar.cc/150?u=${email}` },
    });
    createdApplicants.push(user);
    ai++;
    progress('Applicants', ai, CONFIG.applicants);
  }

  // ── Seed Jobs ──────────────────────────────────────────────────────────────
  console.log(`\n💼 Seeding jobs...`);
  const createdJobs = [];
  let expiredCount = 0;
  let deletedCount = 0;

  for (let i = 0; i < createdEmployers.length; i++) {
    const employer = createdEmployers[i];
    const count = faker.number.int({ min: CONFIG.jobsPerEmployer.min, max: CONFIG.jobsPerEmployer.max });

    for (let j = 0; j < count; j++) {
      const title      = pick(JOB_TITLES);
      const isExpired  = Math.random() < CONFIG.expiredJobRatio;
      const isDeleted  = !isExpired && Math.random() < CONFIG.deletedJobRatio;
      const locationType = pick(LOCATION_TYPES);
      const location     = locationType === 'REMOTE' ? 'Remote' : pick(CITIES.filter(c => c !== 'Remote'));
      const { salaryMin, salaryMax } = randomSalaryRange();

      if (isExpired) expiredCount++;
      if (isDeleted) deletedCount++;

      const job = await prisma.job.create({
        data: {
          employerId: employer.id,
          title,
          description: pick(JOB_DESCRIPTIONS)(title),
          location,
          locationType,
          jobType:    pick(JOB_TYPES),
          salaryMin,
          salaryMax,
          skills:     pickN(ALL_SKILLS, faker.number.int({ min: 3, max: 7 })),
          deadline:   randomDeadline(isExpired),
          isDeleted,
        },
      });
      createdJobs.push(job);
    }
    progress('Jobs', i + 1, createdEmployers.length);
  }

  const totalJobs  = createdJobs.length;
  const activeJobs = createdJobs.filter(j => !j.isDeleted && j.deadline > new Date());

  // ── Seed Applications ──────────────────────────────────────────────────────
  console.log(`\n📋 Seeding applications (~${CONFIG.applicantsPerJob} per active job)...`);
  let totalApplications = 0;
  const statusCounts = { APPLIED: 0, REVIEWING: 0, INTERVIEW: 0, OFFERED: 0, REJECTED: 0 };

  for (let ji = 0; ji < activeJobs.length; ji++) {
    const job     = activeJobs[ji];
    const pool    = [...createdApplicants].sort(() => Math.random() - 0.5).slice(0, CONFIG.applicantsPerJob);

    const data = pool.map(applicant => {
      const status      = weightedStatus();
      const coverLetter = Math.random() < CONFIG.noCoverLetterRatio ? null : pick(COVER_LETTERS);
      statusCounts[status]++;
      return {
        jobId:       job.id,
        applicantId: applicant.id,
        status,
        resumeUrl:   fakeResumeUrl(applicant.name),
        coverLetter,
      };
    });

    await prisma.application.createMany({ data, skipDuplicates: true });
    totalApplications += pool.length;
    progress('Applications', ji + 1, activeJobs.length);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║              Seeding Complete            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n  ⏱️  Time taken         : ${elapsed}s`);
  console.log(`  👔 Employers          : ${createdEmployers.length} (${DEMO_ACCOUNTS.employers.length} demo)`);
  console.log(`  👤 Applicants         : ${createdApplicants.length} (${DEMO_ACCOUNTS.applicants.length} demo)`);
  console.log(`  💼 Jobs (total)       : ${totalJobs}`);
  console.log(`     ├─ Active          : ${activeJobs.length}`);
  console.log(`     ├─ Expired         : ${expiredCount}`);
  console.log(`     └─ Soft-deleted    : ${deletedCount}`);
  console.log(`  📋 Applications       : ${totalApplications}`);
  console.log(`     ├─ APPLIED         : ${statusCounts.APPLIED}`);
  console.log(`     ├─ REVIEWING       : ${statusCounts.REVIEWING}`);
  console.log(`     ├─ INTERVIEW       : ${statusCounts.INTERVIEW}`);
  console.log(`     ├─ OFFERED         : ${statusCounts.OFFERED}`);
  console.log(`     └─ REJECTED        : ${statusCounts.REJECTED}`);
  console.log('\n  🔑 Demo credentials (password: Password123!)');
  console.log('     Employers  : employer1@demo.com | employer2@demo.com');
  console.log('     Applicants : applicant1@demo.com | applicant2@demo.com\n');

  // ── Seed Report ────────────────────────────────────────────────────────────
  const report = `# Seed Report

Generated: ${new Date().toISOString()}
Duration: ${elapsed}s

## Summary

| Category | Count |
|---|---|
| Employers (total) | ${createdEmployers.length} |
| Employers (demo) | ${DEMO_ACCOUNTS.employers.length} |
| Employers (faker) | ${createdEmployers.length - DEMO_ACCOUNTS.employers.length} |
| Applicants (total) | ${createdApplicants.length} |
| Applicants (demo) | ${DEMO_ACCOUNTS.applicants.length} |
| Applicants (faker) | ${createdApplicants.length - DEMO_ACCOUNTS.applicants.length} |
| Jobs (total) | ${totalJobs} |
| Jobs (active) | ${activeJobs.length} |
| Jobs (expired) | ${expiredCount} |
| Jobs (soft-deleted) | ${deletedCount} |
| Applications (total) | ${totalApplications} |

## Application Status Breakdown

| Status | Count | % |
|---|---|---|
| APPLIED | ${statusCounts.APPLIED} | ${((statusCounts.APPLIED / totalApplications) * 100).toFixed(1)}% |
| REVIEWING | ${statusCounts.REVIEWING} | ${((statusCounts.REVIEWING / totalApplications) * 100).toFixed(1)}% |
| INTERVIEW | ${statusCounts.INTERVIEW} | ${((statusCounts.INTERVIEW / totalApplications) * 100).toFixed(1)}% |
| OFFERED | ${statusCounts.OFFERED} | ${((statusCounts.OFFERED / totalApplications) * 100).toFixed(1)}% |
| REJECTED | ${statusCounts.REJECTED} | ${((statusCounts.REJECTED / totalApplications) * 100).toFixed(1)}% |

## Configuration Used

| Setting | Value |
|---|---|
| Faker employers | ${CONFIG.employers} |
| Faker applicants | ${CONFIG.applicants} |
| Jobs per employer | ${CONFIG.jobsPerEmployer.min}–${CONFIG.jobsPerEmployer.max} |
| Applicants per job | ${CONFIG.applicantsPerJob} |
| Expired job ratio | ${CONFIG.expiredJobRatio * 100}% |
| Soft-deleted job ratio | ${CONFIG.deletedJobRatio * 100}% |
| No-salary ratio | ${CONFIG.noSalaryRatio * 100}% |
| No-cover-letter ratio | ${CONFIG.noCoverLetterRatio * 100}% |

## Demo Accounts

All accounts use password: \`Password123!\`

### Employers
| Name | Email |
|---|---|
${DEMO_ACCOUNTS.employers.map(e => `| ${e.name} | ${e.email} |`).join('\n')}

### Applicants
| Name | Email |
|---|---|
${DEMO_ACCOUNTS.applicants.map(a => `| ${a.name} | ${a.email} |`).join('\n')}
`;

  const reportPath = path.join(__dirname, 'seed-report.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`  📄 Report saved to: prisma/seed-report.md\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
