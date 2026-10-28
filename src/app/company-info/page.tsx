
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Plus, Trash2, Pencil, Search, Users, ArrowRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CompanyProfile {
  id: string;
  companyName: string;
  ceoName: string;
  updatedAt: string;
  userId: string;
  businessType?: string;
  businessItems?: string;
}

// NOTE: We will use a separate localStorage key for customer profiles
const MY_PROFILES_KEY = 'company-profiles';
const CUSTOMER_PROFILES_KEY = 'customer-profiles';

export default function CompanyInfoDashboardPage() {
  const [myProfiles, setMyProfiles] = useState<CompanyProfile[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CompanyProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('my-company');

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
        const storedMyProfiles = JSON.parse(localStorage.getItem(MY_PROFILES_KEY) || '[]');
        const userMyProfiles = storedMyProfiles.filter((p: CompanyProfile) => p.userId === user.uid);
        userMyProfiles.sort((a: CompanyProfile, b: CompanyProfile) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setMyProfiles(userMyProfiles);

        const storedCustomerProfiles = JSON.parse(localStorage.getItem(CUSTOMER_PROFILES_KEY) || '[]');
        const userCustomerProfiles = storedCustomerProfiles.filter((p: CompanyProfile) => p.userId === user.uid);
        userCustomerProfiles.sort((a: CompanyProfile, b: CompanyProfile) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setCustomerProfiles(userCustomerProfiles);
    } else {
        toast({
          variant: 'destructive',
          title: '로그인 필요',
          description: '회사 정보를 관리하려면 로그인이 필요합니다.',
        });
        router.push('/login?redirect=/company-info');
    }
  }, [user, router, toast]);

  const profilesToDisplay = activeTab === 'my-company' ? myProfiles : customerProfiles;

  const filteredProfiles = useMemo(() => {
    return profilesToDisplay.filter(p => {
        if (!searchTerm) return true;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          p.companyName.toLowerCase().includes(lowerCaseSearch) ||
          p.ceoName.toLowerCase().includes(lowerCaseSearch) ||
          p.businessType?.toLowerCase().includes(lowerCaseSearch) ||
          p.businessItems?.toLowerCase().includes(lowerCaseSearch)
        );
      });
  }, [profilesToDisplay, searchTerm]);
  
  const handleDelete = (profileId: string) => {
    const key = activeTab === 'my-company' ? MY_PROFILES_KEY : CUSTOMER_PROFILES_KEY;
    const allProfiles = JSON.parse(localStorage.getItem(key) || '[]');
    const updatedProfiles = allProfiles.filter((p: CompanyProfile) => p.id !== profileId);
    localStorage.setItem(key, JSON.stringify(updatedProfiles));
    
    if (activeTab === 'my-company') {
        setMyProfiles(myProfiles.filter(p => p.id !== profileId));
    } else {
        setCustomerProfiles(customerProfiles.filter(p => p.id !== profileId));
    }
    toast({ title: '삭제 완료', description: '회사 정보가 삭제되었습니다.' });
  };
  
  const handleEdit = (profileId: string) => {
    router.push(`/company-info/form?id=${profileId}&type=${activeTab}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const ProfileCard = ({ profile }: { profile: CompanyProfile }) => (
    <Card className="flex flex-col border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 rounded-[22px] overflow-hidden bg-white">
        <CardHeader className="pb-4">
            <CardTitle className="flex items-start gap-3 text-xl font-bold text-[#0b2447]">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-2 rounded-lg flex-shrink-0">
                    <Building className="text-[#0b50d0] w-5 h-5" />
                </div>
                <span className="flex-grow pt-1 line-clamp-1">{profile.companyName}</span>
            </CardTitle>
            <CardDescription className="font-bold text-[#475069]">대표: {profile.ceoName}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-2 text-sm px-6 pb-4">
            <p className="flex gap-2"><span className="font-black text-[#7b86a0] w-12 flex-shrink-0">업태</span> <span className="font-bold text-[#475069]">{profile.businessType || 'N/A'}</span></p>
            <p className="flex gap-2"><span className="font-black text-[#7b86a0] w-12 flex-shrink-0">종목</span> <span className="font-bold text-[#475069]">{profile.businessItems || 'N/A'}</span></p>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-white/50 border-t-2 border-[#e2e8f4] pt-4">
            <span className="text-[10px] font-bold text-[#7b86a0]">수정: {formatDate(profile.updatedAt)}</span>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9 border-2 border-[#0b50d0] rounded-lg hover:bg-[#e8f0ff]" onClick={() => handleEdit(profile.id)}>
                    <Pencil className="h-4 w-4 text-[#0b50d0]" />
                    <span className="sr-only">수정</span>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-9 w-9 border-2 border-[#0b2447] rounded-lg shadow-[2px_2px_0px_0px_rgba(11,36,71,0.1)]">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">삭제</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-[3px] border-[#0b2447] rounded-2xl shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-black text-[#0b2447]">정말로 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold">이 정보를 삭제하면 복구할 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-2 rounded-xl font-bold">취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(profile.id)} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-bold">삭제</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardFooter>
    </Card>
  );

  const EmptyState = ({ type }: { type: 'my-company' | 'customer' }) => (
     <div className="text-center py-20 border-[3px] border-dashed border-[#0b50d0] rounded-[22px] bg-white shadow-[6px_6px_0px_0px_rgba(11,80,208,0.05)] col-span-full">
        {type === 'my-company' ? <Building className="mx-auto h-16 w-16 text-[#7b86a0] mb-4" /> : <Users className="mx-auto h-16 w-16 text-[#7b86a0] mb-4" />}
        <h3 className="text-xl font-black text-[#0b2447]">{searchTerm ? '검색 결과가 없습니다.' : (type === 'my-company' ? '저장된 회사 정보가 없습니다.' : '저장된 고객사 정보가 없습니다.')}</h3>
        <p className="mt-2 text-[#475069] font-medium">{searchTerm ? '다른 키워드로 검색해보세요.' : (type === 'my-company' ? '새로운 회사 정보를 추가하고 AI 기능에 활용해 보세요.' : '고객사 정보를 추가하고 관리하세요.')}</p>
        {!searchTerm && (
            <div className="mt-8">
                <Button asChild size="lg" className="h-14 px-8 bg-[#0b50d0] border-2 border-[#0b2447] font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] rounded-xl transition-all hover:translate-y-[-2px]">
                    <Link href={`/company-info/form?type=${activeTab}`}>
                        <Plus className="mr-2 h-5 w-5" /> 새 정보 추가
                    </Link>
                </Button>
            </div>
        )}
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h1 className="text-4xl font-extrabold font-headline text-[#0b2447]">회사 정보 관리</h1>
                <p className="text-[#475069] font-medium mt-1">기업 데이터를 안전하게 관리하고 AI 작성 시 활용하세요.</p>
            </div>
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="회사명, 대표자명 검색..." 
                        className="pl-10 w-full md:w-64 h-12 border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] bg-white font-bold" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <Button asChild className="h-12 bg-[#0b50d0] border-2 border-[#0b2447] font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] rounded-xl hover:bg-[#1463ff] transition-all hover:translate-y-[-2px]">
                    <Link href={`/company-info/form?type=${activeTab}`}>
                        <Plus className="mr-2 h-5 w-5" /> 추가
                    </Link>
                </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
              <TabsList className="bg-white/50 border-2 border-[#e2e8f4] p-1 rounded-xl h-auto">
                  <TabsTrigger 
                    value="my-company" 
                    className="rounded-lg font-black px-6 py-2.5 data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    내 회사 정보
                  </TabsTrigger>
                  <TabsTrigger 
                    value="customer" 
                    className="rounded-lg font-black px-6 py-2.5 data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    고객사 정보
                  </TabsTrigger>
              </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProfiles.length > 0 ? (
                filteredProfiles.map(profile => <ProfileCard key={profile.id} profile={profile} />)
            ) : (
                <EmptyState type={activeTab === 'my-company' ? 'my-company' : 'customer'} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
