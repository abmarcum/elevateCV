import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { profile, jobTitle, company, style, tone } = await request.json();

    if (!profile || !jobTitle || !company) {
      return NextResponse.json({ error: 'Missing profile, job title, or company' }, { status: 400 });
    }

    const applicantName = profile.name || 'Applicant';
    const applicantTitle = profile.title || 'Professional';
    const skills = (profile.skills || []).slice(0, 10).join(', ');

    let styleInstruction = '';
    if (style === 'linkedin') {
      styleInstruction = 'Create a short, high-impact LinkedIn connection request message (strict limit of 300 characters, no subject line, direct pitch). Do not exceed 300 characters under any circumstance.';
    } else {
      styleInstruction = 'Create a professional cold email pitch. Include a compelling Subject Line at the top starting with "Subject: " and clean signature formatting.';
    }

    let toneInstruction = '';
    if (tone === 'bold') {
      toneInstruction = 'Tone: CONFIDENT & BOLD. Highlight major achievements and high value add, with a direct call-to-action.';
    } else if (tone === 'short_direct') {
      toneInstruction = 'Tone: DIRECT & CONCISE. Keep paragraphs very short and bulleted, respecting the busy recruiter\'s time.';
    } else {
      toneInstruction = 'Tone: PROFESSIONAL & CORDIAL. Standard polite corporate style focused on mutual fit.';
    }

    const prompt = `
You are a career consultant and expert recruiter. Draft a cold outreach message for a candidate reaching out to a recruiter or hiring manager at their target company.

Candidate Profile:
- Name: ${applicantName}
- Current Title: ${applicantTitle}
- Top Skills: ${skills}

Target Role:
- Title: ${jobTitle}
- Company: ${company}

Requirements:
1. ${styleInstruction}
2. ${toneInstruction}
3. Maintain a friendly yet professional demeanor.
4. Leave placeholders like [Recruiter Name] if not known.
5. Only output the message text (plus subject line if email), do not include extra comments, markdown formatting, or HTML blocks.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const resultText = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ message: resultText });
  } catch (error: any) {
    console.error('API Outreach error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
