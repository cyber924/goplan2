'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { generateFormFields } from '@/ai/flows/generate-form-fields';
import { db } from '@/lib/firebase/client';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';


const formSchema = z.object({
  topic: z.string().min(2, '최소 2자 이상 주제를 입력해주세요.').describe('예: 업무일지, 출장보고서, 재직증명서'),
  title: z.string().min(2, '최소 2자 이상 제목을 입력해주세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function AiFormGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '분기별 실적 보고서',
      title: '2024년 3분기 영업팀 실적 보고서',
    },
  });

  const handleCreateForm = async (values: FormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능을 사용하려면 로그인이 필요합니다.' });
        router.push('/login?redirect=/ai-forms');
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    setIsLoading(true);
    try {
      const result = await generateFormFields({ topic: values.topic });
      const newFormDoc = {
          type: 'form' as const,
          title: values.title,
          businessIdea: values.topic, // Use topic as a short description
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          content: {
              title: values.title,
              topic: values.topic,
              fields: result.fields.map(f => ({ ...f, value: '' })), // Add empty value field
          }
      };
      
      const docRef = await addDoc(collection(db, "documents"), newFormDoc);
      toast({ title: 'AI 양식 생성 완료', description: '문서에 필요한 항목들이 생성되었습니다. 내용을 채워주세요.' });
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
        <Card className="w-full max-w-lg border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] bg-white">
          <CardHeader className="text-center p-8">
            <div className="mx-auto bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-2xl w-fit mb-6">
                <FileType className="w-10 h-10 text-[#0b50d0]" />
            </div>
            <CardTitle className="text-3xl font-black font-headline text-[#0b2447]">AI 양식 생성기</CardTitle>
            <CardDescription className="text-lg text-[#475069] mt-2">
              필요한 문서의 종류를 알려주시면, AI가 맞춤 양식을 만들어 드립니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateForm)} className="space-y-6">
                 <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[#0b2447]">문서 종류 (주제)</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 분기별 실적 보고서, 주간 업무 일지" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-[#0b2447]">문서 제목</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 2024년 2분기 영업팀 실적 보고서" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] hover:bg-[#1463ff] text-white font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  AI로 양식 만들기 시작
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
