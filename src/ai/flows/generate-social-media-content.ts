'use server';
/**
 * @fileOverview An AI flow to generate a social media content package.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSocialMediaContentInputSchema = z.object({
  businessIdea: z.string().describe('The core business idea.'),
  targetAudience: z.string().describe('The target audience.'),
});
export type GenerateSocialMediaContentInput = z.infer<typeof GenerateSocialMediaContentInputSchema>;

const ContentPieceSchema = z.object({ copy: z.string(), imagePrompt: z.string(), hashtags: z.array(z.string()) });
const GenerateSocialMediaContentOutputSchema = z.object({
  instagram: ContentPieceSchema,
  facebook: ContentPieceSchema,
  blog: z.object({ title: z.string(), outline: z.string() }),
  weeklyCalendar: z.array(z.object({ day: z.string(), theme: z.string(), idea: z.string() })),
});
export type GenerateSocialMediaContentOutput = z.infer<typeof GenerateSocialMediaContentOutputSchema>;

export async function generateSocialMediaContent(input: GenerateSocialMediaContentInput): Promise<GenerateSocialMediaContentOutput> {
  return generateSocialMediaContentFlow(input);
}

const generateSocialMediaContentFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaContentFlow',
    inputSchema: GenerateSocialMediaContentInputSchema,
    outputSchema: GenerateSocialMediaContentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateSocialMediaContentOutputSchema },
      prompt: `당신은 스타트업 전문 소셜 미디어 마케팅 전문가입니다. 다음 아이디어에 대해 한국어로 콘텐츠 패키지를 생성하세요.

      사업 아이디어: ${input.businessIdea}
      타겟 고객: ${input.targetAudience}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: 결과 데이터 내부 필드에 마크다운 기호를 사용하지 마세요. (해시태그 제외)
      2. PURE TEXT ONLY: 모든 텍스트 필드는 깔끔한 일반 텍스트로만 구성하세요.
      3. NO TITLES IN CONTENT: 출력되는 각 본문 안에 제목을 다시 반복하지 마세요.
      4. PROFESSIONAL TONE: 채널에 맞는 톤앤매너를 유지하되 정중한 한국어 문체를 사용하세요.`,
    });
    if (!output) throw new Error('Failed to generate social media content.');
    return output;
  }
);
