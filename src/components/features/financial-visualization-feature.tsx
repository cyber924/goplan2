
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowLeft, BarChart, Plus, Trash2, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { analyzeFinancials, type AnalyzeFinancialsOutput } from '@/ai/flows/analyze-financials';
import SalesChart from '@/components/charts/sales-chart';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const financialDataPointSchema = z.object({
  period: z.string().min(1, '기간을 입력해주세요.'),
  revenue: z.coerce.number().min(0, '매출은 0 이상이어야 합니다.'),
  expenses: z.coerce.number().min(0, '비용은 0 이상이어야 합니다.'),
});

const formSchema = z.object({
  businessDescription: z.string().min(10, '최소 10자 이상 구체적으로 입력해주세요.'),
  financialData: z.array(financialDataPointSchema).min(3, '최소 3개 이상의 데이터가 필요합니다.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function FinancialVisualizationFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeFinancialsOutput | null>(null);
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessDescription: 'MZ세대를 위한 비건 화장품을 제조 및 판매하는 커머스 플랫폼',
      financialData: [
        { period: '2023년 1분기', revenue: 1000, expenses: 600 },
        { period: '2023년 2분기', revenue: 1200, expenses: 700 },
        { period: '2023년 3분기', revenue: 1500, expenses: 800 },
      ],
    },
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능은 로그인이 필요합니다.' });
        router.push('/login?redirect=/ai-features/financial-visualization');
        return;
    }
    if (docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                if (docData.type === 'financial-visualization' && docData.content) {
                    form.reset({
                        businessDescription: docData.businessIdea,
                        financialData: docData.content.originalData.formData.financialData
                    });
                    setAnalysisResult(docData.content.originalData.analysisResult);
                }
            } else {
                toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
                router.push('/my-documents');
            }
        };
        fetchDocument();
    }
  }, [docId, user, form, router, toast, isAuthLoading]);
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "financialData",
  });

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

    const dataWithProfit = values.financialData.map(d => ({...d, profit: d.revenue - d.expenses }));

    try {
      const result = await analyzeFinancials({ 
        businessDescription: values.businessDescription,
        financialData: dataWithProfit,
       });
      setAnalysisResult(result);
      toast({ title: '재무 분석 완료', description: 'AI가 데이터를 분석하고 시각화했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '분석 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFullDocumentData = () => {
    if (!analysisResult) return null;
    const formData = form.getValues();
    const businessIdea = formData.businessDescription;
    const title = `재무 분석: ${businessIdea.substring(0, 20)}...`;
    
    return {
        type: 'financial-visualization' as const,
        title,
        businessIdea,
        sections: [
            { id: 'financial-chart', title: '매출 및 이익 추이', content: "CHART_PLACEHOLDER" },
            { id: 'financial-analysis-report', title: 'AI 재무 분석 리포트', content: analysisResult.analysis }
        ],
        content: {
            originalData: { analysisResult, formData },
        },
    };
  };
  
  const handleSave = async () => {
    if (!user) return;
    const docData = getFullDocumentData();
    if (!docData) return;

    const finalDoc = {
        ...docData,
        userId: user.uid,
        updatedAt: serverTimestamp(),
    }

    try {
        if (docId) {
            await setDoc(doc(db, 'documents', docId), finalDoc, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "documents"), { ...finalDoc, createdAt: serverTimestamp() });
            router.replace(`/ai-features/financial-visualization?id=${newDoc.id}`, undefined, { shallow: true });
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
    <div className="max-w-7xl mx-auto space-y-10">
      <Button variant="outline" asChild className="border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
          <Link href="/ai-features"><ArrowLeft className="mr-2 h-4 w-4"/> AI 기능 목록으로</Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
          <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
            <div className="flex items-center gap-4">
              <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-3 rounded-xl">
                <BarChart className="w-10 h-10 text-[#0b50d0]" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black text-[#0b2447]">AI 재무 데이터 시각화</CardTitle>
                <CardDescription className="text-lg font-bold text-[#475069] mt-1">데이터를 입력하면 AI가 핵심 성장 지표를 분석하고 차트를 생성합니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAnalyze)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="businessDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xl font-black text-[#0b2447]">사업 내용</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="예: MZ세대를 위한 비건 화장품을 제조 및 판매하는 커머스 플랫폼"
                          rows={4}
                          className="text-base border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-medium leading-relaxed bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormLabel className="text-xl font-black text-[#0b2447]">실적 및 예측 데이터</FormLabel>
                  <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center p-3 border-2 border-[#e2e8f4] rounded-xl bg-[#f4f7fc]/50">
                          <FormField control={form.control} name={`financialData.${index}.period`} render={({ field }) => <FormItem><FormControl><Input placeholder="기간(예: 1분기)" className="h-10 border-2 rounded-lg font-bold" {...field} /></FormControl></FormItem>} />
                          <FormField control={form.control} name={`financialData.${index}.revenue`} render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="매출" className="h-10 border-2 rounded-lg font-bold" {...field} /></FormControl></FormItem>} />
                          <FormField control={form.control} name={`financialData.${index}.expenses`} render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="비용" className="h-10 border-2 rounded-lg font-bold" {...field} /></FormControl></FormItem>} />
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length <= 3}>
                              <Trash2 className="h-5 w-5"/>
                          </Button>
                        </div>
                      ))}
                  </div>
                  <Button type="button" variant="outline" className="w-full border-2 border-dashed border-[#0b50d0] text-[#0b50d0] font-black rounded-xl hover:bg-[#e8f0ff]" onClick={() => append({ period: '', revenue: 0, expenses: 0 })}>
                      <Plus className="mr-2 h-4 w-4" /> 항목 추가하기
                  </Button>
                </div>

                <Button type="submit" size="lg" className="w-full h-16 rounded-2xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6" /> }
                  데이터 분석 및 차트 생성
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white sticky top-24">
          <CardHeader className="border-b-2 border-[#e2e8f4] p-8 bg-[#f4f7fc]/50">
            <CardTitle className="text-2xl font-black text-[#0b2447]">시각화 분석 리포트</CardTitle>
          </CardHeader>
          <CardContent className="p-8 min-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-[#7b86a0]">
                <Loader2 className="w-16 h-16 animate-spin text-[#0b50d0] mb-6" />
                <p className="text-xl font-black">AI가 재무 차트를 그리고 있습니다...</p>
              </div>
            ) : analysisResult ? (
              <div className="space-y-10">
                  <div className="p-6 border-2 border-[#0b50d0] rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]">
                      <h3 className="text-lg font-black text-[#0b2447] mb-6 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-[#0b50d0]" />
                        매출 및 이익 지표 추이
                      </h3>
                      <SalesChart data={analysisResult.chartData} />
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-lg font-black text-[#0b2447] flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#0b50d0]" />
                        AI 재무 분석 인사이트
                      </h3>
                      <div className="prose prose-sm max-w-none text-[#475069] font-bold whitespace-pre-wrap bg-[#f4f7fc] p-6 rounded-2xl border-2 border-[#e2e8f4]">
                          {analysisResult.analysis}
                      </div>
                  </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#7b86a0] py-20">
                <BarChart className="w-20 h-20 mx-auto opacity-20 mb-6" />
                <p className="text-xl font-black">데이터를 입력하고 분석 버튼을 누르세요.</p>
              </div>
            )}
          </CardContent>
          {analysisResult && !isLoading && (
              <CardFooter className="flex flex-wrap justify-end gap-3 p-8 border-t-2 border-[#e2e8f4] bg-[#f4f7fc]/30">
                  <Button variant="outline" className="border-2 border-[#0b50d0] rounded-xl font-black" onClick={handleDownloadHtml}><Download className="mr-2 h-4 w-4"/> HTML</Button>
                  <Button variant="outline" className="border-2 border-[#0b50d0] rounded-xl font-black" onClick={handleDownloadDocx}><Download className="mr-2 h-4 w-4"/> Word</Button>
                  <Button className="bg-[#0b50d0] border-2 border-[#0b2447] font-black rounded-xl" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" /> 내 문서에 저장
                  </Button>
              </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
