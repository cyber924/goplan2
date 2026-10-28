
'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Zap, BarChart, FileText, ScanSearch, Globe, MousePointer2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function Home() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBanner, setHasBanner] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Listen for banner state to adjust padding
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setHasBanner(docSnap.data().noticeActive || false);
      }
    }, (error) => {
      console.warn('System banner state snapshot read blocked:', error);
    });

    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, []);

  const handleStart = () => {
    router.push('/templates');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className={cn(
            "relative overflow-hidden pb-16 md:pb-24 bg-gradient-to-b from-[#f7faff] to-white transition-all duration-300",
            hasBanner ? "pt-40 md:pt-56" : "pt-32 md:pt-48"
        )}>
          {/* Grid Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20" 
            style={{ 
              backgroundImage: 'linear-gradient(#e2e8f4 1px, transparent 1px), linear-gradient(90deg, #e2e8f4 1px, transparent 1px)',
              backgroundSize: '46px 46px'
            }} 
          />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className={cn("reveal space-y-6", isVisible && "in")}>
                <span className="inline-flex items-center gap-2 bg-white border-2 border-[#0b50d0] text-[#0b50d0] px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00b8d9] shadow-[0_0_0_4px_rgba(0,184,217,0.18)]" />
                  AI 기반 정부지원사업 사업계획서 자동화
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-[900] text-[#0b2447] leading-[1.1] tracking-tight">
                  아이디어를<br />
                  <span className="text-[#0b50d0] relative">
                    합격하는 사업계획서
                    <span className="absolute left-0 right-0 bottom-1 h-3 bg-[#1463ff]/10 -z-10 rounded-sm" />
                  </span>로
                </h1>
                <p className="text-base sm:text-lg text-[#475069] max-w-lg leading-relaxed font-bold">
                  GOplanAI는 정부지원사업 평가 기준에 맞춰, 당신의 빛나는 아이디어를 전문가 수준의 사업계획서로 빠르고 정확하게 완성해 드리는 AI 솔루션입니다.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" onClick={handleStart} className="h-16 px-10 rounded-xl bg-gradient-to-r from-[#0b50d0] to-[#1463ff] border-[3px] border-[#0b2447] hover:translate-y-[-2px] transition-all shadow-[6px_6px_0px_0px_rgba(11,80,208,0.2)] text-base font-[900] w-full sm:w-auto">
                    템플릿 선택하고 시작하기
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" asChild className="h-16 px-10 rounded-xl border-[3px] border-[#0b50d0] text-[#0b2447] hover:bg-[#f4f7fc] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] text-base font-[900] w-full sm:w-auto">
                    <Link href="/announcements">사업공고 보기</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-4 pt-8 border-t-2 border-[#e2e8f4]">
                  <div className="flex items-center gap-2 text-sm font-black text-[#475069]">
                    <Check className="w-5 h-5 text-[#0b50d0]" /> 예비·초기창업패키지
                  </div>
                  <div className="flex items-center gap-2 text-sm font-black text-[#475069]">
                    <Check className="w-5 h-5 text-[#0b50d0]" /> PSST 구조 자동 반영
                  </div>
                </div>
              </div>

              {/* Visual Panel */}
              <div className="reveal relative hidden lg:block">
                <div className="bg-white border-[3px] border-[#0b2447] rounded-[22px] shadow-[12px_12px_0px_0px_rgba(11,36,71,0.15)] overflow-hidden">
                  <div className="bg-[#f4f7fc] border-b-[3px] border-[#0b2447] px-5 py-4 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff6058] border border-black/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-black/10" />
                    </div>
                    <div className="ml-4 bg-white border-2 border-[#0b2447] rounded-md px-3 py-1 text-[11px] text-[#7b86a0] flex-1 font-bold">
                      app.goplanai.kr / draft / 예비창업패키지
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="bg-[#e8f0ff] border border-[#0b50d0] text-[#0b50d0] text-[10px] font-bold px-2 py-0.5 rounded">PROBLEM</span>
                      <span className="text-[#0b2447] font-extrabold text-sm">문제 인식 (Problem)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 bg-[#eef2f9] rounded-full w-[90%]" />
                      <div className="h-2.5 bg-[#eef2f9] rounded-full w-[70%]" />
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                      <span className="bg-[#e2f8fc] border border-[#00b8d9] text-[#00b8d9] text-[10px] font-bold px-2 py-0.5 rounded">AI 생성 중</span>
                      <span className="text-[#0b2447] font-extrabold text-sm">실현 가능성 (Solution)</span>
                    </div>
                    <div className="h-2.5 bg-gradient-to-r from-[#0b50d0] to-[#00b8d9] rounded-full hp-fill" />
                    <div className="space-y-2">
                      <div className="h-2.5 bg-[#eef2f9] rounded-full w-[55%]" />
                      <div className="h-2.5 bg-[#eef2f9] rounded-full w-[40%]" />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-4">
                      {[
                        { num: '4', label: 'PSST 항목', em: '개' },
                        { num: '12', label: '자동 분량', em: 'p' },
                        { num: '9', label: '초안 완성', em: '分' }
                      ].map((card, i) => (
                        <div key={i} className="bg-[#f4f7fc] border-2 border-[#0b2447] rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(11,36,71,0.05)]">
                          <div className="text-xl font-black text-[#0b2447]">
                            {card.num}<em className="not-italic text-[#0b50d0] text-sm ml-0.5">{card.em}</em>
                          </div>
                          <div className="text-[10px] text-[#7b86a0] font-bold">{card.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Floating Chips */}
                <div className="absolute -top-6 right-8 bg-white border-[3px] border-[#0b50d0] rounded-2xl shadow-[6px_6px_0px_0px_rgba(11,80,208,0.15)] px-4 py-3 flex items-center gap-3 animate-bob">
                  <Zap className="w-5 h-5 text-[#0b50d0]" />
                  <span className="text-xs font-black text-[#0b2447]">평가지표 자동 매칭</span>
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white border-[3px] border-[#0b50d0] rounded-2xl shadow-[6px_6px_0px_0px_rgba(11,80,208,0.15)] px-4 py-3 flex items-center gap-3 animate-bob [animation-delay:0.8s]">
                  <MousePointer2 className="w-5 h-5 text-[#0b50d0]" />
                  <span className="text-xs font-black text-[#0b2447]">9분 만에 초안 완성</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 reveal">
              <span className="text-[#0b50d0] text-xs font-black tracking-[0.2em] uppercase block mb-4">Core Features</span>
              <h2 className="text-3xl md:text-4xl font-[900] text-[#0b2447] tracking-tight">핵심 기능 소개</h2>
              <p className="mt-4 text-[#475069] text-base font-bold">GOplanAI는 강력하고 직관적인 기능들로 당신의 사업 계획을 처음부터 끝까지 돕습니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: <TrendingUp />, title: '평가기준 맞춤 작성', desc: '예비·초기·도약 등 사업별 PSST 평가 구조를 자동 반영하여 심사 항목에 정확히 대응합니다.' },
                { icon: <FileText />, title: '다양한 정부양식 템플릿', desc: 'R&D, 창업, 소상공인 등 부처별 공식 양식을 그대로 제공해 형식 오류 없이 제출할 수 있습니다.' },
                { icon: <Zap />, title: 'AI 첨삭 & 보완 제안', desc: '내용의 논리 흐름과 부족한 부분을 진단하고 합격 사례 기반으로 보완 문장을 제안합니다.' },
                { icon: <ScanSearch />, title: 'AI OCR 자료 변환', desc: '기존 문서나 이미지를 업로드하면 텍스트로 자동 변환하여 사업계획서 본문에 바로 활용합니다.' },
                { icon: <BarChart />, title: '시장·매출 추정 자동화', desc: 'TAM·SAM·SOM 시장 규모와 추정 손익을 정량적 근거가 담긴 표와 그래프로 만들어 줍니다.' },
                { icon: <Globe />, title: 'HWP·PDF 내보내기', desc: '완성된 계획서를 제출 양식 그대로 내보내 별도 편집 없이 곧바로 제출할 수 있습니다.' }
              ].map((feat, i) => (
                <div key={i} className="reveal group relative bg-white border-[3px] border-[#0b50d0] p-8 rounded-[18px] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(11,80,208,0.2)] transition-all">
                  <div className="w-14 h-14 bg-[#e8f0ff] border-2 border-[#0b50d0] rounded-xl flex items-center justify-center text-[#0b50d0] mb-6 shadow-sm">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-[900] text-[#0b2447] mb-3">{feat.title}</h3>
                  <p className="text-[#475069] text-sm font-bold leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
