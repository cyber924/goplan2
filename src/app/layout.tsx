
import type {Metadata} from 'next';
import './globals.css';
import AuthProviderClient from '@/contexts/auth-provider-client';

export const metadata: Metadata = {
  title: {
    default: 'GOplanAI | AI 정부지원사업 사업계획서 작성 지원 솔루션',
    template: '%s | GOplanAI'
  },
  description: 'GOplanAI는 정부지원사업 평가 기준에 맞춰, 당신의 빛나는 아이디어를 전문가 수준의 사업계획서로 빠르고 정확하게 완성해 드리는 AI 솔루션입니다. 예비창업패키지, 초기창업패키지, 창업도약패키지 맞춤형 템플릿을 제공합니다.',
  keywords: ['사업계획서 AI', '정부지원사업 합격', '예비창업패키지 양식', '초기창업패키지', '창업도약패키지', 'AI 문서 자동화', '비즈니스 기획'],
  authors: [{ name: 'FOUND Inc.' }],
  viewport: 'width=device-width, initial-scale=1',
  verification: {
    // 구글 서치 콘솔에서 발급받은 인증 코드를 여기에 넣으세요
    google: 'GOOGLE_SITE_VERIFICATION_CODE_HERE',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://goplanai.co.kr',
    title: 'GOplanAI | AI 사업계획서 작성 도우미',
    description: '아이디어를 9분 만에 합격하는 사업계획서로 만드세요.',
    siteName: 'GOplanAI',
    images: [
      {
        url: 'https://picsum.photos/seed/goplanai-og/1200/630',
        width: 1200,
        height: 630,
        alt: 'GOplanAI 서비스 소개',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GOplanAI | AI 사업계획서 자동화',
    description: '전문가 수준의 사업계획서, 이제 AI와 함께 쉽고 빠르게 완성하세요.',
    images: ['https://picsum.photos/seed/goplanai-og/1200/630'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="canonical" href="https://goplanai.co.kr" />
      </head>
      <body className="font-body antialiased">
        <AuthProviderClient>
          {children}
        </AuthProviderClient>
      </body>
    </html>
  );
}
