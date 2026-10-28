
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, ArrowRight, MessageSquare, Megaphone, Mail, ShieldCheck, DownloadCloud, Lightbulb } from 'lucide-react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const adminFeatures = [
  {
    icon: <Users className="w-6 h-6 text-[#0b50d0]" />,
    title: '고객 관리',
    description: '사용자 정보 조회, 권한 관리, 활동 내역 모니터링 등 고객 데이터를 관리합니다.',
    href: '/admin/users', 
    isReady: true,
  },
  {
    icon: <DownloadCloud className="w-6 h-6 text-[#0b50d0]" />,
    title: '공고 수집',
    description: '외부 정부기관의 최신 공고를 크롤링하여 사이트에 게시합니다.',
    href: '/admin/scraping',
    isReady: true,
  },
  {
    icon: <Megaphone className="w-6 h-6 text-[#0b50d0]" />,
    title: '공지사항 관리',
    description: '사이트 공지사항을 작성하고 게시합니다. AI 전문 문구 생성이 가능합니다.',
    href: '/admin/announcements',
    isReady: true,
  },
  {
    icon: <Lightbulb className="w-6 h-6 text-[#0b50d0]" />,
    title: '아이디어 관리',
    description: 'IT, 법률, 제조 등 다양한 산업 트렌드별 최신 AI 추천 비즈니스 아이디어를 생성하고 배포합니다.',
    href: '/admin/ideas',
    isReady: true,
  },
  {
    icon: <Mail className="w-6 h-6 text-[#0b50d0]" />,
    title: '뉴스레터 발행',
    description: '고객들에게 보낼 뉴스레터 콘텐츠를 기획하고 발행 내역을 관리합니다.',
    href: '/admin/newsletters',
    isReady: true,
  },
  {
    icon: <Settings className="w-6 h-6 text-[#0b50d0]" />,
    title: '사이트 설정',
    description: 'AI 모델 관리, 시스템 상태 모니터링, 글로벌 사용 한도 및 서비스 모드를 설정합니다.',
    href: '/admin/settings',
    isReady: true,
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-[#0b50d0]" />,
    title: '고객 문의',
    description: '사용자들이 남긴 문의사항을 확인하고 답변을 관리합니다. (예정)',
    href: '#',
    isReady: false,
  },
];

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
             <span className="inline-flex items-center gap-2 bg-white border-2 border-[#0b50d0] text-[#0b50d0] px-4 py-1.5 rounded-full text-xs font-black shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] mb-4">
              <ShieldCheck className="w-4 h-4" />
              ADMINISTRATOR CONSOLE
            </span>
            <h1 className="text-4xl md:text-5xl font-black font-headline text-[#0b2447] tracking-tight">
              관리자 <span className="text-[#0b50d0] relative inline-block">대시보드<span className="absolute left-0 right-0 bottom-1 h-3 bg-[#1463ff]/10 -z-10 rounded-sm" /></span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base text-[#475069] font-bold">
              애플리케이션의 핵심 데이터를 관리하고 시스템 설정을 변경합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {adminFeatures.map((feature) => (
              <Card key={feature.title} className="flex flex-col border-[2.5px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 rounded-[18px] overflow-hidden bg-white">
                <CardHeader className="flex-row items-start gap-3 p-5">
                  <div className="bg-[#e8f0ff] border-[1.5px] border-[#0b50d0] p-2.5 rounded-xl flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-[#0b2447]">{feature.title}</CardTitle>
                    <CardDescription className="mt-1.5 text-xs font-bold text-[#475069] leading-relaxed">{feature.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                </CardContent>
                <div className="p-5 pt-0">
                    <Button asChild className="w-full h-11 rounded-lg bg-[#0b50d0] border-[2px] border-[#0b2447] hover:bg-[#1463ff] text-white text-xs font-black shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all" disabled={!feature.isReady}>
                      <Link href={feature.isReady ? feature.href : '#'}>
                        {feature.isReady ? '기능 열기' : '준비 중'}
                        {feature.isReady && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Link>
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
