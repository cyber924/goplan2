'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Share2, Check, Download, Bookmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MarketDetailHeaderActions({ title }: { title: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast({ title: '링크 복사 완료', description: '기획서 URL이 클립보드에 복사되었습니다.' });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      // User cancelled share or clipboard fallback
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="h-9 px-3.5 rounded-xl border-2 border-[#0b50d0] text-[#0b50d0] hover:bg-[#e8f0ff] font-bold text-xs shadow-sm cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
        {copied ? '복사됨' : '공유하기'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="h-9 px-3.5 rounded-xl border-2 border-[#0b2447] bg-white text-[#0b2447] hover:bg-[#f4f7fc] font-bold text-xs shadow-sm cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5 mr-1" />
        인쇄 / PDF 저장
      </Button>
    </div>
  );
}
