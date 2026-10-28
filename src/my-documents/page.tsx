'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, Trash2, Pencil, Search, BarChart, Building, LayoutGrid, FileText, Loader2, FileType, ImageIcon, ScanSearch, ToyBrick, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StoredDocument {
  id: string;
  type: 'template' | 'market-analysis' | 'financial-visualization' | 'corporate-diagnosis' | 'business-model-canvas' | 'form' | 'image-generation' | 'document-analysis' | 'interactive-report' | 'leap-package-report' | 'financial-statement';
  slug?: string;
  title: string;
  businessIdea?: string;
  prompt?: string;
  imageUrl?: string;
  updatedAt: { seconds: number, nanoseconds: number };
  userId: string;
  content: any;
}

const ICONS: { [key in StoredDocument['type']]: React.ReactNode } = {
    'template': <FileText className="text-primary mt-1 flex-shrink-0" />,
    'market-analysis': <Search className="text-primary mt-1 flex-shrink-0" />,
    'financial-visualization': <BarChart className="text-primary mt-1 flex-shrink-0" />,
    'corporate-diagnosis': <Building className="text-primary mt-1 flex-shrink-0" />,
    'business-model-canvas': <LayoutGrid className="text-primary mt-1 flex-shrink-0" />,
    'form': <FileType className="text-primary mt-1 flex-shrink-0" />,
    'image-generation': <ImageIcon className="text-primary mt-1 flex-shrink-0" />,
    'document-analysis': <ScanSearch className="text-primary mt-1 flex-shrink-0" />,
    'interactive-report': <ToyBrick className="text-primary mt-1 flex-shrink-0" />,
    'leap-package-report': <TrendingUp className="text-primary mt-1 flex-shrink-0" />,
    'financial-statement': <FileSpreadsheet className="text-primary mt-1 flex-shrink-0" />,
};

const TYPE_NAMES: { [key in StoredDocument['type']]: string } = {
    'template': '사업기획',
    'market-analysis': '시장분석',
    'financial-visualization': '재무분석',
    'corporate-diagnosis': '기업진단',
    'business-model-canvas': 'BMC',
    'form': 'AI양식',
    'image-generation': '이미지',
    'document-analysis': '문서분석',
    'interactive-report': '예창패',
    'leap-package-report': '도약패',
    'financial-statement': '재무제표',
};

const CARD_BG: Record<string, string> = {
  'template': 'bg-blue-50/50',
  'market-analysis': 'bg-green-50/50',
  'financial-visualization': 'bg-yellow-50/50',
  'corporate-diagnosis': 'bg-purple-50/50',
  'business-model-canvas': 'bg-pink-50/50',
  'form': 'bg-orange-50/50',
  'image-generation': 'bg-cyan-50/50',
  'document-analysis': 'bg-red-50/50',
  'interactive-report': 'bg-indigo-50/50',
  'leap-package-report': 'bg-emerald-50/50',
  'financial-statement': 'bg-lime-50/50',
};

