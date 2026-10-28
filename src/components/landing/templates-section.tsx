'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { templates } from '@/lib/templates';

interface TemplatesSectionProps {
    onTemplateClick: (e: React.MouseEvent, href: string) => void;
}

export default function TemplatesSection({ onTemplateClick }: TemplatesSectionProps) {

  return (
    <section id="templates" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">다양한 템플릿 보기</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            어떤 목적이든, GOplanAI의 전문적인 템플릿으로 시작하세요.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {templates.map((template) => (
            <Link key={template.title} href={template.href} onClick={(e) => onTemplateClick(e, template.href)} className="block h-full">
                <Card className="overflow-hidden group border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 h-full flex flex-col bg-white">
                <div className="relative aspect-video border-b-[3px] border-[#0b50d0]">
                    <Image src={template.image} alt={template.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" data-ai-hint={template.aiHint} />
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold font-headline text-[#0b2447]">{template.title}</h3>
                    <p className="mt-2 text-[#475069] h-12 flex-grow text-sm leading-relaxed">{template.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-[#e8f0ff] border-[#0b50d0] text-[#0b50d0] font-bold">{tag}</Badge>
                    ))}
                    </div>
                    <div className="mt-6 pt-4 border-t-2 border-[#e2e8f4] flex items-center text-[#0b50d0] font-bold text-sm">
                      자세히 보기 <ArrowRight className="ml-2 w-4 h-4" />
                    </div>
                </CardContent>
                </Card>
            </Link>
          ))}
        </div>
        <div className="mt-16 text-center">
            <Button variant="outline" size="lg" asChild className="h-14 px-10 rounded-xl border-[3px] border-[#0b50d0] text-[#0b50d0] font-bold hover:bg-[#f4f7fc] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)]">
                <Link href="/ai-features">
                    모든 AI 기능 보기 <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
