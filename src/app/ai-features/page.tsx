'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BarChart, ImageIcon, Search, Building, LayoutGrid, ScanSearch, ToyBrick, TrendingUp, FileSpreadsheet, Share2, FilePenLine, Terminal } from 'lucide-react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Terminal className="w-8 h-8 text-primary" />,
    title: '프로 프롬프트 생성기',
    description: '단순한 명령어를 전문가 수준의 정교한 프롬프트로 변환하여 AI로부터 최상의 결과물을 끌어냅니다.',
    details: [
      '배포 환경 최적화 신규 로직 적용',
      '전문가급 프롬프트 구조(PCTF) 자동 설계',
      '복사하여 즉시 활용 가능한 결과물',
    ],
    href: '/ai-features/pro-prompt-generator',
    slug: 'pro-prompt-generator',
    isReady: true,
  },
  {
    icon: <FilePenLine className="w-8 h-8 text-primary" />,
    title: 'AI 문체 변환기',
    description: 'AI가 작성한 문서 초안을 전문가가 직접 쓴 것처럼 자연스러운 문체로 다듬어, 보고서의 신뢰도를 높여줍니다.',
    details: [
      'AI 특유의 반복적 구조 및 표현 제거',
      '정부 과제, R&D 보고서에 최적화',
      '개발자, 기획자 등 전문적인 톤앤매너 선택',
    ],
    href: '/ai-features/document-rewriter',
    slug: 'document-rewriter',
    isReady: true,
  },
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: '재무 데이터 시각화',
    description: '재무 데이터를 입력하면 AI가 핵심 성장 지표를 분석하고, 미래 예측을 포함한 전문적인 차트와 그래프를 생성합니다.',
    details: [
      '손익분기점(BEP) 분석 및 예측',
      '매출 및 이익 성장률 시각화',
      '주요 비용 항목 분석 차트',
    ],
    href: '/ai-features/financial-visualization',
    slug: 'financial-visualization',
    isReady: true,
  },
  {
    icon: <ImageIcon className="w-8 h-8 text-primary" />,
    title: 'AI 이미지 생성',
    description: '사업 계획서나 발표 자료에 필요한 이미지를 텍스트 설명만으로 즉시 생성합니다. 저작권 걱정 없는 고품질 이미지를 사용해 보세요.',
    details: [
      '제품 목업 및 컨셉 아트 생성',
      '서비스 설명용 삽화 제작',
      '소셜 미디어 및 마케팅용 이미지 생성',
    ],
    href: '/ai-features/image-generation',
    slug: 'image-generation',
    isReady: true,
  },
  {
    icon: <Search className="w-8 h-8 text-primary" />,
    title: 'AI 시장 분석 리포트',
    description: '사업 아이템만 알려주시면, AI가 최신 데이터를 기반으로 시장 규모, 경쟁사, 타겟 고객을 분석한 심층 리포트를 제공합니다.',
    details: [
      '경쟁사 강점/약점 분석 (SWOT)',
      '시장 동향 및 기회 요인 도출',
      '페르소나 기반 타겟 고객 분석',
    ],
    href: '/ai-features/market-analysis',
    slug: 'market-analysis',
    isReady: true,
  },
   {
    icon: <Building className="w-8 h-8 text-primary" />,
    title: 'AI 기업 분석 및 진단',
    description: '저장된 회사 정보를 바탕으로 AI가 재무 상태, 성장성, 리스크를 분석하여 전문적인 기업 진단 리포트를 제공합니다.',
    details: [
      '재무 데이터 기반 성장성/수익성 분석',
      '강점, 약점, 기회 요인 도출',
      '맞춤형 성장 전략 제안',
    ],
    href: '/ai-features/corporate-diagnosis',
    slug: 'corporate-diagnosis',
    isReady: true,
  },
  {
    icon: <LayoutGrid className="w-8 h-8 text-primary" />,
    title: 'AI 비즈니스 모델 캔버스',
    description: '사업 아이디어를 입력하면 AI가 비즈니스 모델 캔버스를 생성하고, 각 요소의 타당성을 검증하는 리포트를 제공합니다.',
    details: [
      '9가지 핵심 요소 자동 완성',
      '수익 모델 및 비용 구조 분석',
      '논리적 허점 및 리스크 진단',
    ],
    href: '/ai-features/business-model-canvas',
    slug: 'business-model-canvas',
    isReady: true,
  },
  {
    icon: <ScanSearch className="w-8 h-8 text-primary" />,
    title: 'AI 문서 분석기',
    description: '재무제표, 계약서 등 문서 파일을 올리면 AI가 내용을 분석하고, 핵심 데이터를 추출하여 보고서와 질문 답변을 제공합니다.',
    details: [
      'OCR 기반 텍스트 자동 추출',
      '문서 종류 식별 및 핵심 내용 요약',
      '분석 결과에 대한 대화형 Q&A',
    ],
    href: '/ai-features/document-analysis',
    slug: 'document-analysis',
    isReady: true,
  },
  {
    icon: <ToyBrick className="w-8 h-8 text-primary" />,
    title: '인터랙티브 보고서 (예비창업패키지)',
    description: '사업 아이디어를 입력하면, 예비창업패키지 심사 기준에 맞춘 동적인 데이터 시각화 보고서를 AI가 생성합니다.',
    details: [
      '동적 차트를 포함한 재무 추정',
      '시각화된 경쟁사 분석 매트릭스',
      '인터랙티브 사업 추진 로드맵',
    ],
    href: '/ai-features/interactive-report',
    slug: 'interactive-report',
    isReady: true,
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: '인터랙티브 보고서 (창업도약패키지)',
    description: '3~7년차 도약기 기업을 위한 맞춤형 보고서. 스케일업, 투자유치, 글로벌 진출 전략을 중심으로 AI가 심층 분석합니다.',
    details: [
      '스케일업 전략 및 KPI 수립',
      '글로벌 진출 계획 및 시장 분석',
      '투자 유치를 위한 재무 계획 및 기업가치 추정',
    ],
    href: '/ai-features/leap-package-report',
    slug: 'leap-package-report',
    isReady: true,
  },
  {
    icon: <FileSpreadsheet className="w-8 h-8 text-primary" />,
    title: 'AI 예상 재무제표 생성',
    description: '회계를 몰라도 괜찮습니다. 최소한의 정보만으로 AI가 전문가 수준의 추정 손익계산서를 생성해 드립니다.',
    details: [
      '최소 정보 기반 재무제표 자동 생성',
      '사업 모델에 맞는 비용 구조 추론',
      'Markdown 표 형식으로 결과 제공',
    ],
    href: '/ai-features/financial-statement-generator',
    slug: 'financial-statement-generator',
    isReady: true,
  },
  {
    icon: <Share2 className="w-8 h-8 text-primary" />,
    title: 'AI 소셜 미디어 콘텐츠 생성',
    description: '사업 아이템과 타겟 고객을 알려주시면, AI가 채널별 광고 카피, 이미지, 해시태그, 콘텐츠 캘린더까지 생성합니다.',
    details: [
      '인스타그램, 페이스북, 블로그 맞춤 콘텐츠',
      'AI 이미지 생성을 위한 프롬프트 제공',
      '주간 콘텐츠 캘린더 자동 생성',
    ],
    href: '/ai-features/social-media-content-generator',
    slug: 'social-media-content-generator',
    isReady: true,
  },
];

