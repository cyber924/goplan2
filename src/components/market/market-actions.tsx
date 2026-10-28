'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function MarketActions({ item }: { item: any }) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const handleTryTemplate = () => {
    // 비로그인 상태인 경우 로그인 페이지로 유도 (현재 페이지로 돌아올 수 있게 리디렉션 경로 포함)
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '이 기획안으로 작업을 시작하려면 로그인이 필요합니다.',
      });
      router.push(`/login?redirect=/market/${item.id}`);
      return;
    }

    // 세션 스토리지에 데이터를 임시 저장하고 템플릿 선택으로 유도
    sessionStorage.setItem('initial-plan-data', JSON.stringify({
        title: `(마켓참조) ${item.title}`,
        businessIdea: item.businessIdea,
    }));
    router.push('/templates');
    toast({ title: '데이터 로드 완료', description: '이 기획안을 바탕으로 나만의 기획서를 만들어보세요!' });
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border-[3px] border-[#0b2447] p-3.5 px-5 sm:px-6 rounded-2xl sm:rounded-full shadow-[8px_8px_0px_0px_rgba(11,36,71,0.2)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 print:hidden">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-full bg-[#e8f0ff] border-2 border-[#0b50d0] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#0b50d0]" />
        </div>
        <div>
          <p className="text-[10px] font-black text-[#0b50d0] uppercase tracking-wider">
            INSPIRED BY THIS PLAN?
          </p>
          <p className="text-sm font-black text-[#0b2447]">
            이 아이디어로 나만의 계획서 만들기
          </p>
        </div>
      </div>
      
      <div className="w-full sm:w-auto">
        <Button 
          size="default" 
          className="w-full sm:w-auto h-11 px-7 bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black rounded-xl sm:rounded-full shadow-[3px_3px_0px_0px_rgba(11,80,208,0.2)] hover:bg-[#1463ff] transition-all hover:translate-y-[-2px] text-sm cursor-pointer"
          onClick={handleTryTemplate}
        >
          기획 시작하기 <ArrowRight className="ml-1.5 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
