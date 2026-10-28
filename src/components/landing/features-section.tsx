import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, FileScan, Sparkles } from 'lucide-react';

const features = [
  {
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: 'AI 기반 초안 생성',
    description: '핵심 키워드 몇 개만으로 AI가 사업 계획서의 초안을 빠르게 생성하여 시간을 절약해줍니다.',
  },
  {
    icon: <FileScan className="w-8 h-8 text-primary" />,
    title: 'PDF 분석 및 통합',
    description: '기존의 PDF 자료를 업로드하면, AI가 내용을 분석하고 새로운 사업 계획에 자연스럽게 통합합니다.',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    title: '실시간 미리보기',
    description: '아이디어를 입력하고 수정하는 즉시, 완성될 사업 계획서의 모습을 실시간으로 확인할 수 있습니다.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">핵심 기능 소개</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            GOplanAI는 강력하고 직관적인 기능들로 당신의 사업 계획을 돕습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center shadow-lg drop-shadow-md hover:-translate-y-2 transition-transform duration-300">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                  {feature.icon}
                </div>
                <CardTitle className="mt-4 font-headline">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
