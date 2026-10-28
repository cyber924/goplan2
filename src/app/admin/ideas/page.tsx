'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Lightbulb, Plus, Trash2, Sparkles, Check, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'IT', label: 'IT/SaaS' },
  { id: 'LEGAL', label: '법률/공공' },
  { id: 'MANUFACTURING', label: '제조/IoT' },
  { id: 'LOGISTICS', label: '유통/물류' },
  { id: 'SERVICE', label: '서비스/생활' },
];

const INITIAL_SEEDS = [
  {
    category: 'IT',
    title: 'AI 기반 개인화 학습 경로 추천 SaaS 플랫폼',
    description: '개별 학습자의 학습 상태, 취약 영역, 선호 스타일을 종합 분석하여 최적의 추천 학습 경로를 정렬하는 AI 솔루션입니다. 불필요한 반복 낭비를 배제하고 핵심 핵심 역량 성취에 즉시 집중하도록 돕습니다.',
    targetEfficiency: '학생들의 학습 효율을 20% 향상시키는 것을 목표로 합니다.',
    trendingTags: ['인공지능', '에듀테크', 'SaaS', '개인화'],
  },
  {
    category: 'LEGAL',
    title: 'AI 기반 소상공인 맞춤형 근로계약 노무 리스크 분석 리걸테크',
    description: '소상공인이 작성한 수동 노무 계약서를 실시간 파싱하여 최신 노동법 위반 여부를 점검하고, 리스크를 등급화하여 올바른 조항을 제안해 주는 완전 자동화 자문 봇 서비스입니다.',
    targetEfficiency: '노무 법적 분쟁 리스크를 95% 이상 방어하는 것을 타겟으로 합니다.',
    trendingTags: ['리걸테크', '자동화', '노무관리', '소상공인'],
  },
  {
    category: 'MANUFACTURING',
    title: '정밀 제조 공정 기계 고장 예지 보전 AI IoT 센서 모니터링',
    description: '공장 모터 및 진동 축 센서 데이터를 실시간 스트리밍 분석하여, 미세 주파수 어긋남이나 비정상 과열이 발생할 시 부품 교체 시점을 최대 2주 전 예견해 주는 차세대 스마트 팩토리 감지 시스템입니다.',
    targetEfficiency: '공장 생산 라인 다운타임(정지 시간)을 40% 단축하는 목표를 둡니다.',
    trendingTags: ['스마트팩토리', 'IoT', '제조혁신', '기계학습'],
  },
  {
    category: 'LOGISTICS',
    title: '스마트 물류 콜드체인 실시간 식자재 신선 보존 제어 최적화',
    description: '다차원 기온/습도 복합 환경 센서를 수송 트럭에 연동하여, 이동 중 실시간 변동을 연산하고 식자재가 부패점 임계치에 도달하지 않도록 실시간 에어컨을 AI로 피드백 조절하는 지능형 콜드체인 플랫폼입니다.',
    targetEfficiency: '수송 도중 신선 신선 폐기 손실율을 15% 이하로 보전합니다.',
    trendingTags: ['물류SaaS', '콜드체인', '신선배송', '최적화'],
  },
  {
    category: 'SERVICE',
    title: '시니어 전문 일대일 AI 동행 라이프 매칭 모바일 플랫폼',
    description: '초고령 사회 진입에 맞추어 실버 세대의 진료 예약, 일상 쇼핑, 여가 파트너 매칭을 돕고, 실시간 동선 안정을 모니터링하여 보호자에게 실시간 심리 상태 알림을 전송하는 모바일 매칭 서비스입니다.',
    targetEfficiency: '시니어의 일상 고독감 해소 및 이동 편의를 50% 개선하는 것을 목표합니다.',
    trendingTags: ['시니어케어', '헬스케어', '매칭서비스', '생활편의'],
  }
];

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const fetchIdeas = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'system_ideas'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // 클라이언트 사이드 자바스크립트 정렬 (createdAt 역순)
      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      // 클라이언트 사이드 카테고리 필터링
      const filteredList = selectedCategory === 'ALL'
        ? list
        : list.filter(idea => idea.category === selectedCategory);

      setIdeas(filteredList);
    } catch (error) {
      console.error('아이디어 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/admin/ideas');
      return;
    }
    
    const checkAdmin = async () => {
      const isAdminUser = user.email === 'cyber924@naver.com' || user.email === 'sungbaep296@gmail.com';
      if (!isAdminUser) {
        toast({ variant: 'destructive', title: '권한 없음', description: '이 페이지는 관리자만 이용할 수 있습니다.' });
        router.push('/');
        return;
      }
      await fetchIdeas();
    };

    checkAdmin();
  }, [selectedCategory, user]);

  const handleGenerate = async () => {
    const targetCat = selectedCategory === 'ALL' ? 'IT' : selectedCategory;
    setIsGenerating(true);
    toast({ title: 'AI 아이디어 탐색 시작', description: `${selectedModel} 모델을 가동하여 ${targetCat} 분야 혁신 비즈니스 모델을 기획 중입니다...` });
    
    try {
      const res = await fetch('/api/gemini/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: targetCat, model: selectedModel }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        // Save to Firestore on the Client-side using active Admin auth session
        const ideasCol = collection(db, 'system_ideas');
        for (const idea of data.ideas) {
          await addDoc(ideasCol, {
            ...idea,
            createdAt: serverTimestamp(),
          });
        }
        toast({ title: 'AI 대량 생성 및 DB 저장 성공!', description: `${targetCat} 분야 5개의 초고부가가치 아이디어가 추가 적재되었습니다.` });
        await fetchIdeas();
      } else {
        throw new Error(data.error || '생성 도중 서버 응답 실패');
      }
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: '생성 실패', description: err.message || '아이디어 생성 도중 오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const ideasCol = collection(db, 'system_ideas');
      for (const seed of INITIAL_SEEDS) {
        await addDoc(ideasCol, {
          ...seed,
          createdAt: serverTimestamp(),
        });
      }
      toast({ title: '초기 프리미엄 시드 배포 완료', description: '총 5개의 고가치 비즈니스 템플릿 아이디어가 DB에 영구 세팅되었습니다!' });
      await fetchIdeas();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: '시딩 실패', description: '초기 데이터 저장에 실패했습니다.' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 비즈니스 아이디어를 영구 삭제하시겠습니까? 데이터베이스에서 즉각 제외되며 사용자 추천 풀에서도 제외됩니다.')) return;
    try {
      await deleteDoc(doc(db, 'system_ideas', id));
      toast({ title: '아이디어 제외 완료', description: 'DB에서 성공적으로 영구 삭제되었습니다.' });
      setIdeas(prev => prev.filter(idea => idea.id !== id));
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: '삭제 실패', description: '데이터를 삭제하는 중 오류가 발생했습니다.' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push('/admin')} className="border-2 border-[#0b50d0] rounded-xl h-11 w-11 shadow-[3px_3px_0px_0px_rgba(11,80,208,0.1)]">
                <ArrowLeft className="w-5 h-5 text-[#0b50d0]" />
              </Button>
              <div>
                <h1 className="text-3xl font-black font-headline text-[#0b2447] flex items-center gap-2">
                  <Lightbulb className="text-amber-500 fill-amber-100" />
                  아이디어 기획 관리
                </h1>
                <p className="text-xs font-bold text-[#7b86a0] mt-1">사용자 사업계획서 작성을 서포트하는 추천 BM 제어 패널</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isGenerating || isSeeding}
                className="bg-white border-[2.5px] border-[#0b2447] text-[#0b2447] font-black text-xs h-11 px-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] outline-none focus:ring-0 focus-visible:ring-0 cursor-pointer"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (최신 속도 모델)</option>
                <option value="gemini-3.5-pro">Gemini 3.5 Pro (최신 기획 모델)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (심층 추론 모델)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (속도형 일반 모델)</option>
              </select>

              {ideas.length === 0 && (
                <Button 
                  onClick={handleSeedDefaults} 
                  disabled={isSeeding || isGenerating}
                  className="bg-white border-[2.5px] border-[#0b2447] text-[#0b2447] hover:bg-gray-50 font-black text-xs h-11 rounded-xl shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  초기 대표시드 수동 배포
                </Button>
              )}
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || isSeeding}
                className="bg-[#0b50d0] border-[2.5px] border-[#0b2447] hover:bg-[#1463ff] text-white font-black text-xs h-11 rounded-xl shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {selectedCategory === 'ALL' ? 'IT 분야 AI 아이디어 5개 생성' : `${CATEGORIES.find(c => c.id === selectedCategory)?.label} AI 신규 아이디어 생성`}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1.5 bg-[#e8f0ff]/50 border-2 border-[#0b50d0] rounded-2xl mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#0b50d0] border-[2px] border-[#0b2447] text-white shadow-[3px_3px_0px_0px_rgba(11,36,71,0.15)]'
                    : 'text-[#0b2447] hover:bg-[#0b50d0]/10 border-[2px] border-transparent'
                }`}
              >
                {cat.id === 'ALL' ? <Filter className="w-3.5 h-3.5" /> : null}
                {cat.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#7b86a0]">
              <Loader2 className="w-12 h-12 animate-spin text-[#0b50d0] mb-4" />
              <p className="font-bold text-sm">데이터베이스에서 수집 정보를 읽어오는 중입니다...</p>
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center border-3 border-dashed border-[#ccc] bg-white rounded-3xl p-16">
              <Lightbulb className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-black text-[#0b2447]">아직 적재된 비즈니스 아이디어가 없습니다.</h3>
              <p className="text-xs text-[#7b86a0] font-bold mt-2 max-w-sm mx-auto">
                우측 상단의 생성 버튼을 눌러 AI 브레인스토밍을 가동하거나 초기 5대 대표 시드를 일괄 배포하여 DB를 채워주세요!
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <Button onClick={handleSeedDefaults} disabled={isSeeding} className="bg-white border-2 border-[#0b2447] text-[#0b2447] hover:bg-gray-50 h-10 font-bold text-xs rounded-xl shadow-sm">
                  기본 대표시드 5종 수동 세팅
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating} className="bg-[#0b50d0] border-2 border-[#0b2447] hover:bg-[#1463ff] h-10 font-bold text-xs text-white rounded-xl shadow-sm">
                  IT 분야 AI 생성 돌려보기
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {ideas.map((idea) => (
                <Card key={idea.id} className="relative overflow-hidden border-[2.5px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.06)] rounded-2xl bg-white transition-all hover:translate-y-[-2px]">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#e8f0ff] border border-[#0b50d0] text-[#0b50d0] text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                          {CATEGORIES.find(c => c.id === idea.category)?.label}
                        </span>
                        <span className="text-[10px] text-[#7b86a0] font-black">
                          {idea.createdAt ? new Date(idea.createdAt.seconds * 1000).toLocaleDateString() : '방금 생성'}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(idea.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-xl font-black text-[#0b2447] mt-3 leading-snug">{idea.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <p className="text-xs text-[#475069] leading-relaxed font-bold">{idea.description}</p>
                    
                    <div className="bg-secondary/40 border border-[#e2e8f4] p-3 rounded-xl mt-4">
                      <p className="text-[11px] text-[#0b2447] font-black flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <strong>목표 지표:</strong> {idea.targetEfficiency}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {idea.trendingTags?.map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] text-[#7b86a0] font-black bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
