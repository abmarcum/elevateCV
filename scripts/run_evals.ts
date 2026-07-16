import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';

// 1. Simple helper to parse and load .env manually (no external dotenv package required)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        let val = match[2].trim();
        // Remove quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[match[1]] = val;
      }
    });
  }
}

loadEnv();

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error('ERROR: OPENAI_API_KEY is not defined in .env file.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

const cohereKey = process.env.COHERE_API_KEY;
if (!cohereKey) {
  console.warn('Warning: COHERE_API_KEY is not defined in environment variables. Cohere Rerank will fall back to cosine similarity.');
}
const cohere = cohereKey ? new CohereClient({ token: cohereKey }) : null;

// 2. Define the evaluation dataset (5 resumes and 5 job descriptions)
interface ResumeData {
  id: string;
  name: string;
  targetRole: string;
  text: string;
  chunks: string[]; // For advanced retrieval
}

interface JobData {
  id: string;
  title: string;
  description: string;
}

const resumes: ResumeData[] = [
  {
    id: 'R1',
    name: 'Alice Dev',
    targetRole: 'Senior React Developer',
    text: `Alice Dev. Senior React Developer with 6 years experience.
Skills: React, Next.js, TypeScript, TailwindCSS, Redux, Jest, Webpack.
Experience:
- Senior Frontend Engineer at TechCorp (2022 - Present): Led React and Next.js frontend rebuilding, improving Core Web Vitals by 35%. Mentored 4 junior developers.
- React Developer at WebBuilders (2020 - 2022): Developed responsive dashboards in React, integrating Rest APIs and WebSockets.
Education: BS in Computer Science, State University, 2020.`,
    chunks: [
      'Alice Dev. Senior React Developer with 6 years experience.',
      'Skills: React, Next.js, TypeScript, TailwindCSS, Redux, Jest, Webpack.',
      'Experience: Senior Frontend Engineer at TechCorp (2022 - Present): Led React and Next.js frontend rebuilding, improving Core Web Vitals by 35%. Mentored 4 junior developers.',
      'Experience: React Developer at WebBuilders (2020 - 2022): Developed responsive dashboards in React, integrating Rest APIs and WebSockets.',
      'Education: BS in Computer Science, State University, 2020.'
    ]
  },
  {
    id: 'R2',
    name: 'Bob Product',
    targetRole: 'Technical Product Manager',
    text: `Bob Product. Technical Product Manager with 5 years experience.
Skills: Agile, Scrum, JIRA, SQL, Product Strategy, Roadmap planning, User Interviews, A/B Testing.
Experience:
- Technical Product Manager at ShopFlow (2023 - Present): Owned checkout funnel optimizations, increasing conversion rate by 12%. Defined roadmap and managed 10 engineers.
- Associate Product Manager at CloudSaaS (2021 - 2023): Conducted user research and designed specifications for core analytics features.
Education: MBA, Business School, 2021. BS in Information Systems, 2019.`,
    chunks: [
      'Bob Product. Technical Product Manager with 5 years experience.',
      'Skills: Agile, Scrum, JIRA, SQL, Product Strategy, Roadmap planning, User Interviews, A/B Testing.',
      'Experience: Technical Product Manager at ShopFlow (2023 - Present): Owned checkout funnel optimizations, increasing conversion rate by 12%. Defined roadmap and managed 10 engineers.',
      'Experience: Associate Product Manager at CloudSaaS (2021 - 2023): Conducted user research and designed specifications for core analytics features.',
      'Education: MBA, Business School, 2021. BS in Information Systems, 2019.'
    ]
  },
  {
    id: 'R3',
    name: 'Charlie Data',
    targetRole: 'Data Scientist',
    text: `Charlie Data. Data Scientist specializing in Machine Learning.
Skills: Python, SQL, PyTorch, Scikit-Learn, Pandas, AWS, Docker, Git, Tableau.
Experience:
- Data Scientist at InsightsInc (2022 - Present): Built predictive churn models saving $1.2M annually. Implemented NLP pipelines for review sentiment analysis.
- Data Analyst at RetailMetrics (2020 - 2022): Developed executive Tableau dashboards and performed predictive SQL forecasting.
Education: MS in Data Science, Tech Institute, 2020.`,
    chunks: [
      'Charlie Data. Data Scientist specializing in Machine Learning.',
      'Skills: Python, SQL, PyTorch, Scikit-Learn, Pandas, AWS, Docker, Git, Tableau.',
      'Experience: Data Scientist at InsightsInc (2022 - Present): Built predictive churn models saving $1.2M annually. Implemented NLP pipelines for review sentiment analysis.',
      'Experience: Data Analyst at RetailMetrics (2020 - 2022): Developed executive Tableau dashboards and performed predictive SQL forecasting.',
      'Education: MS in Data Science, Tech Institute, 2020.'
    ]
  },
  {
    id: 'R4',
    name: 'Diana Design',
    targetRole: 'Lead Product Designer',
    text: `Diana Design. Lead Product Designer / UX UI.
Skills: Figma, Wireframing, User Research, Prototyping, Design Systems, HTML/CSS.
Experience:
- Lead Designer at DesignStudio (2021 - Present): Redesigned mobile app interface, increasing monthly active users by 45%. Established cross-company Design System.
- Product Designer at FinTechCorp (2019 - 2021): Designed user flows and wireframes for mobile payment modules.
Education: BFA in Graphic Design, Arts Academy, 2019.`,
    chunks: [
      'Diana Design. Lead Product Designer / UX UI.',
      'Skills: Figma, Wireframing, User Research, Prototyping, Design Systems, HTML/CSS.',
      'Experience: Lead Designer at DesignStudio (2021 - Present): Redesigned mobile app interface, increasing monthly active users by 45%. Established cross-company Design System.',
      'Experience: Product Designer at FinTechCorp (2019 - 2021): Designed user flows and wireframes for mobile payment modules.',
      'Education: BFA in Graphic Design, Arts Academy, 2019.'
    ]
  },
  {
    id: 'R5',
    name: 'Ethan Marketing',
    targetRole: 'Growth Marketing Manager',
    text: `Ethan Marketing. Growth Marketing Manager / Acquisition.
Skills: SEO, Google Ads, Meta Ads, HubSpot, Analytics, Copywriting, Email Campaigns.
Experience:
- Growth Marketer at ScaleUp (2022 - Present): Managed $50k monthly ad spend, cutting customer acquisition cost (CAC) by 22%. Increased inbound organic leads by 80% via SEO.
- Digital Marketer at AgencyX (2020 - 2022): Created PPC search campaigns and social ads for 15+ B2B clients.
Education: BA in Communications, State College, 2020.`,
    chunks: [
      'Ethan Marketing. Growth Marketing Manager / Acquisition.',
      'Skills: SEO, Google Ads, Meta Ads, HubSpot, Analytics, Copywriting, Email Campaigns.',
      'Experience: Growth Marketer at ScaleUp (2022 - Present): Managed $50k monthly ad spend, cutting customer acquisition cost (CAC) by 22%. Increased inbound organic leads by 80% via SEO.',
      'Experience: Digital Marketer at AgencyX (2020 - 2022): Created PPC search campaigns and social ads for 15+ B2B clients.',
      'Education: BA in Communications, State College, 2020.'
    ]
  }
];

const jobs: JobData[] = [
  {
    id: 'J1',
    title: 'Senior React Developer (Next.js Focus)',
    description: `We are looking for a Senior React Developer to join our core SaaS team.
You will write clean TypeScript, build high-performance components in Next.js, and style them using TailwindCSS.
Requirements:
- 5+ years of experience building modern web applications with React.
- Strong knowledge of state management (Redux, Zustand) and tooling (Webpack, Vite).
- Experience optimizing page loading speeds and Core Web Vitals.`
  },
  {
    id: 'J2',
    title: 'Technical Product Manager',
    description: `Join us as a Technical Product Manager. You will collaborate with engineering and design to define product roadmap specifications.
Requirements:
- Proven experience managing software products in an Agile/Scrum environment.
- Ability to write SQL queries to analyze customer behavior.
- Experience running A/B tests and customer interviews.`
  },
  {
    id: 'J3',
    title: 'Machine Learning & Data Scientist',
    description: `We are seeking a ML Data Scientist to build predictive analytics models and NLP integrations.
Requirements:
- Expert in Python programming and packages (Scikit-Learn, PyTorch, Pandas).
- Strong SQL and database querying skills.
- Experience deploying machine learning models to production using Docker.`
  },
  {
    id: 'J4',
    title: 'Senior UX/UI Designer',
    description: `We need a Senior UX/UI Designer to lead design direction. You will build user experiences in Figma and establish our typography and design systems.
Requirements:
- Extensive Figma portfolio with high-fidelity mockups and interaction flows.
- Experience carrying out user research and usability testing.
- Basic understanding of web technologies (HTML/CSS) is a plus.`
  },
  {
    id: 'J5',
    title: 'Growth Marketing Lead',
    description: `Acquire and convert customers as our Growth Marketing Lead. You will run multi-channel campaigns and manage acquisition budget.
Requirements:
- Deep experience managing Google Ads and Facebook Meta Ads manager.
- Professional copywriting and email automation skills (HubSpot, Marketo).
- Strong SEO understanding to improve organic ranking.`
  }
];

// 3. Ground Truth Fit Scores (0-100) established by human assessment
// Format: groundTruth[ResumeID][JobID] = Score
const groundTruth: Record<string, Record<string, number>> = {
  R1: { J1: 95, J2: 30, J3: 15, J4: 40, J5: 10 }, // Alice Dev
  R2: { J1: 20, J2: 95, J3: 40, J4: 50, J5: 35 }, // Bob Product
  R3: { J1: 15, J2: 45, J3: 98, J4: 20, J5: 25 }, // Charlie Data
  R4: { J1: 35, J2: 50, J3: 10, J4: 95, J5: 20 }, // Diana Design
  R5: { J1: 10, J2: 30, J3: 20, J4: 20, J5: 95 }  // Ethan Marketing
};

// 4. Utility: Get Vector Embedding from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  });
  return response.data[0].embedding;
}

