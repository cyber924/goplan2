'use server';
/**
 * @fileOverview An AI flow to generate relevant tags for an image based on its content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateImageTagsInputSchema = z.object({
  imageDataUri: z.string().describe("A data URI of the image to analyze."),
});
export type GenerateImageTagsInput = z.infer<typeof GenerateImageTagsInputSchema>;

const GenerateImageTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of 3-5 relevant tags in Korean.'),
});
export type GenerateImageTagsOutput = z.infer<typeof GenerateImageTagsOutputSchema>;

export async function generateImageTags(input: GenerateImageTagsInput): Promise<GenerateImageTagsOutput> {
  return generateImageTagsFlow(input);
}

const generateImageTagsFlow = ai.defineFlow(
  {
    name: 'generateImageTagsFlow',
    inputSchema: GenerateImageTagsInputSchema,
    outputSchema: GenerateImageTagsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateImageTagsOutputSchema },
      prompt: [
        { media: { url: input.imageDataUri } },
        { text: `당신은 이미지 분석 및 태깅 전문가입니다. 다음 이미지를 바탕으로 한국어로 된 3~5개의 관련 태그 배열을 생성하세요. 태그는 이미지의 주요 대상, 스타일, 분위기를 포착하는 단어여야 합니다. 마크다운을 사용하지 마세요.` }
      ],
    });
    if (!output) throw new Error('Failed to generate tags from AI.');
    return output;
  }
);
