'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import FileUploader from '@/components/common/file-uploader';
import { Loader2, Sparkles, ScanLine, FileText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { analyzeDocumentForm } from '@/ai/flows/analyze-document-form';
import { db } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];


const formSchema = z.object({
  title: z.string().min(2, '최소 2자 이상 제목을 입력해주세요.'),
  analysisMode: z.enum(['structure_only', 'full_ocr'], { required_error: '분석 모드를 선택해주세요.' }),
  documentFile: z.any()
    .refine((file) => !!file, "문서 파일을 업로드해주세요.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `최대 파일 크기는 5MB입니다.`)
    .refine(
      (file) => ACCEPTED_TYPES.includes(file?.type),
      ".jpg, .jpeg, .png, .webp, .pdf 파일만 지원됩니다."
    ),
});

type FormValues = z.infer<typeof formSchema>;

export default function AiOcrGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '2024년 3분기 실적 보고서',
      analysisMode: 'structure_only',
    },
  });

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const handleCreateForm = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능을 사용하려면 로그인이 필요합니다.' });
        router.push('/login?redirect=/ai-ocr');
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsLoading(true);
    try {
        const documentDataUri = await fileToDataUri(values.documentFile);

      const result = await analyzeDocumentForm({ 
          documentTitle: values.title,
          analysisMode: values.analysisMode,
          documentDataUri: documentDataUri,
      });
      
      const newFormDoc = {
          type: 'form' as const,
          title: values.title,
          businessIdea: `AI OCR: ${values.documentFile.name}`,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          content: {
              title: values.title,
              topic: `AI OCR: ${values.documentFile.name}`,
              fields: result.fields,
          }
      };
      
      const docRef = await addDoc(collection(db, "documents"), newFormDoc);
      toast({ title: 'AI 양식 생성 완료', description: '업로드된 문서를 분석하여 양식을 생성했습니다.' });
      router.push(`/ai-forms/${docRef.id}`);

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '오류', description: 'AI 양식 생성 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 flex items-center justify-center py-24">
        <Card className="w-full max-w-2xl border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] bg-white">
          <CardHeader className="text-center p-8">
            <div className="mx-auto bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-2xl w-fit mb-6">
                <ScanLine className="w-10 h-10 text-[#0b50d0]" />
            </div>
            <CardTitle className="text-3xl font-black font-headline text-[#0b2447]">AI OCR 양식 생성기</CardTitle>
            <CardDescription className="text-base text-[#475069] mt-2 leading-relaxed">
              기존 양식(PDF, 이미지)을 업로드하면,<br />
              AI가 자동으로 분석하여 디지털 양식을 만들어 드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateForm)} className="space-y-8">
                 <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[#0b2447]">새 문서 제목</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 2024년 2분기 영업팀 실적 보고서" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                    control={form.control}
                    name="documentFile"
                    render={() => (
                        <FormItem>
                            <FormLabel className="font-bold text-[#0b2447]">분석할 문서 파일 업로드</FormLabel>
                            <FormControl>
                                <FileUploader name="documentFile" setValue={form.setValue} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="analysisMode"
                    render={({ field }) => (
                        <FormItem className="space-y-4">
                            <FormLabel className="font-bold text-[#0b2447]">분석 모드 선택</FormLabel>
                             <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroupItem value="structure_only" id="structure_only" className="sr-only" />
                                        </FormControl>
                                        <Label htmlFor="structure_only" className={cn(
                                            "flex flex-col items-center justify-between rounded-xl border-[3px] bg-white p-6 hover:bg-[#f4f7fc] cursor-pointer transition-all duration-200",
                                            field.value === "structure_only" ? "border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)]" : "border-[#e2e8f4]"
                                        )}>
                                            <Check className={cn("mb-3 h-6 w-6 text-[#0b50d0]", field.value !== "structure_only" && "invisible")} />
                                            <FileText className="mb-2 w-8 h-8 text-[#0b50d0]" />
                                            <span className="font-black text-[#0b2447]">양식 구조만 추출</span>
                                            <span className="text-xs text-[#7b86a0] text-center mt-2 leading-relaxed">빈 양식의 '틀'만 복제하여<br />새로운 디지털 양식을 만듭니다.</span>
                                        </Label>
                                    </FormItem>
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroupItem value="full_ocr" id="full_ocr" className="sr-only" />
                                        </FormControl>
                                        <Label htmlFor="full_ocr" className={cn(
                                            "flex flex-col items-center justify-between rounded-xl border-[3px] bg-white p-6 hover:bg-[#f4f7fc] cursor-pointer transition-all duration-200",
                                            field.value === "full_ocr" ? "border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)]" : "border-[#e2e8f4]"
                                        )}>
                                            <Check className={cn("mb-3 h-6 w-6 text-[#0b50d0]", field.value !== "full_ocr" && "invisible")} />
                                            <ScanLine className="mb-2 w-8 h-8 text-[#0b50d0]" />
                                            <span className="font-black text-[#0b2447]">구조와 내용 모두 추출</span>
                                            <span className="text-xs text-[#7b86a0] text-center mt-2 leading-relaxed">내용이 채워진 양식을 스캔하여<br />데이터가 입력된 양식을 만듭니다.</span>
                                        </Label>
                                    </FormItem>
                                </RadioGroup>
                             </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" size="lg" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] hover:bg-[#1463ff] text-white font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px] mt-4" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  AI로 스마트 양식 생성하기
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
