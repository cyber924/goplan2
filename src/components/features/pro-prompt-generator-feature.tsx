'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, ArrowLeft, Terminal, Copy, Wand2, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateProPrompt, type ProPromptOutput } from '@/ai/flows/pro-prompt-generator';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  task: z.string().min(5, { message: '수행할 작업을 구체적으로 입력해주세요.' }),
  context: z.string().optional(),
  outputFormat: z.enum(['standard', 'detailed', 'technical']),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProPromptGeneratorFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProPromptOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task: '스타트업을 위한 시장 분석 보고서 초안 작성하기',
      context: '타겟 고객은 30대 직장인이며, 말투는 전문적이어야 함.',
      outputFormat: 'standard',
    },
  });

  const handleGenerate = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능은 로그인이 필요합니다.' });
        router.push('/login?redirect=/ai-features/pro-prompt-generator');
        return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const data = await generateProPrompt(values);
      setResult(data);
      toast({ title: '프롬프트 최적화 완료', description: 'AI를 위한 전문가급 명령어가 생성되었습니다.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: '생성 오류', description: error.message || '프롬프트 생성 중 문제가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: '복사 완료', description: '최적화된 프롬프트가 클립보드에 복사되었습니다.' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
      </Button>

      <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)]">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Terminal className="w-10 h-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold font-headline text-[#0b2447]">프로 프롬프트 생성기</CardTitle>
              <CardDescription className="text-lg">
                가장 직접적인 AI 호출 방식을 적용하여 배포 환경에서도 100% 작동을 보장하는 프롬프트 엔진입니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <FormField control={form.control} name="task" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary"/>무엇을 하고 싶으신가요?</FormLabel>
                            <FormControl><Textarea placeholder="예: 비즈니스 이메일 작성, 코드 리뷰, 마케팅 문구 생성 등" rows={3} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="context" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary"/>참고할 문맥이나 조건</FormLabel>
                            <FormControl><Textarea placeholder="예: 어조는 친절하게, 특정 데이터 포함 등" rows={3} {...field} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="outputFormat" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">프롬프트 상세 수준</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="형식 선택" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="standard">표준 (균형 잡힘)</SelectItem>
                                    <SelectItem value="detailed">상세 (매우 정교함)</SelectItem>
                                    <SelectItem value="technical">기술적 (논리적 구조 강조)</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <Button type="submit" size="lg" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] hover:bg-[#1463ff] font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)]" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                        AI 최적화 프롬프트 만들기
                    </Button>
                </div>

                <div className="relative">
                    <FormLabel className="font-bold text-lg mb-2 block">최적화 결과</FormLabel>
                    <div className="min-h-[400px] h-full bg-secondary/50 rounded-xl border-2 border-dashed border-[#0b50d0] p-6 relative group overflow-y-auto">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-10">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <p className="font-bold text-[#0b2447]">전문가급 프롬프트 설계 중...</p>
                            </div>
                        )}
                        {result ? (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-black text-primary">BEST PROMPT</h4>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.optimizedPrompt)}><Copy className="w-4 h-4 mr-2"/>복사</Button>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-[#0b50d0] text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.optimizedPrompt}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-black text-[#0b2447] mb-2 uppercase text-xs tracking-widest">Why it works</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {result.explanation}
                                    </p>
                                </div>
                            </div>
                        ) : !isLoading && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                <Terminal className="w-16 h-16 mb-4" />
                                <p>왼쪽 정보를 입력하고 생성 버튼을 누르세요.</p>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
