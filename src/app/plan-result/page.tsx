
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { generateSimplePlan, type GenerateSimplePlanOutput } from '@/ai/flows/generate-simple-plan';
import { useToast } from '@/hooks/use-toast';
import TemplateSelectModal from '@/components/landing/template-select-modal';
import type { Template } from '@/lib/types';


function PlanResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<GenerateSimplePlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const title = searchParams.get('title');
  const businessIdea = searchParams.get('businessIdea');

  useEffect(() => {
    if (!title || !businessIdea) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '사업 계획을 생성하기 위한 정보가 부족합니다. 홈으로 돌아갑니다.',
      });
      router.push('/');
      return;
    }

    const generatePlan = async () => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      try {
        const planResult = await generateSimplePlan({ title, businessIdea });
        setResult(planResult);
      } catch (e: any) {
        console.error(e);
        let errorMessage = 'AI 사업 계획서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        if (e.message && (e.message.includes('503') || e.message.includes('overloaded'))) {
            errorMessage = 'AI 모델이 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
        }
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: '생성 실패',
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    generatePlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleRetry = () => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('retry', Date.now().toString());
      router.push(`/plan-result?${newSearchParams.toString()}`);
  }
  
  const handleSelectTemplate = (template: Template) => {
    sessionStorage.setItem('initial-plan-data', JSON.stringify({ title, businessIdea }));
    router.push(template.href);
    setIsModalOpen(false);
  };

  const renderMarkdown = (markdown: string) => {
    return markdown
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4 border-b pb-2">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 border-b pb-2">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
        .replace(/^\* (.*$)/gim, '<li class="ml-5 list-disc">$1</li>')
        .replace(/^- (.*$)/gim, '<li class="ml-5 list-disc">$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/g, '<br />');
  };

  return (
    <>
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="outline" onClick={() => router.push('/')} className="mb-4 cursor-pointer">
            <ArrowLeft className="mr-2"/> 홈으로 돌아가기
          </Button>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                  <FileText className="w-10 h-10 text-primary" />
                  <div>
                      <CardTitle className="text-3xl font-bold font-headline">{title || 'AI 생성 사업 계획서'}</CardTitle>
                      <CardDescription className="text-lg">입력하신 아이디어를 바탕으로 AI가 생성한 초안입니다.</CardDescription>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[500px] relative">
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <p className="mt-6 text-xl">AI가 사업 계획서를 작성하고 있습니다...</p>
                  <p className="mt-2 text-base">잠시만 기다려 주세요. 최대 1분 정도 소요될 수 있습니다.</p>
                </div>
              )}
              {error && (
                <div className="flex flex-col items-center justify-center h-full text-center text-destructive py-20">
                  <p className="text-xl mb-6">{error}</p>
                  <Button onClick={handleRetry} size="lg">
                    <RefreshCw className="mr-2"/> 다시 생성하기
                  </Button>
                </div>
              )}
              {result && (
                <>
                    <div className="absolute top-4 right-4">
                        <Button onClick={() => setIsModalOpen(true)}>
                            템플릿으로 편집하기 <ChevronRight className="ml-2" />
                        </Button>
                    </div>
                    <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(result.plan) }}/>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
    <TemplateSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectTemplate}
      />
    </>
  );
}


export default function PlanResultPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
        }>
            <PlanResultContent />
        </Suspense>
    )
}
