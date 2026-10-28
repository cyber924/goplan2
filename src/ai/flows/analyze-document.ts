'use server';
/**
 * @fileOverview A flow to analyze a document image/pdf, extract structured data,
 * generate a report, and answer follow-up questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialTableEntrySchema = z.object({
    item: z.string().describe('재무 항목 (예: 매출액, 영업이익)'),
    value: z.string().describe('해당 항목의 값 (단위 포함)'),
    change: z.string().optional().describe('전년 대비 증감률 또는 변화'),
});

const ContractClauseSchema = z.object({
    clause: z.string().describe('계약서의 핵심 조항'),
    summary: z.string().describe('해당 조항의 요약'),
});

const StructuredDataSchema = z.union([
    z.array(FinancialTableEntrySchema),
    z.array(ContractClauseSchema),
    z.object({ custom: z.any() }).describe('기타 구조화된 데이터'),
]);

const AnalyzeDocumentInputSchema = z.object({
  documentDataUri: z.string().describe("The document file as a data URI."),
});
export type AnalyzeDocumentInput = z.infer<typeof AnalyzeDocumentInputSchema>;

const AnalyzeDocumentOutputSchema = z.object({
  documentType: z.string().describe('분석된 문서의 종류'),
  analysisReport: z.string().describe('상세 분석 리포트 (순수 텍스트)'),
  structuredData: StructuredDataSchema.optional().describe('추출 및 구조화된 데이터'),
});
export type AnalyzeDocumentOutput = z.infer<typeof AnalyzeDocumentOutputSchema>;

const FollowupQuestionInputSchema = z.object({
    analysisReport: z.string().describe("The initial analysis report."),
    structuredData: z.any().optional().describe("The initial structured data."),
    question: z.string().describe("The user's follow-up question."),
});
export type FollowupQuestionInput = z.infer<typeof FollowupQuestionInputSchema>;

const FollowupQuestionOutputSchema = z.object({
    answer: z.string().describe("The AI's answer."),
});
export type FollowupQuestionOutput = z.infer<typeof FollowupQuestionOutputSchema>;

export async function analyzeDocument(input: AnalyzeDocumentInput): Promise<AnalyzeDocumentOutput> {
  return analyzeDocumentFlow(input);
}

export async function answerFollowupQuestion(input: FollowupQuestionInput): Promise<FollowupQuestionOutput> {
    return answerFollowupQuestionFlow(input);
}

const analyzeDocumentFlow = ai.defineFlow(
  {
    name: 'analyzeDocumentFlow',
    inputSchema: AnalyzeDocumentInputSchema,
    outputSchema: AnalyzeDocumentOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: AnalyzeDocumentOutputSchema },
      prompt: [
        { media: { url: input.documentDataUri } },
        { text: `당신은 전문 AI 문서 분석가입니다. 제공된 문서를 분석하여 포괄적인 리포트를 작성하세요.

        [지침]
        1. 문서 종류 식별: 문선의 종류(예: 재무제표, 계약서, 사업자등록증 등)를 결정하세요.
        2. 분석 리포트 생성: 주요 내용을 요약하고, 중요한 포인트를 강조하며, 통찰력을 제공하는 상세 리포트를 한국어로 작성하세요.
        3. 구조화된 데이터 추출: 가능한 경우 핵심 데이터를 구조화된 형식으로 추출하세요.

        [필수 규칙 - 엄격 준수]
        1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요. 
        2. PURE TEXT ONLY: 모든 리포트 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
        3. NO TITLES IN CONTENT: 출력되는 본문(analysisReport 필드) 안에 문서 종류나 "분석 리포트" 등의 제목을 다시 반복하지 마세요. 바로 본문 내용부터 시작하세요.
        4. PROFESSIONAL TONE: 신뢰감을 주는 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.` }
      ],
    });
    if (!output) throw new Error('Failed to analyze document.');
    return output;
  }
);

const answerFollowupQuestionFlow = ai.defineFlow(
    {
      name: 'answerFollowupQuestionFlow',
      inputSchema: FollowupQuestionInputSchema,
      outputSchema: FollowupQuestionOutputSchema,
    },
    async (input) => {
      const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        output: { schema: FollowupQuestionOutputSchema },
        prompt: `당신은 사용자가 분석된 문서를 이해하도록 돕는 AI 어시스턴트입니다. 
        이전 분석 결과와 사용자의 질문을 바탕으로 명확하고 간결한 답변을 한국어로 제공하세요.

        이전 분석 리포트:
        ${input.analysisReport}

        이전 구조화 데이터:
        ${JSON.stringify(input.structuredData)}

        사용자 질문: "${input.question}"

        [필수 규칙]
        1. NO MARKDOWN: 답변에 마크다운 기호를 사용하지 마세요.
        2. PURE TEXT ONLY: 깔끔한 문장으로만 답변하세요.
        3. PROFESSIONAL TONE: 정중한 비즈니스 문체를 사용하세요.`,
      });
      if (!output) throw new Error('Failed to answer the question.');
      return output;
    }
);
