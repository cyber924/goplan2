import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import MarketActions from '@/components/market/market-actions';
import MarketDetailHeaderActions from '@/components/market/market-detail-header-actions';
import MarkdownReportViewer from '@/components/common/markdown-report-viewer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, FileText, CheckCircle2, Bookmark, Award } from 'lucide-react';
import { getMarketItem } from '@/lib/firebase/server-fetch';

type Props = {
  params: Promise<{ id: string }>;
};

// 상세 페이지 캐시 주기를 1시간(3600초)으로 설정
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getMarketItem(id);

  if (!item) {
    return { title: '기획안을 찾을 수 없습니다 | GOplanAI' };
  }

  return {
    title: `${item.title} | GOplanAI 공공·민간 마켓 리포트`,
    description: item.businessIdea?.substring(0, 160) || `${item.title} 상세 기획안입니다.`,
    alternates: {
      canonical: `https://goplanai.co.kr/market/${id}`,
    },
    openGraph: {
      title: item.title,
      description: item.businessIdea,
      url: `https://goplanai.co.kr/market/${id}`,
      type: 'article',
      images: [{ url: `https://picsum.photos/seed/${id}/1200/630` }],
    },
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getMarketItem(id);

  if (!item) {
    notFound();
  }

  const createdDate = item.createdAt instanceof Date 
    ? item.createdAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '최근 발행';

  const sections = item.content?.sections || [];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 py-10 md:py-16 print:py-0 print:bg-white">
        <div className="container mx-auto px-4 max-w-4xl pb-36 print:pb-0 print:max-w-none">
          <article className="space-y-6 md:space-y-8">
            
            {/* Document Header Card */}
            <div className="bg-white border border-[#cbd5e1] rounded-2xl p-6 md:p-8 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
              
              {/* Top Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] font-bold px-2.5 py-0.5 rounded-md text-xs">
                    {item.type === 'template' ? '표준 사업 기획서' : '전략 분석 리포트'}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2.5 py-0.5 rounded-md border border-[#dbeafe]">
                    <Award className="w-3.5 h-3.5 text-[#2563eb]" />
                    2026 정부지원사업 및 VC 심사 표준 서식
                  </span>
                </div>

                <MarketDetailHeaderActions title={item.title} />
              </div>

              {/* Title Section (Scaled down to compact, balanced size) */}
              <div className="space-y-2.5 pt-1">
                <h1 className="text-lg md:text-xl font-black text-[#0f172a] leading-snug tracking-tight">
                  {item.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-medium text-[#64748b]">
                  <span className="flex items-center gap-1 text-[#334155]">
                    <User className="w-3.5 h-3.5 text-[#0b50d0]" />
                    <span className="text-[#64748b]">기획자:</span> <span className="font-bold">{item.authorName || 'GOplanAI 공인 기획팀'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0b50d0]" />
                    <span>발행일:</span> {createdDate}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    AI 정합성 검증 완료
                  </span>
                </div>
              </div>

              {/* Quick Section Index Jump Bar */}
              {sections.length > 0 && (
                <div className="pt-3 border-t border-[#f1f5f9] print:hidden">
                  <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-[#0b50d0]" /> 목차 바로가기
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sections.map((sec: any, idx: number) => {
                      const cleanTitle = (sec.title || '').replace(/^\d+[\.\)]\s*/, '');
                      return (
                        <a
                          key={idx}
                          href={`#section-${idx + 1}`}
                          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#f1f5f9] border border-[#e2e8f0] text-[#334155] hover:bg-[#0b50d0] hover:text-white hover:border-[#0b50d0] transition-all flex items-center gap-1"
                        >
                          <span className="text-[#0b50d0] group-hover:text-white font-bold">0{idx + 1}.</span>
                          <span>{cleanTitle}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Executive Summary Card (핵심 비즈니스 총괄 요약) */}
            {item.businessIdea && (
              <Card className="border border-[#cbd5e1] shadow-sm rounded-2xl overflow-hidden bg-white print:border print:shadow-none">
                <CardHeader className="bg-[#f8fafc] p-4 md:p-5 border-b border-[#e2e8f0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base font-bold text-[#0f172a]">
                      <FileText className="w-4 h-4 text-[#0b50d0]" />
                      핵심 비즈니스 총괄 요약 (Executive Summary)
                    </CardTitle>
                    <span className="text-[10px] font-bold uppercase bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
                      CORE SUMMARY
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 md:p-6 bg-white">
                  <MarkdownReportViewer content={item.businessIdea} />
                </CardContent>
              </Card>
            )}

            {/* Detailed Report Chapters */}
            <div className="space-y-6 md:space-y-8">
              {sections.map((section: any, idx: number) => (
                <section key={idx} id={`section-${idx + 1}`} className="scroll-mt-20">
                  <Card className="border border-[#cbd5e1] shadow-sm rounded-2xl overflow-hidden bg-white print:border print:shadow-none">
                    
                    {/* Chapter Header */}
                    <CardHeader className="p-4 md:p-5 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-[#0b50d0] text-white flex items-center justify-center font-bold text-xs">
                          0{idx + 1}
                        </span>
                        <h2 className="text-base md:text-lg font-bold text-[#0f172a] tracking-tight">
                          {section.title}
                        </h2>
                      </div>

                      <span className="text-[11px] font-semibold text-[#64748b] hidden sm:inline-block bg-white border border-[#e2e8f0] px-2 py-0.5 rounded">
                        SECTION 0{idx + 1}
                      </span>
                    </CardHeader>

                    {/* Chapter Content parsed via MarkdownReportViewer */}
                    <CardContent className="p-5 md:p-8">
                      <MarkdownReportViewer content={section.content || ''} />
                    </CardContent>
                  </Card>
                </section>
              ))}
            </div>

            {/* Floating Bottom CTA */}
            <div className="sticky bottom-6 z-30 max-w-2xl mx-auto print:hidden">
              <MarketActions item={item} />
            </div>

          </article>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
