

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import FileUploader from '@/components/common/file-uploader';
import { Loader2, Sparkles, ArrowLeft, ScanSearch, MessageSquare, Save, TableIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { analyzeDocument, answerFollowupQuestion, type AnalyzeDocumentOutput } from '@/ai/flows/analyze-document';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const formSchema = z.object({
  documentFile: z.any()
    .refine((file) => !!file, "분석할 파일을 업로드해주세요.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `최대 파일 크기는 5MB입니다.`)
    .refine((file) => ACCEPTED_TYPES.includes(file?.type), ".jpg, .jpeg, .png, .webp, .pdf 파일만 지원됩니다."),
  followupQuestion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DocumentAnalysisFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeDocumentOutput | null>(null);
  const [conversation, setConversation] = useState<{ question: string; answer: string }[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!user) {
        router.push('/login?redirect=/ai-features/document-analysis');
        return;
    }
    if(docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                if(docData.type === 'document-analysis') {
                    setAnalysisResult(docData.content.originalData.analysisResult);
                    setConversation(docData.content.originalData.conversation);
                }
            } else {
                 toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없거나 권한이 없습니다.' });
                router.push('/my-documents');
            }
        };
        fetchDocument();
    }
  }, [docId, user, router, toast]);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        router.push('/login?redirect=/ai-features/document-analysis');
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setConversation([]);
    try {
      const documentDataUri = await fileToDataUri(values.documentFile);
      const result = await analyzeDocument({ documentDataUri });
      setAnalysisResult(result);
      toast({ title: '문서 분석 완료', description: `AI가 '${result.documentType}' 문서를 분석했습니다.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: '분석 오류', description: error.message || '문서 분석 중 오류 발생' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowup = async () => {
    const question = form.getValues('followupQuestion');
    if (!question || !analysisResult) return;
    
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsAnswering(true);
    try {
        const result = await answerFollowupQuestion({
            analysisReport: analysisResult.analysisReport,
            structuredData: analysisResult.structuredData,
            question: question,
        });
        setConversation(prev => [...prev, { question, answer: result.answer }]);
        form.setValue('followupQuestion', '');
    } catch (error: any) {
        toast({ variant: 'destructive', title: '답변 생성 오류', description: error.message || '질문에 답변하는 중 오류 발생' });
    } finally {
        setIsAnswering(false);
    }
  };

  const handleSave = async () => {
    if (!user || !analysisResult) {
        toast({ variant: 'destructive', title: '오류', description: '저장할 데이터가 없거나 로그인이 필요합니다.' });
        return;
    }
    
    const docFile = form.getValues('documentFile');
    const title = `문서 분석: ${docFile?.name || analysisResult.documentType}`;
    
    let sections = [
        { id: 'analysis-report', title: 'AI 분석 리포트', content: analysisResult.analysisReport },
    ];

    if(analysisResult.structuredData) {
        sections.unshift({ id: 'structured-data', title: '구조화된 데이터', content: JSON.stringify(analysisResult.structuredData, null, 2)});
    }
     if(conversation.length > 0) {
        sections.push({ id: 'qna', title: 'AI Q&A', content: conversation.map(c => `Q: ${c.question}\n\nA: ${c.answer}`).join('\n\n---\n\n')});
    }

    const docData = {
        type: 'document-analysis' as const,
        title,
        businessIdea: `AI가 분석한 '${analysisResult.documentType}' 문서`,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        content: {
            title,
            sections,
            originalData: { analysisResult, conversation }
        }
    };

    try {
        await addDoc(collection(db, "documents"), docData);
        toast({ title: '저장 완료', description: '분석 결과가 내 문서에 저장되었습니다.' });
        router.push('/my-documents');
    } catch (error) {
        console.error("Error saving document:", error);
        toast({ variant: 'destructive', title: '저장 실패' });
    }
  };

  if (!user) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button variant="outline" asChild>
        <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <ScanSearch className="w-10 h-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold font-headline">AI 문서 분석기</CardTitle>
              <CardDescription className="text-lg">파일을 올리면 AI가 분석, 요약, 질문 답변까지 한번에 처리합니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAnalyze)} className="space-y-6">
              <FormField
                control={form.control}
                name="documentFile"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">분석할 문서 (PDF, 이미지)</FormLabel>
                    <FormControl>
                      <FileUploader name="documentFile" setValue={form.setValue} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                AI 분석 실행
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">AI가 문서를 읽고 분석하고 있습니다...</p>
        </div>
      )}

      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>분석 결과: <span className="text-primary">{analysisResult.documentType}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisResult.structuredData && (
                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center"><TableIcon className="mr-2"/>구조화된 데이터</h3>
                    <pre className="bg-secondary/50 p-4 rounded-md text-sm overflow-x-auto">
                        {JSON.stringify(analysisResult.structuredData, null, 2)}
                    </pre>
                </div>
            )}
            <div>
                <h3 className="text-xl font-bold mb-2">상세 분석 리포트</h3>
                <div className="prose prose-sm max-w-none p-4 border rounded-md" dangerouslySetInnerHTML={{ __html: analysisResult.analysisReport.replace(/\n/g, '<br/>') }} />
            </div>
            
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center"><MessageSquare className="mr-2"/>궁금한 점 질문하기</h3>
                {conversation.map((c, i) => (
                    <div key={i} className="space-y-2">
                        <p className="p-3 rounded-md bg-secondary"><strong>Q:</strong> {c.question}</p>
                        <p className="p-3 rounded-md bg-primary/10"><strong>A:</strong> {c.answer}</p>
                    </div>
                ))}
                 <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); handleFollowup(); }} className="flex gap-2">
                        <FormField
                            control={form.control}
                            name="followupQuestion"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input {...field} placeholder="예: 이 계약의 가장 큰 독소조항은 뭐야?" disabled={isAnswering}/>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isAnswering}>
                            {isAnswering ? <Loader2 className="animate-spin" /> : "질문"}
                        </Button>
                    </form>
                </Form>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="mr-2"/> 내 문서에 저장
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
