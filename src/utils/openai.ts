import OpenAI from 'openai';
import { wrapOpenAI } from 'langsmith/wrappers';

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not defined in environment variables.');
}

export const openai = wrapOpenAI(
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
);
