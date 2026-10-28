'use server';
/**
 * @fileOverview An AI flow to generate a rich, interactive report for a Startup Leap Package application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLeapReportInputSchema = z.object({
  companyName: z.string().describe('The name of the startup.'),
  businessIdea: z.string().describe('The core business idea.'),
  currentStatus: z.string().describe('Current status and metrics.'),
});
export type GenerateLeapReportInput = z.infer<typeof GenerateLeapReportInputSchema>;

const GenerateLeapReportOutputSchema = z.object({
  title: z.string().describe('The title of the report.'),
  diagnosis: z.object({ strength: z.string(), weakness: z.string(), opportunity: z.string() }),
  scaleUpStrategy: z.array(z.object({ target: z.string(), strategy: z.string(), kpi: z.string() })),
  globalExpansionPlan: z.object({ targetCountry: z.string(), marketResearch: z.string(), entryStrategy: z.string() }),
  financialPlan: z.array(z.object({ year: z.number(), revenue: z.number(), investment: z.number(), valuation: z.number() })),
  exitStrategy: z.string().describe('Exit strategies.'),
});
export type GenerateLeapReportOutput = z.infer<typeof GenerateLeapReportOutputSchema>;

export async function generateLeapReport(input: GenerateLeapReportInput): Promise<GenerateLeapReportOutput> {
  return generateLeapReportFlow(input);
}

const generateLeapReportFlow = ai.defineFlow(
  {
    name: 'generateLeapReportFlow',
    inputSchema: GenerateLeapReportInputSchema,
    outputSchema: GenerateLeapReportOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-3.8-flash',
      output: { schema: GenerateLeapReportOutputSchema },
      prompt: `당신은 '창업도약패키지' (3~7년차 기업) 전문 컨설턴트입니다. 다음 정보를 바탕으로 한국어 도약 전략 보고서를 작성하세요.

      회사명: ${input.companyName}
      사업 아이디어: ${input.businessIdea}
      현재 현황: ${input.currentStatus}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: 결과 데이터 내부에 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT: 깔끔하고 전문적인 일반 텍스트로만 구성하세요.
      3. NO TITLES IN CONTENT: 필드 내에 제목을 반복하지 마세요.
      4. PROFESSIONAL TONE: 성장기 기업에 걸맞은 격식 있는 문체를 사용하세요.`,
    });
    if (!output) throw new Error('Failed to generate leap package report.');
    return output;
  }
);
