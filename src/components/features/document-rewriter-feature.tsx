
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, ArrowLeft, FilePenLine, Wand2, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { rewriteDocument } from '@/ai/flows/rewrite-document';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const formSchema = z.object({
  originalText: z.string().min(50, { message: '최소 50자 이상 입력해주세요.' }),
  addDeveloperTone: z.boolean().default(false),
  emphasizeExperience: z.boolean().default(false),
  reduceAISuspicion: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function DocumentRewriterFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [rewrittenText, setRewrittenText] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      originalText: '본 과제는 최신 AI 기술을 활용하여 기존의 비효율적인 데이터 처리 방식을 혁신적으로 개선하는 것을 목표로 하며, 이를 통해 업무 생산성을 극대화하고 체계적인 데이터 관리 시스템을 확보할 수 있을 것으로 기대됩니다.',
      addDeveloperTone: false,
      emphasizeExperience: false,
      reduceAISuspicion: true,
    },
  });

  const handleRewrite = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        router.push('/login?redirect=/ai-features/document-rewriter');
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsLoading(true);
    setRewrittenText('');
    try {
      const result = await rewriteDocument({
        text: values.originalText,
        addDeveloperTone: values.addDeveloperTone,
        emphasizeExperience: values.emphasizeExperience,
        reduceAISuspicion: values.reduceAISuspicion,
      });
      setRewrittenText(result.rewrittenText);
      toast({ title: '문체 변환 완료', description: 'AI가 문서를 새롭게 다듬었습니다.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: '변환 오류', description: error.message || '문서 변환 중 오류 발생' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: '복사 완료!', description: '변환된 내용이 클립보드에 복사되었습니다.' });
  };
  
  const clearText = () => {
    form.setValue('originalText', '');
    setRewrittenText('');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <Button variant="outline" asChild className="border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
        <Link href="/ai-features"><ArrowLeft className="mr-2 h-4 w-4"/> AI 기능 목록으로</Link>
      </Button>

      <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
        <CardHeader className="border-b-2 border-[#e2e8f4] p-8 md:p-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-xl">
                <FilePenLine className="w-10 h-10 text-[#0b50d0]" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-[#0b2447]">AI 문체 변환기</CardTitle>
              <CardDescription className="text-lg font-bold text-[#475069] mt-1">AI가 쓴 보고서를 전문가의 손길이 닿은 것처럼 자연스럽게 다듬어 드립니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 md:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRewrite)} className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <FormField
                  control={form.control}
                  name="originalText"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xl font-black text-[#0b2447]">원본 텍스트 (AI 초안)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={18} placeholder="여기에 AI가 작성한 문서 초안을 붙여넣으세요." className="text-base border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-medium leading-relaxed bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                    <FormLabel className="text-xl font-black text-[#0b2447]">변환 결과 (사람 문체)</FormLabel>
                    <div className="relative h-full">
                        <div className="min-h-[445px] h-full bg-[#f4f7fc] rounded-xl border-2 border-[#0b50d0] p-6 relative group overflow-y-auto">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-10">
                                    <Loader2 className="w-12 h-12 animate-spin text-[#0b50d0] mb-4" />
                                    <p className="font-black text-[#0b2447]">전문 문체로 재구성 중...</p>
                                </div>
                            )}
                            {rewrittenText ? (
                                <>
                                    <p className="text-base text-[#475069] font-bold leading-relaxed whitespace-pre-wrap">{rewrittenText}</p>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4 h-10 w-10 border-2 border-[#0b50d0] rounded-xl bg-white hover:bg-[#e8f0ff] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(rewrittenText)}>
                                        <Copy className="w-5 h-5 text-[#0b50d0]" />
                                    </Button>
                                </>
                            ) : !isLoading && (
                                <div className="flex flex-col items-center justify-center h-full text-[#7b86a0] opacity-50">
                                    <Sparkles className="w-16 h-16 mb-4" />
                                    <p className="font-bold">입력한 텍스트가 이곳에서 새롭게 태어납니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>

              <div className="bg-[#f4f7fc] border-2 border-[#0b50d0] p-6 rounded-2xl">
                <FormLabel className="text-lg font-black text-[#0b2447] mb-4 block">변환 전문 옵션</FormLabel>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <FormField control={form.control} name="addDeveloperTone" render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="w-6 h-6 border-2 border-[#0b50d0] data-[state=checked]:bg-[#0b50d0]" /></FormControl>
                            <FormLabel className="text-base font-bold text-[#475069] cursor-pointer">개발자/기획자 톤 추가</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="emphasizeExperience" render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="w-6 h-6 border-2 border-[#0b50d0] data-[state=checked]:bg-[#0b50d0]" /></FormControl>
                            <FormLabel className="text-base font-bold text-[#475069] cursor-pointer">현장 경험 및 고민 강조</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="reduceAISuspicion" render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="w-6 h-6 border-2 border-[#0b50d0] data-[state=checked]:bg-[#0b50d0]" /></FormControl>
                            <FormLabel className="text-base font-bold text-[#475069] cursor-pointer">AI 의심 줄이기 (강력 추천)</FormLabel>
                        </FormItem>
                    )} />
                </div>
              </div>

              <div className="flex justify-between items-center gap-6 pt-4">
                  <Button type="button" variant="ghost" onClick={clearText} className="h-14 px-8 text-destructive font-black hover:bg-red-50 rounded-xl">
                    <Trash2 className="mr-2 h-5 w-5"/> 모두 지우기
                  </Button>
                  <Button type="submit" size="lg" className="h-16 flex-1 rounded-2xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Wand2 className="mr-2 h-6 w-6" />}
                    {isLoading ? '문서를 다듬는 중...' : '사람이 쓴 것처럼 변환하기'}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
