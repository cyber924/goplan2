/**
 * AI 글쓰기 및 기획 생성 모델 정의
 * 3.8 제미나이, 3.5 제미나이, 3.5 제미나이 라이트 모델 구성
 */

export interface WritingModel {
  id: string;
  name: string;
  koreanName: string;
  badge: string;
  description: string;
  genkitModelId: string;
}

export const WRITING_MODELS: WritingModel[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    koreanName: '3.8 제미나이',
    badge: '추천 (최신 기획형)',
    description: '최신 3.8 플래그십 모델로 고품질 사업계획서 및 전문 투자 보고서 작성에 최적화',
    genkitModelId: 'googleai/gemini-3.8-flash',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    koreanName: '3.5 제미나이',
    badge: '전문 보고서 / 균형형',
    description: '구조화된 비즈니스 양식 및 시장 데이터 수치 분석 전문 모델',
    genkitModelId: 'googleai/gemini-3.5-flash',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    koreanName: '3.5 제미나이 라이트',
    badge: '초고속 경량화',
    description: '딜레이 없는 빠른 실시간 응답 속도로 즉각적인 섹션 초안 작성 지원',
    genkitModelId: 'googleai/gemini-3.1-flash-lite',
  },
];

export const DEFAULT_WRITING_MODEL_ID = 'gemini-3.8-flash';

/**
 * 모델 ID 문자열을 Genkit 지원 모델 식별자로 변환
 */
export function resolveGenkitModel(modelId?: string): string {
  if (!modelId) return 'googleai/gemini-3.8-flash';
  
  const cleanId = modelId.replace(/^googleai\//, '');
  if (cleanId === 'gemini-3.8-flash') return 'googleai/gemini-3.8-flash';
  if (cleanId === 'gemini-3.5-flash') return 'googleai/gemini-3.5-flash';
  if (cleanId === 'gemini-3.5-flash-lite' || cleanId === 'gemini-3.1-flash-lite') return 'googleai/gemini-3.1-flash-lite';
  
  // 기본 fallback
  return 'googleai/gemini-3.8-flash';
}
