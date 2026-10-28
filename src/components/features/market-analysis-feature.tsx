
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowLeft, Search, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { analyzeMarket, type AnalyzeMarketOutput } from '@/ai/flows/analyze-market';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const formSchema = z.object({
  businessIdea: z.string().min(10, { message: '최소 10자 이상 구체적으로 입력해주세요.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function MarketAnalysisFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMarketOutput | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessIdea: 'AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스',
    },
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
        router.push('/login?redirect=/ai-features/market-analysis');
        return;
    }
    if (docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                if (docData.type === 'market-analysis' && docData.content) {
                    form.setValue('businessIdea', docData.businessIdea);
                    const reportContent = docData.content.sections.map((s: {title: string, content: string}) => `### ${s.title}\n${s.content}`).join('\n\n');
                    setAnalysisResult({ report: reportContent });
                }
            } else {
                toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
                router.push('/my-documents');
            }
        };
        fetchDocument();
    }
  }, [docId, user, form, router, toast, isAuthLoading]);

  const handleAnalyze = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        return;
    }
    
    setIsLoading(true);
    setAnalysisResult(null);

    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        setIsLoading(false);
        return;
    }

    try {
      const result = await analyzeMarket({ businessIdea: values.businessIdea });
      setAnalysisResult(result);
      toast({ title: '시장 분석 완료', description: 'AI가 시장 분석 리포트를 생성했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '분석 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullDocumentData = () => {
      if (!analysisResult) return null;
      const businessIdea = form.getValues('businessIdea');
      const title = `시장 분석: ${businessIdea.substring(0, 20)}...`;
      
      const sections = [];
      const reportParts = analysisResult.report.split(/(?=###\s)/g);
      for (const part of reportParts) {
          if (part.trim() === '') continue;
          const lines = part.trim().split('\n');
          const sectionTitle = lines.shift()?.replace('###', '').trim() || 'Untitled Section';
          const sectionContent = lines.join('\n').trim();
          if (sectionTitle && sectionContent) {
              sections.push({
                  id: sectionTitle.replace(/\s+/g, '-').toLowerCase(),
                  title: sectionTitle,
                  content: sectionContent,
              });
          }
      }
      if (sections.length === 0) {
        sections.push({
            id: 'full-report',
            title: 'AI 시장 분석 리포트',
            content: analysisResult.report,
        });
      }

      return {
          type: 'market-analysis' as const,
          title,
          businessIdea,
          sections,
      };
  }
  
  const handleSave = async () => {
    if (!user) return;
    const docData = getFullDocumentData();
    if (!docData) return;

    const finalDoc = {
        ...docData,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        content: { ...docData },
    };

    try {
        if (docId) {
            await setDoc(doc(db, 'documents', docId), finalDoc, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "documents"), { ...finalDoc, createdAt: serverTimestamp() });
            router.replace(`/ai-features/market-analysis?id=${newDoc.id}`, undefined, { shallow: true });
        }
        toast({ title: '저장 완료', description: '분석 결과가 내 문서에 저장되었습니다.' });
    } catch (error) {
        console.error("Error saving document: ", error);
        toast({ variant: 'destructive', title: '저장 실패' });
    }
  };
  
  const handleDownloadHtml = async () => {
    const docData = getFullDocumentData();
    if (!docData) return;
    const htmlContent = await generateStyledHtml(docData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title.replace(/[\s/]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    const docData = getFullDocumentData();
    if (!docData) return;
    const htmlContent = await generateStyledHtml(docData);
    const blob = htmlDocx.asBlob(htmlContent);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title.replace(/[\s/]/g, '_')}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <Button variant="outline" asChild className="border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
          <Link href="/ai-features"><ArrowLeft className="mr-2 h-4 w-4"/> AI 기능 목록으로</Link>
      </Button>

      <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
        <CardHeader className="border-b-2 border-[#e2e8f4] p-8 md:p-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-xl">
              <Search className="w-10 h-10 text-[#0b50d0]" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-[#0b2447]">AI 시장 분석 리포트</CardTitle>
              <CardDescription className="text-lg font-bold text-[#475069] mt-1">사업 아이템만 알려주시면 AI가 심층 분석 리포트를 즉시 생성합니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAnalyze)} className="space-y-6">
              <FormField
                control={form.control}
                name="businessIdea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl font-black text-[#0b2447] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#0b50d0]" />
                      분석할 사업 아이디어
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="예: AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스"
                        rows={5}
                        className="text-lg border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-medium leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full h-16 rounded-2xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> 리포트 생성 중...</>
                ) : (
                  <><Sparkles className="mr-2 h-6 w-6" /> AI로 시장 분석 시작하기</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading || analysisResult) && (
          <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
              <CardHeader className="border-b-2 border-[#e2e8f4] p-8 bg-[#f4f7fc]/50">
                  <CardTitle className="text-2xl font-black text-[#0b2447]">AI 심층 분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="p-8 md:p-10">
                  {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-[#7b86a0]">
                          <Loader2 className="w-16 h-16 animate-spin text-[#0b50d0] mb-6" />
                          <p className="text-xl font-black">AI 분석가가 최신 데이터를 바탕으로 리포트를 작성 중입니다...</p>
                      </div>
                  ) : analysisResult && (
                      <div
                        className="prose prose-lg max-w-none text-[#475069] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: analysisResult.report.replace(/### (.*?)\n/g, '<h3 class="font-black text-xl text-[#0b2447] mt-8 mb-4 border-l-4 border-[#0b50d0] pl-4">$1</h3>').replace(/\n/g, '<br />') }}
                      />
                  )}
              </CardContent>
              {analysisResult && !isLoading && (
                  <CardFooter className="flex justify-end gap-3 p-8 bg-[#f4f7fc]/30 border-t-2 border-[#e2e8f4]">
                      <Button variant="outline" className="border-2 border-[#0b50d0] rounded-xl font-black" onClick={handleDownloadHtml}><Download className="mr-2 h-4 w-4"/> HTML</Button>
                      <Button variant="outline" className="border-2 border-[#0b50d0] rounded-xl font-black" onClick={handleDownloadDocx}><Download className="mr-2 h-4 w-4"/> Word</Button>
                      <Button className="bg-[#0b50d0] border-2 border-[#0b2447] font-black rounded-xl" onClick={handleSave}>
                          <Save className="mr-2 h-4 w-4" /> 내 문서에 저장
                      </Button>
                  </CardFooter>
              )}
          </Card>
      )}
    </div>
  );
}