export default function MyDocumentsDashboard() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'documents'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const userDocs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as StoredDocument;
      });

      userDocs.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt.seconds * 1000) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt.seconds * 1000) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setDocuments(userDocs);
    } catch (error) {
      console.error("Error fetching documents: ", error);
      toast({ variant: 'destructive', title: '오류', description: '문서를 불러오는 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
        router.push('/login?redirect=/my-documents');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDelete = async (docId: string) => {
    try {
        await deleteDoc(doc(db, 'documents', docId));
        const updatedDocs = documents.filter((doc) => doc.id !== docId);
        setDocuments(updatedDocs);
        toast({ title: '삭제 완료', description: '문서가 삭제되었습니다.' });
    } catch (error) {
        console.error("Error deleting document: ", error);
        toast({ variant: 'destructive', title: '오류', description: '문서 삭제 중 오류가 발생했습니다.' });
    }
  };

  const handleEdit = (doc: StoredDocument) => {
    switch (doc.type) {
        case 'form':
            router.push(`/ai-forms/${doc.id}`);
            return;
        case 'image-generation':
            router.push(`/ai-features/image-generation?prompt=${encodeURIComponent(doc.prompt || '')}&imageUrl=${encodeURIComponent(doc.imageUrl || '')}`);
            return;
        case 'document-analysis':
            router.push(`/ai-features/document-analysis?id=${doc.id}`);
            return;
        case 'financial-visualization':
            router.push(`/ai-features/financial-visualization?id=${doc.id}`);
            return;
        case 'financial-statement':
            router.push(`/ai-features/financial-statement-generator?id=${doc.id}`);
            return;
        case 'corporate-diagnosis':
            router.push(`/ai-features/corporate-diagnosis?id=${doc.id}`);
            return;
        case 'business-model-canvas':
            router.push(`/ai-features/business-model-canvas?id=${doc.id}`);
            return;
        case 'interactive-report':
            router.push(`/ai-features/interactive-report?id=${doc.id}`);
            return;
        case 'leap-package-report':
            router.push(`/ai-features/leap-package-report?id=${doc.id}`);
            return;
        case 'template':
            if (doc.slug) {
                router.push(`/templates/${doc.slug}?id=${doc.id}`);
            } else {
                router.push(`/documents/edit/${doc.id}`);
            }
            return;
        default:
            router.push(`/documents/edit/${doc.id}`);
    }
  };


  const filteredDocuments = useMemo(() => {
    return documents
      .filter(doc => filter === 'all' || doc.type === filter)
      .filter(doc => {
        if (!searchTerm) return true;
        const lowerCaseSearch = searchTerm.toLowerCase();
        const description = doc.businessIdea || doc.prompt || "";
        return (
          doc.title.toLowerCase().includes(lowerCaseSearch) ||
          description.toLowerCase().includes(lowerCaseSearch)
        );
      });
  }, [documents, filter, searchTerm]);

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!user) return null;

  return (
    <>
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold font-headline text-[#0b2447]">내 문서 대시보드</h1>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="검색..."
                        className="pl-10 w-48 md:w-64 border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button asChild className="bg-[#0b50d0] border-2 border-[#0b2447] font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] rounded-xl">
                  <Link href="/templates">
                    <FilePlus className="mr-2" /> 새 사업계획서
                  </Link>
                </Button>
            </div>
          </div>

           <Tabs value={filter} onValueChange={setFilter} className="mb-8">
            <TabsList className="flex flex-nowrap justify-start h-auto bg-transparent gap-1.5 p-0 overflow-x-auto pb-4 no-scrollbar scrollbar-hide">
                {['all', 'template', 'interactive-report', 'leap-package-report', 'financial-statement', 'form', 'image-generation', 'document-analysis', 'market-analysis', 'financial-visualization', 'corporate-diagnosis', 'business-model-canvas'].map((val) => (
                    <TabsTrigger 
                        key={val} 
                        value={val}
                        className={cn(
                            "flex-shrink-0 border-2 border-[#0b50d0] font-bold rounded-xl data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white shadow-[2px_2px_0px_0px_rgba(11,80,208,0.1)] px-3 py-1.5 text-[11px] h-9",
                        )}
                    >
                        {val === 'all' ? '전체' : TYPE_NAMES[val as keyof typeof TYPE_NAMES] || val}
                    </TabsTrigger>
                ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
             <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map(doc => (
                <Card key={doc.id} className={cn(
                    'flex flex-col border-[3px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 rounded-[18px] overflow-hidden',
                    CARD_BG[doc.type] || 'bg-white'
                )}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-start gap-3 text-xl font-bold text-[#0b2447]">
                        {ICONS[doc.type] || <FileText className="text-primary mt-1 flex-shrink-0" />}
                        <span className="flex-grow line-clamp-2">{doc.title}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                      <Badge variant="secondary" className="bg-white border-[#0b50d0] text-[#0b50d0] font-bold">{TYPE_NAMES[doc.type] || '문서'}</Badge>
                      <span className="text-xs font-semibold text-[#7b86a0]">{formatDate(doc.updatedAt)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pb-4">
                    <p className="text-sm font-medium text-[#475069] line-clamp-3 leading-relaxed">
                        {doc.businessIdea || doc.prompt || "핵심 아이디어 요약이 없습니다."}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-4 border-t-2 border-[#e2e8f4] bg-white/50">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(doc)} className="border-2 border-[#0b50d0] rounded-lg hover:bg-[#e8f0ff]">
                      <Pencil className="h-4 w-4 text-[#0b50d0]" />
                      <span className="sr-only">수정</span>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="border-2 border-[#0b2447] rounded-lg shadow-[2px_2px_0px_0px_rgba(11,36,71,0.1)]">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">삭제</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-[3px] border-[#0b2447] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-[#0b2447]">정말로 삭제하시겠습니까?</AlertDialogTitle>
                                <AlertDialogDescription className="font-medium">이 문서를 삭제하면 복구할 수 없습니다.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-2 rounded-xl font-bold">취소</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-bold">삭제</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-[3px] border-dashed border-[#0b50d0] rounded-[22px] bg-white shadow-[6px_6px_0px_0px_rgba(11,80,208,0.05)]">
              <FileText className="mx-auto h-16 w-16 text-[#7b86a0] mb-4" />
              <h3 className="text-xl font-black text-[#0b2447]">
                {searchTerm ? '검색 결과가 없습니다.' : '표시할 문서가 없습니다.'}
              </h3>
              <p className="mt-2 text-[#475069] font-medium">
                {searchTerm ? '다른 키워드로 검색해보세요.' : '새로운 문서를 만들고 이곳에서 관리하세요.'}
              </p>
              {!searchTerm && (
                <div className="mt-8">
                    <Button asChild size="lg" className="h-14 px-8 bg-[#0b50d0] border-2 border-[#0b2447] font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] rounded-xl">
                    <Link href="/templates">
                        <FilePlus className="mr-2" /> 새 문서 만들기
                    </Link>
                    </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
}
