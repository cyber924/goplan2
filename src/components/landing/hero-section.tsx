
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '../ui/textarea';

interface HeroSectionProps {
  onSubmit: (data: { title: string; businessIdea: string }) => void;
}

const formSchema = z.object({
  title: z.string().min(2, {
    message: '최소 2자 이상의 제목을 입력해주세요.',
  }),
  businessIdea: z.string().min(10, {
    message: '최소 10자 이상의 아이디어를 입력해주세요.',
  }),
});

export default function HeroSection({ onSubmit }: HeroSectionProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: 'AI 기반 맞춤형 영양제 추천 및 구독 서비스',
      businessIdea: '개인의 건강 데이터와 식습관을 분석하여 최적의 영양제를 추천하고, 매달 편리하게 집으로 배송해주는 AI 기반 구독 플랫폼입니다.',
    },
  });

  return (
    <section id="hero" className="w-full py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline text-foreground sm:text-5xl md:text-6xl">
          아이디어를 <span className="text-primary">사업 계획서</span>로
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl">
          GOplanAI는 당신의 빛나는 아이디어를 전문가 수준의 사업 계획서로 빠르고 쉽게 만들어주는 AI 기반 서비스입니다.
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-10 max-w-2xl mx-auto space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">프로젝트 제목</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="프로젝트 제목 (예: 친환경 반려동물 간식 O2O 플랫폼)"
                      className="h-14 text-center text-base rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessIdea"
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="sr-only">핵심 사업 아이디어</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="핵심 사업 아이디어를 요약하여 입력해주세요. AI가 이 내용을 바탕으로 사업 계획서 초안을 작성합니다."
                      rows={4}
                      className="text-base rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-xl">
              템플릿 선택하고 시작하기
            </Button>
          </form>
        </Form>
      </div>
    </section>
  );
}
