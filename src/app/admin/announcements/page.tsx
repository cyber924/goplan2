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
import { Loader2, Sparkles, Save, Megaphone, ArrowLeft, Trash2 } from 'lucide-react';
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
  topic: z.string().min(5, '공지하고자 하는 핵심 내용을 5자 이상 입력하세요.'),
  title: z.string().min(1, '제목을 입력하세요.'),
  content: z.string().min(1, '본문을 입력하세요.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminAnnouncementsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: '', title: '', content: '' },
  });

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(list);
    } catch (error: any) {
       if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'announcements',
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
    fetchAnnouncements();
  }, [user, router]);

  const handleAiDraft = async () => {
    const topic = form.getValues('topic');
    if (!topic) {
      toast({ variant: 'destructive', title: '입력 부족', description: 'AI 초안을 만들려면 먼저 주제를 입력하세요.' });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAdminContent({ type: 'announcement', topic });
      form.setValue('title', result.title);
      form.setValue('content', result.content);
      toast({ title: 'AI 초안 생성 완료', description: '기호 없는 깔끔한 텍스트로 생성되었습니다.' });
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
      createdAt: serverTimestamp(),
      author: user?.email,
    };

    addDoc(collection(db, 'announcements'), dataToSave)
      .then(() => {
        toast({ title: '게시 완료', description: '공지사항이 성공적으로 등록되었습니다.' });
        form.reset();
        fetchAnnouncements();
        setIsLoading(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'announcements',
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      });
  };

  const handleDelete = async (id: string) => {
    const docRef = doc(db, 'announcements', id);
    deleteDoc(docRef)
      .then(() => {
        fetchAnnouncements();
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
                    <Megaphone className="text-[#0b50d0] w-6 h-6" />
                  </div>
                  공지사항 작성
                </CardTitle>
                <CardDescription className="font-bold text-[#475069] mt-1">AI를 사용하여 전문가 수준의 공지사항을 즉시 작성하세요.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="topic" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">AI에게 알려줄 주제</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 서버 점검 안내, 신규 템플릿 업데이트 소식" className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white focus-visible:ring-[#0b50d0]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" variant="secondary" className="w-full h-12 rounded-xl bg-[#f4f7fc] border-2 border-[#0b50d0] font-black text-[#0b50d0] hover:bg-[#e8f0ff] transition-all shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)]" onClick={handleAiDraft} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      AI 초안 작성하기
                    </Button>
                    <Separator className="my-6 bg-[#e2e8f4] h-[2px]" />
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">게시글 제목</FormLabel>
                        <FormControl><Input className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold bg-white" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[#0b2447]">본문 내용 (순수 텍스트)</FormLabel>
                        <FormControl><Textarea rows={10} {...field} className="border-2 border-[#0b50d0] rounded-xl font-medium leading-relaxed bg-white text-sm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                      공지사항 게시하기
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
              <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
                <CardTitle className="text-2xl font-black text-[#0b2447]">게시된 공지사항 목록</CardTitle>
                <CardDescription className="font-bold text-[#475069]">최근 등록된 공지사항을 확인하고 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4] hover:bg-[#f4f7fc]">
                      <TableHead className="font-black text-[#0b2447] h-14 px-8">제목</TableHead>
                      <TableHead className="font-black text-[#0b2447] h-14">날짜</TableHead>
                      <TableHead className="text-right font-black text-[#0b2447] h-14 px-8">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((item) => (
                      <TableRow key={item.id} className="border-b-[1px] border-[#e2e8f4] hover:bg-[#f4f7fc]/50 transition-colors">
                        <TableCell className="font-bold text-[#0b2447] py-5 px-8 truncate max-w-[200px]">{item.title}</TableCell>
                        <TableCell className="text-[#7b86a0] font-medium text-xs">
                          {item.createdAt?.toDate().toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {announcements.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-20 text-[#7b86a0] font-bold">게시된 공지사항이 없습니다.</TableCell></TableRow>
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
