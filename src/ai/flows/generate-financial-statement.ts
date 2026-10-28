'use server';
/**
 * @fileOverview A flow to generate a projected income statement from basic financial inputs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialInputDataSchema = z.object({
  year: z.string().describe('The year for the projection.'),
  revenue: z.number().describe('The projected revenue.'),
  costOfGoodsSold: z.number().describe('The projected cost of goods sold.'),
  sellingAdminExpenses: z.number().describe('The projected SG&A expenses.'),
});

const GenerateFinancialStatementInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  businessIdea: z.string().describe('A brief description of the business.'),
  financialInputs: z.array(FinancialInputDataSchema).min(1, 'At least 1 year of data is required.'),
});
export type GenerateFinancialStatementInput = z.infer<typeof GenerateFinancialStatementInputSchema>;

const GenerateFinancialStatementOutputSchema = z.object({
  report: z.string().describe('A comprehensive projected income statement and analysis. Should be in Korean.'),
});
export type GenerateFinancialStatementOutput = z.infer<typeof GenerateFinancialStatementOutputSchema>;

export async function generateFinancialStatement(input: GenerateFinancialStatementInput): Promise<GenerateFinancialStatementOutput> {
  return generateFinancialStatementFlow(input);
}

const generateFinancialStatementFlow = ai.defineFlow(
  {
    name: 'generateFinancialStatementFlow',
    inputSchema: GenerateFinancialStatementInputSchema,
    outputSchema: GenerateFinancialStatementOutputSchema,
  },
  async (input) => {
    const dataText = input.financialInputs.map(d => `- Year: ${d.year}, Revenue: ${d.revenue}, COGS: ${d.costOfGoodsSold}, SG&A: ${d.sellingAdminExpenses}`).join('\n');

    const { output } = await ai.generate({
      model: 'googleai/gemini-3.8-flash',
      output: { schema: GenerateFinancialStatementOutputSchema },
      prompt: `당신은 스타트업 전문 재무 회계사입니다. 다음 데이터를 바탕으로 한국어 3개년 추정 손익계산서와 분석 리포트를 작성하세요.

      회사명: ${input.companyName}
      사업 내용: ${input.businessIdea}
      제공된 데이터:
      ${dataText}

      [지침]
      1. 마크다운 표를 사용하여 추정 손익계산서를 작성하세요. (표 내부 외에는 마크다운 금지)
      2. 매출총이익, 영업이익, 법인세(약 20%), 당기순이익을 계산하세요.
      3. 판관비를 사업 성격에 맞게 급여, 마케팅비 등으로 합리적으로 세분화하세요.
      4. 전체적인 분석과 주요 재무 비율을 포함하세요.

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN (EXCEPT TABLE): 표 이외의 텍스트에서는 #, ##, **, - 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 리포트 본문은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 출력되는 본문 안에 제목을 다시 반복하지 마세요. 바로 본문 내용부터 시작하세요.
      4. PROFESSIONAL TONE: 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.`,
    });

    if (!output) throw new Error('Failed to get analysis from AI.');
    return output;
  }
);
