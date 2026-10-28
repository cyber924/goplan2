
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus, Trash2, Pencil, Search, BarChart, Building, LayoutGrid, FileText, Loader2, FileType, ChevronLeft, ChevronRight, Presentation, ScanSearch, ToyBrick, TrendingUp, FileSpreadsheet, Globe } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface StoredDocument {
  id: string;
  type: 'template' | 'market-analysis' | 'financial-visualization' | 'corporate-diagnosis' | 'business-model-canvas' | 'form' | 'document-analysis' | 'interactive-report' | 'leap-package-report' | 'financial-statement' | 'preliminary-startup-package' | 'leap-startup-package';
  slug?: string;
  title: string;
  businessIdea?: string;
  prompt?: string;
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
    'document-analysis': <ScanSearch className="text-primary mt-1 flex-shrink-0" />,
    'interactive-report': <ToyBrick className="text-primary mt-1 flex-shrink-0" />,
    'leap-package-report': <TrendingUp className="text-primary mt-1 flex-shrink-0" />,
    'financial-statement': <FileSpreadsheet className="text-primary mt-1 flex-shrink-0" />,
    'preliminary-startup-package': <TrendingUp className="text-primary mt-1 flex-shrink-0" />,
    'leap-startup-package': <TrendingUp className="text-primary mt-1 flex-shrink-0" />,
};

const TYPE_NAMES: { [key in StoredDocument['type']]: string } = {
    'template': '사업기획',
    'market-analysis': '시장분석',
    'financial-visualization': '재무분석',
    'corporate-diagnosis': '기업진단',
    'business-model-canvas': 'BMC',
    'form': 'AI양식',
    'document-analysis': '문서분석',
    'interactive-report': '예창패',
    'leap-package-report': '도약패',
    'financial-statement': '재무제표',
    'preliminary-startup-package': '초창패',
    'leap-startup-package': '창업도약',
};

const CARD_BG: Record<string, string> = {
  'template': 'bg-blue-50/50',
  'market-analysis': 'bg-green-50/50',
  'financial-visualization': 'bg-yellow-50/50',
  'corporate-diagnosis': 'bg-purple-50/50',
  'business-model-canvas': 'bg-pink-50/50',
  'form': 'bg-orange-50/50',
  'document-analysis': 'bg-red-50/50',
  'interactive-report': 'bg-indigo-50/50',
  'leap-package-report': 'bg-emerald-50/50',
  'financial-statement': 'bg-lime-50/50',
  'preliminary-startup-package': 'bg-sky-50/50',
  'leap-startup-package': 'bg-teal-50/50',
};

const ITEMS_PER_PAGE = 15;

