
'use client';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Star, HelpCircle, Minus, ArrowRight, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Script from 'next/script';
import { loadTossPayments } from '@tosspayments/payment-sdk';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_Ba5PzR0Arnyv6PwWLGQGVvmYnNeD";

const plans = [
    {
        name: 'BASIC',
        price: '무료',
        priceAnnual: '무료',
        amount: 0,
        amountAnnual: 0,
        priceDetail: '평생 무료',
        description: 'GOplanAI의 핵심 기능을 체험하고 싶은 개인 사용자에게 적합합니다.',
        features: [
            'AI 사업계획서 초안 생성 (월 10회)',
            '기본 템플릿 사용',
            '최대 5개 문서 저장',
            'AI 이미지 생성 (월 10회)',
        ],
        cta: '현재 요금제',
        isCurrent: true,
    },
    {
        name: 'PREMIUM',
        price: '월 1,900원',
        priceAnnual: '연 20,000원',
        amount: 1900,
        amountAnnual: 20000,
        priceDetail: '연간 결제 시 할인',
        description: '본격적으로 사업을 준비하는 창업가와 프리랜서를 위한 모든 기능을 제공합니다.',
        features: [
            'AI 사업계획서 초안 생성 (무제한)',
            '모든 프리미엄 템플릿 사용',
            '문서 저장 무제한',
            'AI 이미지 생성 (무제한)',
            'AI 시장 분석 및 재무 분석 기능',
            'AI 문서 분석 및 Q&A 기능',
            '우선적인 고객 지원',
        ],
        cta: '프리미엄으로 시작하기',
        isPopular: true,
    },
    {
        name: 'VIP',
        price: '월 99,000원',
        priceAnnual: '연 990,000원',
        amount: 99000,
        amountAnnual: 990000,
        priceDetail: '팀을 위한 최고의 선택',
        description: '팀 단위 협업과 전문가의 컨설팅이 필요한 기업 고객에게 적합합니다.',
        features: [
            'Premium의 모든 기능 포함',
            '팀원 초대 및 협업 기능 (최대 5명)',
            '문서별 접근 권한 관리',
            '전담 컨설턴트의 1:1 맞춤 컨설팅 (월 1회)',
            'API 접근 권한 제공',
        ],
        cta: '문의하기',
    },
];

const featureComparison = [
    { feature: 'AI 사업계획서 생성', basic: '월 10회', premium: '무제한', vip: '무제한' },
    { feature: '템플릿 접근', basic: '기본', premium: '전체', vip: '전체' },
    { feature: '문서 저장', basic: '5개', premium: '무제한', vip: '무제한' },
    { feature: 'AI 이미지 생성', basic: '월 10회', premium: '무제한', vip: '무제한' },
    { feature: 'AI 시장/재무 분석', basic: false, premium: true, vip: true },
    { feature: 'AI 문서 분석', basic: false, premium: true, vip: true },
    { feature: '팀 협업 기능', basic: false, premium: false, vip: true },
    { feature: '1:1 전문가 컨설팅', basic: false, premium: false, vip: '월 1회' },
];

const testimonials = [
    {
        quote: 'GOplanAI 덕분에 정부 지원 사업에 합격했습니다! 복잡했던 사업 계획서 작성이 정말 쉬워졌어요. 특히 AI 시장 분석 리포트는 심사위원들에게 좋은 인상을 남겼습니다.',
        name: '김민준',
        title: '주식회사 넥스트스텝 대표',
        avatar: 'https://picsum.photos/seed/person1/100/100',
    },
    {
        quote: '프리미엄 플랜을 사용하고 있는데, 투자 유치 과정에서 정말 큰 도움이 되었습니다. 다양한 AI 기능들로 IR 자료를 풍성하게 만들 수 있었어요. 월 3만원이 전혀 아깝지 않습니다.',
        name: '이수진',
        title: '펫토피아 서비스 기획자',
        avatar: 'https://picsum.photos/seed/person2/100/100',
    },
];

const faqs = [
    { question: '결제는 어떻게 이루어지나요?', answer: '프리미엄 및 VIP 요금제는 매월 또는 매년 등록된 카드로 자동 결제됩니다. 모든 결제 정보는 안전하게 암호화되어 처리됩니다.' },
    { question: '구독은 언제든지 취소할 수 있나요?', answer: '네, 언제든지 구독을 취소할 수 있습니다. 구독을 취소하더라도 현재 결제 주기가 끝날 때까지는 해당 요금제의 모든 기능을 계속 사용할 수 있습니다.' },
    { question: '팀원과 함께 사용하고 싶습니다. 어떤 요금제를 선택해야 하나요?', answer: '팀 단위 협업 기능은 VIP 요금제에서 제공됩니다. 팀원을 초대하고, 문서를 공유하며, 프로젝트를 함께 관리할 수 있습니다.' },
    { question: '무료 버전과 유료 버전의 가장 큰 차이점은 무엇인가요?', answer: '가장 큰 차이점은 AI 기능 사용 횟수와 고급 기능 접근 여부입니다. 프리미엄 요금제부터는 AI 시장 분석, 재무 분석 등 전문가 수준의 분석 도구를 무제한으로 사용할 수 있어 본격적인 사업 준비에 필수적입니다.' },
];

