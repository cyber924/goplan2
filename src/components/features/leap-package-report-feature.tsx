

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, ArrowLeft, TrendingUp, Target, Globe, DollarSign, Save, Download, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateLeapReport, type GenerateLeapReportOutput } from '@/ai/flows/generate-leap-report';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp, getDoc, doc, setDoc } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';


const formSchema = z.object({
  companyName: z.string().min(1, { message: '회사명을 입력해주세요.' }),
  businessIdea: z.string().min(10, { message: '최소 10자 이상 구체적으로 입력해주세요.' }),
  currentStatus: z.string().min(10, { message: '현재 사업 현황을 10자 이상 입력해주세요.' }),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}십억 원`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}백만 원`;
    return `${value.toLocaleString()} 원`;
};

const ReportCard = ({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode, className?: string }) => (
    <Card className={`bg-white shadow-md w-full ${className}`}>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            {icon}
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

export default function LeapPackageReportFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<GenerateLeapReportOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '(주)고플랜AI',
      businessIdea: 'AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스',
      currentStatus: '현재 MAU 1만, 월 매출 5천만원 달성. 딥러닝 기반 추천 알고리즘 v2.1 보유.',
    },
  });
  
  useEffect(() => {
    if (!user) {
        router.push('/login?redirect=/ai-features/leap-package-report');
        return;
    }
    if (docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                form.setValue('businessIdea', docData.businessIdea);
                form.setValue('companyName', docData.content?.originalData?.companyName || '');
                form.setValue('currentStatus', docData.content?.originalData?.currentStatus || '');
                setReportData(docData.content?.originalData?.analysisResult);
            } else {
                toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
                router.push('/my-documents');
            }
        };
        fetchDocument();
    }
  }, [docId, user, form, toast, router]);

  const handleGenerate = async (values: FormValues) => {
    setIsLoading(true);
    setReportData(null);
    try {
      const result = await generateLeapReport(values);
      setReportData(result);
      toast({ title: '보고서 생성 완료', description: 'AI 창업도약패키지 보고서가 생성되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '보고서 생성 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullDocumentData = () => {
    if (!reportData) return null;

    const { title, diagnosis, scaleUpStrategy, globalExpansionPlan, financialPlan, exitStrategy } = reportData;
    const businessIdea = form.getValues('businessIdea');

    const sections = [
        { id: 'diagnosis', title: '기업 현황 진단', content: `### 강점\n${diagnosis.strength}\n\n### 약점\n${diagnosis.weakness}\n\n### 기회\n${diagnosis.opportunity}`},
        { id: 'scaleup', title: '스케일업 전략', content: scaleUpStrategy.map(s => `### ${s.target}\n- **전략:** ${s.strategy}\n- **KPI:** ${s.kpi}`).join('\n\n') },
        { id: 'global', title: '글로벌 진출 계획', content: `### 진출 국가\n${globalExpansionPlan.targetCountry}\n\n### 시장분석\n${globalExpansionPlan.marketResearch}\n\n### 진출전략\n${globalExpansionPlan.entryStrategy}`},
        { id: 'financials', title: '재무 및 투자 계획', content: "CHART_PLACEHOLDER", chartData: financialPlan },
        { id: 'exit', title: 'EXIT 전략', content: exitStrategy },
    ];
    
    return {
      type: 'leap-package-report' as const,
      title: title,
      businessIdea: businessIdea,
      sections: sections,
      content: {
          originalData: {
              analysisResult: reportData,
              companyName: form.getValues('companyName'),
              currentStatus: form.getValues('currentStatus'),
          }
      }
    };
  }

  const handleSave = async () => {
    if (!user || !reportData) return;
    const docData = getFullDocumentData();
    if (!docData) {
        toast({ variant: 'destructive', title: '결과 없음' });
        return;
    }
    
     try {
        if (docId) {
            const docRef = doc(db, 'documents', docId);
            await setDoc(docRef, {
                ...docData,
                userId: user.uid,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } else {
            const newDocRef = await addDoc(collection(db, "documents"), {
                ...docData,
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            router.replace(`/ai-features/leap-package-report?id=${newDocRef.id}`);
        }
        toast({ title: '저장 완료', description: '보고서가 내 문서에 저장되었습니다.' });
    } catch (error) {
        console.error("Error saving document:", error);
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

  if (!user) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <Button variant="outline" asChild>
        <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold font-headline">AI 인터랙티브 보고서 (창업도약패키지)</CardTitle>
          <CardDescription className="text-lg">성장기 기업(3~7년)을 위한 맞춤형 보고서. 현재 상태와 아이디어를 입력하면 AI가 도약 전략을 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>회사명</FormLabel><FormControl><Input placeholder="(주)고플랜AI" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="businessIdea" render={({ field }) => (
                <FormItem><FormLabel>핵심 사업 아이디어</FormLabel><FormControl><Input placeholder="AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="md:col-span-2">
                <FormField control={form.control} name="currentStatus" render={({ field }) => (
                    <FormItem><FormLabel>현재 사업 현황</FormLabel><FormControl><Textarea placeholder="주요 지표(매출, MAU 등), 현재 기술 수준, 팀 구성 등 상세히 작성" {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" size="lg" className="w-full md:w-auto md:col-span-2 md:justify-self-end" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {reportData ? '보고서 재생성' : '보고서 생성'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">AI가 도약 전략 보고서를 분석하고 있습니다...</p>
        </div>
      )}

      {reportData && (
        <div className="bg-secondary/70 p-4 sm:p-8 rounded-2xl space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold text-center text-foreground">{reportData.title}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadHtml}><Download className="mr-2" /> HTML</Button>
                    <Button variant="outline" onClick={handleDownloadDocx}><Download className="mr-2"/> Word</Button>
                    <Button onClick={handleSave}><Save className="mr-2"/> 저장하기</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ReportCard icon={<Lightbulb className="w-8 h-8 text-yellow-500" />} title="강점">
                    <p className="text-muted-foreground">{reportData.diagnosis.strength}</p>
                </ReportCard>
                <ReportCard icon={<Sparkles className="w-8 h-8 text-red-500" />} title="약점">
                     <p className="text-muted-foreground">{reportData.diagnosis.weakness}</p>
                </ReportCard>
                <ReportCard icon={<Target className="w-8 h-8 text-green-500" />} title="기회">
                     <p className="text-muted-foreground">{reportData.diagnosis.opportunity}</p>
                </ReportCard>
            </div>
            
            <ReportCard icon={<TrendingUp className="w-8 h-8 text-blue-500" />} title="스케일업 전략">
                <div className="space-y-4">
                {reportData.scaleUpStrategy.map((s, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800">{s.target}</h4>
                        <p className="text-sm"><strong className="text-blue-600">전략:</strong> {s.strategy}</p>
                        <p className="text-sm"><strong className="text-blue-600">KPI:</strong> {s.kpi}</p>
                    </div>
                ))}
                </div>
            </ReportCard>

            <ReportCard icon={<DollarSign className="w-8 h-8 text-purple-500" />} title="재무 및 투자 유치 계획 (3년)">
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <ComposedChart data={reportData.financialPlan} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" tickFormatter={(v) => `${v}년`} />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tickFormatter={formatCurrency} width={80} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="revenue" name="예상 매출" fill="#8884d8" />
                            <Line yAxisId="left" type="monotone" dataKey="investment" name="필요 투자금" stroke="#82ca9d" />
                            <Line yAxisId="left" type="monotone" dataKey="valuation" name="예상 기업가치" stroke="#ffc658" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </ReportCard>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportCard icon={<Globe className="w-8 h-8 text-green-500" />} title="글로벌 진출 계획">
                    <div className="space-y-3">
                         <div>
                            <h4 className="font-semibold">진출 대상 국가</h4>
                            <p className="text-muted-foreground">{reportData.globalExpansionPlan.targetCountry}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold">시장 분석 요약</h4>
                            <p className="text-muted-foreground">{reportData.globalExpansionPlan.marketResearch}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">진출 전략</h4>
                            <p className="text-muted-foreground">{reportData.globalExpansionPlan.entryStrategy}</p>
                        </div>
                    </div>
                </ReportCard>
                <ReportCard icon={<Target className="w-8 h-8 text-red-500" />} title="EXIT 전략">
                    <p className="text-muted-foreground">{reportData.exitStrategy}</p>
                </ReportCard>
            </div>
        </div>
      )}
    </div>
  );
}
