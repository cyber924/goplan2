'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, FileText, Presentation, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { DocumentData } from '@/lib/types';
import SalesChart from '@/components/charts/sales-chart';
import FinancialSummaryChart from '@/components/charts/financial-summary-chart';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import MarkdownReportViewer from '@/components/common/markdown-report-viewer';

const BmcBlock = ({ title, content }: { title: string, content: string }) => (
    <div className="border-[2px] border-[#0b50d0] rounded-xl flex flex-col h-full bg-white shadow-[3px_3px_0px_0px_rgba(11,80,208,0.05)]">
        <h4 className="font-black text-[10px] p-1 bg-[#e8f0ff] border-b-2 border-[#0b50d0] text-center text-[#0b2447]">{title}</h4>
        <p className="text-[10px] p-1.5 flex-grow whitespace-pre-wrap leading-tight text-[#475069] font-bold">{content}</p>
    </div>
);

const KEYWORDS = [
    "AI", "인공지능", "혁신", "최적화", "플랫폼", "서비스", "기술", "전략", "가치", 
    "성장", "효율", "데이터", "솔루션", "디지털", "자동화", "고객", "경험", "시스템", 
    "글로벌", "차별화", "수익", "시장", "분석", "구독", "추천", "개인화"
];

function ReportView() {
  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const docId = params.docId as string;

  useEffect(() => {
    if (!user) {
        router.push(`/login?redirect=/report/${docId}`);
        return;
    }
    if (!docId) {
      setError("문서 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    const fetchDocument = async () => {
      try {
        const docRef = doc(db, 'documents', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().userId === user.uid) {
          const fetchedData = docSnap.data();
          const fullDocumentData = {
              ...fetchedData.content,
              id: docId,
              type: fetchedData.type,
              title: fetchedData.title || fetchedData.content?.title || '제목 없음',
              businessIdea: fetchedData.businessIdea || fetchedData.content?.businessIdea,
              sections: fetchedData.content?.sections || [],
              fields: fetchedData.content?.fields || [],
          } as DocumentData;
          setDocData(fullDocumentData);
        } else {
          setError('문서를 찾을 수 없거나 접근 권한이 없습니다.');
        }
      } catch (err) {
        console.error(err);
        setError('문서를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [docId, user, router]);

  const processContent = (text: string) => {
    if (!text) return '';

    // 백슬래시 n(\\n)과 같이 텍스트로 들어온 이중 이스케이프 개행 기호를 실제 개행 문자(\n)로 전역 치환
    let normalizedText = text.replace(/\\n/g, '\n');

    // 이미지 처리 (마크다운 ![]() 형식)
    let processedHtml = normalizedText.replace(/!\[(.*?)\][\s\n]*\((.*?)\)/g, (match, alt, url) => {
        return `<div class="my-6 flex justify-center"><img src="${url}" alt="${alt}" class="rounded-xl border-[3px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] max-w-full h-auto" /></div>`;
    });

    // 링크 처리
    processedHtml = processedHtml.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-[#0b50d0] font-black underline">$1</a>');

    // 볼드 처리 (**텍스트**)
    processedHtml = processedHtml.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-[#0b2447]">$1</strong>');

    const lines = processedHtml.split('\n');
    const resultBlocks: string[] = [];
    
    let inList = false;
    let inOrderedList = false;
    let tableRows: string[][] = [];
    let inTable = false;

    const flushList = () => {
      if (inList) {
        resultBlocks.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        resultBlocks.push('</ol>');
        inOrderedList = false;
      }
    };

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        let html = `<div class="my-5 overflow-hidden border-[2px] border-[#0b50d0] rounded-xl shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)] bg-white">`;
        html += `<table class="w-full border-collapse">`;
        
        let startIndex = 0;
        let hasHeader = false;
        if (tableRows.length > 1 && tableRows[1].every(cell => {
          const c = cell.trim();
          return c.startsWith('-') || c.startsWith(':') || c === '';
        })) {
          hasHeader = true;
          startIndex = 2;
        }

        // Header
        if (hasHeader && tableRows[0]) {
          html += `<thead class="bg-[#e8f0ff] border-b-[2px] border-[#0b50d0]"><tr>`;
          tableRows[0].forEach(cell => {
            if (cell.trim() !== '') {
              html += `<th class="p-3 text-left font-black text-[#0b2447] text-xs border-r-[1px] border-[#e2e8f4] last:border-r-0">${cell.trim()}</th>`;
            }
          });
          html += `</tr></thead>`;
        }

        // Body
        html += `<tbody class="divide-y divide-[#e2e8f4]">`;
        const bodyRows = hasHeader ? tableRows.slice(2) : tableRows;
        bodyRows.forEach((row) => {
          if (row.length > 0 && row.some(c => c.trim() !== '')) {
            html += `<tr class="hover:bg-[#f4f7fc]/50">`;
            row.forEach(cell => {
              if (cell.trim() !== '') {
                html += `<td class="p-3 text-[#475069] font-bold text-xs border-r-[1px] border-[#e2e8f4] last:border-r-0">${cell.trim()}</td>`;
              }
            });
            html += `</tr>`;
          }
        });
        html += `</tbody></table></div>`;
        resultBlocks.push(html);
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let pText = line.trim();

      if (pText === '') {
        flushList();
        flushTable();
        continue;
      }

      // 테이블 감지
      if (pText.startsWith('|') && pText.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = pText.split('|').slice(1, -1);
        tableRows.push(cells);
        continue;
      } else {
        flushTable();
      }

      // ## 대제목
      if (pText.startsWith('## ')) {
        flushList();
        const cleanText = pText.replace('## ', '').trim();
        resultBlocks.push(`<h2 class="text-base font-black text-[#0b2447] mt-6 mb-3 border-b-2 border-[#0b50d0] pb-1.5 uppercase tracking-wide">${cleanText}</h2>`);
        continue;
      }

      // ### 소제목
      if (pText.startsWith('### ')) {
        flushList();
        const cleanText = pText.replace('### ', '').trim();
        resultBlocks.push(`<h3 class="text-sm font-black text-[#0b2447] mt-5 mb-2 border-l-[4px] border-[#0b50d0] pl-3 bg-[#e8f0ff]/40 py-1.5 rounded-r-md">${cleanText}</h3>`);
        continue;
      }

      // > 인용구 / 요약 블록
      if (pText.startsWith('> ')) {
        flushList();
        const cleanText = pText.replace('> ', '').trim();
        resultBlocks.push(`<div class="my-4 p-4 border-l-4 border-[#0b50d0] bg-[#e8f0ff]/30 text-[#0b2447] font-bold text-xs rounded-r-xl leading-relaxed">${cleanText}</div>`);
        continue;
      }

      // - * 글머리 리스트
      if (pText.startsWith('- ') || pText.startsWith('* ')) {
        if (inOrderedList) flushList();
        if (!inList) {
          resultBlocks.push('<ul class="my-3 space-y-1.5">');
          inList = true;
        }
        const cleanText = pText.substring(2).trim();
        resultBlocks.push(`<li class="ml-5 list-disc pl-1 text-[13px] text-[#475069] leading-relaxed font-bold">${cleanText}</li>`);
        continue;
      }

      // 숫자리스트
      if (/^\d+\.\s/.test(pText)) {
        if (inList) flushList();
        if (!inOrderedList) {
          resultBlocks.push('<ol class="my-3 space-y-1.5">');
          inOrderedList = true;
        }
        const cleanText = pText.replace(/^\d+\.\s/, '').trim();
        resultBlocks.push(`<li class="ml-5 list-decimal pl-1 text-[13px] text-[#475069] leading-relaxed font-bold">${cleanText}</li>`);
        continue;
      }

      // 일반 문단
      flushList();
      
      // 키워드 하이라이팅
      KEYWORDS.forEach(keyword => {
          const regex = new RegExp(`(?![^<]*>)(${keyword})`, 'gi');
          pText = pText.replace(regex, '<span class="text-[#0b50d0] font-black underline decoration-1 underline-offset-1">$1</span>');
      });

      resultBlocks.push(`<p class="mb-3 text-[13px] text-[#475069] leading-[1.65] font-semibold text-justify">${pText}</p>`);
    }

    flushList();
    flushTable();

    return resultBlocks.join('');
  };

  const renderSectionContent = (section: any) => {
    if (section.isChart) {
      if (docData?.type === 'financial-visualization') {
        return <div className="h-[280px] mt-4"><SalesChart data={section.chartData} /></div>;
      }
      if (docData?.type === 'corporate-diagnosis') {
        return <div className="h-[280px] mt-4"><FinancialSummaryChart data={section.chartData} /></div>;
      }
    }
    
    if (section.isBmc) {
        const getSectionContent = (id: string) => section.bmcSections.find((s:any) => s.id === id)?.content || '';
        return (
            <div className="grid grid-cols-5 grid-rows-3 gap-2 h-[380px] mt-4">
                <div className="col-span-1 row-span-2"><BmcBlock title="핵심 파트너" content={getSectionContent('keyPartners')} /></div>
                <div className="col-span-1 row-span-1"><BmcBlock title="핵심 활동" content={getSectionContent('keyActivities')} /></div>
                <div className="col-span-1 row-span-2"><BmcBlock title="가치 제안" content={getSectionContent('valuePropositions')} /></div>
                <div className="col-span-1 row-span-1"><BmcBlock title="고객 관계" content={getSectionContent('customerRelationships')} /></div>
                <div className="col-span-1 row-span-2"><BmcBlock title="고객 세그먼트" content={getSectionContent('customerSegments')} /></div>
                <div className="col-span-1 row-span-1"><BmcBlock title="핵심 자원" content={getSectionContent('keyResources')} /></div>
                <div className="col-span-1 row-span-1"><BmcBlock title="채널" content={getSectionContent('channels')} /></div>
                <div className="col-span-2 row-span-1"><BmcBlock title="비용 구조" content={getSectionContent('costStructure')} /></div>
                <div className="col-span-3 row-span-1"><BmcBlock title="수익원" content={getSectionContent('revenueStreams')} /></div>
            </div>
        );
    }
    
    if (docData?.type === 'form' && section.isForm) {
      return (
          <div className="w-full mt-4">
            <Table className="border-[2px] border-[#0b50d0] rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)] bg-white">
                <TableBody>
                    {section.fields.map((field: any) => (
                        <TableRow key={field.id} className="border-b-[1px] border-[#e2e8f4] hover:bg-[#f4f7fc]">
                            <TableCell className="font-black bg-[#e8f0ff] text-[#0b2447] w-[25%] border-r-[1px] border-[#e2e8f4] text-xs py-3">{field.label}</TableCell>
                            <TableCell className="whitespace-pre-wrap text-[#475069] font-bold text-xs p-3">{field.value || <span className="text-[#9aa6c0] italic">내용 없음</span>}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
      )
    }
    
    return <MarkdownReportViewer content={section.content || ''} className="mt-1" />;
  };

  const getSections = () => {
    if (!docData) return [];
    
    const sections = [];

    if (docData.type === 'form' && docData.fields && docData.fields.length > 0) {
        return [{
            id: 'form-summary',
            title: docData.title,
            isForm: true,
            fields: docData.fields,
        }];
    }

    if (docData.businessIdea) {
        sections.push({
            id: 'businessIdea',
            title: '핵심 사업 아이디어',
            content: docData.businessIdea
        });
    }

    if (docData.sections && docData.sections.length > 0) {
      for (const section of docData.sections) {
        if (section.content === 'CHART_PLACEHOLDER') {
          if (docData.type === 'financial-visualization' && docData.content?.originalData?.analysisResult?.chartData) {
            sections.push({ ...section, isChart: true, chartData: docData.content.originalData.analysisResult.chartData });
          }
           else if (docData.type === 'corporate-diagnosis' && docData.content?.originalData?.profileId) {
            const profile = [...(JSON.parse(localStorage.getItem('company-profiles') || '[]')), ...(JSON.parse(localStorage.getItem('customer-profiles') || '[]'))].find(p => p.id === docData.content.originalData.profileId);
            if (profile?.financials) {
              sections.push({ ...section, isChart: true, chartData: profile.financials });
            }
          }
        } else if (docData.type === 'business-model-canvas') {
            const bmcSections = docData.sections.filter(s => s.id !== 'validation-report');
            const validationReport = docData.sections.find(s => s.id === 'validation-report');
            if (sections.findIndex(s => s.isBmc) === -1) {
                 sections.push({ id: 'bmc-grid', title: '비즈니스 모델 캔버스', content: '', isBmc: true, bmcSections });
            }
            if (validationReport) {
                sections.push(validationReport);
            }
        }
        else {
          sections.push(section);
        }
      }
    }
    return sections;
  }

  const sections = getSections();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7fc]">
        <Loader2 className="h-16 w-16 animate-spin text-[#0b50d0]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f4f7fc] text-destructive">
        <p className="text-xl font-black">{error}</p>
        <Button onClick={() => router.back()} className="mt-6 border-[3px] border-[#0b2447] rounded-xl h-12 px-6 font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.1)]">
          <ArrowLeft className="mr-2" /> 돌아가기
        </Button>
      </div>
    );
  }

  if (!docData) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-[2px] border-[#0b50d0] px-6 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-1.5 rounded-lg">
                    <Presentation className="h-5 w-5 text-[#0b50d0]" />
                </div>
                <h1 className="text-lg font-black text-[#0b2447] tracking-tight truncate max-w-[200px] md:max-w-xl">{docData.title}</h1>
            </div>
             <Button variant="outline" onClick={() => router.back()} className="border-2 border-[#0b50d0] rounded-xl h-9 px-4 text-xs font-black text-[#0b50d0] hover:bg-[#e8f0ff] transition-all">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> 대시보드
            </Button>
        </header>

      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-5">
            {sections.map((section, index) => (
                <Card key={section.id || index} className="border-[2px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.05)] rounded-[20px] bg-white overflow-hidden transition-all duration-300 hover:translate-y-[-1px]">
                    <CardHeader className="border-b-[1px] border-[#e2e8f4] bg-[#f4f7fc]/40 p-4">
                        <CardTitle className="flex items-center gap-2.5 text-base font-black text-[#0b2447]">
                            <span className="flex items-center justify-center bg-[#0b50d0] text-white text-[10px] w-5 h-5 rounded-full font-bold">{index + 1}</span>
                            {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {renderSectionContent(section)}
                    </CardContent>
                </Card>
            ))}
            
            <div className="pt-8 text-center text-[#7b86a0] font-bold text-[11px] opacity-60">
                <p>© GOplanAI Business Report</p>
                <p className="mt-0.5">모든 분석 결과는 AI에 의해 생성되었습니다.</p>
            </div>
        </div>
      </main>

      <style jsx global>{`
        body {
            background-color: #f4f7fc;
        }
        img {
            max-width: 100%;
            display: block;
        }
      `}</style>
    </div>
  );
}

export default function SuspendedReportPage() {
    return (
        <Suspense fallback={
             <div className="flex h-screen items-center justify-center bg-[#f4f7fc]">
                <Loader2 className="h-16 w-16 animate-spin text-[#0b50d0]" />
            </div>
        }>
            <ReportView />
        </Suspense>
    )
}
