
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, ArrowLeft, Bot, FileType, Trash2, Download, GripVertical, Pencil, Plus, Presentation, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { generateFormContent } from '@/ai/flows/generate-form-content';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateStyledHtml } from '@/lib/html-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import htmlDocx from 'html-docx-js/dist/html-docx';
import Link from 'next/link';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "라벨을 입력해주세요."),
  type: z.enum(['text', 'textarea', 'date']),
  placeholder: z.string().optional(),
  value: z.any().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  topic: z.string(),
  fields: z.array(fieldSchema),
});

type FormValues = z.infer<typeof formSchema>;

function AiFormEditPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();
  
  const formId = params.formId as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', topic: '', fields: [] },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "fields" });

  useEffect(() => {
    if (!user) {
        toast({variant: 'destructive', title: '로그인 필요', description: '이 페이지에 접근하려면 로그인이 필요합니다.'});
        router.push(`/login?redirect=/ai-forms/${formId}`);
        return;
    }
    if (!formId) {
        toast({variant: 'destructive', title: '오류', description: '문서 ID가 없습니다.'});
        router.push('/my-documents');
        return;
    }

    const fetchDocument = async () => {
      setIsInitializing(true);
      const docRef = doc(db, 'documents', formId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        const docData = docSnap.data();
        if (docData.type === 'form') {
            form.reset(docData.content);
        } else {
            toast({ variant: 'destructive', title: '잘못된 문서 타입', description: '이 문서는 AI 양식이 아닙니다.' });
            router.push('/my-documents');
        }
      } else {
        toast({ variant: 'destructive', title: '오류', description: '문서를 불러올 수 없거나 권한이 없습니다.' });
        router.push('/my-documents');
      }
      setIsInitializing(false);
    };

    fetchDocument();
  }, [user, formId, form, router, toast]);

  const handleGenerateContent = async (index: number) => {
    if (!user) {
        toast({ variant: 'destructive', title: '로그인 필요' });
        return;
    }
    const canProceed = await checkAndIncrementUsage(user.uid);
    if (!canProceed) {
        openLimitReachedDialog();
        return;
    }

    const fieldToFill = fields[index];
    setLoadingStates(prev => ({...prev, [fieldToFill.id]: true}));
    
    const allFieldsData = form.getValues('fields').map(f => ({
        id: f.id,
        label: f.label,
        value: f.value || '',
    }));

    try {
        const result = await generateFormContent({
            documentTitle: form.getValues('title'),
            targetField: { id: fieldToFill.id, label: fieldToFill.label },
            allFields: allFieldsData,
        });
        form.setValue(`fields.${index}.value`, result.content);
        toast({ title: 'AI 초안 생성 완료', description: `'${fieldToFill.label}' 항목이 채워졌습니다.` });
    } catch(error) {
        toast({ variant: 'destructive', title: '오류', description: 'AI 초안 생성 중 오류가 발생했습니다.' });
        console.error(error);
    } finally {
        setLoadingStates(prev => ({...prev, [fieldToFill.id]: false}));
    }
  };
  
  const handleToggleEdit = () => {
      setIsEditing(prev => !prev);
  }

  const handleSave = async (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: "로그인 필요" });
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, 'documents', formId);
      const originalDoc = await getDoc(docRef);

      if (!originalDoc.exists()) throw new Error("Document not found");

      await setDoc(docRef, { 
        ...originalDoc.data(),
        title: values.title,
        businessIdea: values.topic,
        updatedAt: new Date(),
        content: values,
       }, { merge: true });
      toast({ title: '저장 완료', description: '문서가 성공적으로 업데이트되었습니다.' });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving document:", error);
      toast({ variant: 'destructive', title: '저장 실패' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteDocument = async () => {
    if (formId && user) {
      try {
        await deleteDoc(doc(db, 'documents', formId));
        toast({ title: '삭제 완료', description: '문서가 삭제되었습니다.' });
        router.push('/my-documents');
      } catch (error) {
        toast({ variant: 'destructive', title: '삭제 실패' });
      }
    }
  };

  const handleDownloadHtml = async () => {
    const docDataFromDb = await getDoc(doc(db, 'documents', formId));
    if (!docDataFromDb.exists()) {
        toast({ variant: 'destructive', title: '오류', description: '문서를 찾을 수 없습니다.' });
        return;
    }
    const fullDocumentData = {
        ...docDataFromDb.data().content,
        type: docDataFromDb.data().type,
    };
    
    const htmlContent = await generateStyledHtml(fullDocumentData);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullDocumentData.title.replace(/ /g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadDocx = async () => {
    const docDataFromDb = await getDoc(doc(db, 'documents', formId));
    if (!docDataFromDb.exists()) {
        toast({ variant: 'destructive', title: '오류', description: '문서를 찾을 수 없습니다.' });
        return;
    }
    const fullDocumentData = {
        ...docDataFromDb.data().content,
        type: docDataFromDb.data().type,
    };
    
    const htmlContent = await generateStyledHtml(fullDocumentData);

    const blob = htmlDocx.asBlob(htmlContent);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fullDocumentData.title.replace(/ /g, '_')}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      move(dragItem.current, dragOverItem.current);
      dragItem.current = null;
      dragOverItem.current = null;
    }
  };

  const addNewField = () => {
    append({
        id: `custom-${Date.now()}`,
        label: "새로운 항목",
        type: 'text',
        placeholder: '내용을 입력하세요.',
        value: ''
    });
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
    <div className="flex flex-col min-h-screen bg-[#f4f7fc] print:bg-white">
      <Header className="print:hidden" />
      <main className="flex-1 py-12 md:py-24 print:py-0">
        <div className="container mx-auto px-4 max-w-5xl print:max-w-full">
           <div className="flex flex-wrap justify-between items-center gap-4 mb-8 print:hidden">
             <Button variant="outline" onClick={() => router.push('/my-documents')} className="border-2 border-[#0b50d0] rounded-xl font-bold hover:bg-[#e8f0ff]">
               <ArrowLeft className="mr-2 w-4 h-4"/> 내 문서로 돌아가기
             </Button>
             <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="border-2 border-[#0b50d0] rounded-xl font-bold hover:bg-[#e8f0ff]">
                  <Link href={`/report/${formId}`}><Presentation className="mr-2 w-4 h-4"/> 보고서 보기</Link>
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadHtml} className="border-2 border-[#0b50d0] rounded-xl font-bold hover:bg-[#e8f0ff]">
                  <Download className="mr-2 w-4 h-4" />HTML
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadDocx} className="border-2 border-[#0b50d0] rounded-xl font-bold hover:bg-[#e8f0ff]">
                  <Download className="mr-2 w-4 h-4" />Word
                </Button>
                <Button type="button" onClick={handleToggleEdit} className={cn(
                  "border-2 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] transition-all",
                  isEditing ? "bg-[#00b8d9] border-[#0b2447] hover:bg-[#00b8d9]/90" : "bg-[#0b50d0] border-[#0b2447] hover:bg-[#1463ff]"
                )}>
                  {isEditing ? <Save className="mr-2 w-4 h-4"/> : <Pencil className="mr-2 w-4 h-4"/>}
                  {isEditing ? '변경사항 반영' : '양식 편집'}
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button type="button" variant="destructive" className="border-2 border-[#0b2447] rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(11,36,71,0.1)]">
                         <Trash2 className="mr-2 w-4 h-4"/> 삭제
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-[3px] border-[#0b2447] rounded-[22px] shadow-[10px_10px_0px_0px_rgba(11,36,71,0.15)]">
                        <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-2xl text-[#0b2447]">정말로 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription className="font-bold text-[#475069]">이 문서를 삭제하면 복구할 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="border-2 rounded-xl font-bold">취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-bold">영구 삭제</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
           </div>
           
           <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)}>
              <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white print:shadow-none print:border-none">
                <CardHeader className="p-8 border-b-2 border-[#e2e8f4]">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-3 rounded-xl flex-shrink-0">
                          <FileType className="w-8 h-8 text-[#0b50d0]"/>
                        </div>
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                            <FormItem className="w-full">
                            <FormControl>
                                <Input
                                    {...field}
                                    className="text-3xl font-black font-headline h-auto p-0 border-0 shadow-none focus-visible:ring-0 bg-transparent text-[#0b2447] print:text-black"
                                    disabled={!isEditing}
                                    placeholder="문서 제목을 입력하세요"
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <CardDescription className="mt-2 text-lg font-bold text-[#475069] print:hidden">
                        {isEditing ? '필드명을 수정하거나, 필드를 추가, 삭제, 재정렬할 수 있습니다.' : 'AI가 생성한 양식입니다. 각 항목을 채우거나 AI 초안을 생성하여 문서를 완성하세요.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8" onDragOver={(e) => e.preventDefault()}>
                  <div className="space-y-10">
                    {fields.map((field, index) => (
                      <div 
                        key={field.id} 
                        className={cn(
                          "relative p-6 border-2 transition-all duration-200 rounded-[20px]",
                          isEditing ? "border-dashed border-[#0b50d0] bg-[#f4f7fc] group/item" : "border-transparent"
                        )}
                        draggable={isEditing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                      >
                         <div className="flex items-center justify-between mb-4">
                            {isEditing ? (
                                <div className="flex items-center gap-3 w-full">
                                  <GripVertical className="cursor-move text-[#7b86a0] w-6 h-6 flex-shrink-0" />
                                  <FormField control={form.control} name={`fields.${index}.label`} render={({ field: itemField }) => (
                                      <FormItem className="flex-grow">
                                        <FormControl>
                                          <Input {...itemField} className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white focus-visible:ring-[#0b50d0]" />
                                        </FormControl>
                                      </FormItem>
                                  )} />
                                  <Controller control={form.control} name={`fields.${index}.type`} render={({ field: { onChange, value } }) => (
                                    <Select onValueChange={onChange} value={value}>
                                        <SelectTrigger className="w-[160px] h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-2 border-[#0b50d0] font-bold">
                                            <SelectItem value="text">한 줄 텍스트</SelectItem>
                                            <SelectItem value="textarea">여러 줄 텍스트</SelectItem>
                                            <SelectItem value="date">날짜</SelectItem>
                                        </SelectContent>
                                    </Select>
                                  )} />
                                   <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-12 w-12 text-destructive hover:bg-destructive/10 rounded-xl">
                                        <Trash2 className="w-5 h-5"/>
                                   </Button>
                                </div>
                            ) : (
                                <FormLabel className="text-xl font-black text-[#0b2447]">{field.label}</FormLabel>
                            )}
                         </div>

                         {!isEditing && (
                            <FormField
                                control={form.control}
                                name={`fields.${index}.value`}
                                render={({ field: itemField }) => (
                                <FormItem>
                                    <div className="flex items-start gap-4 print:hidden">
                                    <FormControl>
                                        {field.type === 'textarea' ? (
                                            <Textarea 
                                              rows={6} 
                                              placeholder={field.placeholder || "내용을 입력하세요..."} 
                                              {...itemField} 
                                              className="border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-medium leading-relaxed bg-white text-base"
                                            />
                                        ) : (
                                            <Input 
                                              type={field.type} 
                                              placeholder={field.placeholder || "내용을 입력하세요..."} 
                                              {...itemField} 
                                              className="h-14 border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] font-bold bg-white text-base"
                                            />
                                        )}
                                    </FormControl>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleGenerateContent(index)} 
                                      disabled={loadingStates[field.id]}
                                      className="h-12 border-2 border-[#0b50d0] rounded-xl font-black text-[#0b50d0] hover:bg-[#e8f0ff] flex-shrink-0 mt-1"
                                    >
                                        {loadingStates[field.id] ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                                        AI 초안
                                    </Button>
                                    </div>
                                    <div className="hidden print:block text-base p-5 bg-[#f4f7fc] border-2 border-[#e2e8f4] rounded-xl whitespace-pre-wrap min-h-[40px] font-medium">
                                        {itemField.value || <span className="text-[#9aa6c0] italic">(입력 없음)</span>}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                         )}
                      </div>
                    ))}
                    
                    {isEditing && (
                        <div className="text-center pt-4">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={addNewField}
                              className="h-14 px-10 border-2 border-dashed border-[#0b50d0] text-[#0b50d0] font-black rounded-xl hover:bg-[#e8f0ff] hover:border-solid transition-all"
                            >
                                <Plus className="mr-2 w-5 h-5"/> 새로운 필드 추가
                            </Button>
                        </div>
                    )}
                    
                     <div className="flex justify-end pt-10 mt-12 border-t-2 border-[#e2e8f4] gap-4 print:hidden">
                          <Button 
                            type="submit" 
                            size="lg" 
                            disabled={isSaving}
                            className="h-16 px-12 bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.2)] transition-all hover:translate-y-[-2px] rounded-2xl text-lg"
                          >
                              {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                              {isSaving ? '저장 중...' : '문서 저장하기'}
                          </Button>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </form>
            </Form>
        </div>
      </main>
      <Footer className="print:hidden" />
    </div>
  );
}

export default function SuspendedAiFormEditPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        }>
            <AiFormEditPage />
        </Suspense>
    );
}
