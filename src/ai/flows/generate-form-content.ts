'use server';
/**
 * @fileOverview A flow to generate content for a specific field in a form.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { resolveGenkitModel } from '@/lib/ai-models';

const FieldDataSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.string().optional(),
});

const GenerateFormContentInputSchema = z.object({
  documentTitle: z.string().describe("The title of the entire document."),
  targetField: z.object({
    id: z.string(),
    label: z.string(),
  }).describe("The specific field for which to generate content."),
  allFields: z.array(FieldDataSchema).describe("All other fields in the form for context."),
  model: z.string().optional().describe('선택된 AI 글쓰기 모델 (3.8 제미나이, 3.5 제미나이, 3.5 제미나이 라이트 등)'),
});
export type GenerateFormContentInput = z.infer<typeof GenerateFormContentInputSchema>;

const GenerateFormContentOutputSchema = z.object({
  content: z.string().describe('The generated content for the specified field.'),
});
export type GenerateFormContentOutput = z.infer<typeof GenerateFormContentOutputSchema>;

export async function generateFormContent(input: GenerateFormContentInput): Promise<GenerateFormContentOutput> {
  return generateFormContentFlow(input);
}

const generateFormContentFlow = ai.defineFlow(
  {
    name: 'generateFormContentFlow',
    inputSchema: GenerateFormContentInputSchema,
    outputSchema: GenerateFormContentOutputSchema,
  },
  async (input) => {
    const targetModel = resolveGenkitModel(input.model);
    const contextText = input.allFields.map(f => `- ${f.label}: ${f.value || '(아직 채워지지 않음)'}`).join('\n');

    const { output } = await ai.generate({
      model: targetModel,
      output: { schema: GenerateFormContentOutputSchema },
      prompt: `당신은 전문적인 비즈니스 문서 작성가입니다. 특정 항목에 대해 전문적인 내용을 생성하세요.

      문서 제목: ${input.documentTitle}
      작성할 항목: "${input.targetField.label}"

      참고 문맥:
      ${contextText}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT ONLY: 모든 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
      3. NO TITLES IN CONTENT: 출력되는 내용 안에 항목 이름 "${input.targetField.label}"이나 제목을 다시 반복하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
      4. PROFESSIONAL TONE: 신뢰감을 주는 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.`,
    });

    if (!output) throw new Error('Failed to generate content from AI.');
    return output;
  }
);
