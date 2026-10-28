'use server';
/**
 * @fileOverview A flow to analyze financial data and provide insights with chart data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialDataPointSchema = z.object({
  period: z.string().describe('The time period for the data (e.g., "1분기", "2023년").'),
  revenue: z.number().describe('The revenue for the period.'),
  expenses: z.number().describe('The expenses for the period.'),
  profit: z.number().describe('The profit for the period.'),
});

const AnalyzeFinancialsInputSchema = z.object({
  businessDescription: z.string().describe('A brief description of the business.'),
  financialData: z.array(FinancialDataPointSchema).min(3, 'At least 3 data points are required.'),
});
export type AnalyzeFinancialsInput = z.infer<typeof AnalyzeFinancialsInputSchema>;

const AnalyzeFinancialsOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis of the financial data. (in Korean)'),
  chartData: z.array(FinancialDataPointSchema).describe('The original financial data.'),
});
export type AnalyzeFinancialsOutput = z.infer<typeof AnalyzeFinancialsOutputSchema>;

export async function analyzeFinancials(input: AnalyzeFinancialsInput): Promise<AnalyzeFinancialsOutput> {
  return analyzeFinancialsFlow(input);
}

const analyzeFinancialsFlow = ai.defineFlow(
  {
    name: 'analyzeFinancialsFlow',
    inputSchema: AnalyzeFinancialsInputSchema,
    outputSchema: AnalyzeFinancialsOutputSchema,
  },
  async (input) => {
    const dataText = input.financialData.map(d => `- Period: ${d.period}, Revenue: ${d.revenue}, Expenses: ${d.expenses}, Profit: ${d.profit}`).join('\n');

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: z.object({ analysis: z.string() }) },
      prompt: `당신은 스타트업을 위한 수석 재무 분석가입니다. 제공된 재무 데이터를 분석하여 전문적인 리포트를 작성하세요.

      사업 내용: ${input.businessDescription}

      재무 데이터:
      ${dataText}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 깔끔한 문단 형태의 텍스트로만 작성하세요.
      3. NO TITLES IN CONTENT: 분석 리포트 본문 안에 제목이나 "재무 분석" 등의 단어를 다시 반복하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
      4. TONE: 전문적이고 분석적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.
      5. 가독성: 문단 사이에는 빈 줄을 넣어 읽기 편하게 만드세요.`,
    });

    if (!output) {
      throw new Error('Failed to get analysis from AI.');
    }
    
    return {
      analysis: output.analysis,
      chartData: input.financialData,
    };
  }
);
