import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini SDK with server-side API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { category, model } = await req.json();
    if (!category) {
      return NextResponse.json({ error: "카테고리가 필요합니다." }, { status: 400 });
    }

    const categoryUpper = category.toUpperCase();
    const modelToUse = model || "gemini-3.5-flash";

    // Call Gemini API to generate 5 professional trending ideas
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `당신은 실리콘밸리 벤처캐피털(VC) 심사역이자 스타트업 인큐베이터의 최고 파트너입니다.
      최신 2026년 트렌드와 성공 지표를 반영하여, 해당 산업 카테고리에 맞는 즉시 실행 가능한 고부가가치 비즈니스 아이디어(BM)를 5개 기획해 주세요.

      산업군 카테고리: ${category}

      [필수 규칙 및 양식]
      - 각 비즈니스 아이디어는 극도로 트렌디하고 매력적이어야 하며 구체적인 데이터 개선 목표(수치 지표)를 포함해야 합니다.
      - 설명은 구체적이고 전문적으로 작성해 주세요.
      - 관련 검색 태그는 2~4개 수준의 키워드로 작성해 주세요.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "스타트업 비즈니스 아이디어 제목" },
                  description: { type: Type.STRING, description: "비즈니스 모델(BM)에 대한 구체적인 설명 및 페인포인트 해소 방식" },
                  targetEfficiency: { type: Type.STRING, description: "정량적 수치 지표 목표 (예: 효율 20% 향상, 비용 15% 절감 등)" },
                  trendingTags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "인기 트렌드 태그 및 검색 최적화 키워드 리스트"
                  }
                },
                required: ["title", "description", "targetEfficiency", "trendingTags"]
              }
            }
          },
          required: ["ideas"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini API가 빈 응답을 반환했습니다.");
    }

    const data = JSON.parse(text);
    const generatedIdeas = data.ideas || [];

    // Map through and format for client to save
    const formattedIdeas = generatedIdeas.map((idea: any) => ({
      category: categoryUpper,
      title: idea.title,
      description: idea.description,
      targetEfficiency: idea.targetEfficiency,
      trendingTags: idea.trendingTags || [],
    }));

    // Return the formatted ideas to the client
    return NextResponse.json({ success: true, ideas: formattedIdeas });
  } catch (error: any) {
    console.error("AI 아이디어 생성 에러:", error);
    return NextResponse.json({ error: error.message || "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
