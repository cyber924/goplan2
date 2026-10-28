'use server';
/**
 * @fileOverview An AI flow to rewrite a document to a more human-like, professional tone.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RewriteDocumentInputSchema = z.object({
  text: z.string().describe('The original text to be rewritten.'),
  addDeveloperTone: z.boolean().optional(),
  emphasizeExperience: z.boolean().optional(),
  reduceAISuspicion: z.boolean().optional(),
});
export type RewriteDocumentInput = z.infer<typeof RewriteDocumentInputSchema>;

const RewriteDocumentOutputSchema = z.object({
  rewrittenText: z.string().describe('The rewritten, human-like text.'),
});
export type RewriteDocumentOutput = z.infer<typeof RewriteDocumentOutputSchema>;

export async function rewriteDocument(input: RewriteDocumentInput): Promise<RewriteDocumentOutput> {
  return rewriteDocumentFlow(input);
}

const rewriteDocumentFlow = ai.defineFlow(
  {
    name: 'rewriteDocumentFlow',
    inputSchema: RewriteDocumentInputSchema,
    outputSchema: RewriteDocumentOutputSchema,
  },
  async (input) => {
    let instructions = `당신은 전문 문서 편집가입니다. 다음 텍스트를 전문가가 직접 작성한 것처럼 자연스럽고 정중하게 다듬어 주세요.

    [필수 규칙 - 엄격 준수]
    1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
    2. PURE TEXT ONLY: 깔끔한 전문 비즈니스 텍스트 문단으로만 구성하세요.
    3. NO TITLES: 출력 결과에 어떠한 제목도 포함하지 마세요. 제목 없이 바로 본문 내용부터 시작하세요.
    4. TONE: 정중하고 신뢰감 있는 한국어 비즈니스 문체(하십시오체)를 사용하세요.
    5. AI 특유의 반복적인 표현을 자연스러운 실무 용어로 대체하세요.`;

    if (input.addDeveloperTone) instructions += "\n- 실무 기획자의 기술적인 관점을 반영하세요.";
    if (input.emphasizeExperience) instructions += "\n- 실제 현장 경험과 고민이 묻어나도록 작성하세요.";
    if (input.reduceAISuspicion) instructions += "\n- 인위적인 구조를 피하고 자연스러운 문장 흐름을 만드세요.";

    const { text } = await ai.generate({
        model: 'googleai/gemini-3.8-flash',
        prompt: `${instructions}\n\n원본 텍스트:\n${input.text}\n\n변환된 일반 텍스트 본문:`,
    });
    
    return { rewrittenText: (text || '').trim() };
  }
);
