'use server';
/**
 * @fileOverview An AI flow to analyze a document image/pdf and extract form fields.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalysisModeSchema = z.enum(['structure_only', 'full_ocr']);

const AnalyzeDocumentFormInputSchema = z.object({
  documentTitle: z.string().describe("The title for the new document to be created."),
  analysisMode: AnalysisModeSchema.describe("The analysis mode: 'structure_only' to get the form layout, 'full_ocr' to also extract content."),
  documentDataUri: z
    .string()
    .describe(
      "The document file (image or PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDocumentFormInput = z.infer<typeof AnalyzeDocumentFormInputSchema>;

const FieldSchema = z.object({
  id: z.string().describe("A unique identifier for the field, e.g., 'reportDate'."),
  label: z.string().describe("The user-facing label for the form field, e.g., '보고일자'. (in Korean)"),
  type: z.enum(['text', 'textarea', 'date']).describe("The type of the input field."),
  placeholder: z.string().optional().describe("Placeholder text for the input field. (in Korean)"),
  value: z.string().optional().describe("The extracted value for the field if using full_ocr mode."),
});

const AnalyzeDocumentFormOutputSchema = z.object({
  fields: z.array(FieldSchema).describe('An array of generated form fields.'),
});
export type AnalyzeDocumentFormOutput = z.infer<typeof AnalyzeDocumentFormOutputSchema>;

export async function analyzeDocumentForm(input: AnalyzeDocumentFormInput): Promise<AnalyzeDocumentFormOutput> {
  return analyzeDocumentFormFlow(input);
}

const analyzeDocumentFormFlow = ai.defineFlow(
  {
    name: 'analyzeDocumentFormFlow',
    inputSchema: AnalyzeDocumentFormInputSchema,
    outputSchema: AnalyzeDocumentFormOutputSchema,
  },
  async (input) => {
    const isFullOcr = input.analysisMode === 'full_ocr';
    const isStructureOnly = input.analysisMode === 'structure_only';

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: AnalyzeDocumentFormOutputSchema },
      prompt: [
        { media: { url: input.documentDataUri } },
        { text: `당신은 문서 분석 및 OCR 전문가입니다. 제공된 문서 파일을 분석하여 적절한 입력 양식 항목들을 추출하세요.

        분석 모드: ${input.analysisMode}

        [지침]
        1. 문서의 시각적 레이아웃을 분석하여 모든 뚜렷한 입력 항목(라벨, 텍스트 상자, 날짜 필드 등)을 식별하세요.
        2. 각 항목에 대해 고유한 'id'(camelCase), 한국어 'label', 적절한 'type'('text', 'textarea', 'date'), 그리고 선택적인 'placeholder'를 결정하세요.
        
        ${isFullOcr ? `3. **전체 OCR 모드**: 양식 구조뿐만 아니라 문서 전체에 대해 OCR을 수행하여 각 필드 내의 텍스트 내용을 읽어 'value' 필드에 채우세요. 내용이 없으면 빈 문자열로 둡니다.` : ""}
        ${isStructureOnly ? `3. **구조 전용 모드**: 양식의 '틀'만 추출합니다. OCR을 통한 내용 추출은 하지 마세요. 모든 필드의 'value'는 빈 문자열이어야 합니다.` : ""}

        [필수 규칙 - 엄격 준수]
        1. NO MARKDOWN: 결과 데이터 내부의 텍스트에 #, *, - 등의 마크다운 기호를 절대 사용하지 마세요.
        2. PURE TEXT: 라벨과 플레이스홀더는 깔끔한 한국어 텍스트로만 구성하세요.` }
      ],
    });

    if (!output) {
      throw new Error('Failed to analyze document.');
    }
    return output;
  }
);
