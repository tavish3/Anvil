const { PDFParse } = require('pdf-parse');
const ApiError = require('../utils/ApiError');
const {
  RESUME_MAX_PDF_PAGES,
  PDF_PARSE_TIMEOUT_MS,
  RESUME_MIN_TEXT_CHARS,
  RESUME_TEXT_MAX_CHARS,
} = require('./constants');
const { cleanText, stripPdfPageMarkers, truncate } = require('./text');

const PARSE_ERROR = 'We could not read this PDF. Make sure it is not password-protected or corrupted.';
const EMPTY_ERROR = 'This PDF has no readable text (it may be a scanned image). Please upload a text-based PDF.';

async function extractPdfText(buffer) {
  let parser;
  let result;
  let timeoutId;

  try {
    parser = new PDFParse({ data: buffer });
    result = await Promise.race([
      parser.getText({ first: RESUME_MAX_PDF_PAGES }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('PDF parsing timed out')), PDF_PARSE_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error('[AI PDF] extraction failed:', err && err.message ? err.message : err);
    throw new ApiError(422, PARSE_ERROR);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (parser) {
      try {
        await parser.destroy();
      } catch (_) {
        // ignore cleanup errors
      }
    }
  }

  const text = cleanText(stripPdfPageMarkers(result && result.text ? result.text : ''));
  if (text.length < RESUME_MIN_TEXT_CHARS) {
    throw new ApiError(422, EMPTY_ERROR);
  }
  return truncate(text, RESUME_TEXT_MAX_CHARS);
}

module.exports = { extractPdfText };
