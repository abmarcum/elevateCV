import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { keywordGaps, jobTitle } = await request.json();

    if (!keywordGaps || !Array.isArray(keywordGaps) || keywordGaps.length === 0) {
      return NextResponse.json({ success: true, roadmap: [] });
    }

    const targetTitle = jobTitle || 'Software Engineer';

    const prompt = `
You are an expert technical mentor and career coach.
Given a list of missing skill/keyword gaps for a candidate applying to a ${targetTitle} role, design a structured learning roadmap.
Provide recommendations for up to 5 key gaps.

Gaps Identified:
${keywordGaps.map(g => `- ${g}`).join('\n')}

For each skill gap, provide:
1. The skill name.
2. Conceptual breakdown: Briefly what topics to focus on.
3. Suggested Learning Resources: Highly specific topics, tutorials, or documentation.
4. Estimated Timeframe: Realistic duration to acquire intermediate level.
5. Practice Mini-Project: A brief description of a small, hands-on project the candidate can build to demonstrate this skill on their portfolio.

Provide your output as a JSON object matching this schema:
{
  "roadmap": [
    {
      "skill": "React Native",
      "concept": "...",
      "timeframe": "2 weeks",
      "project": "...",
      "resources": "..."
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
      roadmap: parsed.roadmap || []
    });

  } catch (err: any) {
    console.error('Learning path API failed:', err);
    return NextResponse.json({ error: err.message || 'Learning path generation failed' }, { status: 500 });
  }
}
