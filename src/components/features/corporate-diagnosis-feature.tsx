

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, ArrowLeft, Building, Search, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { corporateDiagnosis, type CorporateDiagnosisOutput } from '@/ai/flows/corporate-diagnosis';
import FinancialSummaryChart from '@/components/charts/financial-summary-chart';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';


interface CompanyProfile {
  id: string;
  companyName: string;
  vision?: string;
  history?: string;
  financials?: {
    year: string;
    revenue?: number;
    operatingProfit?: number;
    netProfit?: number;
  }[];
  userId: string;
}

const MY_PROFILES_KEY = 'company-profiles';
const CUSTOMER_PROFILES_KEY = 'customer-profiles';

export default function CorporateDiagnosisFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [myProfiles, setMyProfiles] = useState<CompanyProfile[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CompanyProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CorporateDiagnosisOutput | null>(null);
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const allProfiles = useMemo(() => [...myProfiles, ...customerProfiles], [myProfiles, customerProfiles]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.push('/login?redirect=/ai-features/corporate-diagnosis');
      return;
    }

    const storedMyProfiles = JSON.parse(localStorage.getItem(MY_PROFILES_KEY) || '[]');
    const userMyProfiles = storedMyProfiles.filter((p: CompanyProfile) => p.userId === user.uid);
    setMyProfiles(userMyProfiles);

    const storedCustomerProfiles = JSON.parse(localStorage.getItem(CUSTOMER_PROFILES_KEY) || '[]');
    const userCustomerProfiles = storedCustomerProfiles.filter((p: CompanyProfile) => p.userId === user.uid);
    setCustomerProfiles(userCustomerProfiles);

    if (docId) {
      const fetchDocument = async () => {
          const docRef = doc(db, 'documents', docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().userId === user.uid) {
              const docData = docSnap.data();
              if (docData.type === 'corporate-diagnosis' && docData.content) {
                  const profileId = docData.content.originalData.profileId;
                  setSelectedProfileId(profileId);
                  setAnalysisResult(docData.content.originalData.analysisResult);
              }
          } else {
              toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
              router.push('/my-documents');
          }
      };
      fetchDocument();
    }
  }, [user, router, toast, docId, isAuthLoading]);

  const handleAnalyze = async () => {
    if (!selectedProfileId) {
      toast({ variant: 'destructive', title: '회사 선택 필요', description: '분석할 회사를 선택해주세요.' });
      return;
    }
    
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }
    
    const profileToAnalyze = allProfiles.find(p => p.id === selectedProfileId);
    
    if (!profileToAnalyze || !profileToAnalyze.financials || profileToAnalyze.financials.length === 0) {
      toast({ variant: 'destructive', title: '데이터 부족', description: '선택된 회사의 재무 정보가 부족하여 분석할 수 없습니다.' });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    const analysisInput = {
      companyName: profileToAnalyze.companyName,
      vision: profileToAnalyze.vision || undefined,
      history: profileToAnalyze.history || undefined,
      financials: profileToAnalyze.financials.map(f => ({
        year: f.year,
        revenue: f.revenue ?? 0,
        operatingProfit: f.operatingProfit ?? 0,
        netProfit: f.netProfit ?? 0,
      })),
    };

    try {
      const result = await corporateDiagnosis(analysisInput);
      setAnalysisResult(result);
      toast({ title: '기업 분석 완료', description: 'AI가 기업 진단 리포트를 생성했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '분석 중 오류가 발생했습니다. 입력 데이터를 확인해주세요.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullDocumentData = () => {
    if (!analysisResult || !selectedProfileId) return null;
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    if (!profile) return null;
    
    const title = `기업 진단: ${profile.companyName}`;
    const businessIdea = `${profile.companyName} 기업 진단 리포트`;

    return {
        type: 'corporate-diagnosis' as const,
        title: title,
        businessIdea: businessIdea,
        sections: [
            { id: 'financial-summary-chart', title: '재무 요약', content: "CHART_PLACEHOLDER" },
            { id: 'corporate-analysis-report', title: 'AI 기업 진단 리포트', content: analysisResult.report }
        ],
        content: {
          originalData: { 
              analysisResult: { chartData: profile.financials },
          },
        },
    };
  }

  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        return;
    }
    const docDataToSave = getFullDocumentData();
    if (!docDataToSave) {
        toast({ variant: 'destructive', title: '결과 없음', description: '저장할 분석 결과가 없습니다.' });
        return;
    }
    
    // Add full original data for future retrieval
    const fullContent = {
       ...docDataToSave.content,
       originalData: {
           analysisResult,
           profileId: selectedProfileId
       }
    };

    const finalDoc = {
      ...docDataToSave,
      userId: user.uid,
      updatedAt: serverTimestamp(),
      content: fullContent,
    }

    try {
        let newDocId = docId;
        if (newDocId) {
            await setDoc(doc(db, 'documents', newDocId), { ...finalDoc, createdAt: serverTimestamp() }, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "documents"), { ...finalDoc, createdAt: serverTimestamp() });
            newDocId = newDoc.id;
            router.replace(`/ai-features/corporate-diagnosis?id=${newDocId}`, undefined, { shallow: true });
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

  const selectedProfileData = allProfiles.find(p => p.id === selectedProfileId);

  if (!user) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );
  }

  return (
    <>
        <Button variant="outline" asChild className="mb-4">
            <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
            <CardHeader>
            <div className="flex items-center gap-4">
                <Building className="w-10 h-10 text-primary" />
                <div>
                <CardTitle className="text-3xl font-bold font-headline">AI 기업 분석 및 진단</CardTitle>
                <CardDescription className="text-lg">저장된 회사 정보를 바탕으로 AI 진단 리포트를 받아보세요.</CardDescription>
                </div>
            </div>
            </CardHeader>
            <CardContent className="space-y-6">
            <div>
                <label className="text-lg font-semibold">분석할 회사 선택</label>
                <Select onValueChange={setSelectedProfileId} value={selectedProfileId || undefined}>
                <SelectTrigger className="w-full mt-2 text-base h-12">
                    <SelectValue placeholder="분석할 회사를 선택해주세요..." />
                </SelectTrigger>
                <SelectContent>
                    {myProfiles.length === 0 && customerProfiles.length === 0 ? (
                        <SelectItem value="no-company" disabled>저장된 회사가 없습니다.</SelectItem>
                    ) : (
                    <>
                        {myProfiles.length > 0 && (
                        <SelectGroup>
                            <SelectLabel>내 회사 정보</SelectLabel>
                            {myProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.companyName}</SelectItem>)}
                        </SelectGroup>
                        )}
                        {customerProfiles.length > 0 && (
                            <SelectGroup>
                            <SelectLabel>고객사 정보</SelectLabel>
                            {customerProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.companyName}</SelectItem>)}
                        </SelectGroup>
                        )}
                    </>
                    )}
                </SelectContent>
                </Select>
                {myProfiles.length === 0 && customerProfiles.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                    먼저 <Link href="/company-info/form" className="underline text-primary">회사 정보</Link>를 추가해주세요.
                    </p>
                )}
            </div>
            <Button onClick={handleAnalyze} size="lg" className="w-full" disabled={isLoading || !selectedProfileId}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" /> }
                AI 분석 실행
            </Button>
            </CardContent>
        </Card>

        <Card className="shadow-lg sticky top-24">
            <CardHeader>
                <CardTitle>분석 결과</CardTitle>
                <CardDescription>{selectedProfileData?.companyName || '분석 결과가 여기에 표시됩니다.'}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px] max-h-[70vh] overflow-y-auto">
                {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4">AI가 기업 정보를 분석하고 있습니다...</p>
                </div>
                )}
                {!isLoading && analysisResult && selectedProfileData && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold mb-2">재무 요약</h3>
                        <FinancialSummaryChart data={selectedProfileData.financials || []} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">AI 진단 리포트</h3>
                            <div
                            className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap bg-secondary/50 p-4 rounded-md"
                            dangerouslySetInnerHTML={{ __html: analysisResult.report.replace(/### (.*?)(?:\n|<br \/>)/g, '<h3>$1</h3>').replace(/\n/g, '<br />') }}
                            />
                    </div>
                </div>
                )}
                {!isLoading && !analysisResult && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto" />
                    <p className="mt-4">분석할 회사를 선택하고 'AI 분석 실행'을 클릭하세요.</p>
                </div>
                )}
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
    </>
  );
}
