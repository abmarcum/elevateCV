import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { profile, jobDescription, jobTitle, company, creativeMode } = await request.json();

    if (!profile || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing profile or job description' },
        { status: 400 }
      );
    }

    const title = profile.title || 'Applicant';
    const name = profile.name || 'Applicant Name';
    const skills = (profile.skills || []).join(', ');
    const experienceText = JSON.stringify(profile.experience || []);

    const modeInstruction = creativeMode 
      ? "Creativity Level: HIGH (Creative Mode). You are encouraged to rephrase experience bullet points, reorganize skills, and rewrite the professional summary to tell a highly compelling story matching the target job description while remaining truthful."
      : "Creativity Level: LOW (Minimal Mode - Default). Retain the exact original layout, experience structure, and wording as much as possible. Only suggest minor rephrasing or keyword additions where strictly necessary to align with the job posting, preserving the original factual phrasing.";

    const curatePrompt = `
You are a career consultant and expert ATS optimizer.
Compare the applicant's profile with the target job details.

Target Job:
- Title: ${jobTitle || 'Target Role'}
- Company: ${company || 'Target Company'}
- Description: ${jobDescription}

Applicant Profile:
- Name: ${name}
- Title: ${title}
- Skills: ${skills}
- Experience: ${experienceText}
- Summary: ${profile.summary || ''}
- Education: ${JSON.stringify(profile.education || [])}

Revision Guideline:
${modeInstruction}

Perform the following tasks:
1. Compute a simulated ATS Compatibility Score (0 to 100).
2. Identify a list of critical keywords, technical terms, or hard/soft skills required by the job that are missing or weak in the applicant's profile (Keyword Gaps).
3. Analyze the applicant's experience bullet points. Provide specific suggestions for at least 3 bullet points, explaining how to rephrase them to better highlight relevant experience for the target job while remaining truthful.
4. Generate a tailored Professional Summary and list of Skills matching this job.
5. Draft a completely tailored Resume in clean markdown format (incorporating the new summary, optimized skills list, and rephrased experience).
6. Draft a tailored, professional Cover Letter (in markdown) that bridges the applicant's skills to the target job requirements.

Output a JSON object with this schema:
{
  "atsScore": 75,
  "keywordGaps": ["Keyword A", "Skill B", ...],
  "bulletSuggestions": [
    {
      "original": "Original bullet point text from experience...",
      "suggested": "Rephrased bullet point highlighting job-relevant details...",
      "explanation": "Why this rephrasing helps pass ATS screening for this job."
    }
  ],
  "tailoredSummary": "The newly generated tailored professional summary.",
  "tailoredResume": "A complete, beautifully formatted markdown resume.",
  "coverLetter": "A professional cover letter in markdown."
}
Only output the JSON object, do not wrap in markdown or include extra commentary.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: curatePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const resultText = completion.choices[0]?.message?.content || '{}';
    const parsedResult = JSON.parse(resultText);

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('API Curate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
