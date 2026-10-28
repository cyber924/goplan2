

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
import { Loader2, Sparkles, ArrowLeft, BarChart, Users, Milestone, Target, DollarSign, Lightbulb, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateInteractiveReport, type GenerateInteractiveReportOutput } from '@/ai/flows/generate-interactive-report';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp, getDoc, doc, setDoc } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';


const formSchema = z.object({
  businessIdea: z.string().min(10, { message: '최소 10자 이상 구체적으로 입력해주세요.' }),
  companyName: z.string().min(1, { message: '회사명을 입력해주세요.' }),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}십억 원`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}백만 원`;
    return `${value.toLocaleString()} 원`;
};

const ReportCard = ({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode, className?: string }) => (
    <Card className={`shadow-md w-full ${className}`}>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            {icon}
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

export default function InteractiveReportFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<GenerateInteractiveReportOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessIdea: 'AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스',
      companyName: '(주)고플랜AI',
    },
  });
  
  useEffect(() => {
    if (!user) {
        router.push('/login?redirect=/ai-features/interactive-report');
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
      const result = await generateInteractiveReport(values);
      setReportData(result);
      toast({ title: '보고서 생성 완료', description: 'AI 인터랙티브 보고서가 생성되었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '보고서 생성 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

    const getFullDocumentData = () => {
    if (!reportData) return null;

    const { title, overview, marketAnalysis, competitors, businessModel, roadmap, financialProjections, team } = reportData;
    const businessIdea = form.getValues('businessIdea');

    const sections = [
        { id: 'overview', title: '사업 개요', content: `### 문제정의\n${overview.problem}\n\n### 해결방안\n${overview.solution}\n\n### 차별성\n${overview.uniqueness}`},
        { id: 'market-analysis', title: '시장 분석', content: `### 시장 규모 (TAM)\n${formatCurrency(marketAnalysis.marketSize)}\n\n### 타겟 고객\n${marketAnalysis.targetMarket}\n\n### 성장 잠재력\n${marketAnalysis.growthPotential}` },
        { id: 'competitors', title: '경쟁사 분석', content: competitors.map(c => `### ${c.name}\n- **강점:** ${c.strength}\n- **약점:** ${c.weakness}`).join('\n\n') },
        { id: 'business-model', title: '비즈니스 모델', content: `### 수익 모델\n${businessModel.revenueModel}\n\n### 비용 구조\n${businessModel.costStructure}`},
        { id: 'roadmap', title: '사업 추진 로드맵', content: roadmap.map(m => `### ${m.year}년 ${m.quarter}: ${m.goal}\n${m.details.map(d => `- ${d}`).join('\n')}`).join('\n\n') },
        { id: 'financials', title: '재무 계획', content: "CHART_PLACEHOLDER", chartData: financialProjections },
        { id: 'team', title: '팀 구성', content: team.map(t => `### ${t.name} (${t.role})\n${t.expertise}`).join('\n\n') },
    ];
    
    return {
      type: 'interactive-report' as const,
      title: title,
      businessIdea: businessIdea,
      slug: 'interactive-report',
      sections: sections,
      content: {
          originalData: {
              analysisResult: reportData,
              companyName: form.getValues('companyName')
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
                type: "interactive-report",
                userId: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            router.replace(`/ai-features/interactive-report?id=${newDocRef.id}`);
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
          <CardTitle className="text-3xl font-bold font-headline">AI 인터랙티브 보고서 (예비창업패키지)</CardTitle>
          <CardDescription className="text-lg">사업 아이템을 입력하면, 정부 지원 사업 심사 기준에 맞춘 시각화된 보고서를 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>회사명</FormLabel><FormControl><Input placeholder="(주)고플랜AI" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="businessIdea" render={({ field }) => (
                <FormItem><FormLabel>핵심 사업 아이디어</FormLabel><FormControl><Textarea placeholder="AI 기반 맞춤형 영양제 추천 및 정기 구독 서비스" {...field} rows={1} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isLoading}>
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
          <p className="mt-4 text-lg text-muted-foreground">AI가 보고서를 분석하고 시각화하고 있습니다...</p>
        </div>
      )}

      {reportData && reportData.overview && (
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
                <ReportCard icon={<Lightbulb className="w-8 h-8 text-yellow-500" />} title="문제 정의" className="bg-yellow-50">
                    <p className="text-muted-foreground">{reportData.overview.problem}</p>
                </ReportCard>
                <ReportCard icon={<Sparkles className="w-8 h-8 text-primary" />} title="해결 방안" className="bg-blue-50">
                     <p className="text-muted-foreground">{reportData.overview.solution}</p>
                </ReportCard>
                <ReportCard icon={<Target className="w-8 h-8 text-green-500" />} title="차별성" className="bg-green-50">
                     <p className="text-muted-foreground">{reportData.overview.uniqueness}</p>
                </ReportCard>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReportCard icon={<DollarSign className="w-8 h-8 text-purple-500" />} title="비즈니스 모델" className="bg-purple-50">
                    <div className="space-y-3">
                         <div>
                            <h4 className="font-semibold">수익 모델</h4>
                            <p className="text-muted-foreground">{reportData.businessModel.revenueModel}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold">비용 구조</h4>
                            <p className="text-muted-foreground">{reportData.businessModel.costStructure}</p>
                        </div>
                    </div>
                </ReportCard>
                 <ReportCard icon={<Users className="w-8 h-8 text-red-500" />} title="경쟁사 분석" className="bg-red-50">
                    <div className="space-y-3">
                    {reportData.competitors.map(c => (
                        <div key={c.name}>
                            <h4 className="font-semibold">{c.name}</h4>
                            <p className="text-sm text-muted-foreground"><span className="text-green-600 font-medium">강점:</span> {c.strength}</p>
                             <p className="text-sm text-muted-foreground"><span className="text-red-600 font-medium">약점:</span> {c.weakness}</p>
                        </div>
                    ))}
                    </div>
                </ReportCard>
            </div>

            <ReportCard icon={<BarChart className="w-8 h-8 text-blue-500" />} title="시장 분석 및 재무 계획 (3년 추정)" className="bg-background">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-semibold">시장 규모 (TAM)</h4>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(reportData.marketAnalysis.marketSize)}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold">타겟 고객</h4>
                            <p className="text-muted-foreground">{reportData.marketAnalysis.targetMarket}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold">성장 잠재력</h4>
                            <p className="text-muted-foreground">{reportData.marketAnalysis.growthPotential}</p>
                        </div>
                    </div>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <ComposedChart data={reportData.financialProjections} margin={{ top: 5, right: 0, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" tickFormatter={(v) => `${v}년`} />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tickFormatter={formatCurrency} width={80} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="revenue" name="매출" fill="#8884d8" />
                                <Line yAxisId="left" type="monotone" dataKey="profit" name="이익" stroke="#82ca9d" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </ReportCard>

            <ReportCard icon={<Milestone className="w-8 h-8 text-indigo-500" />} title="사업 추진 로드맵 (1년)" className="bg-background">
                <div className="relative pl-6 before:absolute before:inset-y-0 before:w-0.5 before:bg-border before:left-2">
                {reportData.roadmap.map((m, idx) => (
                    <div key={idx} className="relative pb-8 last:pb-0">
                        <div className="absolute left-2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
                        <div className="pl-8">
                            <p className="font-bold text-primary">{m.year}년 {m.quarter}</p>
                            <h4 className="font-semibold text-lg">{m.goal}</h4>
                            <ul className="list-disc pl-5 text-muted-foreground text-sm mt-1">
                                {m.details.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </div>
                    </div>
                ))}
                </div>
            </ReportCard>
            
            <ReportCard icon={<Users className="w-8 h-8 text-gray-600" />} title="팀 구성" className="bg-background">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reportData.team.map(t => (
                        <div key={t.name} className="p-4 bg-secondary/50 rounded-lg">
                            <h4 className="font-bold text-lg">{t.name}</h4>
                            <p className="text-primary font-semibold">{t.role}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.expertise}</p>
                        </div>
                    ))}
                </div>
            </ReportCard>
        </div>
      )}
    </div>
  );
}
