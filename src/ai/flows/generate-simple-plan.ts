
'use server';
/**
 * @fileOverview 단순 사업 계획서 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSimplePlanInputSchema = z.object({
  title: z.string().describe('사업 계획서의 제목'),
  businessIdea: z.string().describe('사업의 핵심 아이디어'),
});
export type GenerateSimplePlanInput = z.infer<typeof GenerateSimplePlanInputSchema>;

const GenerateSimplePlanOutputSchema = z.object({
  plan: z.string().describe('생성된 전체 사업 계획서 텍스트'),
});
export type GenerateSimplePlanOutput = z.infer<typeof GenerateSimplePlanOutputSchema>;

export async function generateSimplePlan(input: GenerateSimplePlanInput): Promise<GenerateSimplePlanOutput> {
  return generateSimplePlanFlow(input);
}

const generateSimplePlanFlow = ai.defineFlow(
  {
    name: 'generateSimplePlanFlow',
    inputSchema: GenerateSimplePlanInputSchema,
    outputSchema: GenerateSimplePlanOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: 'googleai/gemini-3.8-flash',
      output: { schema: GenerateSimplePlanOutputSchema },
      prompt: `당신은 세계적인 비즈니스 컨설턴트입니다. 전문적인 한국어로 사업 계획서를 작성하세요.

      사업 계획서 제목: ${input.title}
      핵심 사업 아이디어: ${input.businessIdea}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 문단은 전문적인 일반 텍스트로만 구성하세요.
      3. NO TITLES IN CONTENT: 본문 내용(plan 필드) 안에 문서 제목 "${input.title}"이나 섹션 제목을 다시 반복하지 마세요. 제목 없이 바로 본문부터 시작하세요.
      4. PROFESSIONAL TONE: 정중한 비즈니스 문체(하십시오체)를 사용하세요.
      5. 가독성: 문단 사이에는 빈 줄을 넣어 가독성을 높이세요.`,
    });

    const output = response.output;
    if (!output) throw new Error('계획서 생성 실패');
    return output;
  }
);
