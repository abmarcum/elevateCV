import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { profile, jobTitle, company, jobDescription } = await request.json();

    if (!profile || !jobDescription) {
      return NextResponse.json({ error: 'Missing profile or job description' }, { status: 400 });
    }

    const title = profile.title || 'Applicant';
    const targetTitle = jobTitle || 'Software Engineer';
    const targetCompany = company || 'Target Company';

    const prompt = `
You are an expert technical recruiter and interviewer.
Generate 5 tailored interview questions specifically customized for this candidate's background and the target job description.
Create:
- 3 Behavioral/Situation questions (e.g. leadership, resolving conflict, handling pressure)
- 2 Technical/Core role questions (specific to skills listed in the resume and needed by the job description)

Candidate Profile Details:
- Current Title: ${profile.title}
- Skills: ${(profile.skills || []).join(', ')}
- Work History:
${(profile.experience || []).map((exp: any) => `- ${exp.role} at ${exp.company}: ${(exp.bullets || []).join('; ')}`).join('\n')}

Target Position Details:
- Role: ${targetTitle} at ${targetCompany}
- Job Description:
---
${jobDescription}
---

For each question, provide:
1. The question text.
2. The type ("behavioral" or "technical").
3. Recruiter Rationale: Why the interviewer is asking this question.
4. Response Framework: A detailed guideline based on the STAR method (Situation, Task, Action, Result) outlining how the candidate should structure their answer using their specific experience.

Provide your output as a JSON object matching this schema:
{
  "questions": [
    {
      "id": 1,
      "type": "behavioral",
      "question": "...",
      "rationale": "...",
      "framework": "..."
    }
  ]
}

Do not include any extra wrapper text, markdown quotes, or conversational formatting. Return raw JSON only.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const outputText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(outputText);

    return NextResponse.json({
      success: true,
      questions: parsed.questions || []
    });

  } catch (err: any) {
    console.error('Interview prep API failed:', err);
    return NextResponse.json({ error: err.message || 'Interview prep failed' }, { status: 500 });
  }
}
