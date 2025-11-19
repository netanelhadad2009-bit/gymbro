import OpenAI from 'openai';
import { serverEnv } from '@/lib/env';

export const openai = new OpenAI({
  apiKey: serverEnv.OPENAI_API_KEY,
});