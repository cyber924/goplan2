import Image from 'next/image';

const steps = [
  {
    step: '1단계',
    title: '아이디어 입력',
    description: '사업 아이디어를 대표하는 핵심 아이디어를 입력하여 AI에게 기본 정보를 제공하세요.',
  },
  {
    step: '2단계',
    title: 'AI 사업계획서 생성',
    description: '입력한 아이디어를 바탕으로 AI가 사업 계획서 전체 초안을 생성합니다.',
  },
  {
    step: '3단계',
    title: '결과 확인 및 저장',
    description: 'AI가 생성한 사업 계획서 초안을 확인하고, 필요에 따라 저장하고 관리하세요.',
  },
];

export default function GuideSection() {
  return (
    <section id="guide" className="py-16 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline text-foreground">사용 가이드</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            단 3단계만으로 쉽고 빠르게 사업 계획서를 완성할 수 있습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg drop-shadow-lg">
                 <Image src="https://picsum.photos/seed/business-guide/800/600" alt="사용 가이드 이미지" layout="fill" objectFit="cover" data-ai-hint="guide tutorial" />
            </div>
            <div className="space-y-8">
                {steps.map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                        {item.step.charAt(0)}
                    </div>
                    <div>
                    <h3 className="text-xl font-bold font-headline text-foreground">{item.title}</h3>
                    <p className="mt-1 text-muted-foreground">{item.description}</p>
                    </div>
                </div>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
}
