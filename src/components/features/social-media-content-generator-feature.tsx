

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
import { Loader2, Sparkles, ArrowLeft, Share2, Bot, Copy, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateSocialMediaContent, type GenerateSocialMediaContentOutput } from '@/ai/flows/generate-social-media-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateImage } from '@/ai/flows/generate-image';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';


const formSchema = z.object({
  businessIdea: z.string().min(10, { message: '최소 10자 이상 구체적으로 입력해주세요.' }),
  targetAudience: z.string().min(5, { message: '최소 5자 이상 구체적으로 입력해주세요.' }),
});

type FormValues = z.infer<typeof formSchema>;

const ContentCard = ({ title, copy, imagePrompt, hashtags, platform }: { title: string, copy: string, imagePrompt: string, hashtags: string[], platform: 'instagram' | 'facebook' }) => {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: '복사 완료!', description: `${title} 카피가 클립보드에 복사되었습니다.` });
    };

    const handleGenerateImage = async () => {
        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const result = await generateImage({ prompt: imagePrompt });
            setGeneratedImage(result.imageUrl);
        } catch(e) {
            toast({ variant: 'destructive', title: '이미지 생성 실패' });
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <Card className="bg-background/70">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-1">광고 카피</h4>
                    <div className="relative group">
                        <p className="text-sm whitespace-pre-wrap p-3 bg-secondary rounded-md">{copy}</p>
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(copy)}><Copy/></Button>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-1">해시태그</h4>
                    <p className="text-sm text-primary">{hashtags.join(' ')}</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-1">추천 이미지</h4>
                     <div className="aspect-video relative rounded-md border-2 border-dashed bg-secondary flex items-center justify-center">
                         {isGenerating ? <Loader2 className="animate-spin w-10 h-10 text-primary" /> : 
                          generatedImage ? <Image src={generatedImage} alt="generated image" layout="fill" objectFit="cover" /> :
                          <div className="text-center text-muted-foreground p-4">
                            <ImageIcon className="mx-auto w-8 h-8 mb-2"/>
                            <p className="text-xs">{imagePrompt}</p>
                          </div>
                         }
                     </div>
                    <Button size="sm" variant="outline" className="mt-2 w-full" onClick={handleGenerateImage} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                        AI 이미지 생성
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


export default function SocialMediaContentGeneratorFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GenerateSocialMediaContentOutput | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessIdea: 'MZ세대를 위한 비건 화장품 브랜드',
      targetAudience: '20-30대 초반의 가치 소비를 중시하는 여성',
    },
  });

  useEffect(() => {
    if (!user) {
        router.push('/login?redirect=/ai-features/social-media-content-generator');
    }
  }, [user, router, toast]);

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
      const result = await generateSocialMediaContent(values);
      setAnalysisResult(result);
      toast({ title: '콘텐츠 생성 완료', description: 'AI가 소셜 미디어 콘텐츠 패키지를 생성했습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '콘텐츠 생성 중 오류가 발생했습니다.' });
      console.error(error);
    } finally {
      setIsLoading(false);
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
    <div className="max-w-6xl mx-auto space-y-8">
      <Button variant="outline" asChild>
        <Link href="/ai-features"><ArrowLeft className="mr-2"/> AI 기능 목록으로</Link>
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Share2 className="w-10 h-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold font-headline">AI 소셜 미디어 콘텐츠 생성기</CardTitle>
              <CardDescription className="text-lg">사업 아이템과 타겟 고객을 입력하면, 채널별 광고 콘텐츠 패키지를 AI가 만들어 드립니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="businessIdea" render={({ field }) => (
                    <FormItem><FormLabel>사업 아이템</FormLabel><FormControl><Input placeholder="예: MZ세대를 위한 비건 화장품" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                    <FormItem><FormLabel>타겟 고객</FormLabel><FormControl><Input placeholder="예: 20대 여성, 환경에 관심 많은 학생" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Bot className="mr-2" />}
                {isLoading ? '콘텐츠 생성 중...' : 'AI 콘텐츠 패키지 생성'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">AI가 소셜 미디어 콘텐츠를 제작하고 있습니다...</p>
        </div>
      )}

      {analysisResult && (
        <Tabs defaultValue="instagram">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="instagram">인스타그램</TabsTrigger>
                <TabsTrigger value="facebook">페이스북</TabsTrigger>
                <TabsTrigger value="blog">블로그</TabsTrigger>
                <TabsTrigger value="calendar">콘텐츠 캘린더</TabsTrigger>
            </TabsList>
            <TabsContent value="instagram">
                <ContentCard title="인스타그램 콘텐츠" platform="instagram" {...analysisResult.instagram} />
            </TabsContent>
            <TabsContent value="facebook">
                 <ContentCard title="페이스북 콘텐츠" platform="facebook" {...analysisResult.facebook} />
            </TabsContent>
            <TabsContent value="blog">
                <Card>
                    <CardHeader><CardTitle>블로그 콘텐츠 아이디어</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <h4 className="font-semibold mb-1">블로그 포스트 제목</h4>
                            <p className="text-sm p-3 bg-secondary rounded-md">{analysisResult.blog.title}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">상세 목차</h4>
                            <div className="text-sm p-3 bg-secondary rounded-md whitespace-pre-wrap">{analysisResult.blog.outline}</div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="calendar">
                <Card>
                    <CardHeader><CardTitle>주간 콘텐츠 캘린더</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysisResult.weeklyCalendar.map(item => (
                                <div key={item.day} className="p-3 border rounded-md">
                                    <p className="font-bold">{item.day}</p>
                                    <p className="text-sm font-semibold text-primary">{item.theme}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.idea}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
