'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Save, Mail, ArrowLeft, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { generateAdminContent } from '@/ai/flows/admin-special-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  topic: z.string().min(10, '뉴스레터의 핵심 내용을 구체적으로 입력하세요.'),
  target: z.string().default('모든 회원님'),
  title: z.string().min(1, '제목을 입력하세요.'),
  content: z.string().min(1, '본문을 입력하세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminNewslettersPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: '', target: '모든 회원님', title: '', content: '' },
  });

  const fetchNewsletters = async () => {
    try {
      const q = query(collection(db, 'newsletters'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNewsletters(list);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'newsletters',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    }
  };

  useEffect(() => {
    if (!user || user.email !== 'cyber924@naver.com') {
      router.push('/');
      return;
    }
    fetchNewsletters();
  }, [user, router]);

  const handleAiDraft = async () => {
    const topic = form.getValues('topic');
    const target = form.getValues('target');
    if (!topic) {
      toast({ variant: 'destructive', title: '입력 부족', description: '뉴스레터 기획을 위해 주제를 입력하세요.' });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAdminContent({ type: 'newsletter', topic, target });
      form.setValue('title', result.title);
      form.setValue('content', result.content);
      toast({ title: 'AI 뉴스레터 초안 완성', description: '기호 없이 전문적인 문체로 다듬었습니다.' });
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: 'AI 생성 중 문제가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    const dataToSave = {
      title: values.title,
      content: values.content,
      target: values.target,
      createdAt: serverTimestamp(),
      author: user?.email,
      status: 'draft'
    };

    addDoc(collection(db, 'newsletters'), dataToSave)
      .then(() => {
        toast({ title: '저장 완료', description: '뉴스레터 초안이 저장되었습니다.' });
        form.reset();
        fetchNewsletters();
        setIsLoading(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'newsletters',
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      });
  };

  const handleDelete = async (id: string) => {
    const docRef = doc(db, 'newsletters', id);
    deleteDoc(docRef)
      .then(() => {
        fetchNewsletters();
        toast({ title: '삭제 완료' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button variant="outline" asChild className="mb-6 border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />관리 대시보드로 돌아가기</Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white h-fit">
              <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-black text-[#0b2447]">
                  <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-2 rounded-xl">
                    <Mail className="text-[#0b50d0] w-6 h-6" />
                  </div>
                  뉴스레터 제작
                </CardTitle>
                <CardDescription className="font-bold text-[#475069] mt-1">AI를 활용하여 독자들의 관심을 끄는 뉴스레터를 구성하세요.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="topic" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">뉴스레터 주요 소식 (주제)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="예: 이번 주 스타트업 트렌드, 새로운 템플릿 출시 기념 이벤트 등" className="border-2 border-[#0b50d0] rounded-xl font-bold bg-white focus-visible:ring-[#0b50d0]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="target" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">수신 대상</FormLabel>
                        <FormControl><Input className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" variant="secondary" className="w-full h-12 rounded-xl bg-[#f4f7fc] border-2 border-[#0b50d0] font-black text-[#0b50d0] hover:bg-[#e8f0ff] transition-all" onClick={handleAiDraft} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      AI 뉴스레터 구성하기
                    </Button>
                    <Separator className="my-6 bg-[#e2e8f4] h-[2px]" />
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">뉴스레터 제목</FormLabel>
                        <FormControl><Input className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">본문 내용 (순수 텍스트)</FormLabel>
                        <FormControl><Textarea rows={12} {...field} className="border-2 border-[#0b50d0] rounded-xl font-medium leading-relaxed bg-white text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                      뉴스레터 초안 저장
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
              <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
                <CardTitle className="text-2xl font-black text-[#0b2447]">발행 대기 및 이력</CardTitle>
                <CardDescription className="font-bold text-[#475069]">작성 중인 초안과 과거 발행 내역을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4] hover:bg-[#f4f7fc]">
                      <TableHead className="font-black text-[#0b2447] h-14 px-8">제목</TableHead>
                      <TableHead className="font-black text-[#0b2447] h-14">상태</TableHead>
                      <TableHead className="text-right font-black text-[#0b2447] h-14 px-8">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters.map((item) => (
                      <TableRow key={item.id} className="border-b-[1px] border-[#e2e8f4] hover:bg-[#f4f7fc]/50 transition-colors">
                        <TableCell className="font-bold text-[#0b2447] py-5 px-8 truncate max-w-[180px]">{item.title}</TableCell>
                        <TableCell>
                          <span className="text-[10px] px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-black border border-yellow-200">작성 중</span>
                        </TableCell>
                        <TableCell className="text-right px-8 space-x-2">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#0b50d0] hover:bg-[#e8f0ff] rounded-xl transition-all">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {newsletters.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-20 text-[#7b86a0] font-bold">이력이 없습니다.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
