import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { profile, jobTitle, company, jobDescription, tone } = await request.json();

    if (!profile || !jobDescription) {
      return NextResponse.json({ error: 'Missing profile or job description' }, { status: 400 });
    }

    const name = profile.name || 'Applicant';
    const targetTitle = jobTitle || 'Software Engineer';
    const targetCompany = company || 'Target Company';
    const selectedTone = tone || 'Professional';

    let tonePrompt = '';
    if (selectedTone === 'Confident & Bold') {
      tonePrompt = 'Write with high confidence and assertiveness. Focus heavily on key achievements, impact metrics, and readiness to lead from day one. Avoid overly passive or humble filler language.';
    } else if (selectedTone === 'Friendly & Conversational') {
      tonePrompt = 'Write with a warm, personal, and approachable tone. Focus on cultural fit, collaboration, and enthusiasm for the team/mission. Keep it authentic and engaging.';
    } else if (selectedTone === 'Direct & Brief') {
      tonePrompt = 'Keep it extremely concise and straight to the point (no more than 3 brief paragraphs). Focus strictly on the strongest qualification match. Respect the hiring manager\'s time.';
    } else {
      tonePrompt = 'Use a classic, formal, and corporate tone. Focus on professionalism, alignment of experience with job requirements, and structured business communication standards.';
    }

    const prompt = `
You are an expert executive resume curator and career advisor.
Create a highly personalized cover letter for:
Candidate Name: ${name}
Target Role: ${targetTitle}
Target Company: ${targetCompany}
Tone Preference: ${selectedTone}

Tone Instructions:
${tonePrompt}

Candidate Profile Details:
- Title: ${profile.title}
- Skills: ${(profile.skills || []).join(', ')}
- Summary: ${profile.summary}
- Work History bullet points to draw from:
${(profile.experience || []).map((exp: any) => `- ${exp.role} at ${exp.company}: ${(exp.bullets || []).join('; ')}`).join('\n')}

Target Job Description details:
---
${jobDescription}
---

Provide a ready-to-use cover letter. Address it to "Hiring Manager" or the target company. Do not use generic placeholders. Output the cover letter directly. Do not include extra markdown comments or formatting outside the cover letter itself.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const coverLetter = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ success: true, coverLetter });

  } catch (err: any) {
    console.error('Cover letter generation API failed:', err);
    return NextResponse.json({ error: err.message || 'Cover letter generation failed' }, { status: 500 });
  }
}
