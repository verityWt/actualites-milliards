import { createHash } from 'node:crypto';
import { tokenize } from '../src/behavioral-analysis.mjs';

/**
 * Reject manually entered model results without a matching, dated quote.
 * This confirms integrity of stored inputs, NOT authenticity of external sources
 * nor that an external model was actually run.
 */
export function validateExperimentResults(record, researchProfiles) {
  if (record?.schemaVersion !== 1 || !record.subject || !researchProfiles[record.subject] ||
      !Array.isArray(record.results) || !Array.isArray(record.models) ||
      !Number.isInteger(record.sampleCount) || record.results.length !== record.sampleCount) {
    throw new Error('Invalid experimental record');
  }
  const samples = researchProfiles[record.subject].speechSamples || [];
  if (!samples.length || record.results.length > samples.length) throw new Error('Missing source excerpts');
  const used = new Set();
  for (const output of record.results) {
    const key = output.date + '|' + output.url;
    if (used.has(key)) throw new Error('Duplicate experimental excerpt');
    used.add(key);
    const sample = samples.find(s => s.date === output.date && s.url === output.url);
    if (!sample || sample.reviewed !== true) throw new Error('Experimental result not linked to a reviewed excerpt');
    const hash = createHash('sha256').update(sample.text, 'utf8').digest('hex');
    if (hash !== output.sha256) throw new Error('Speech excerpt hash mismatch');
    if (tokenize(sample.text).length !== output.words) throw new Error('Inconsistent word count');
    if (!Number.isFinite(output.polarity) || output.polarity < -1 || output.polarity > 1 ||
        !Number.isFinite(output.subjectivity) || output.subjectivity < 0 || output.subjectivity > 1) {
      throw new Error('Text sentiment value out of range');
    }
  }
  if (record.comparison) {
    const x = record.comparison;
    if (!Number.isFinite(x.tfidfCosineSimilarity) ||
        x.tfidfCosineSimilarity < -1 || x.tfidfCosineSimilarity > 1 ||
        x.nSamples !== record.sampleCount ||
        record.sampleCount !== 2) throw new Error('Invalid comparison');
  }
  const declaredModels = new Set();
  for (const m of record.models) {
    if (!m || typeof m.name !== 'string' || declaredModels.has(m.name) ||
        typeof m.executed !== 'boolean' || (m.executed && !m.version)) throw new Error('Invalid model provenance');
    declaredModels.add(m.name);
  }
  return {subject:record.subject,checkedExcerpts:used.size,sourceLinked:true,
    meaning:'integrity only; model execution and original source authenticity not independently verified'};
}