export default function PricingPage() {
    const [isAnnual, setIsAnnual] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handlePayment = async (plan: typeof plans[0]) => {
        if (isProcessing) return;

        if (!user) {
            toast({
                variant: 'destructive',
                title: '로그인 필요',
                description: '결제를 진행하려면 먼저 로그인해주세요.',
            });
            router.push('/login?redirect=/pricing');
            return;
        }

        if (plan.name === 'VIP') {
            router.push('/contact');
            return;
        }
        
        if (plan.name === 'BASIC') return;

        setIsProcessing(plan.name);

        const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);

        const amount = isAnnual ? plan.amountAnnual : plan.amount;
        const orderId = `${user.uid}_${new Date().getTime()}`;
        
        tossPayments.requestPayment('카드', {
            amount: amount,
            orderId: orderId,
            orderName: `${plan.name} ${isAnnual ? '연간' : '월간'} 구독`,
            customerName: user.displayName || user.email?.split('@')[0] || '고객님',
            successUrl: `${window.location.origin}/api/confirm-payment`,
            failUrl: `${window.location.origin}/pricing?payment_fail=true`,
        }).catch(function (error) {
            if (error.code === 'USER_CANCEL') {
                // 결제 고객이 결제창을 닫았을 때 에러 처리
            } else if (error.code === 'INVALID_CARD_COMPANY') {
                // 유효하지 않은 카드사 에러 처리
            }
        }).finally(() => {
            setIsProcessing(null);
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header />
            <main className="flex-1 py-24">
                <div className="container mx-auto px-4">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-foreground">
                            당신의 비전에 맞는 완벽한 플랜
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl">
                            혼자 시작하는 창업가부터 팀 단위 기업까지, 모두를 위한 합리적인 요금제를 만나보세요.
                        </p>
                        <div className="flex items-center justify-center space-x-2 mt-8">
                            <Label htmlFor="billing-cycle">월간</Label>
                            <Switch id="billing-cycle" checked={isAnnual} onCheckedChange={setIsAnnual} />
                            <Label htmlFor="billing-cycle">연간 (15% 할인)</Label>
                        </div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
                        {plans.map((plan) => (
                            <Card key={plan.name} className={cn('flex flex-col shadow-lg', plan.isPopular ? 'border-2 border-primary shadow-primary/20 -translate-y-4' : '')}>
                                {plan.isPopular && <div className="bg-primary text-primary-foreground text-sm font-bold text-center py-1 rounded-t-lg">가장 인기있는 요금제</div>}
                                <CardHeader className="text-center">
                                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                    <p className="text-4xl font-extrabold">{isAnnual ? plan.priceAnnual : plan.price}</p>
                                    <CardDescription>{plan.priceDetail}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-center mb-6 text-muted-foreground text-sm h-12">{plan.description}</p>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start">
                                                <Check className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <div className="p-6 pt-0">
                                    <Button size="lg" className="w-full" disabled={plan.isCurrent || !!isProcessing} onClick={() => handlePayment(plan)}>
                                        {isProcessing === plan.name ? <Loader2 className="mr-2 animate-spin"/> : null}
                                        {plan.name === 'VIP' ? <><HelpCircle className="mr-2"/>문의하기</> : 
                                        plan.name === 'BASIC' ? plan.cta :
                                        <>{plan.cta} <ArrowRight className="ml-2" /></>}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                    
                    {/* Feature Comparison Table */}
                        <div className="mt-24">
                        <h2 className="text-3xl font-bold text-center mb-8">요금제별 상세 기능 비교</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="border-b">
                                    <tr>
                                        <th className="py-4 px-6 w-1/3">핵심 기능</th>
                                        <th className="text-center py-4 px-6">BASIC</th>
                                        <th className="text-center py-4 px-6 text-primary font-bold">PREMIUM</th>
                                        <th className="text-center py-4 px-6">VIP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {featureComparison.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-4 px-6 font-medium">{item.feature}</td>
                                            <td className="text-center py-4 px-6 text-muted-foreground">
                                                {typeof item.basic === 'boolean' ? (item.basic ? <Check className="mx-auto text-green-500"/> : <Minus className="mx-auto"/>) : item.basic}
                                            </td>
                                            <td className="text-center py-4 px-6 text-primary font-bold">
                                                    {typeof item.premium === 'boolean' ? (item.premium ? <Check className="mx-auto"/> : <Minus className="mx-auto"/>) : item.premium}
                                            </td>
                                            <td className="text-center py-4 px-6 text-muted-foreground">
                                                    {typeof item.vip === 'boolean' ? (item.vip ? <Check className="mx-auto text-green-500"/> : <Minus className="mx-auto"/>) : item.vip}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Testimonials */}
                    <div className="mt-24">
                        <h2 className="text-3xl font-bold text-center mb-12">성공한 창업가들의 이야기</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {testimonials.map((t, i) => (
                                <Card key={i} className="bg-background">
                                    <CardContent className="pt-6">
                                        <blockquote className="border-l-2 pl-6 italic text-muted-foreground">"{t.quote}"</blockquote>
                                        <div className="flex items-center gap-4 mt-4">
                                            <Image src={t.avatar} width={48} height={48} alt={t.name} className="rounded-full" />
                                            <div>
                                                <p className="font-semibold">{t.name}</p>
                                                <p className="text-sm text-muted-foreground">{t.title}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="mt-24 max-w-3xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-8">자주 묻는 질문 (FAQ)</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger className="text-lg font-semibold">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
