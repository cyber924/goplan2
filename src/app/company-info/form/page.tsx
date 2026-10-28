
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Building, Trash2, Plus, Info, Briefcase, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const financialItemSchema = z.object({
  year: z.string().min(4, '연도를 4자리로 입력해주세요.').max(4),
  revenue: z.coerce.number().optional().default(0),
  operatingProfit: z.coerce.number().optional().default(0),
  netProfit: z.coerce.number().optional().default(0),
});

const formSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  companyName: z.string().min(1, '회사명을 입력해주세요.'),
  ceoName: z.string().min(1, '대표자명을 입력해주세요.'),
  businessNumber: z.string().optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
  businessItems: z.string().optional(),
  vision: z.string().optional(),
  history: z.string().optional(),
  financials: z.array(financialItemSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const MY_PROFILES_KEY = 'company-profiles';
const CUSTOMER_PROFILES_KEY = 'customer-profiles';

export default function CompanyInfoFormPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const profileId = searchParams.get('id');
  const profileType = searchParams.get('type') || 'my-company'; // 'my-company' or 'customer'
  const storageKey = profileType === 'customer' ? CUSTOMER_PROFILES_KEY : MY_PROFILES_KEY;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      ceoName: '',
      businessNumber: '',
      address: '',
      businessType: '',
      businessItems: '',
      vision: '',
      history: '',
      financials: [{ year: new Date().getFullYear().toString(), revenue: 0, operatingProfit: 0, netProfit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'financials',
  });
  
  useEffect(() => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요', description: '이 기능을 사용하려면 로그인이 필요합니다.' });
        router.push('/login?redirect=/company-info/form');
        return;
    }

    if (profileId) {
        const storedProfiles = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const profileToLoad = storedProfiles.find((p: FormValues) => p.id === profileId && p.userId === user.uid);
        if (profileToLoad) {
            form.reset(profileToLoad);
        } else {
            toast({ variant: 'destructive', title: '오류', description: '정보를 불러올 수 없거나 권한이 없습니다.' });
            router.push('/company-info');
        }
    }
  }, [profileId, user, router, toast, form, storageKey]);

  const handleSave = (values: FormValues) => {
    if (!user) {
        toast({variant: 'destructive', title: "로그인 필요", description: "정보를 저장하려면 로그인이 필요합니다."})
        router.push('/login');
        return;
    }
    
    setIsLoading(true);
    const now = new Date().toISOString();
    let storedProfiles = JSON.parse(localStorage.getItem(storageKey) || '[]');

    if (values.id) {
      storedProfiles = storedProfiles.map((p: FormValues) => 
        p.id === values.id ? { ...values, updatedAt: now, userId: user.uid } : p
      );
    } else {
      const newProfile = { 
        ...values, 
        id: Date.now().toString(), 
        createdAt: now,
        updatedAt: now,
        userId: user.uid,
      };
      storedProfiles.push(newProfile);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(storedProfiles));
    toast({ title: '저장 완료', description: '회사 정보가 성공적으로 저장되었습니다.' });
    setIsLoading(false);
    router.push('/company-info');
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-4xl">
           <Button variant="outline" asChild className="mb-6 border-2 border-[#0b50d0] rounded-xl font-bold hover:bg-[#e8f0ff]">
               <Link href="/company-info"><ArrowLeft className="mr-2 h-4 w-4"/> 목록으로 돌아가기</Link>
            </Button>
          
          <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
            <CardHeader className="border-b-2 border-[#e2e8f4] p-8 md:p-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-4 rounded-2xl">
                    <Building className="w-10 h-10 text-[#0b50d0]" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black font-headline text-[#0b2447]">
                    {profileId ? `정보 수정: ${form.getValues('companyName')}` : `새 ${profileType === 'customer' ? '고객사' : '회사'} 정보 추가`}
                  </CardTitle>
                  <CardDescription className="text-lg font-bold text-[#475069] mt-1">
                    회사의 핵심 데이터를 체계적으로 관리하세요.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8 md:p-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-12">
                  
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-[#e2e8f4]">
                        <Briefcase className="w-6 h-6 text-[#0b50d0]" />
                        <h3 className="text-xl font-black text-[#0b2447]">기본 및 비즈니스 정보</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField control={form.control} name="companyName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-black text-[#0b2447]">회사명*</FormLabel>
                            <FormControl><Input placeholder="주식회사 고플랜" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="ceoName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">대표자명*</FormLabel>
                                <FormControl><Input placeholder="홍길동" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="businessNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">사업자 등록번호</FormLabel>
                                <FormControl><Input placeholder="123-45-67890" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">주소</FormLabel>
                                <FormControl><Input placeholder="서울특별시 강남구 테헤란로" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="businessType" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">업태</FormLabel>
                                <FormControl><Input placeholder="서비스업" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="businessItems" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">종목</FormLabel>
                                <FormControl><Input placeholder="소프트웨어 개발 및 공급" className="h-12 border-2 focus-visible:ring-[#0b50d0] rounded-xl font-bold" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="space-y-6 pt-4">
                        <FormField control={form.control} name="vision" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">회사 비전 및 목표</FormLabel>
                                <FormControl><Textarea rows={3} placeholder="AI를 통해 모든 창업가의 꿈을 현실로 만듭니다." className="border-2 focus-visible:ring-[#0b50d0] rounded-xl font-medium leading-relaxed" {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="history" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[#0b2447]">회사 연혁</FormLabel>
                                <FormControl><Textarea rows={5} placeholder="2024.01 - 법인 설립&#10;2024.05 - GOplanAI 서비스 출시" className="border-2 focus-visible:ring-[#0b50d0] rounded-xl font-medium leading-relaxed" {...field} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b-2 border-[#e2e8f4]">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-[#0b50d0]" />
                        <h3 className="text-xl font-black text-[#0b2447]">재무 정보 요약</h3>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="border-2 border-[#0b50d0] rounded-lg font-bold text-[#0b50d0] hover:bg-[#e8f0ff]" onClick={() => append({ year: '', revenue: 0, operatingProfit: 0, netProfit: 0 })}>
                        <Plus className="mr-2 h-4 w-4" /> 연도 추가
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-center font-black text-xs text-[#7b86a0] px-4 uppercase tracking-wider">
                        <span>연도</span>
                        <span>매출액 (원)</span>
                        <span>영업이익 (원)</span>
                        <span>당기순이익 (원)</span>
                        <span className="w-10"></span>
                      </div>
                      
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-start p-4 rounded-2xl border-2 border-transparent hover:border-[#0b50d0] hover:bg-[#f4f7fc] transition-all group">
                             <FormField control={form.control} name={`financials.${index}.year`} render={({ field }) => <FormItem><FormLabel className="sm:hidden font-bold">연도</FormLabel><FormControl><Input placeholder="2023" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                             <FormField control={form.control} name={`financials.${index}.revenue`} render={({ field }) => <FormItem><FormLabel className="sm:hidden font-bold">매출액</FormLabel><FormControl><Input type="number" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                             <FormField control={form.control} name={`financials.${index}.operatingProfit`} render={({ field }) => <FormItem><FormLabel className="sm:hidden font-bold">영업이익</FormLabel><FormControl><Input type="number" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                             <FormField control={form.control} name={`financials.${index}.netProfit`} render={({ field }) => <FormItem><FormLabel className="sm:hidden font-bold">당기순이익</FormLabel><FormControl><Input type="number" className="h-11 border-2 rounded-lg font-bold" {...field} /></FormControl><FormMessage /></FormItem>} />
                             <div className="flex items-center justify-end sm:h-11 pt-2 sm:pt-0">
                               <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => remove(index)}>
                                  <Trash2 className="h-5 w-5" />
                               </Button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <div className="flex justify-end pt-8 border-t-2 border-[#e2e8f4]">
                      <Button type="submit" size="lg" className="h-14 px-10 bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px] rounded-xl" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                        {profileId ? '회사 정보 수정 완료' : '정보 저장하고 계속하기'}
                      </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
