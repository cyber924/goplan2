'use server';
/**
 * @fileOverview A flow to generate a corporate diagnosis report based on company information.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialItemSchema = z.object({
  year: z.string(),
  revenue: z.number().optional(),
  operatingProfit: z.number().optional(),
  netProfit: z.number().optional(),
});

const CorporateDiagnosisInputSchema = z.object({
  companyName: z.string(),
  vision: z.string().optional(),
  history: z.string().optional(),
  financials: z.array(FinancialItemSchema).min(1, 'At least 1 year of financial data is required.'),
});
export type CorporateDiagnosisInput = z.infer<typeof CorporateDiagnosisInputSchema>;

const CorporateDiagnosisOutputSchema = z.object({
  report: z.string().describe('A comprehensive corporate diagnosis report in plain text. Should be in Korean.'),
});
export type CorporateDiagnosisOutput = z.infer<typeof CorporateDiagnosisOutputSchema>;

export async function corporateDiagnosis(input: CorporateDiagnosisInput): Promise<CorporateDiagnosisOutput> {
  return corporateDiagnosisFlow(input);
}

const corporateDiagnosisFlow = ai.defineFlow(
  {
    name: 'corporateDiagnosisFlow',
    inputSchema: CorporateDiagnosisInputSchema,
    outputSchema: CorporateDiagnosisOutputSchema,
  },
  async (input) => {
    let companyInfoString = `회사명: ${input.companyName}\n`;
    if (input.vision) companyInfoString += `비전: ${input.vision}\n`;
    if (input.history) companyInfoString += `연혁: ${input.history}\n`;
    
    const financialsString = input.financials.map(f => 
        `- 연도: ${f.year}, 매출: ${f.revenue ?? 'N/A'}, 영업이익: ${f.operatingProfit ?? 'N/A'}, 당기순이익: ${f.netProfit ?? 'N/A'}`
    ).join('\n');
    
    companyInfoString += `재무제표:\n${financialsString}`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: CorporateDiagnosisOutputSchema },
      prompt: `당신은 일류 비즈니스 컨설턴트입니다. 다음 회사 정보를 바탕으로 한국어 기업 진단 리포트를 작성하세요.

      회사 정보:
      ${companyInfoString}

      [포함 내용]
      종합 진단, 강점 분석, 약점 및 과제, 기회 및 성장 전략을 포함하세요. 섹션 구분 시 제목을 쓰지 말고 빈 줄로 구분하세요.

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 출력되는 본문 내용 안에 "종합 진단"이나 제목 등을 다시 반복하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
      4. PROFESSIONAL TONE: 신뢰감을 주는 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.
      5. 가독성: 문단 사이에는 빈 줄을 넣어 읽기 편하게 만드세요.`,
    });

    if (!output) throw new Error('Failed to get analysis from AI.');
    return output;
  }
);
