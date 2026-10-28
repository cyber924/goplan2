'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ImageIcon, Loader2, Sparkles, ImageOff, ArrowLeft, Save, LayoutGrid, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { generateImage } from '@/ai/flows/generate-image';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { compressImage } from '@/lib/image-compression';
import DbImageGallery from '@/components/common/db-image-gallery';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const PROMPT_CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'TECH', label: 'AI/IT SaaS' },
  { id: 'COMMERCE', label: '이커머스/유통' },
  { id: 'LOCAL', label: '소상공인/F&B' },
  { id: 'EDU', label: '교육/에듀테크' },
  { id: 'CONTENT', label: '콘텐츠/미디어' },
];

const RECOMMENDED_PROMPTS = [
  {
    category: 'TECH',
    title: '스타트업 IT 협업 사무실',
    description: '대표이사 및 개발자들이 통유리창 너머 시티뷰 사무실에서 최신 모니터들과 대형 화이트보드(R&D 아키텍처 다이어그램 포함)를 보며 협업하는 전문적이고 활기찬 분위기',
    prompt: '현대적인 시티뷰 사무실에서 협업하는 스타트업 IT 팀의 모습, 대형 화이트보드에 정교한 AI 아키텍처 다이어그램이 그려져 있고, 은은한 자연광, 시네마틱 조명, 프로페셔널, 8k, photorealistic'
  },
  {
    category: 'TECH',
    title: 'AI 클라우드 서버 데이터 센터',
    description: '바이올렛과 네온 블루 LED 조명이 화려하게 빛나는 최첨단 고성능 신경망 연산 인공지능 슈퍼컴퓨터 서버 랙 전경',
    prompt: '고성능 인공지능 신경망 데이터 센터 및 스마트 클라우드 서버 랙, 네온 블루와 바이올렛 LED 조명, 사이버펑크 느낌, 초현실주의, 정밀함, photorealistic, 8k'
  },
  {
    category: 'COMMERCE',
    title: '스마트 물류/풀필먼트 창고',
    description: '자율주행 물류 로봇(AGV)들이 정밀하게 박스 패키지들을 고속 분류 및 운반하고 있는 최신형 미래지향적 스마트 자동화 물류 창고',
    prompt: '최신 자동화 설비를 갖춘 이커머스 스마트 물류 창고, 자율주행 물류 로봇(AGV)들이 정밀하게 박스를 운반하고 있고, 쾌적하고 미래지향적인 분위기, 광각 렌즈, photorealistic, 4k'
  },
  {
    category: 'COMMERCE',
    title: 'PB 브랜드 에코 패키지 디자인',
    description: '고급 크라프트 종이 질감의 D2C 패션 의류 브랜드 상자 포장 패키지와 세련된 라벨 타이포그래피 스튜디오 제품 샷',
    prompt: '모던한 미니멀 디자인의 D2C 패션 브랜드 박스 포장 패키지 제품 샷, 고급스러운 종이 질감, 따뜻한 웜톤 배경, 스튜디오 하이라이트 조명, photorealistic, 8k'
  },
  {
    category: 'LOCAL',
    title: '그리너리 친환경 카페 인테리어',
    description: '밝은 우드 질감 테이블과 풍성한 플랜테리어가 조화를 이루어 웰빙 감성을 자극하는 아늑한 소상공인 디저트 카페 전경',
    prompt: '감각적인 우드와 식물이 조화를 이루는 아늑한 친환경 웰빙 디저트 카페 매장 인테리어, 넓은 통유리창으로 비치는 따뜻한 오후 햇살, 평화로운 분위기, photorealistic, 8k'
  },
  {
    category: 'LOCAL',
    title: '고급 퓨전 한식 파인다이닝',
    description: '대리석 테이블 위에 극강의 클로즈업 샷으로 표현된 시그니처 퓨전 한식 7코스 플레이팅 요리와 정교한 음식 질감',
    prompt: '정갈하고 고급스럽게 플레이팅된 퓨전 한식 코스 요리 시그니처 메뉴, 대리석 테이블 위, 디테일한 음식 질감 표현, 클로즈업 샷, photorealistic, 8k'
  },
  {
    category: 'EDU',
    title: '온라인 에듀테크 비대면 클래스',
    description: '학생들이 스마트 디바이스 화면 속 가상 선생님과 재미있는 인터랙티브 코딩 및 영어 학습 게임을 즐기는 모습의 세련된 3D 일러스트',
    prompt: '화면을 통해 학생들이 실시간 라이브 화상 과외 및 코딩 교육을 즐겁게 듣고 있는 세련된 교육 플랫폼 화면 및 학습 공간, 3D 일러스트 스타일, 밝고 활기찬 분위기'
  },
  {
    category: 'EDU',
    title: '프라이빗 스마트 스터디 공간',
    description: '스마트 태블릿과 모던한 오거나이저가 정돈된 프라이빗 아늑한 독서실 데스크, 따뜻하고 감성적인 조명 연출',
    prompt: '교재와 스마트 패드가 펼쳐져 있는 안락한 독서실 및 프라이빗 스터디 공간, 아늑한 데스크 램프 불빛, 집중력 높은 분위기, 감성적인 톤, photorealistic, 8k'
  },
  {
    category: 'CONTENT',
    title: '원천 IP 브랜드 팝업 스토어',
    description: '팬덤들이 웹툰 피규어, 캐릭터 포스터 등 한정판 굿즈를 신나게 구경하고 결제하기 위해 줄을 서 있는 트렌디한 팝업 마켓 현장',
    prompt: '다양한 캐릭터 굿즈와 화려한 포스터들이 세련되게 진열되어 있는 IP 브랜드 팝업 스토어 현장, 활짝 웃고 있는 유저들의 뒷모습, 생동감 넘치는 조명, photorealistic, 8k'
  },
  {
    category: 'CONTENT',
    title: '콘텐츠/미디어 유튜브 스튜디오',
    description: '네온 간판, 프로급 카메라, 대형 마이크, 화려한 LED 배경 스크린이 세팅된 쾌적하고 감각적인 콘텐츠 크리에이터의 1인 방송 스튜디오 전경',
    prompt: '최첨단 카메라와 조명, 블루스크린이 정밀하게 장착된 버추얼 콘텐츠 유튜브 방송 스튜디오 전경, 프로페셔널 프로덕션 현장 느낌, photorealistic, 8k'
  }
];

