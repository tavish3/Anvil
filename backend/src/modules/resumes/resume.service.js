const { Prisma } = require('@prisma/client');
const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const uploadToCloudinary = require('../../utils/uploadToCloudinary');
const { extractPdfText } = require('../../ai/pdf');
const { sha256, truncate } = require('../../ai/text');
const { clearResumeEmbedding } = require('../../ai/repository');
const { enqueueResumeProcessing } = require('../../queues/ai.queue');
const { toResumeDTO } = require('./resume.mapper');

const FILE_NAME_MAX_CHARS = 120;

// AI spec §12.4.1: store one resume per applicant. Text is extracted synchronously;
// profile + embedding are built asynchronously by the AI worker.
const upsertResume = async (userId, file) => {
  if (!file || !file.buffer) {
    throw new ApiError(400, 'Resume file is required');
  }

  // mimetype can be spoofed, so verify the PDF magic number
  if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new ApiError(400, 'Only PDF files are allowed');
  }

  const text = await extractPdfText(file.buffer);
  const textHash = sha256(text);

  // Same content already processed: return it unchanged (no upload, no reprocessing)
  const existing = await prisma.resume.findUnique({ where: { userId } });
  if (existing && existing.textHash === textHash && existing.status === 'READY') {
    return toResumeDTO(existing);
  }

  const fileUrl = await uploadToCloudinary(file.buffer, 'job-board/resumes');
  const fileName = truncate(file.originalname || 'resume.pdf', FILE_NAME_MAX_CHARS);

  const row = await prisma.resume.upsert({
    where: { userId },
    create: { userId, fileUrl, fileName, text, textHash, status: 'PENDING' },
    update: { fileUrl, fileName, text, textHash, profile: Prisma.DbNull, status: 'PENDING', error: null, processedAt: null }
  });

  await clearResumeEmbedding(prisma, userId);
  await enqueueResumeProcessing(userId);

  return toResumeDTO(row);
};

const getResume = async (userId) => {
  const row = await prisma.resume.findUnique({ where: { userId } });
  return row ? toResumeDTO(row) : null;
};

const deleteResume = async (userId) => {
  const row = await prisma.resume.findUnique({ where: { userId }, select: { id: true } });
  if (!row) {
    throw new ApiError(404, 'No resume found');
  }
  // The Cloudinary file is intentionally kept: past applications reference the same URL.
  await prisma.resume.delete({ where: { userId } });
};

const reprocessResume = async (userId) => {
  const row = await prisma.resume.findUnique({ where: { userId } });
  if (!row) {
    throw new ApiError(404, 'No resume found');
  }

  const updated = await prisma.resume.update({
    where: { userId },
    data: { status: 'PENDING', error: null }
  });
  await enqueueResumeProcessing(userId);

  return toResumeDTO(updated);
};

module.exports = { upsertResume, getResume, deleteResume, reprocessResume };
