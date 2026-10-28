'use server';
/**
 * @fileOverview A flow to generate a Business Model Canvas and provide validation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBmcInputSchema = z.object({
  businessIdea: z.string().describe('The core business idea to be analyzed.'),
});
export type GenerateBmcInput = z.infer<typeof GenerateBmcInputSchema>;

const GenerateBmcOutputSchema = z.object({
  canvas: z.object({
    keyPartners: z.string().describe('핵심 파트너'),
    keyActivities: z.string().describe('핵심 활동'),
    keyResources: z.string().describe('핵심 자원'),
    valuePropositions: z.string().describe('가치 제안'),
    customerRelationships: z.string().describe('고객 관계'),
    channels: z.string().describe('채널'),
    customerSegments: z.string().describe('고객 세그먼트'),
    costStructure: z.string().describe('비용 구조'),
    revenueStreams: z.string().describe('수익원'),
  }),
  validationReport: z.string().describe('A validation report. (in Korean)'),
});
export type GenerateBmcOutput = z.infer<typeof GenerateBmcOutputSchema>;

export async function generateBmc(input: GenerateBmcInput): Promise<GenerateBmcOutput> {
  return generateBmcFlow(input);
}

const generateBmcFlow = ai.defineFlow(
  {
    name: 'generateBmcFlow',
    inputSchema: GenerateBmcInputSchema,
    outputSchema: GenerateBmcOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateBmcOutputSchema },
      prompt: `당신은 비즈니스 모델 캔버스 프레임워크 전문 비즈니스 컨설턴트입니다. 다음 아이디어에 대해 한국어로 상세한 BMC와 검증 리포트를 작성하세요.

      사업 아이디어: ${input.businessIdea}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN in canvas fields: 캔버스 각 항목 및 리포트 내부에는 마크다운 기호를 절대 사용하지 마세요. 줄바꿈만 허용합니다.
      2. PURE TEXT ONLY: 모든 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 각 필드나 리포트 본문 안에 항목 이름을 제목으로 다시 반복하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
      4. PROFESSIONAL TONE: 정중하고 전문적인 비즈니스 문체를 사용하세요.
      5. 비즈니스 모델의 9가지 블록을 구체적이고 현실적으로 채우고, 강점/약점/가정 테스트를 포함한 검증 리포트를 작성하세요.`,
    });

    if (!output) {
      throw new Error('Failed to generate Business Model Canvas.');
    }
    return output;
  }
);
