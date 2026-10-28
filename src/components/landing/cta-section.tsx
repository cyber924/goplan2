
'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CtaSection() {
  return (
    <section id="cta" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">
          당신의 아이디어를 현실로 만들 준비가 되셨나요?
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          GOplanAI와 함께라면 복잡한 사업 계획서 작성이 쉬워집니다. 지금 바로 당신의 비전을 구체적인 계획으로 만들어보세요.
        </p>
        <div className="mt-8">
          <Button size="lg" className="rounded-xl px-8 py-6 text-lg" asChild>
            <Link href="/templates">
                지금 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