export default function MyDocumentsDashboard() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

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
      }).filter(doc => doc.type !== 'image-generation');

      userDocs.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt.seconds * 1000) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt.seconds * 1000) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setDocuments(userDocs);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'documents',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
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
  }, [user]);

  const handleDelete = async (docId: string) => {
    const docRef = doc(db, 'documents', docId);
    deleteDoc(docRef)
      .then(() => {
        const updatedDocs = documents.filter((doc) => doc.id !== docId);
        setDocuments(updatedDocs);
        toast({ title: '삭제 완료', description: '문서가 삭제되었습니다.' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handlePublish = async (docObj: StoredDocument) => {
    if (!user) return;
    setIsPublishing(docObj.id);
    
    const marketRef = doc(db, 'market_items', docObj.id);
    const publishData = {
        title: docObj.title,
        businessIdea: docObj.businessIdea || '',
        content: docObj.content,
        userId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0],
        type: docObj.type,
        createdAt: serverTimestamp(),
    };

    setDoc(marketRef, publishData)
        .then(() => {
            toast({ title: '마켓 발행 완료', description: '이제 마켓에서 누구나 이 기획안을 볼 수 있습니다!' });
            setIsPublishing(null);
            router.push(`/market/${docObj.id}`);
        })
        .catch(async (error: any) => {
            const permissionError = new FirestorePermissionError({
                path: 'market_items',
                operation: 'write',
                requestResourceData: publishData,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsPublishing(null);
        });
  };

  const handleEdit = (doc: StoredDocument) => {
    switch (doc.type) {
        case 'form':
            router.push(`/ai-forms/${doc.id}`);
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
        case 'preliminary-startup-package':
        case 'leap-startup-package':
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);
  
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const calculateProgress = (doc: StoredDocument) => {
    if (doc.type === 'form') {
        const fields = doc.content?.fields || [];
        if (fields.length === 0) return 0;
        const filled = fields.filter((f: any) => f.value && f.value.trim().length > 0).length;
        return Math.round((filled / fields.length) * 100);
    }
    const sections = doc.content?.sections || [];
    if (sections.length === 0) return 0;
    const filled = sections.filter((s: any) => s.content && s.content.trim().length > 0).length;
    return Math.round((filled / sections.length) * 100);
  };
  
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
        <div className="flex justify-center items-center gap-4 mt-8">
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-2 border-[#0b50d0] rounded-xl hover:bg-[#e8f0ff]"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-black text-[#0b2447]">
                {currentPage} / {totalPages}
            </span>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-2 border-[#0b50d0] rounded-xl hover:bg-[#e8f0ff]"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
  };


  if (!user) return null;

  return (
    <>
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black font-headline text-[#0b2447]">내 문서 대시보드</h1>
              <p className="text-[#475069] font-bold text-sm mt-1">작성 중인 비즈니스 문서를 한눈에 관리하고 발표하세요.</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="문서 제목 검색..."
                        className="pl-10 w-48 md:w-64 border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button asChild className="bg-[#0b50d0] border-2 border-[#0b2447] font-black shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] rounded-xl hover:bg-[#1463ff] transition-all hover:translate-y-[-2px]">
                  <Link href="/templates">
                    <FilePlus className="mr-2 h-5 w-5" /> 새 사업계획서
                  </Link>
                </Button>
            </div>
          </div>

           <Tabs value={filter} onValueChange={setFilter} className="mb-8">
            <TabsList className="flex flex-nowrap justify-start h-auto bg-transparent gap-2 p-0 overflow-x-auto pb-4 no-scrollbar scrollbar-hide">
                {['all', 'template', 'preliminary-startup-package', 'leap-startup-package', 'interactive-report', 'financial-statement', 'form', 'document-analysis', 'market-analysis', 'financial-visualization', 'corporate-diagnosis', 'business-model-canvas'].map((val) => (
                    <TabsTrigger 
                        key={val} 
                        value={val}
                        className={cn(
                            "flex-shrink-0 border-2 border-[#0b50d0] font-black rounded-xl data-[state=active]:bg-[#0b50d0] data-[state=active]:text-white shadow-[3px_3px_0px_0px_rgba(11,80,208,0.1)] px-4 py-2 text-[11px] h-10 transition-all",
                        )}
                    >
                        {val === 'all' ? '전체' : TYPE_NAMES[val as keyof typeof TYPE_NAMES] || val}
                    </TabsTrigger>
                ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
             <div className="flex flex-col justify-center items-center py-20 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-[#0b50d0] mb-4" />
                <p className="font-bold">문서 데이터를 불러오는 중...</p>
             </div>
          ) : paginatedDocuments.length > 0 ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedDocuments.map(docObj => {
                    const progress = calculateProgress(docObj);
                    return (
                    <Card key={docObj.id} className={cn(
                        'flex flex-col border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(11,80,208,0.15)] transition-all duration-300 rounded-[22px] overflow-hidden',
                        CARD_BG[docObj.type] || 'bg-white'
                    )}>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-start gap-3 text-xl font-black text-[#0b2447]">
                            <div className="bg-white border-2 border-[#0b50d0] p-2 rounded-lg flex-shrink-0">
                                {ICONS[docObj.type] || <FileText className="text-[#0b50d0] w-5 h-5" />}
                            </div>
                            <span className="flex-grow pt-1 line-clamp-2">{docObj.title}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-2">
                          <Badge variant="secondary" className="bg-[#e8f0ff] border-2 border-[#0b50d0] text-[#0b50d0] font-black rounded-lg">{TYPE_NAMES[docObj.type] || '문서'}</Badge>
                          <span className="text-[11px] font-bold text-[#7b86a0]">{formatDate(docObj.updatedAt)}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pb-4 space-y-4">
                        <p className="text-sm font-bold text-[#475069] line-clamp-2 leading-relaxed">
                            {docObj.businessIdea || docObj.prompt || "핵심 아이디어 요약이 없습니다."}
                        </p>
                        <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between items-center text-[10px] font-black text-[#0b50d0]">
                                <span>작성 진행률</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 border-2 border-[#0b50d0] bg-white" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between gap-2 pt-4 border-t-2 border-[#e2e8f4] bg-white/50 px-6">
                        <div className="flex gap-2">
                            {docObj.type !== 'form' && (
                                <Button variant="outline" size="sm" asChild className="h-10 border-2 border-[#0b50d0] rounded-xl font-black text-[#0b50d0] hover:bg-[#e8f0ff]">
                                    <Link href={`/report/${docObj.id}`}>
                                        <Presentation className="h-4 w-4 mr-2" />
                                        발표
                                    </Link>
                                </Button>
                            )}
                            {docObj.type !== 'form' && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handlePublish(docObj)}
                                    disabled={isPublishing === docObj.id}
                                    className="h-10 border-2 border-[#00b8d9] rounded-xl font-black text-[#00b8d9] hover:bg-[#e2f8fc]"
                                >
                                    {isPublishing === docObj.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="h-4 w-4 mr-2" />}
                                    마켓 발행
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(docObj)} className="h-10 w-10 border-2 border-[#0b50d0] rounded-xl hover:bg-[#e8f0ff]">
                                <Pencil className="h-4 w-4 text-[#0b50d0]" />
                                <span className="sr-only">수정</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="h-10 w-10 border-2 border-[#0b2447] rounded-xl shadow-[2px_2px_0px_0px_rgba(11,36,71,0.1)]">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">삭제</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="border-[4px] border-[#0b2447] shadow-[12px_12px_0px_0px_rgba(11,36,71,0.2)] rounded-[26px]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-black text-2xl text-[#0b2447]">정말로 삭제하시겠습니까?</AlertDialogTitle>
                                        <AlertDialogDescription className="font-bold text-base text-[#475069]">이 문서를 삭제하면 복구할 수 없습니다.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="pt-4">
                                        <AlertDialogCancel className="border-2 rounded-xl font-black h-12">취소</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(docObj.id)} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-black h-12">영구 삭제</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardFooter>
                    </Card>
                )})}
                </div>
                <PaginationControls />
            </>
          ) : (
            <div className="text-center py-24 border-[4px] border-dashed border-[#0b50d0] rounded-[32px] bg-white shadow-[12px_12px_0px_0px_rgba(11,80,208,0.05)]">
              <div className="bg-[#e8f0ff] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#0b50d0]">
                <FileText className="h-12 w-12 text-[#0b50d0]" />
              </div>
              <h3 className="text-2xl font-black text-[#0b2447]">
                {searchTerm ? '검색 결과가 없습니다.' : '아직 작성된 문서가 없습니다.'}
              </h3>
              <p className="mt-3 text-[#475069] font-bold">
                {searchTerm ? '다른 검색어로 다시 시도해보세요.' : '전문적인 AI 템플릿으로 첫 사업 계획서를 만들어보세요.'}
              </p>
              {!searchTerm && (
                <div className="mt-10">
                    <Button asChild size="lg" className="h-16 px-10 bg-[#0b50d0] border-2 border-[#0b2447] font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.2)] rounded-2xl hover:bg-[#1463ff] transition-all hover:translate-y-[-4px]">
                    <Link href="/templates">
                        <FilePlus className="mr-3 h-6 w-6" /> 새 문서 만들기
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
