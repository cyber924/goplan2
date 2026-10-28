
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, ArrowRight, FileText } from 'lucide-react';

export default function MarketCard({ item }: { item: any }) {
  const thumbnailUrl = item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/600/400`;

  return (
    <Link href={`/market/${item.id}`} className="block group">
      <Card className="flex flex-col h-full border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] group-hover:translate-y-[-6px] group-hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 rounded-[22px] overflow-hidden bg-white">
        <div className="relative aspect-video border-b-[3px] border-[#0b50d0] overflow-hidden">
          <Image 
            src={thumbnailUrl} 
            alt={item.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute top-3 left-3">
             <Badge className="bg-[#0b50d0] text-white font-black border-2 border-white shadow-md">
                {item.type === 'template' ? '사업기획' : '리포트'}
             </Badge>
          </div>
        </div>
        
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl font-black text-[#0b2447] line-clamp-2 leading-tight group-hover:text-[#0b50d0] transition-colors">
            {item.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 pt-2 flex-grow">
          <p className="text-sm font-bold text-[#475069] line-clamp-3 leading-relaxed mb-4">
             {item.businessIdea || "상세 기획 내용이 포함된 전문 보고서입니다."}
          </p>
          <div className="flex items-center justify-between text-[11px] font-bold text-[#7b86a0] border-t-2 border-[#e2e8f4] pt-4">
             <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {item.authorName || '기획자'}</span>
             <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
        
        <CardFooter className="p-0">
          <div className="w-full bg-[#f4f7fc] border-t-[3px] border-[#0b50d0] py-3 px-6 flex items-center justify-between group-hover:bg-[#e8f0ff] transition-colors">
             <span className="text-xs font-black text-[#0b50d0]">전문 읽기</span>
             <ArrowRight className="w-4 h-4 text-[#0b50d0] group-hover:translate-x-1 transition-transform" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
