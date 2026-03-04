// @ts-ignore — Deno runtime uses npm: specifier
import { GoogleGenAI } from 'npm:@google/genai'

export const genai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! })
export const GEMINI_MODEL = 'gemini-2.5-flash'
