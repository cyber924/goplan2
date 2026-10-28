'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Sparkles, ChevronDown, ChevronUp, Save, Trash2, Image as ImageIcon, Link as LinkIcon, ArrowLeft, Download, Plus, LayoutGrid, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { generateSectionDraft } from '@/ai/flows/generate-section-draft';
import { analyzeFinancials, type AnalyzeFinancialsOutput } from '@/ai/flows/analyze-financials';
import SalesChart from '@/components/charts/sales-chart';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import type { Template } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';
import DbImageGallery from '@/components/common/db-image-gallery';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  placeholder: z.string().optional(),
  isCollapsed: z.boolean().default(false),
});

const financialDataPointSchema = z.object({
  period: z.string().min(1, '기간을 입력해주세요.'),
  revenue: z.coerce.number().min(0, '매출은 0 이상이어야 합니다.'),
  expenses: z.coerce.number().min(0, '비용은 0 이상이어야 합니다.'),
});

const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  businessIdea: z.string().min(10, { message: '사업 아이디어를 10자 이상 입력해주세요.' }),
  sections: z.array(sectionSchema),
  type: z.string().optional(),
  financialData: z.array(financialDataPointSchema).min(3, '최소 3개 이상의 데이터가 필요합니다.').optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORIES = [
  { id: 'ALL', label: '전체' },
  { id: 'IT', label: 'IT/SaaS' },
  { id: 'LEGAL', label: '법률/공공' },
  { id: 'MANUFACTURING', label: '제조/IoT' },
  { id: 'LOGISTICS', label: '유통/물류' },
  { id: 'SERVICE', label: '서비스/생활' },
];

