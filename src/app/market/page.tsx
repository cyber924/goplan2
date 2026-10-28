import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import MarketCard from '@/components/market/market-card';
import { ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import { getMarketItems } from '@/lib/firebase/server-fetch';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '기획안 마켓 | GOplanAI',
  description: '다른 창업가들의 성공적인 사업 기획안을 둘러보고 나만의 인사이트를 얻어보세요. 합격 가능성 분석이 완료된 고품질 기획안이 가득합니다.',
};

// 캐시 재갱신 주기를 1시간(3600초)으로 설정
export const revalidate = 3600; 

export default async function MarketPage() {
  const items = await getMarketItems(48);

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          {/* Market Hero */}
          <div className="text-center mb-16 space-y-4">
            <span className="inline-flex items-center gap-2 bg-white border-2 border-[#0b50d0] text-[#0b50d0] px-4 py-1.5 rounded-full text-xs font-black shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]">
              <ShoppingBag className="w-3 h-3" />
              GLOBAL PLANNING MARKET
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-[#0b2447] tracking-tight">
              성공을 부르는 <span className="text-[#0b50d0] relative inline-block">비즈니스 기획 마켓<span className="absolute left-0 right-0 bottom-1 h-3 bg-[#1463ff]/10 -z-10 rounded-sm" /></span>
            </h1>
            <p className="text-lg text-[#475069] max-w-2xl mx-auto font-bold">
              다른 창업가들은 어떤 아이디어를 가지고 있을까요? <br />
              실제 발행된 기획안을 둘러보고 나만의 인사이트를 얻어보세요.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 mb-12 py-6 border-y-2 border-[#e2e8f4]">
             <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-500 w-5 h-5" />
                <span className="text-sm font-black text-[#0b2447]">합격 가능성 분석 완료</span>
             </div>
             <div className="flex items-center gap-2">
                <TrendingUp className="text-[#00b8d9] w-5 h-5" />
                <span className="text-sm font-black text-[#0b2447]">최신 트렌드 반영 기획안</span>
             </div>
          </div>

          {/* Items Grid */}
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map((item: any) => (
                <MarketCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 border-[4px] border-dashed border-[#0b50d0] rounded-[32px] bg-white">
               <ShoppingBag className="w-16 h-16 text-[#7b86a0] mx-auto mb-4 opacity-20" />
               <h3 className="text-2xl font-black text-[#0b2447]">현재 등록된 기획안이 없습니다.</h3>
               <p className="text-[#475069] font-bold mt-2">첫 번째로 멋진 기획안을 발행해 보세요!</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
