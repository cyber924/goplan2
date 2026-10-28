'use server';
/**
 * @fileOverview 관리자 전용 콘텐츠 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminContentInputSchema = z.object({
  type: z.enum(['announcement', 'newsletter']).describe('생성할 콘텐츠의 종류'),
  topic: z.string().describe('콘텐츠의 주제 또는 핵심 내용'),
  target: z.string().optional().describe('수신 대상'),
});
export type AdminContentInput = z.infer<typeof AdminContentInputSchema>;

const AdminContentOutputSchema = z.object({
  title: z.string().describe('생성된 제목'),
  content: z.string().describe('생성된 본문'),
});
export type AdminContentOutput = z.infer<typeof AdminContentOutputSchema>;

export async function generateAdminContent(input: AdminContentInput): Promise<AdminContentOutput> {
  const isNotice = input.type === 'announcement';
  
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    output: { schema: AdminContentOutputSchema },
    prompt: `당신은 비즈니스 플랫폼 GOplanAI의 전문 운영자입니다. 
    다음 주제에 대해 고객들에게 전달할 ${isNotice ? '공지사항' : '뉴스레터'}를 작성하세요.

    주제: ${input.topic}
    대상: ${input.target || '모든 사용자'}

    [필수 규칙 - 엄격 준수]
    1. NO MARKDOWN: #, ##, ###, **, -, _ 등의 마크다운 기호를 절대 사용하지 마세요.
    2. PURE TEXT ONLY: 모든 내용은 깔끔한 일반 텍스트 문단으로만 구성하세요.
    3. NO TITLES IN CONTENT: 출력되는 본문(content 필드) 안에 제목이나 "${isNotice ? '공지사항' : '뉴스레터'}"라는 단어를 다시 반복하지 마세요. 바로 본문 내용부터 시작하세요.
    4. PROFESSIONAL TONE: 신뢰감을 주는 전문적인 한국어 비즈니스 문체(하십시오체)를 사용하세요.
    5. 가독성: 문단 사이에는 빈 줄을 넣어 읽기 편하게 만드세요.`,
  });

  const output = response.output;
  if (!output) throw new Error('콘텐츠 생성 실패');
  return output;
}
