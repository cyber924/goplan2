'use server';
/**
 * @fileOverview 사업 계획서의 특정 섹션 초안 생성을 위한 Genkit v1.x 표준 Flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { resolveGenkitModel } from '@/lib/ai-models';

const GenerateSectionDraftInputSchema = z.object({
  businessIdea: z.string().describe('사업의 핵심 아이디어'),
  sectionTitle: z.string().describe('작성할 섹션의 제목'),
  model: z.string().optional().describe('선택된 AI 글쓰기 모델 (3.8 제미나이, 3.5 제미나이, 3.5 제미나이 라이트 등)'),
});
export type GenerateSectionDraftInput = z.infer<typeof GenerateSectionDraftInputSchema>;

const GenerateSectionDraftOutputSchema = z.object({
  draft: z.string().describe('생성된 섹션 초안'),
});
export type GenerateSectionDraftOutput = z.infer<typeof GenerateSectionDraftOutputSchema>;

export async function generateSectionDraft(input: GenerateSectionDraftInput): Promise<GenerateSectionDraftOutput> {
  return generateSectionDraftFlow(input);
}

const generateSectionDraftFlow = ai.defineFlow(
  {
    name: 'generateSectionDraftFlow',
    inputSchema: GenerateSectionDraftInputSchema,
    outputSchema: GenerateSectionDraftOutputSchema,
  },
  async (input) => {
    const targetModel = resolveGenkitModel(input.model);

    const response = await ai.generate({
      model: targetModel,
      output: { schema: GenerateSectionDraftOutputSchema },
      prompt: `당신은 최신 2026년 스타트업 트렌드와 투자 유치 기준을 꿰뚫고 있는 수석 실리콘밸리/국내 탑티어 VC(Venture Capital) 심사역이자 전문 비즈니스 컨설턴트입니다.

      주어진 사업 아이디어를 기반으로, 해당 섹션에 대해 투자 심사역들이 한눈에 반할 수밖에 없는 완벽하고 전문적인 사업 계획서 초안을 작성하세요.

      사업 아이디어: ${input.businessIdea}
      작성할 섹션 제목: "${input.sectionTitle}"

      [작성 가이드라인 - 전문적 구조화 및 디자인 가독성 극대화]
      1. 구조적 다양성 확보 (필수): 단순 줄글(텍스트 덩어리)을 지양하고 다음 마크다운 문법을 조합하여 입체적이고 세련된 비즈니스 양식을 만드세요.
         - 핵심 요약 또는 하이라이트 메시지: 문장 처음에 \`> \`(인용구)를 사용하여 강력한 헤드라인 요약 블록을 선배치하세요.
         - 하부 토픽 구분: \`### \`(소제목)을 사용하여 세부 영역을 깔끔히 구분하세요.
         - 핵심 지표 및 리스트: 중요 포인트나 나열식 설명은 \`- \` 또는 \`* \` 글머리 기호를 활용하세요.
         - 수치 및 비교 데이터: 시장 규모(TAM-SAM-SOM), 사업 전략 비교, 매출 추정 등 수치가 있는 부분은 반드시 마크다운 테이블(예: \`| 구분 | 내용 | 수치 |\`) 형식을 적용하여 표로 일목요연하게 정리하세요.
         - 강조 단어: 핵심 지표나 중요 핵심 명사는 \`**텍스트**\`(볼드) 기호를 활용해 시선이 각인되게 만드세요.
      2. 중복 타이틀 금지: 출력되는 본문(draft 필드) 가장 첫 머리에 섹션 제목 "${input.sectionTitle}" 자체를 제목(예: # 또는 ##)으로 반복해서 적지 마세요. 제목 없이 바로 본문 내용부터 임팩트 있게 개시하십시오.
      3. 전문적인 신뢰감: 실현 가능성이 돋보이는 구체적인 수치 지표와 전문 용어, 정제된 한국어 어조(하십시오체)를 조화롭게 구사하세요.
      4. 줄바꿈 및 여백: 문단 사이 및 표 앞뒤에는 반드시 2번의 줄바꿈(\\n\\n)을 두어 시각적인 산소 공간(여백)을 부여하세요.`,
    });

    const output = response.output;
    if (!output) throw new Error('초안 생성 실패');
    return output;
  }
);
