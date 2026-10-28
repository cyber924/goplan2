
'use server';
/**
 * @fileOverview 핵심 아이디어로부터 전체 사업 계획서 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().describe('생성된 본문 내용'),
});

const GeneratePlanFromIdeaInputSchema = z.object({
  title: z.string().describe('사업 계획서의 제목'),
  businessIdea: z.string().describe('사업의 핵심 아이디어'),
  sections: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type GeneratePlanFromIdeaInput = z.infer<typeof GeneratePlanFromIdeaInputSchema>;

const GeneratePlanFromIdeaOutputSchema = z.object({
  title: z.string(),
  businessIdea: z.string(),
  sections: z.array(SectionSchema),
});
export type GeneratePlanFromIdeaOutput = z.infer<typeof GeneratePlanFromIdeaOutputSchema>;

export async function generatePlanFromIdea(input: GeneratePlanFromIdeaInput): Promise<GeneratePlanFromIdeaOutput> {
  return generatePlanFromIdeaFlow(input);
}

const generatePlanFromIdeaFlow = ai.defineFlow(
  {
    name: 'generatePlanFromIdeaFlow',
    inputSchema: GeneratePlanFromIdeaInputSchema,
    outputSchema: GeneratePlanFromIdeaOutputSchema,
  },
  async (input) => {
    const sectionsList = input.sections.map(s => `- ${s.title}`).join('\n');

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GeneratePlanFromIdeaOutputSchema },
      prompt: `당신은 세계적인 비즈니스 컨설턴트입니다. 전문적인 사업 계획서 초안을 작성하세요.

      사업 계획서 제목: ${input.title}
      핵심 사업 아이디어: ${input.businessIdea}
      작성할 섹션:
      ${sectionsList}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: 결과 데이터 내부(특히 각 섹션의 content 필드)에 #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 섹션의 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 각 섹션의 내용 안에 해당 섹션의 제목을 다시 반복하지 마세요. 바로 본문부터 시작하세요.
      4. PROFESSIONAL TONE: 정중한 비즈니스 문체(하십시오체)를 사용하세요.`,
    });

    const output = response.output;
    if (!output) throw new Error('사업 계획서 생성 실패');
    return { ...output, businessIdea: input.businessIdea, title: input.title };
  }
);
