
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
import { Loader2, Sparkles, ArrowLeft, Plus, Trash2, Save, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateFinancialStatement, type GenerateFinancialStatementOutput } from '@/ai/flows/generate-financial-statement';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';
import { Separator } from '@/components/ui/separator';

const financialInputSchema = z.object({
  year: z.string().min(1, '연도를 입력해주세요.'),
  revenue: z.coerce.number().min(0, '매출은 0 이상이어야 합니다.'),
  costOfGoodsSold: z.coerce.number().min(0, '매출원가는 0 이상이어야 합니다.'),
  sellingAdminExpenses: z.coerce.number().min(0, '판관비는 0 이상이어야 합니다.'),
});

const formSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력해주세요.'),
  businessIdea: z.string().min(10, '최소 10자 이상 구체적으로 입력해주세요.'),
  financialInputs: z.array(financialInputSchema).min(1, '최소 1개 이상의 데이터가 필요합니다.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function FinancialStatementGeneratorFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GenerateFinancialStatementOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '주식회사 고플랜',
      businessIdea: 'AI 기반 맞춤형 영양제 구독 서비스',
      financialInputs: [
        { year: '1년차', revenue: 100000000, costOfGoodsSold: 40000000, sellingAdminExpenses: 30000000 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "financialInputs",
  });
  
  useEffect(() => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능은 로그인이 필요합니다.' });
        router.push('/login?redirect=/ai-features/financial-statement-generator');
        return;
    }
    if (docId) {
        const fetchDocument = async () => {
            const docRef = doc(db, 'documents', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                const docData = docSnap.data();
                if (docData.type === 'financial-statement' && docData.content) {
                    form.reset(docData.content.originalData.formData);
                    setAnalysisResult(docData.content.originalData.analysisResult);
                }
            } else {
                toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
                router.push('/my-documents');
            }
        };
        fetchDocument();
    }
  }, [docId, user, form, router, toast]);

  const handleGenerate = async (values: FormValues) => {
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
      const result = await generateFinancialStatement(values);
      setAnalysisResult(result);
      toast({ title: '재무제표 생성 완료', description: 'AI가 예상 손익계산서를 생성했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '생성 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFullDocumentData = () => {
      if (!analysisResult) return null;
      const formData = form.getValues();
      const title = `예상 손익계산서: ${formData.companyName}`;
      
      const sections = [{
          id: 'projected-income-statement',
          title: '추정 손익계산서 및 분석',
          content: analysisResult.report
      }];

      return {
          type: 'financial-statement' as const,
          title,
          businessIdea: formData.businessIdea,
          sections,
          content: {
            title,
            businessIdea: formData.businessIdea,
            sections,
            originalData: { analysisResult, formData },
          }
      };
  }

  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '결과를 저장하려면 로그인이 필요합니다.' });
        return;
    }
    const docData = getFullDocumentData();
    if (!docData) {
        toast({ variant: 'destructive', title: '결과 없음', description: '저장할 분석 결과가 없습니다.' });
        return;
    }
    
    const finalDoc = {
        type: docData.type,
        title: docData.title,
        businessIdea: docData.businessIdea,
        userId: user.uid,
        updatedAt: serverTimestamp(),
        content: docData.content,
    };

    try {
        if (docId) {
            await setDoc(doc(db, 'documents', docId), finalDoc, { merge: true });
        } else {
            const newDoc = await addDoc(collection(db, "documents"), { ...finalDoc, createdAt: serverTimestamp() });
            router.replace(`/ai-features/financial-statement-generator?id=${newDoc.id}`);
        }
        toast({ title: '저장 완료', description: '분석 결과가 내 문서에 저장되었습니다.' });
    } catch (error) {
        console.error("Error saving document: ", error);
        toast({ variant: 'destructive', title: '저장 실패', description: '문서 저장 중 오류가 발생했습니다.' });
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

   const renderMarkdown = (markdown: string) => {
    let html = markdown;

    const tableRegex = /(\|.*\|(?:\n|\r\n?))+/g;
    html = html.replace(tableRegex, (tableMatch) => {
        const rows = tableMatch.trim().split(/\n|\r\n?/);
        let tableHtml = '<div class="overflow-x-auto my-6 border-2 border-[#0b50d0] rounded-xl shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]"><table class="w-full text-sm border-collapse bg-white">';
        
        const header = rows[0].split('|').map(s => s.trim()).slice(1, -1);
        tableHtml += '<thead class="bg-[#f4f7fc] border-b-2 border-[#e2e8f4]"><tr>';
        header.forEach(h => {
            tableHtml += `<th class="p-3 text-left font-black text-[#0b2447]">${h}</th>`;
        });
        tableHtml += '</tr></thead>';

        tableHtml += '<tbody>';
        rows.slice(2).forEach(row => {
            const cells = row.split('|').map(s => s.trim()).slice(1, -1);
            tableHtml += '<tr class="border-b border-[#e2e8f4] hover:bg-[#f4f7fc]/50">';
            cells.forEach(c => {
                tableHtml += `<td class="p-3 font-bold text-[#475069]">${c}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';

        return tableHtml;
    });

    html = html
        .replace(/##\s(.*?)(?:\n|<br \/>)/g, '<h3 class="font-black text-xl text-[#0b2447] mt-8 mb-4 border-l-4 border-[#0b50d0] pl-4">$1</h3>')
        .replace(/###\s(.*?)(?:\n|<br \/>)/g, '<h4 class="font-black text-lg text-[#0b2447] mt-6 mb-2">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#0b50d0] font-black">$1</strong>')
        .replace(/\n/g, '<br />');
    
    return html;
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
                  <FileSpreadsheet className="w-10 h-10 text-[#0b50d0]" />
              </div>
              <div>
                  <CardTitle className="text-3xl font-black text-[#0b2447]">AI 예상 재무제표 생성기</CardTitle>
                  <CardDescription className="text-lg font-bold text-[#475069] mt-1">간단한 정보만으로 AI가 전문적인 손익계산서를 만들어 드립니다.</CardDescription>
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[#0b2447]">회사명</FormLabel>
                      <FormControl><Input placeholder="주식회사 고플랜" className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="businessIdea" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[#0b2447]">사업 아이템</FormLabel>
                      <FormControl><Input placeholder="예: AI 기반 맞춤형 영양제 구독 서비스" className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )} />
              </div>

              <div className="space-y-4">
                <FormLabel className="text-xl font-black text-[#0b2447]">기본 재무 정보 (연차별 입력)</FormLabel>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-2 sm:grid-cols-[1fr_1.5fr_1.5fr_1.5fr_auto] gap-3 items-start p-4 border-2 border-[#e2e8f4] rounded-xl bg-[#f4f7fc]/50">
                      <FormField control={form.control} name={`financialInputs.${index}.year`} render={({ field }) => <FormItem><FormControl><Input placeholder="1년차" className="h-11 border-2 rounded-lg font-bold text-center" {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name={`financialInputs.${index}.revenue`} render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="총 매출" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name={`financialInputs.${index}.costOfGoodsSold`} render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="총 매출원가" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                      <FormField control={form.control} name={`financialInputs.${index}.sellingAdminExpenses`} render={({ field }) => <FormItem><FormControl><Input type="number" placeholder="총 판관비" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" className="border-2 border-dashed border-[#0b50d0] text-[#0b50d0] font-black rounded-xl hover:bg-[#e8f0ff]" onClick={() => append({ year: `${fields.length + 1}년차`, revenue: 0, costOfGoodsSold: 0, sellingAdminExpenses: 0 })}>
                  <Plus className="mr-2 h-4 w-4" /> 연차 추가하기
                </Button>
              </div>
              
              <Button type="submit" size="lg" className="w-full h-16 rounded-2xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6" />}
                AI로 3개년 추정 재무제표 생성
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {(isLoading || analysisResult) && (
        <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
          <CardHeader className="border-b-2 border-[#e2e8f4] p-8 bg-[#f4f7fc]/50">
            <CardTitle className="text-2xl font-black text-[#0b2447]">AI 생성 결과: 추정 손익계산서</CardTitle>
          </CardHeader>
          <CardContent className="p-8 md:p-10">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#7b86a0]">
                    <Loader2 className="w-16 h-16 animate-spin text-[#0b50d0] mb-6" />
                    <p className="text-xl font-black">AI 회계사가 재무제표를 작성하고 있습니다...</p>
                </div>
            ) : analysisResult && (
                <div
                    className="prose prose-lg max-w-none text-[#475069] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisResult.report) }}
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
