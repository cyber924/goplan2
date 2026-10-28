'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const organizations = [
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: 'K-Startup (케이-스타트업)',
    description: '대한민국 창업지원 포털. 예비, 초기, 도약 등 성장단계별 지원사업 정보와 온라인 창업교육을 제공합니다.',
    href: 'https://www.k-startup.go.kr/',
  },
    {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '중소기업 기술개발사업 종합관리시스템 (SMTECH)',
    description: '중소벤처기업부의 기술개발(R&D) 사업을 공고하고 과제를 관리하는 통합 시스템입니다.',
    href: 'https://www.smtech.go.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '범부처통합연구지원시스템 (IRIS)',
    description: '국가 R&D 과제를 신청하고 관리하는 통합 시스템. 모든 정부 R&D 과제 공고를 한눈에 볼 수 있습니다.',
    href: 'https://www.iris.go.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '창업진흥원 (KISED)',
    description: '기술혁신형 창업기업 육성을 위한 핵심 기관. 초기창업패키지, 창업도약패키지 등 주요 사업을 운영합니다.',
    href: 'https://www.kised.or.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '기업마당',
    description: '중소기업을 위한 종합 정책 정보 제공 사이트. 각종 지원사업, 교육, 컨설팅 정보를 확인할 수 있습니다.',
    href: 'https://www.bizinfo.go.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '중소벤처기업24',
    description: '중소벤처기업을 위한 다양한 정책과 지원사업을 안내하는 포털. 온라인으로 민원을 신청하고 처리할 수 있습니다.',
    href: 'https://www.smes.go.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '한국산업기술기획평가원 (KEIT)',
    description: '산업 핵심기술 R&D 과제를 기획, 평가, 관리하는 산업통상자원부 산하 전문 기관입니다.',
    href: 'https://www.keit.re.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '한국콘텐츠진흥원 (KOCCA)',
    description: '방송, 게임, 애니메이션, 캐릭터, 음악 등 모든 콘텐츠 장르의 기획, 제작, 유통, 해외진출을 지원합니다.',
    href: 'https://www.kocca.kr/',
  },
    {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '정보통신기획평가원 (IITP)',
    description: 'AI, 5G, 블록체인 등 ICT 분야 국가 R&D 사업을 총괄하는 기관으로, IT 기술 과제 수행 시 필수적입니다.',
    href: 'https://www.iitp.kr/',
  },
  {
    icon: <Globe className="w-8 h-8 text-[#0b50d0]" />,
    title: '나라장터 (국가종합전자조달)',
    description: '공공기관의 모든 물품, 공사, 용역 입찰 정보를 확인할 수 있는 국가 조달 시스템입니다.',
    href: 'https://www.g2b.go.kr/',
  },
];

export default function RelatedOrganizationsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-white border-2 border-[#0b50d0] text-[#0b50d0] px-4 py-1.5 rounded-full text-xs font-bold shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] mb-4">
               공공 데이터 및 정책 가이드
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-[#0b2447]">
              R&D 및 창업 관련 주요 사이트
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-[#475069] md:text-xl">
              사업 계획과 정부 과제 준비에 도움이 되는 필수 사이트들을 모았습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {organizations.map((org) => (
              <Card key={org.title} className="flex flex-col border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 bg-white">
                <CardHeader className="flex-row items-start gap-4 p-8">
                  <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-xl flex-shrink-0">
                    {org.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-[#0b2447]">{org.title}</CardTitle>
                    <CardDescription className="mt-2 text-[#475069] leading-relaxed">{org.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                </CardContent>
                <div className="p-8 pt-0">
                    <Button asChild className="w-full h-12 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] hover:bg-[#1463ff] text-white font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] transition-all" variant="default">
                      <Link href={org.href} target="_blank" rel="noopener noreferrer">
                        공식 홈페이지 방문하기
                        <ArrowRight className="ml-2 h-4 w-4" />
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