// Utility: Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 5. Baseline Retrieval Method (Simple embedding cosine similarity)
async function evaluateBaseline(resume: ResumeData, job: JobData): Promise<number> {
  const resumeEmb = await getEmbedding(resume.text);
  const jobEmb = await getEmbedding(job.description);
  const similarity = cosineSimilarity(resumeEmb, jobEmb);
  // Scale similarity (often in range 0.2 to 0.7 for different roles) to a score out of 100
  // Formula: Map similarity [0.0, 0.6] -> [10, 95] approximately
  const minSim = 0.1;
  const maxSim = 0.6;
  const clamped = Math.max(minSim, Math.min(maxSim, similarity));
  const score = Math.round(10 + ((clamped - minSim) / (maxSim - minSim)) * 85);
  return score;
}

// 6. Advanced Retrieval Method (Contextual Chunking + Cohere Reranking)
async function evaluateAdvanced(resume: ResumeData, job: JobData): Promise<number> {
  let topChunks: string[] = [];

  // A. Try to retrieve and sort using Cohere Rerank API
  if (cohere) {
    try {
      const response = await cohere.rerank({
        model: 'rerank-v3.5',
        query: job.description,
        documents: resume.chunks,
        topN: 3,
      });
      topChunks = response.results.map((result) => resume.chunks[result.index]);
    } catch (error) {
      console.warn('Cohere Rerank API call failed. Falling back to cosine similarity.', error);
    }
  }

  // B. Fallback to cosine similarity if cohere is not initialized or failed
  if (topChunks.length === 0) {
    const jobEmb = await getEmbedding(job.description);
    const chunkScores = await Promise.all(
      resume.chunks.map(async (chunk) => {
        const chunkEmb = await getEmbedding(chunk);
        return { chunk, similarity: cosineSimilarity(jobEmb, chunkEmb) };
      })
    );
    topChunks = chunkScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map((x) => x.chunk);
  }

  // C. LLM-as-a-Judge Scoring using top retrieved contexts
  const rerankPrompt = `
You are an expert technical recruiter. Evaluate how well this candidate matches the target job based ONLY on the retrieved resume sections.
Target Job Title: ${job.title}
Target Job Requirements:
${job.description}

Retrieved Candidate Resume Chunks:
${topChunks.map((c, i) => `[Chunk ${i+1}] ${c}`).join('\n')}

Calculate a match score from 0 to 100 indicating the fit of the candidate for this job.
Consider technical skill alignment, experience levels, and role match.
Only output the raw numeric score as an integer (e.g. "85"), do not include any words, markdown, or symbols.
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: rerankPrompt }],
    temperature: 0.1,
  });

  const responseText = completion.choices[0]?.message?.content?.trim() || '0';
  const score = parseInt(responseText, 10);
  return isNaN(score) ? 0 : score;
}

// 7. Execution Runner
async function runEvals() {
  console.log('====================================================');
  console.log('STARTING RESUME MATCHING PIPELINE EVALUATIONS');
  console.log('====================================================');
  console.log(`Running evaluation matrix: 5 Resumes x 5 Jobs = 25 pairs\n`);

  interface ResultRow {
    resumeId: string;
    resumeName: string;
    jobId: string;
    jobTitle: string;
    groundTruth: number;
    baselineScore: number;
    advancedScore: number;
  }

  const results: ResultRow[] = [];
  let baselineTime = 0;
  let advancedTime = 0;

  for (const r of resumes) {
    for (const j of jobs) {
      const gt = groundTruth[r.id][j.id];

      // Measure Baseline
      const startBaseline = Date.now();
      const baselineScore = await evaluateBaseline(r, j);
      baselineTime += Date.now() - startBaseline;

      // Measure Advanced
      const startAdvanced = Date.now();
      const advancedScore = await evaluateAdvanced(r, j);
      advancedTime += Date.now() - startAdvanced;

      results.push({
        resumeId: r.id,
        resumeName: r.name,
        jobId: j.id,
        jobTitle: j.title,
        groundTruth: gt,
        baselineScore,
        advancedScore
      });

      console.log(`Evaluated Pair: ${r.name} x ${j.title} | GT: ${gt} | Baseline: ${baselineScore} | Advanced: ${advancedScore}`);

      // Add a rate limit safety delay for Cohere Trial keys (10 requests/minute limit)
      if (cohere) {
        await new Promise((resolve) => setTimeout(resolve, 6100));
      }
    }
  }

  // Calculate Aggregated Metrics
  // Mean Absolute Error (MAE)
  let baselineMaeSum = 0;
  let advancedMaeSum = 0;
  // Top Match Accuracy (Precision@1: Is the job that human marked highest also matching highest?)
  let baselineP1Matches = 0;
  let advancedP1Matches = 0;

  resumes.forEach((r) => {
    // Find job with highest ground truth score for this resume
    let bestJobId = 'J1';
    let maxGt = 0;
    jobs.forEach((j) => {
      if (groundTruth[r.id][j.id] > maxGt) {
        maxGt = groundTruth[r.id][j.id];
        bestJobId = j.id;
      }
    });

    // Find what jobs baseline and advanced ranked highest for this resume
    let bestBaselineJobId = 'J1';
    let maxBaseline = -1;
    let bestAdvancedJobId = 'J1';
    let maxAdvanced = -1;

    results.filter(x => x.resumeId === r.id).forEach((res) => {
      baselineMaeSum += Math.abs(res.baselineScore - res.groundTruth);
      advancedMaeSum += Math.abs(res.advancedScore - res.groundTruth);

      if (res.baselineScore > maxBaseline) {
        maxBaseline = res.baselineScore;
        bestBaselineJobId = res.jobId;
      }
      if (res.advancedScore > maxAdvanced) {
        maxAdvanced = res.advancedScore;
        bestAdvancedJobId = res.jobId;
      }
    });

    if (bestBaselineJobId === bestJobId) baselineP1Matches++;
    if (bestAdvancedJobId === bestJobId) advancedP1Matches++;
  });

  const totalPairs = results.length;
  const baselineMae = (baselineMaeSum / totalPairs).toFixed(2);
  const advancedMae = (advancedMaeSum / totalPairs).toFixed(2);

  const baselineP1 = ((baselineP1Matches / resumes.length) * 100).toFixed(0);
  const advancedP1 = ((advancedP1Matches / resumes.length) * 100).toFixed(0);

  const avgBaselineTime = (baselineTime / totalPairs).toFixed(0);
  const avgAdvancedTime = (advancedTime / totalPairs).toFixed(0);

  // Print Summary Table
  console.log('\n====================================================');
  console.log('EVALUATION RESULTS SUMMARY');
  console.log('====================================================\n');

  let markdownTable = `| Metric | Baseline (Full Embedding Cosine) | Advanced (Chunk RAG + Cohere Reranking) |\n`;
  markdownTable += `| :--- | :---: | :---: |\n`;
  markdownTable += `| **Mean Absolute Error (MAE)** | ${baselineMae} score points | **${advancedMae}** score points (lower is better) |\n`;
  markdownTable += `| **Precision@1 (Best Job Accuracy)** | ${baselineP1}% | **${advancedP1}%** (higher is better) |\n`;
  markdownTable += `| **Avg Processing Time per Pair** | ${avgBaselineTime} ms | ${avgAdvancedTime} ms |\n`;

  console.log(markdownTable);

  console.log('\nDetailed Breakdown:\n');
  console.log('| Resume | Job Posting | Human Ground Truth | Baseline Score | Advanced Score | Error Difference (Base / Adv) |');
  console.log('| :--- | :--- | :---: | :---: | :---: | :---: |');
  results.forEach((row) => {
    const baseDiff = Math.abs(row.baselineScore - row.groundTruth);
    const advDiff = Math.abs(row.advancedScore - row.groundTruth);
    console.log(`| ${row.resumeName} | ${row.jobTitle} | ${row.groundTruth} | ${row.baselineScore} | ${row.advancedScore} | ${baseDiff} / ${advDiff} |`);
  });

  // Write results to a file for easy submission loading
  const outputFilePath = path.join(process.cwd(), 'tests', 'evals_output.md');
  
  let detailsTable = `### Detailed Breakdown\n\n`;
  detailsTable += `| Resume | Job Posting | Human Ground Truth | Baseline Score | Advanced Score | Error Difference (Base / Adv) |\n`;
  detailsTable += `| :--- | :--- | :---: | :---: | :---: | :---: |\n`;
  results.forEach((row) => {
    const baseDiff = Math.abs(row.baselineScore - row.groundTruth);
    const advDiff = Math.abs(row.advancedScore - row.groundTruth);
    detailsTable += `| ${row.resumeName} | ${row.jobTitle} | ${row.groundTruth} | ${row.baselineScore} | ${row.advancedScore} | ${baseDiff} / ${advDiff} |\n`;
  });

  const fullContent = `# RAG Evaluation Results\n\n${markdownTable}\n\n${detailsTable}\n\n*Generated on: ${new Date().toISOString()}*`;
  fs.writeFileSync(outputFilePath, fullContent);
  console.log(`\nSaved evaluation summary and detailed breakdown to ${outputFilePath}`);
}

runEvals().catch(err => console.error(err));