function TemplatePage() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUrlModalOpen, setUrlModalOpen] = useState(false);
  const [isGalleryModalOpen, setGalleryModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'image' | 'link' | null>(null);
  const [modalInputValue, setModalInputValue] = useState({ url: '', text: '' });
  const activeSectionIndexRef = useRef<number | null>(null);
  const [financialAnalysisResult, setFinancialAnalysisResult] = useState<AnalyzeFinancialsOutput | null>(null);
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false);

  // AI 추천 아이디어 선택 모달 상태 및 핸들러
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [suggestedIdeas, setSuggestedIdeas] = useState<any[]>([]);
  const [selectedIdeaCategory, setSelectedIdeaCategory] = useState('ALL');
  const [isFetchingIdeas, setIsFetchingIdeas] = useState(false);

  const fetchSuggestedIdeas = async () => {
    setIsFetchingIdeas(true);
    try {
      const q = query(collection(db, 'system_ideas'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // 클라이언트 사이드 자바스크립트 정렬 (createdAt 역순)
      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      // 클라이언트 사이드 카테고리 필터링
      const filteredList = selectedIdeaCategory === 'ALL'
        ? list
        : list.filter(idea => idea.category === selectedIdeaCategory);

      setSuggestedIdeas(filteredList);
    } catch (err) {
      console.error('추천 아이디어 조회 에러:', err);
    } finally {
      setIsFetchingIdeas(false);
    }
  };

  useEffect(() => {
    if (isIdeaModalOpen) {
      fetchSuggestedIdeas();
    }
  }, [isIdeaModalOpen, selectedIdeaCategory]);

  const handleSelectIdea = (idea: any) => {
    // Fill the businessIdea textarea with description + target efficiency
    const textToFill = `${idea.description} ${idea.targetEfficiency}`;
    form.setValue('businessIdea', textToFill);
    toast({
      title: '추천 아이디어 적용 완료',
      description: '선택하신 프리미엄 비즈니스 모델이 사업 아이디어 란에 자동 입력되었습니다.',
    });
    setIsIdeaModalOpen(false);
  };

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { user } = useAuth();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

  const slug = params.slug as string;
  const docId = searchParams.get('id');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      businessIdea: '',
      sections: [],
      type: 'template',
      financialData: [
        { period: '1년차', revenue: 100000000, expenses: 60000000 },
        { period: '2년차', revenue: 300000000, expenses: 150000000 },
        { period: '3년차', revenue: 700000000, expenses: 300000000 },
      ],
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  
  const { fields: financialFields, append: appendFinancial, remove: removeFinancial } = useFieldArray({
    control: form.control,
    name: "financialData",
  });

  useEffect(() => {
    if (!slug) return;
    const fetchTemplateData = async () => {
      try {
        const data = await import(`@/lib/templates/${slug}.json`);
        setTemplateData(data.default);
      } catch (error) {
        toast({ variant: 'destructive', title: '오류', description: '템플릿을 불러올 수 없습니다.' });
        router.push('/');
      }
    };
    fetchTemplateData();
  }, [slug, router, toast]);

  useEffect(() => {
    if (!user) {
        router.push(`/login?redirect=/templates/${slug}${docId ? `?id=${docId}`: ''}`);
        return;
    }
    if (!templateData) return;

    const initializeForm = async () => {
      if (docId) {
        const docRef = doc(db, 'documents', docId);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().userId === user.uid) {
            const docData = docSnap.data().content as FormValues;
            form.reset({...docData, type: 'template' });
            if(docData.financialData) {
              setFinancialAnalysisResult(docSnap.data().content.financialAnalysisResult);
            }
          } else {
            toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없습니다.' });
            router.push('/my-documents');
          }
        } catch (error: any) {
          if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
      } else {
        const initialPlanDataString = sessionStorage.getItem('initial-plan-data');
        if (initialPlanDataString) {
          try {
            const parsedData = JSON.parse(initialPlanDataString);
            form.setValue('title', parsedData.title || templateData.title);
            form.setValue('businessIdea', parsedData.businessIdea);
            sessionStorage.removeItem('initial-plan-data');
          } catch (e) {
            form.setValue('title', templateData.title);
            form.setValue('businessIdea', templateData.defaultIdea || 'AI 기반 맞춤형 여행 추천 플랫폼');
          }
        } else {
          form.setValue('title', templateData.title);
          form.setValue('businessIdea', templateData.defaultIdea || 'AI 기반 맞춤형 여행 추천 플랫폼');
        }
        form.setValue('sections', templateData.sections.map(s => ({ ...s, content: s.content || '', placeholder: s.placeholder || '', isCollapsed: false })));
      }
      form.setValue('type', 'template');
      setIsInitializing(false);
    };

    initializeForm();
  }, [user, templateData, docId, form, router, toast, slug]);

  const handleGenerateDraft = async (index: number) => {
    if (!user) return;
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    const section = fields[index];
    const businessIdea = form.getValues('businessIdea');
    if (!businessIdea) {
      form.setError('businessIdea', { message: 'AI 초안을 생성하려면 먼저 사업 아이디어를 입력해야 합니다.' });
      return;
    }
    setLoadingStates(prev => ({ ...prev, [section.id]: true }));
    try {
      const result = await generateSectionDraft({ businessIdea, sectionTitle: section.title });
      form.setValue(`sections.${index}.content`, result.draft);
      toast({ title: 'AI 초안 생성 완료' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'AI 초안 생성 실패' });
    } finally {
      setLoadingStates(prev => ({ ...prev, [section.id]: false }));
    }
  };

  const handleSave = async (values: FormValues) => {
    if (!user) return;
    setIsSaving(true);
    
    const docData = {
      type: 'template' as const,
      slug: slug,
      title: values.title,
      businessIdea: values.businessIdea,
      userId: user.uid,
      updatedAt: serverTimestamp(),
      content: {
        ...values,
        financialAnalysisResult: financialAnalysisResult
      },
    };

    if (docId) {
      const docRef = doc(db, 'documents', docId);
      setDoc(docRef, docData, { merge: true })
        .then(() => {
          toast({ title: '저장 완료' });
          setIsSaving(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: docData,
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsSaving(false);
        });
    } else {
      addDoc(collection(db, "documents"), { ...docData, createdAt: serverTimestamp() })
        .then((docRef) => {
          toast({ title: '저장 완료' });
          router.push(`/my-documents`);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: 'documents',
            operation: 'create',
            requestResourceData: docData,
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsSaving(false);
        });
    }
  };

  const handleDelete = async () => {
    if (docId && user) {
      const docRef = doc(db, 'documents', docId);
      deleteDoc(docRef)
        .then(() => {
          toast({ title: '삭제 완료' });
          router.push('/my-documents');
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const openUrlModal = (type: 'image' | 'link', index: number) => {
    activeSectionIndexRef.current = index;
    setModalType(type);
    setUrlModalOpen(true);
  };

  const openGalleryModal = (index: number) => {
    activeSectionIndexRef.current = index;
    setGalleryModalOpen(true);
  };
  
  const handleGallerySelect = (imageUrl: string) => {
    const index = activeSectionIndexRef.current;
    if (index === null) return;
    const currentContent = form.getValues(`sections.${index}.content`);
    const markdownToAdd = `\n![이미지](${imageUrl})\n`;
    form.setValue(`sections.${index}.content`, currentContent + markdownToAdd);
    setGalleryModalOpen(false);
  };
  
  const handleUrlModalSubmit = () => {
    const index = activeSectionIndexRef.current;
    if (index === null) return;
    const currentContent = form.getValues(`sections.${index}.content`);
    let markdownToAdd = '';
    if (modalType === 'image') {
      markdownToAdd = `\n![${modalInputValue.text || 'image'}](${modalInputValue.url})\n`;
    } else if (modalType === 'link') {
      markdownToAdd = `[${modalInputValue.text || modalInputValue.url}](${modalInputValue.url})`;
    }
    form.setValue(`sections.${index}.content`, currentContent + markdownToAdd);
    setUrlModalOpen(false);
    setModalInputValue({ url: '', text: '' });
  };
  
  const handleDownloadHtml = async () => {
    const docData = form.getValues();
    const htmlContent = await generateStyledHtml(docData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title}.html`;
    link.click();
  };

  const handleDownloadDocx = async () => {
    const docData = form.getValues();
    const htmlContent = await generateStyledHtml(docData);
    const blob = htmlDocx.asBlob(htmlContent);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title}.docx`;
    link.click();
  };

  if (isInitializing || !templateData) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary/30">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30 print:bg-white">
      <Header className="print:hidden"/>
      <main className="flex-1 py-24 print:py-0">
        <div className="container mx-auto px-4 print:max-w-full">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <Button variant="outline" onClick={() => router.push('/my-documents')}>
                <ArrowLeft className="mr-2"/> 내 문서로 돌아가기
            </Button>
            {docId && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm"><Trash2 className="mr-2"/> 삭제</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>이 문서를 삭제하면 복구할 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">삭제</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
           </div>
          <Card className="max-w-5xl mx-auto shadow-lg print:shadow-none print:border-none">
            <Form {...form}>
              <form className="space-y-8" onSubmit={form.handleSubmit(handleSave)}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-grow">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} className="text-3xl font-bold font-headline border-0 p-0 h-auto focus-visible:ring-0 print:text-black" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <CardDescription className="mt-1 print:hidden">{templateData.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                      <FormField
                        control={form.control}
                        name="businessIdea"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                              <FormLabel className="text-lg font-semibold flex items-center gap-2"><Sparkles className="text-primary" />핵심 사업 아이디어</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsIdeaModalOpen(true)}
                                className="border-2 border-[#0b50d0] rounded-xl h-9 px-3 text-xs font-black text-[#0b50d0] hover:bg-[#e8f0ff] transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lightbulb className="w-3.5 h-3.5 text-[#0b50d0]" />
                                ✨ AI 추천 아이디어 선택
                              </Button>
                            </div>
                            <FormControl>
                              <Textarea rows={3} className="text-base" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                           <Card key={field.id} className="overflow-hidden print:border-none print:shadow-none">
                                <CardHeader className="flex flex-row items-center justify-between p-4 bg-secondary/50 cursor-pointer print:hidden" onClick={() => update(index, { ...field, isCollapsed: !field.isCollapsed })}>
                                   <h3 className="font-semibold text-lg">{field.title}</h3>
                                   {field.isCollapsed ? <ChevronDown /> : <ChevronUp />}
                                </CardHeader>
                                {!field.isCollapsed && (
                                  <CardContent className="p-4 space-y-4 print:p-0">
                                     <h3 className="font-semibold text-lg hidden print:block border-b-2 border-primary pb-2 mb-4">{field.title}</h3>
                                    <FormField control={form.control} name={`sections.${index}.content`} render={({ field: textareaField }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea placeholder={field.placeholder} rows={8} {...textareaField} className="print:hidden"/>
                                        </FormControl>
                                         <div className="hidden print:block text-base p-4 bg-gray-100 rounded-md whitespace-pre-wrap min-h-[40px]">
                                            {textareaField.value || <span className="text-gray-400">(입력 없음)</span>}
                                        </div>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                    <div className="flex items-center justify-between print:hidden">
                                      <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => openGalleryModal(index)}><LayoutGrid className="mr-2 h-4 w-4" />DB 갤러리</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => openUrlModal('image', index)}><ImageIcon className="mr-2 h-4 w-4" />URL 이미지</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => openUrlModal('link', index)}><LinkIcon className="mr-2 h-4 w-4" />링크</Button>
                                      </div>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => handleGenerateDraft(index)} disabled={loadingStates[field.id]}>
                                        {loadingStates[field.id] ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
                                        AI 초안
                                      </Button>
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                        ))}
                      </div>
                      <div className="flex justify-end pt-6 border-t gap-2 print:hidden">
                          <Button type="button" variant="outline" size="lg" onClick={handleDownloadHtml}>HTML</Button>
                          <Button type="button" variant="outline" size="lg" onClick={handleDownloadDocx}>Word</Button>
                          <Button type="submit" size="lg" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                            {isSaving ? '저장 중...' : '저장하기'}
                          </Button>
                      </div>
                    </div>
                </CardContent>
              </form>
            </Form>
          </Card>
        </div>
      </main>
      <Footer className="print:hidden"/>

      {/* URL/Link Modal */}
      <Dialog open={isUrlModalOpen} onOpenChange={setUrlModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalType === 'image' ? 'URL 이미지 추가' : '링크 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">URL</Label>
              <Input id="url" value={modalInputValue.url} onChange={(e) => setModalInputValue(v => ({...v, url: e.target.value}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="text" className="text-right">표시 텍스트</Label>
              <Input id="text" value={modalInputValue.text} onChange={(e) => setModalInputValue(v => ({...v, text: e.target.value}))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUrlModalSubmit}>추가하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DB Gallery Modal */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setGalleryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>내 DB 갤러리에서 선택</DialogTitle>
            <DialogDescription>저장된 이미지 중 문서에 삽입할 이미지를 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DbImageGallery selectable onSelect={handleGallerySelect} />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggested Ideas Selection Modal */}
      <Dialog open={isIdeaModalOpen} onOpenChange={setIsIdeaModalOpen}>
        <DialogContent className="sm:max-w-2xl border-3 border-[#0b2447] bg-white rounded-[24px] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] z-[100] max-h-[80vh] flex flex-col p-6">
          <DialogHeader className="p-1 pb-2 flex-shrink-0">
            <DialogTitle className="text-2xl font-black font-headline text-[#0b2447] flex items-center gap-2">
              <Lightbulb className="text-amber-500 fill-amber-100" />
              추천 비즈니스 아이디어 선택
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7b86a0] font-bold">
              검증된 고성능 AI 트렌드 및 BM 모델을 선택하여 아이디어 입력란을 즉시 채워보세요.
            </DialogDescription>
          </DialogHeader>

          {/* Categories bar */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#e8f0ff]/50 border-2 border-[#0b50d0] rounded-xl mb-4 flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedIdeaCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  selectedIdeaCategory === cat.id
                    ? 'bg-[#0b50d0] text-white shadow-sm'
                    : 'text-[#0b2447] hover:bg-[#0b50d0]/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[250px]">
            {isFetchingIdeas ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#7b86a0]">
                <Loader2 className="w-8 h-8 animate-spin text-[#0b50d0] mb-2" />
                <p className="font-bold text-xs">아이디어 라이브러리 로드 중...</p>
              </div>
            ) : suggestedIdeas.length === 0 ? (
              <div className="text-center py-12 text-[#7b86a0] border-2 border-dashed border-[#ccc] rounded-xl">
                <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-2" />
                <p className="font-bold text-xs">이 카테고리에 할당된 추천 아이디어가 없습니다.</p>
                <p className="text-[10px] text-muted-foreground mt-1">어드민 제어판에서 [AI 생성]을 눌러 데이터를 채워주세요!</p>
              </div>
            ) : (
              suggestedIdeas.map((idea) => (
                <div 
                  key={idea.id} 
                  onClick={() => handleSelectIdea(idea)}
                  className="p-4 border-2 border-[#0b50d0] rounded-xl bg-white hover:bg-[#e8f0ff]/20 hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-[#e8f0ff] border border-[#0b50d0] text-[#0b50d0] text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                      {CATEGORIES.find(c => c.id === idea.category)?.label}
                    </span>
                    <Button size="sm" className="bg-[#0b50d0] border border-[#0b2447] text-white text-[10px] font-black h-7 rounded px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      이 아이디어 선택
                    </Button>
                  </div>
                  <h4 className="font-black text-sm text-[#0b2447] mt-2 group-hover:text-[#0b50d0] transition-colors">{idea.title}</h4>
                  <p className="text-xs text-[#475069] mt-1.5 leading-relaxed font-bold">{idea.description}</p>
                  <p className="text-[10px] text-[#0b2447] font-black mt-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <strong>목표 수치:</strong> {idea.targetEfficiency}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TemplateEditorPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen bg-secondary/30">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        }>
            <TemplatePage />
        </Suspense>
    );
}