const formSchema = z.object({
  prompt: z.string().min(10, { message: '최소 10자 이상 구체적으로 입력해주세요.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ImageGenerationFeature() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [selectedPromptCategory, setSelectedPromptCategory] = useState('ALL');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '현대적인 사무실에서 협업하는 스타트업 팀의 모습, 따뜻한 햇살, 시네마틱 조명',
    },
  });

  useEffect(() => {
    if (!user) {
        router.push('/login?redirect=/ai-features/image-generation');
    }
  }, [user, router]);

  const handleGenerateImage = async (values: FormValues) => {
    if (!user) return;
    
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }
    
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const result = await generateImage({ prompt: values.prompt });
      setGeneratedImage(result.imageUrl);
      toast({ title: '이미지 생성 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: '이미지 생성 실패' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!generatedImage || !user) return;
    
    setIsSaving(true);
    try {
      const compressedUri = await compressImage(generatedImage, 300);
      
      const imageData = {
        imageUrl: compressedUri,
        prompt: form.getValues('prompt'),
        userId: user.uid,
        createdAt: serverTimestamp(),
      };
      
      addDoc(collection(db, 'public_images'), imageData)
        .then(() => {
          toast({ title: '갤러리 저장 완료', description: 'DB에 압축되어 안전하게 보관되었습니다.' });
          setIsSaving(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: 'public_images',
            operation: 'create',
            requestResourceData: imageData,
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsSaving(false);
        });
    } catch (error) {
      toast({ variant: 'destructive', title: '저장 실패', description: '이미지 처리 중 오류가 발생했습니다.' });
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `goplanai-${Date.now()}.png`;
      link.click();
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="outline" asChild className="mb-2 border-2 border-[#0b50d0] rounded-xl font-bold">
          <Link href="/ai-features"><ArrowLeft className="mr-2 h-4 w-4"/> AI 기능 목록으로</Link>
      </Button>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/50 border-2 border-[#e2e8f4] p-1 rounded-xl h-auto mb-8">
          <TabsTrigger value="generate" className="rounded-lg font-black px-8 py-3 data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" /> 이미지 생성
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-lg font-black px-8 py-3 data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white shadow-sm">
            <LayoutGrid className="w-4 h-4 mr-2" /> 내 DB 갤러리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] bg-white overflow-hidden">
            <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
              <div className="flex items-center gap-4">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-xl">
                  <ImageIcon className="w-10 h-10 text-[#0b50d0]" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black text-[#0b2447]">AI 이미지 생성</CardTitle>
                  <CardDescription className="text-lg font-bold text-[#475069]">아이디어를 시각화하고 DB에 저장하여 언제든 꺼내 쓰세요.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleGenerateImage)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <FormLabel className="text-xl font-black text-[#0b2447] m-0">이미지 프롬프트</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsPromptModalOpen(true)}
                              className="border-2 border-[#0b50d0] rounded-xl h-9 px-3 text-xs font-black text-[#0b50d0] hover:bg-[#e8f0ff] transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Lightbulb className="w-3.5 h-3.5 text-[#0b50d0]" />
                              ✨ AI 추천 프롬프트 선택
                            </Button>
                          </div>
                          <FormControl>
                            <Textarea 
                                placeholder="생성하고 싶은 이미지를 상세히 설명하세요..." 
                                rows={6} 
                                className="text-base border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-medium" 
                                {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="lg" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6" />}
                      {isLoading ? '이미지 그리는 중...' : '이미지 생성하기'}
                    </Button>
                  </form>
                </Form>

                <div className="space-y-6">
                  <p className="text-xl font-black text-[#0b2447]">미리보기</p>
                  <div className="aspect-square w-full rounded-2xl border-[3px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] bg-[#f4f7fc] flex items-center justify-center relative overflow-hidden">
                    {isLoading ? (
                      <div className="text-center">
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-[#0b50d0]" />
                        <p className="mt-4 font-bold text-[#475069]">AI 아티스트가 작업 중입니다...</p>
                      </div>
                    ) : generatedImage ? (
                      <Image src={generatedImage} alt="Preview" layout="fill" objectFit="cover" unoptimized />
                    ) : (
                      <div className="text-center text-[#7b86a0]">
                        <ImageOff className="w-16 h-16 mx-auto opacity-20 mb-4" />
                        <p className="font-bold">프롬프트를 입력하고 생성 버튼을 누르세요.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        className="flex-1 h-14 border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff]" 
                        disabled={!generatedImage || isLoading} 
                        onClick={handleDownload}
                    >
                      <Download className="mr-2" /> 다운로드
                    </Button>
                    <Button 
                        className="flex-1 h-14 bg-[#0b50d0] border-2 border-[#0b2447] rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)]" 
                        disabled={!generatedImage || isLoading || isSaving} 
                        onClick={handleSaveToDb}
                    >
                      {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                      {isSaving ? '압축 저장 중...' : 'DB 갤러리에 저장'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <DbImageGallery />
        </TabsContent>
      </Tabs>

      {/* AI Suggested Prompts Selection Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="sm:max-w-2xl border-3 border-[#0b2447] bg-white rounded-[24px] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] z-[100] max-h-[80vh] flex flex-col p-6">
          <DialogHeader className="p-1 pb-2 flex-shrink-0">
            <DialogTitle className="text-2xl font-black font-headline text-[#0b2447] flex items-center gap-2">
              <Lightbulb className="text-amber-500 fill-amber-100" />
              추천 이미지 프롬프트 선택
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7b86a0] font-bold">
              현재 작성 중인 사업계획서(예창패, 도창패, AI, 커머스 등)에 필요한 시각자료Presest 프롬프트를 원터치로 선택해 보세요.
            </DialogDescription>
          </DialogHeader>

          {/* Categories bar */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#e8f0ff]/50 border-2 border-[#0b50d0] rounded-xl mb-4 flex-shrink-0">
            {PROMPT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedPromptCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  selectedPromptCategory === cat.id
                    ? 'bg-[#0b50d0] text-white shadow-sm'
                    : 'text-[#0b2447] hover:bg-[#0b50d0]/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px]">
            {RECOMMENDED_PROMPTS.filter(p => selectedPromptCategory === 'ALL' || p.category === selectedPromptCategory).map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  form.setValue('prompt', item.prompt);
                  setIsPromptModalOpen(false);
                  toast({ title: '프롬프트 선택 완료', description: '텍스트 입력란에 추천 프롬프트가 주입되었습니다.' });
                }}
                className="p-4 border-2 border-[#0b50d0] rounded-xl bg-white hover:bg-[#e8f0ff]/20 hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-[#e8f0ff] border border-[#0b50d0] text-[#0b50d0] text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                    {PROMPT_CATEGORIES.find(c => c.id === item.category)?.label}
                  </span>
                  <Button size="sm" className="bg-[#0b50d0] border border-[#0b2447] text-white text-[10px] font-black h-7 rounded px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    프롬프트 사용하기
                  </Button>
                </div>
                <h4 className="font-black text-sm text-[#0b2447] mt-2 group-hover:text-[#0b50d0] transition-colors">{item.title}</h4>
                <p className="text-xs text-[#475069] mt-1 leading-relaxed font-bold">{item.description}</p>
                <div className="bg-[#f4f7fc] border border-[#e2e8f4] p-3 rounded-lg mt-3">
                  <p className="text-[10px] text-[#0b2447] font-medium leading-relaxed italic">
                    "{item.prompt}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
