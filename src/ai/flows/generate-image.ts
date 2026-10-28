'use server';
/**
 * @fileOverview AI 이미지 생성을 위한 고품질 Gemini 3.1 Flash-Lite Image 표준 Flow.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'genkit';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('A text description of the image to generate.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated image."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-image',
    contents: `Generate a high quality, professional, photorealistic business image: ${input.prompt}`,
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Image generation failed: no candidate returned.');
  }

  for (const part of candidates[0].content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      const mime = part.inlineData.mimeType || 'image/jpeg';
      return { imageUrl: `data:${mime};base64,${part.inlineData.data}` };
    }
  }

  throw new Error('Image generation failed: no image data received.');
}
