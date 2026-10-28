'use server';
/**
 * @fileOverview An AI flow to generate a rich, interactive report for a preliminary startup package application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInteractiveReportInputSchema = z.object({
  businessIdea: z.string().describe('The core business idea.'),
  companyName: z.string().describe('The name of the startup.'),
});
export type GenerateInteractiveReportInput = z.infer<typeof GenerateInteractiveReportInputSchema>;

const GenerateInteractiveReportOutputSchema = z.object({
  title: z.string().describe('The title of the report.'),
  overview: z.object({ problem: z.string(), solution: z.string(), uniqueness: z.string() }),
  marketAnalysis: z.object({ marketSize: z.number(), targetMarket: z.string(), growthPotential: z.string() }),
  competitors: z.array(z.object({ name: z.string(), strength: z.string(), weakness: z.string() })),
  businessModel: z.object({ revenueModel: z.string(), costStructure: z.string() }),
  roadmap: z.array(z.object({ quarter: z.string(), year: z.number(), goal: z.string(), details: z.array(z.string()) })),
  financialProjections: z.array(z.object({ year: z.number(), revenue: z.number(), expenses: z.number(), profit: z.number() })),
  team: z.array(z.object({ name: z.string(), role: z.string(), expertise: z.string() })),
});
export type GenerateInteractiveReportOutput = z.infer<typeof GenerateInteractiveReportOutputSchema>;

export async function generateInteractiveReport(input: GenerateInteractiveReportInput): Promise<GenerateInteractiveReportOutput> {
  return generateInteractiveReportFlow(input);
}

const generateInteractiveReportFlow = ai.defineFlow(
  {
    name: 'generateInteractiveReportFlow',
    inputSchema: GenerateInteractiveReportInputSchema,
    outputSchema: GenerateInteractiveReportOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateInteractiveReportOutputSchema },
      prompt: `당신은 '예비창업패키지' 전문 컨설턴트입니다. 다음 아이디어에 대해 데이터 기반의 상세 한국어 보고서를 작성하세요.

      회사명: ${input.companyName}
      사업 아이디어: ${input.businessIdea}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: 결과 데이터 내부의 어떠한 필드에도 마크다운 기호(#, *, - 등)를 사용하지 마세요.
      2. PURE TEXT: 모든 텍스트는 깔끔한 한국어 문장으로만 구성하세요.
      3. NO TITLES IN CONTENT: 필드 값 내에 항목 이름을 제목으로 다시 반복하지 마세요.
      4. PROFESSIONAL TONE: 전문적이고 설득력 있는 비즈니스 문체를 사용하세요.
      5. 데이터는 현실적이고 구체적이어야 합니다.`,
    });
    if (!output) throw new Error('Failed to generate interactive report.');
    return output;
  }
);
