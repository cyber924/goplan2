
'use server';
/**
 * @fileOverview 전문가급 프롬프트 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProPromptInputSchema = z.object({
  task: z.string().describe('AI가 수행해야 할 작업의 핵심 내용'),
  context: z.string().optional().describe('작업에 필요한 배경 지식이나 제약 사항'),
  outputFormat: z.enum(['standard', 'detailed', 'technical']).default('standard').describe('원하는 프롬프트의 상세 수준'),
});
export type ProPromptInput = z.infer<typeof ProPromptInputSchema>;

const ProPromptOutputSchema = z.object({
  optimizedPrompt: z.string().describe('생성된 최적화 프롬프트 본문'),
  explanation: z.string().describe('이 프롬프트가 효과적인 이유에 대한 설명'),
});
export type ProPromptOutput = z.infer<typeof ProPromptOutputSchema>;

export async function generateProPrompt(input: ProPromptInput): Promise<ProPromptOutput> {
  return proPromptGeneratorFlow(input);
}

const proPromptGeneratorFlow = ai.defineFlow(
  {
    name: 'proPromptGeneratorFlow',
    inputSchema: ProPromptInputSchema,
    outputSchema: ProPromptOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: ProPromptOutputSchema },
      prompt: `당신은 세계 최고의 프롬프트 엔지니어링 전문가입니다. 
      다음 정보를 바탕으로 AI 모델(LLM)이 최고의 성능을 낼 수 있는 '완벽한 프롬프트'를 설계하세요.

      [사용자 요청 작업]
      ${input.task}

      [참고 문맥/제약]
      ${input.context || '없음'}

      [출력 스타일]
      ${input.outputFormat}

      [프롬프트 설계 가이드라인 - 엄격 준수]
      1. 구조화: 프롬프트는 페르소나(Persona), 작업(Task), 문맥(Context), 출력 형식(Format)을 포함해야 합니다.
      2. 명확성: 모호한 표현을 피하고 구체적인 지시어를 사용하세요.
      3. 단계별 사고: 복잡한 작업인 경우 '단계별로 생각하라'는 지침을 포함하세요.
      4. NO MARKDOWN: 결과 데이터(optimizedPrompt, explanation 필드 내부)에 #, ##, **, - 등의 마크다운 기호를 절대 사용하지 마세요. 오직 줄바꿈으로만 가독성을 확보하세요.
      5. PURE TEXT: 깔끔한 일반 텍스트 문단으로만 구성하세요.`,
    });

    const output = response.output;
    if (!output) throw new Error('프롬프트 생성 실패');
    return output;
  }
);
