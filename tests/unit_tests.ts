import assert from 'node:assert';
import { parseResumeFile } from '../src/utils/parser';

// Cosine similarity logic from run_evals
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Domain cleaning logic from jobs endpoint
function cleanDomain(d: string): string {
  try {
    let clean = d.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return new URL(clean).hostname;
    }
    return clean;
  } catch (e) {
    return d.trim();
  }
}

async function runTests() {
  console.log('=============================================');
  console.log('RUNNING UNIT TESTS');
  console.log('=============================================');

  // Test 1: Cosine Similarity calculations
  console.log('Running Test 1: Cosine Similarity...');
  assert.strictEqual(cosineSimilarity([1, 0], [1, 0]), 1.0);
  assert.strictEqual(cosineSimilarity([1, 0], [0, 1]), 0.0);
  assert.ok(Math.abs(cosineSimilarity([1, 1], [1, 0]) - 0.7071) < 0.001);
  console.log('✅ Cosine Similarity Tests Passed!');

  // Test 2: Domain cleaning parser
  console.log('Running Test 2: Domain Cleaning...');
  assert.strictEqual(cleanDomain('https://nvidia.wd5.myworkdayjobs.com'), 'nvidia.wd5.myworkdayjobs.com');
  assert.strictEqual(cleanDomain('explore.jobs.netflix.net'), 'explore.jobs.netflix.net');
  assert.strictEqual(cleanDomain('   careers.google.com  '), 'careers.google.com');
  console.log('✅ Domain Cleaning Tests Passed!');

  // Test 3: Plain text file parser
  console.log('Running Test 3: Parser (TXT)...');
  const txtBuffer = Buffer.from('Hello Resume Text');
  const txtResult = await parseResumeFile(txtBuffer, 'text/plain');
  assert.strictEqual(txtResult, 'Hello Resume Text');
  console.log('✅ Parser TXT Tests Passed!');

  console.log('=============================================');
  console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! (3/3)');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('❌ Unit test suite failed:', err);
  process.exit(1);
});
