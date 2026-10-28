'use server';
/**
 * @fileOverview A flow to generate form fields for a given document topic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateFormFieldsInputSchema = z.object({
  topic: z.string().describe('The topic of the document.'),
});
export type GenerateFormFieldsInput = z.infer<typeof GenerateFormFieldsInputSchema>;

const FieldSchema = z.object({
  id: z.string().describe("A unique identifier for the field."),
  label: z.string().describe("The user-facing label for the form field. (in Korean)"),
  type: z.enum(['text', 'textarea', 'date']).describe("The type of the input field."),
  placeholder: z.string().optional().describe("Placeholder text. (in Korean)"),
});

const GenerateFormFieldsOutputSchema = z.object({
  fields: z.array(FieldSchema).describe('An array of generated form fields.'),
});
export type GenerateFormFieldsOutput = z.infer<typeof GenerateFormFieldsOutputSchema>;

export async function generateFormFields(input: GenerateFormFieldsInput): Promise<GenerateFormFieldsOutput> {
  return generateFormFieldsFlow(input);
}

const generateFormFieldsFlow = ai.defineFlow(
  {
    name: 'generateFormFieldsFlow',
    inputSchema: GenerateFormFieldsInputSchema,
    outputSchema: GenerateFormFieldsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: GenerateFormFieldsOutputSchema },
      prompt: `당신은 비즈니스 양식 설계 전문가입니다. 다음 주제에 가장 적합한 문서 양식 항목들을 생성하세요.

      주제: ${input.topic}

      [필수 규칙 - 엄격 준수]
      1. NO MARKDOWN: 라벨이나 플레이스홀더에 #, *, - 등의 마크다운 기호를 절대 사용하지 마세요.
      2. PURE TEXT: 모든 항목의 이름은 깔끔한 한국어 텍스트로만 구성하세요.
      3. PROFESSIONAL TONE: 실무에서 사용되는 전문적인 용어를 사용하세요.

      항목 예시 (업무일지): reportDate(날짜), reporter(텍스트, 성함 입력), tasks(텍스트영역, 주요 업무)`,
    });

    if (!output) throw new Error('Failed to generate form fields.');
    return output;
  }
);
