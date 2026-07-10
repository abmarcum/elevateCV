import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    // 1. Fetch webpage contents
    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        next: { revalidate: 0 } // bypass next cache
      });
      
      if (!response.ok) {
        throw new Error(`Webpage fetch returned status ${response.status}`);
      }
      
      html = await response.text();
    } catch (fetchErr: any) {
      console.error('Fetch error details:', fetchErr);
      return NextResponse.json({ 
        error: `Could not reach the URL: ${fetchErr.message || 'Network error'}. Please paste the description manually.` 
      }, { status: 502 });
    }

    if (!html || html.trim().length === 0) {
      return NextResponse.json({ error: 'Webpage returned empty content. Please copy and paste manually.' }, { status: 400 });
    }

    // Truncate raw content to about 50,000 characters to keep it well within LLM context window
    const bodyContent = html.substring(0, 50000);

    // 2. Instruct OpenAI to scrape the structured parameters
    const prompt = `
You are an expert web scraper assistant. Below is the raw HTML content of a job posting webpage.
Extract the:
1. Job Title
2. Company Name
3. Full Job Description and requirements (cleaned, formatted, ready for ATS matching)

HTML Content:
---
${bodyContent}
---

Provide your output as a JSON object matching this schema:
{
  "title": "...",
  "company": "...",
  "description": "..."
}

Do not include any extra wrapper text, notes, markdown quotes (like \`\`\`json), or conversational details. Return raw JSON only.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const outputText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(outputText);

    return NextResponse.json({
      success: true,
      job: {
        title: parsed.title || '',
        company: parsed.company || '',
        description: parsed.description || ''
      }
    });

  } catch (err: any) {
    console.error('Scraper API failed:', err);
    return NextResponse.json({ error: err.message || 'Scraper processing failed' }, { status: 500 });
  }
}