export default function AiFeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-white border-2 border-[#0b50d0] text-[#0b50d0] px-4 py-1.5 rounded-full text-xs font-bold shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00b8d9]" />
              강력한 AI 파트너 솔루션
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-foreground leading-tight tracking-tight">
              비즈니스 역량을 강화하는 <span className="text-primary relative inline-block">AI 기능<span className="absolute left-0 right-0 bottom-1 h-3 bg-[#1463ff]/10 -z-10 rounded-sm" /></span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground md:text-xl leading-relaxed">
              GOplanAI는 단순한 문서 작성을 넘어, 데이터 분석과 콘텐츠 생성 등 비즈니스의 모든 단계에서 당신을 돕습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {features.map((feature) => (
              <Card 
                key={feature.title} 
                className="flex flex-col border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300"
              >
                <CardHeader className="flex-row items-start gap-4 p-8">
                  <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-xl flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black text-[#0b2447]">{feature.title}</CardTitle>
                    <CardDescription className="text-base text-[#475069] leading-relaxed">{feature.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow px-8 pb-4">
                  <ul className="space-y-3">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-[#0b50d0] flex-shrink-0" />
                        <span className="text-sm font-semibold text-[#475069]">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-8 pt-4">
                    <Button 
                      asChild 
                      className="w-full h-14 rounded-xl bg-[#0b50d0] border-[3px] border-[#0b2447] hover:bg-[#1463ff] text-white font-bold shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" 
                      disabled={!feature.isReady}
                    >
                      <Link href={feature.isReady ? feature.href : '#'}>
                        {feature.isReady ? '기능 사용하기' : '준비 중'}
                        {feature.isReady && <ArrowRight className="ml-2 h-5 w-5" />}
                      </Link>
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
