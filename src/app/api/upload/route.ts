import { NextRequest, NextResponse } from 'next/server';
import { parseResumeFile } from '@/utils/parser';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // 1. Parse raw text from the resume file
    let rawText = '';
    try {
      rawText = await parseResumeFile(buffer, mimeType);
    } catch (parseError: any) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError.message || parseError}` },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty or could not be parsed.' },
        { status: 422 }
      );
    }

    // 2. Structured Profile Extraction using GPT-4o-mini
    const systemPrompt = `
You are an expert ATS (Applicant Tracking System) and professional resume parser.
Your task is to analyze the raw resume text and extract a structured, clean JSON profile.
You must return a valid JSON object matching this schema:
{
  "name": "Full Name",
  "title": "Target or Current Job Title",
  "skills": ["Skill 1", "Skill 2", ...],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Duration (e.g., Jan 2020 - Present)",
      "bullets": [
        "Responsibility or achievement bullet point 1",
        "Responsibility or achievement bullet point 2",
        ...
      ]
    }
  ],
  "education": ["Degree, Major, School, Year"],
  "summary": "Short professional summary summarizing experience and goals."
}
Only output the JSON object, do not wrap in markdown or include extra commentary.
`;

    const userPrompt = `Raw Resume Text:\n\n${rawText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const resultText = completion.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('No content returned from OpenAI');
    }

    const structuredProfile = JSON.parse(resultText);

    return NextResponse.json({
      rawText,
      profile: structuredProfile,
    });
  } catch (error: any) {
    console.error('API Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
