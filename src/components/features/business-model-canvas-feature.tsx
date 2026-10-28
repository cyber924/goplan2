

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowLeft, LayoutGrid, Lightbulb, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateBmc, type GenerateBmcOutput } from '@/ai/flows/generate-bmc';
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

const CanvasBlock = ({ title, content, colorClass }: { title: string; content: string; colorClass: string; }) => (
  <Card className={`flex flex-col h-full shadow-sm ${colorClass}`}>
    <CardHeader className="py-2 px-4 border-b border-black/10">
      <CardTitle className="text-sm font-semibold text-center">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-3 text-xs flex-grow whitespace-pre-wrap">
      {content || <span className="text-muted-foreground">...</span>}
    </CardContent>
  </Card>
);

export default function BusinessModelCanvasFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GenerateBmcOutput | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessIdea: '바쁜 직장인들을 위한 AI 기반 맞춤형 도시락 정기 배송 서비스',
    },
  });

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
        router.push('/login?redirect=/ai-features/business-model-canvas');
        return;
    }
    if (docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                if (docData.type === 'business-model-canvas' && docData.content) {
                    form.setValue('businessIdea', docData.businessIdea);
                    setAnalysisResult(docData.content.originalData?.analysisResult);
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
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await generateBmc({ businessIdea: values.businessIdea });
      setAnalysisResult(result);
      toast({ title: '비즈니스 모델 분석 완료', description: 'AI가 비즈니스 모델 캔버스를 생성했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '분석 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '결과를 저장하려면 로그인이 필요합니다.' });
        router.push('/login');
        return;
    }
    if (!analysisResult) {
        toast({ variant: 'destructive', title: '결과 없음', description: '저장할 분석 결과가 없습니다.' });
        return;
    }

    const businessIdea = form.getValues('businessIdea');
    const title = `BMC: ${businessIdea.substring(0, 25)}...`;
    const canvasBlockMapping: { [key: string]: string } = {
        keyPartners: '핵심 파트너',
        keyActivities: '핵심 활동',
        keyResources: '핵심 자원',
        valuePropositions: '가치 제안',
        customerRelationships: '고객 관계',
        channels: '채널',
        customerSegments: '고객 세그먼트',
        costStructure: '비용 구조',
        revenueStreams: '수익원',
    };

    const sections = Object.entries(analysisResult.canvas).map(([key, value]) => ({
        id: key,
        title: canvasBlockMapping[key] || key,
        content: value,
    }));

    sections.push({
        id: 'validation-report',
        title: 'AI 검증 리포트',
        content: analysisResult.validationReport,
    });

    const docData = {
        type: 'business-model-canvas' as const,
        title: title,
        businessIdea: businessIdea,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        content: {
            title: title,
            businessIdea: businessIdea,
            sections: sections,
            originalData: { analysisResult },
        },
    };
    
    try {
        if (docId) {
            await setDoc(doc(db, 'documents', docId), docData, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "documents"), { ...docData, createdAt: serverTimestamp() });
            router.replace(`/ai-features/business-model-canvas?id=${newDoc.id}`);
        }
        toast({ title: '저장 완료', description: '분석 결과가 내 문서에 저장되었습니다.' });
    } catch (error) {
        console.error("Error saving document: ", error);
        toast({ variant: 'destructive', title: '저장 실패', description: '문서 저장 중 오류가 발생했습니다.' });
    }
  };

  const getFullDocumentData = () => {
    if (!analysisResult) return null;
    const businessIdea = form.getValues('businessIdea');
    const title = `BMC: ${businessIdea.substring(0, 25)}...`;

     const canvasBlockMapping: { [key: string]: string } = {
        keyPartners: '핵심 파트너',
        keyActivities: '핵심 활동',
        keyResources: '핵심 자원',
        valuePropositions: '가치 제안',
        customerRelationships: '고객 관계',
        channels: '채널',
        customerSegments: '고객 세그먼트',
        costStructure: '비용 구조',
        revenueStreams: '수익원',
    };

    const sections = Object.entries(analysisResult.canvas).map(([key, value]) => ({
        id: key,
        title: canvasBlockMapping[key] || key,
        content: value,
    }));

    sections.push({
        id: 'validation-report',
        title: 'AI 검증 리포트',
        content: analysisResult.validationReport,
    });
    
    return {
      type: 'business-model-canvas' as const,
      title: title,
      businessIdea: businessIdea,
      sections: sections,
    };
  }
  
  const handleDownloadHtml = async () => {
    const docData = getFullDocumentData();
    if (!docData) return;
    const htmlContent = await generateStyledHtml(docData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title.replace(/ /g, '_')}.html`;
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
  
  const renderMarkdown = (markdown: string) => {
    return markdown
        .replace(/^### (.*$)/gm, '<h4 class="font-bold text-base mt-3 mb-1">$1</h4>')
        .replace(/\*\*\*(.*?):/g, '<strong class="text-primary">$1:</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
  };


  if (!user) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
        </Button>
        
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center gap-4">
              <LayoutGrid className="w-10 h-10 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold font-headline">AI 비즈니스 모델 캔버스</CardTitle>
                <CardDescription className="text-lg">사업 아이디어를 입력하면 AI가 비즈니스 모델을 분석하고 검증해줍니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAnalyze)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessIdea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold flex items-center">
                        <Lightbulb className="inline-block mr-2 text-primary" />
                        분석할 사업 아이디어
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="예: 바쁜 직장인들을 위한 AI 기반 맞춤형 도시락 정기 배송 서비스"
                          rows={3}
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 캔버스 생성 중...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" /> AI로 캔버스 생성하기</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center py-20">
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">AI가 비즈니스 모델을 분석하고 있습니다...</p>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-center mb-6">비즈니스 모델 캔버스</h2>
                <div className="grid grid-cols-5 grid-rows-[auto_auto_auto] gap-2">
                    <div className="col-span-1 row-span-2"><CanvasBlock title="핵심 파트너" content={analysisResult.canvas.keyPartners} colorClass="bg-blue-50" /></div>
                    <div className="col-span-1"><CanvasBlock title="핵심 활동" content={analysisResult.canvas.keyActivities} colorClass="bg-green-50" /></div>
                    <div className="col-span-1 row-span-2"><CanvasBlock title="가치 제안" content={analysisResult.canvas.valuePropositions} colorClass="bg-yellow-50" /></div>
                    <div className="col-span-1"><CanvasBlock title="고객 관계" content={analysisResult.canvas.customerRelationships} colorClass="bg-purple-50" /></div>
                    <div className="col-span-1 row-span-2"><CanvasBlock title="고객 세그먼트" content={analysisResult.canvas.customerSegments} colorClass="bg-red-50" /></div>
                    <div className="col-span-1"><CanvasBlock title="핵심 자원" content={analysisResult.canvas.keyResources} colorClass="bg-green-50" /></div>
                    <div className="col-span-1"><CanvasBlock title="채널" content={analysisResult.canvas.channels} colorClass="bg-purple-50" /></div>
                    <div className="col-span-2"><CanvasBlock title="비용 구조" content={analysisResult.canvas.costStructure} colorClass="bg-indigo-50" /></div>
                    <div className="col-span-3"><CanvasBlock title="수익원" content={analysisResult.canvas.revenueStreams} colorClass="bg-pink-50" /></div>
                </div>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>AI 검증 리포트</CardTitle>
                <CardDescription>AI가 분석한 비즈니스 모델의 강점, 약점, 그리고 주요 검증 포인트입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisResult.validationReport) }}
                />
              </CardContent>
                {analysisResult && !isLoading && (
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleDownloadHtml}><Download className="mr-2"/> HTML</Button>
                        <Button variant="outline" onClick={handleDownloadDocx}><Download className="mr-2"/> Word</Button>
                        <Button onClick={handleSave}>
                            <Save className="mr-2" />
                            내 문서에 저장하기
                        </Button>
                    </CardFooter>
                )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
