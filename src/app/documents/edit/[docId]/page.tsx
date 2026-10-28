'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Link as LinkIcon, Download, FileText, Presentation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { generateStyledHtml } from '@/lib/html-generator';
import htmlDocx from 'html-docx-js/dist/html-docx';
import Link from 'next/link';

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
});

const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  businessIdea: z.string(),
  sections: z.array(sectionSchema),
  type: z.string(),
  content: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;


function DocumentEditPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUrlModalOpen, setUrlModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'image' | 'link' | null>(null);
  const [modalInputValue, setModalInputValue] = useState({ url: '', text: '' });
  const activeSectionIndexRef = useRef<number | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  
  const docId = params.docId as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', businessIdea: '', sections: [], type: 'template' },
  });

  const { fields } = useFieldArray({ control: form.control, name: "sections" });

  useEffect(() => {
    if (!user) {
        toast({variant: 'destructive', title: '로그인 필요', description: '이 페이지에 접근하려면 로그인이 필요합니다.'});
        router.push(`/login?redirect=/documents/edit/${docId}`);
        return;
    }
    if (!docId) {
        toast({variant: 'destructive', title: '오류', description: '문서 ID가 없습니다.'});
        router.push('/my-documents');
        return;
    }

    const fetchDocument = async () => {
      setIsInitializing(true);
      const docRef = doc(db, 'documents', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        const docData = docSnap.data();
        form.reset({
            ...docData.content,
            type: docData.type,
            content: docData.content,
        });
      } else {
        toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없거나 권한이 없습니다.' });
        router.push('/my-documents');
      }
      setIsInitializing(false);
    };

    fetchDocument();
  }, [user, docId, form, router, toast]);

  const handleSave = async (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: "로그인 필요", description: "문서를 저장하려면 로그인이 필요합니다." });
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, 'documents', docId);
      const originalDocSnap = await getDoc(docRef);

      if (!originalDocSnap.exists()) {
        toast({ variant: 'destructive', title: '오류', description: '원본 문서를 찾을 수 없습니다.' });
        setIsSaving(false);
        return;
      }
      
      const originalDocData = originalDocSnap.data();
      
      const updatedContent = {
          ...originalDocData.content,
          title: values.title,
          businessIdea: values.businessIdea,
          sections: values.sections,
      };

      const docDataToUpdate = {
        ...originalDocData,
        title: values.title,
        businessIdea: values.businessIdea,
        content: updatedContent,
        updatedAt: new Date(),
      };

      await setDoc(docRef, docDataToUpdate);
      toast({ title: '저장 완료', description: '문서가 성공적으로 업데이트되었습니다.' });
    } catch (error) {
      console.error("Error saving document:", error);
      toast({ variant: 'destructive', title: '저장 실패', description: '문서 저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  const openUrlModal = (type: 'image' | 'link', index: number) => {
    activeSectionIndexRef.current = index;
    setModalType(type);
    setUrlModalOpen(true);
  };
  
  const handleUrlModalSubmit = () => {
    const index = activeSectionIndexRef.current;
    if (index === null) return;

    const currentContent = form.getValues(`sections.${index}.content`);
    let markdownToAdd = '';
    if (modalType === 'image') {
      markdownToAdd = `\n\n![${modalInputValue.text || 'image'}](${modalInputValue.url})\n\n`;
    } else if (modalType === 'link') {
      markdownToAdd = ` [${modalInputValue.text || modalInputValue.url}](${modalInputValue.url}) `;
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
    link.download = `${docData.title.replace(/ /g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    const docData = form.getValues();
    const htmlContent = await generateStyledHtml(docData);
    
    const blob = htmlDocx.asBlob(htmlContent);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docData.title.replace(/ /g, '_')}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-screen bg-secondary/30 print:bg-white">
      <Header className="print:hidden"/>
      <main className="flex-1 py-12 md:py-24 print:py-0">
        <div className="container mx-auto px-4 max-w-4xl print:max-w-full">
           <div className="flex justify-between items-center mb-8 print:hidden">
             <Button variant="outline" onClick={() => router.push('/my-documents')} className="cursor-pointer">
               <ArrowLeft className="mr-2"/> 내 문서로 돌아가기
             </Button>
             <div className="flex gap-2">
                <Button asChild variant="outline"><Link href={`/report/${docId}`}><Presentation className="mr-2"/> 보고서 보기</Link></Button>
                <Button type="button" variant="outline" onClick={handleDownloadHtml}><Download className="mr-2"/> HTML</Button>
                <Button type="button" variant="outline" onClick={handleDownloadDocx}><Download className="mr-2"/> Word</Button>
             </div>
           </div>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
              <Card className="print:shadow-none print:border-none">
                  <CardHeader>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                      <FormItem>
                      <FormLabel className="sr-only">문서 제목</FormLabel>
                      <FormControl>
                          <Input
                              {...field}
                              className="text-4xl font-bold h-auto p-2 border-0 shadow-none focus-visible:ring-0 bg-transparent print:text-black"
                              placeholder="문서 제목을 입력하세요."
                          />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )} />
                  </CardHeader>
                  <CardContent>
                      <Card className="special-card">
                          <CardHeader>
                              <CardTitle className="flex items-center gap-2"><FileText />핵심 사업 아이디어</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <FormField
                                  control={form.control}
                                  name="businessIdea"
                                  render={({ field }) => (
                                  <FormItem>
                                  <FormLabel className="sr-only">핵심 사업 아이디어</FormLabel>
                                  <FormControl>
                                      <Textarea
                                          {...field}
                                          rows={5}
                                          className="text-base leading-relaxed mt-2 print:hidden"
                                          placeholder="여기에 핵심 사업 아이디어를 입력하세요."
                                      />
                                  </FormControl>
                                  <div className="hidden print:block text-base p-4 bg-gray-100 rounded-md whitespace-pre-wrap min-h-[40px]">
                                      {field.value || <span className="text-gray-400">(입력 없음)</span>}
                                  </div>
                                  <FormMessage />
                                  </FormItem>
                              )} />
                          </CardContent>
                      </Card>
                  </CardContent>
              </Card>
              
              {fields.map((field, index) => (
                  <Card key={field.id} className="print:shadow-none print:border-none">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2"><FileText />{field.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <FormField
                              control={form.control}
                              name={`sections.${index}.content`}
                              render={({ field: textareaField }) => (
                              <FormItem>
                              <FormLabel className="sr-only">{field.title}</FormLabel>
                              <FormControl>
                                  <Textarea
                                      {...textareaField}
                                      rows={10}
                                      className="text-base leading-relaxed print:hidden"
                                      placeholder="여기를 클릭하여 내용을 입력하세요."
                                  />
                              </FormControl>
                              <div className="hidden print:block text-base p-4 bg-gray-100 rounded-md whitespace-pre-wrap min-h-[40px]">
                                  {textareaField.value || <span className="text-gray-400">(입력 없음)</span>}
                              </div>
                              <FormMessage />
                              </FormItem>
                          )} />
                          <div className="flex gap-2 pt-2 print:hidden">
                              <Button type="button" variant="outline" size="sm" onClick={() => openUrlModal('image', index)}><ImageIcon className="mr-2 h-4 w-4" />URL 이미지</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => openUrlModal('link', index)}><LinkIcon className="mr-2 h-4 w-4" />링크 추가</Button>
                          </div>
                      </CardContent>
                  </Card>
              ))}
              
              <div className="flex justify-end pt-8 mt-12 border-t-2 gap-4 print:hidden">
                  <Button type="submit" size="lg" disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                      {isSaving ? '저장 중...' : '저장하기'}
                  </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
      <Footer className="print:hidden"/>
    </div>

    <Dialog open={isUrlModalOpen} onOpenChange={setUrlModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalType === 'image' ? 'URL로 이미지 추가' : '링크 추가'}</DialogTitle>
            <DialogDescription>본문에 추가할 내용의 Markdown 코드를 생성합니다.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">URL</Label>
              <Input id="url" value={modalInputValue.url} onChange={(e) => setModalInputValue(v => ({...v, url: e.target.value}))} className="col-span-3" placeholder="https://example.com/image.png" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="text" className="text-right">{modalType === 'image' ? '대체 텍스트' : '표시 텍스트'}</Label>
              <Input id="text" value={modalInputValue.text} onChange={(e) => setModalInputValue(v => ({...v, text: e.target.value}))} className="col-span-3" placeholder={modalType === 'image' ? '예: 멋진 풍경' : '예: 내 웹사이트'} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUrlModalSubmit}>추가하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SuspendedDocumentEditPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        }>
            <DocumentEditPage />
        </Suspense>
    );
}