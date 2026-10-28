'use server';
/**
 * @fileOverview An AI agent that generates a business plan preview.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePlanPreviewInputSchema = z.object({
  keywords: z.string().describe('Keywords describing the business plan.'),
  pdfDataUri: z.string().optional().describe('PDF as data URI.'),
});
export type GeneratePlanPreviewInput = z.infer<typeof GeneratePlanPreviewInputSchema>;

const GeneratePlanPreviewOutputSchema = z.object({
  planPreview: z.string().describe('A preview of the business plan.'),
});
export type GeneratePlanPreviewOutput = z.infer<typeof GeneratePlanPreviewOutputSchema>;

export async function generatePlanPreview(input: GeneratePlanPreviewInput): Promise<GeneratePlanPreviewOutput> {
  return generatePlanPreviewFlow(input);
}

const generatePlanPreviewFlow = ai.defineFlow(
  {
    name: 'generatePlanPreviewFlow',
    inputSchema: GeneratePlanPreviewInputSchema,
    outputSchema: GeneratePlanPreviewOutputSchema,
  },
  async (input) => {
    const promptParts: any[] = [{ text: `제시된 키워드 및 문서를 바탕으로 사업 계획서의 핵심 요약(미리보기)을 한국어로 작성하세요.

    키워드: ${input.keywords}

    [필수 규칙]
    1. NO MARKDOWN: 마크다운 기호를 절대 사용하지 마세요.
    2. PURE TEXT: 깔끔한 일반 텍스트로만 요약하세요.
    3. NO TITLES: 제목 없이 바로 요약 내용부터 시작하세요.
    4. PROFESSIONAL TONE: 정중한 한국어 문체를 사용하세요.` }];

    if (input.pdfDataUri) {
      promptParts.unshift({ media: { url: input.pdfDataUri } });
    }

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GeneratePlanPreviewOutputSchema },
      prompt: promptParts,
    });
    return output!;
  }
);
