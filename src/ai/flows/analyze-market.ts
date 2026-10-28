
'use server';
/**
 * @fileOverview 시장 분석 리포트 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeMarketInputSchema = z.object({
  businessIdea: z.string().describe('분석할 핵심 사업 아이디어'),
});
export type AnalyzeMarketInput = z.infer<typeof AnalyzeMarketInputSchema>;

const AnalyzeMarketOutputSchema = z.object({
  report: z.string().describe('한국어로 작성된 상세 시장 분석 리포트'),
});
export type AnalyzeMarketOutput = z.infer<typeof AnalyzeMarketOutputSchema>;

export async function analyzeMarket(input: AnalyzeMarketInput): Promise<AnalyzeMarketOutput> {
  return analyzeMarketFlow(input);
}

const analyzeMarketFlow = ai.defineFlow(
  {
    name: 'analyzeMarketFlow',
    inputSchema: AnalyzeMarketInputSchema,
    outputSchema: AnalyzeMarketOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: AnalyzeMarketOutputSchema },
      prompt: `당신은 세계적인 시장 조사 분석가입니다. 다음 사업 아이디어에 대해 한국어로 상세한 시장 분석 리포트를 작성하세요.

      사업 아이디어: ${input.businessIdea}

      [포함 내용]
      시장 개요, 타겟 고객 분석, 경쟁사 분석, SWOT 분석, 결론을 포함하세요. 섹션 구분 시 제목을 쓰지 말고 빈 줄로 구분하세요.

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 섹션의 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 본문 안에 "시장 개요"나 "경쟁 분석" 등 각 섹션의 제목을 다시 반복하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
      4. PROFESSIONAL TONE: 신뢰감을 주는 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.
      5. 가독성: 문단 사이에는 빈 줄을 넣어 가독성을 높이세요.`,
    });

    const output = response.output;
    if (!output) throw new Error('시장 분석 실패');
    return output;
  }
);
