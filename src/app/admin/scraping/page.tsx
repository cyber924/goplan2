
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DownloadCloud, ArrowLeft, ExternalLink, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { scrapeBizinfoAnnouncements, type ScrapeBizinfoOutput } from '@/ai/flows/scrape-bizinfo-flow';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminScrapingPage() {
  const [isScraping, setIsScraping] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.email !== 'cyber924@naver.com') {
      router.push('/');
      return;
    }
  }, [user, router]);

  const handleStartScrape = async () => {
    setIsScraping(true);
    try {
      const result = await scrapeBizinfoAnnouncements();
      setAnnouncements(result.announcements);
      toast({ title: '수집 완료', description: `기업마당에서 ${result.announcements.length}개의 공고를 가져왔습니다.` });
    } catch (error) {
      toast({ variant: 'destructive', title: '수집 실패', description: '크롤링 중 오류가 발생했습니다.' });
    } finally {
      setIsScraping(false);
    }
  };

  const handlePublish = (item: any) => {
    if (!user) return;
    setPublishingId(item.id);

    const dataToSave = {
      title: `[외부공고] ${item.title}`,
      content: `[기관: ${item.org}]\n[기간: ${item.period}]\n\n본 공고는 기업마당에서 수집된 정보입니다. 자세한 내용은 아래 링크를 확인하세요.\n\n링크: ${item.link}`,
      createdAt: serverTimestamp(),
      author: '시스템(크롤러)',
      source: 'bizinfo',
      externalLink: item.link
    };

    addDoc(collection(db, 'announcements'), dataToSave)
      .then(() => {
        setPublishedIds(prev => [...prev, item.id]);
        toast({ title: '게시 성공', description: '공고가 성공적으로 등록되었습니다.' });
        setPublishingId(null);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'announcements',
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        setPublishingId(null);
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

          <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white mb-10">
            <CardHeader className="border-b-2 border-[#e2e8f4] p-8 md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center gap-4">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-3 rounded-xl">
                  <DownloadCloud className="w-8 h-8 text-[#0b50d0]" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black text-[#0b2447]">기업마당 공고 수집</CardTitle>
                  <CardDescription className="text-lg font-bold text-[#475069]">외부 사이트의 지원사업 공고를 실시간으로 긁어와 게시물로 변환합니다.</CardDescription>
                </div>
              </div>
              <Button 
                onClick={handleStartScrape} 
                disabled={isScraping}
                className="h-14 px-8 bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px] rounded-xl"
              >
                {isScraping ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <DownloadCloud className="mr-2 h-6 w-6" />}
                최신 공고 수집 시작
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {announcements.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4] hover:bg-[#f4f7fc]">
                        <TableHead className="font-black text-[#0b2447] h-14 px-8">공고 제목</TableHead>
                        <TableHead className="font-black text-[#0b2447] h-14">주관기관</TableHead>
                        <TableHead className="font-black text-[#0b2447] h-14">접수기간</TableHead>
                        <TableHead className="text-right font-black text-[#0b2447] h-14 px-8">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.map((item) => (
                        <TableRow key={item.id} className="border-b-[1px] border-[#e2e8f4] hover:bg-[#f4f7fc]/50 transition-colors">
                          <TableCell className="font-bold text-[#0b2447] py-5 px-8">
                            <div className="flex flex-col gap-1">
                                <span className="line-clamp-1">{item.title}</span>
                                <Link href={item.link} target="_blank" className="text-[10px] text-[#0b50d0] flex items-center hover:underline">
                                    <ExternalLink className="w-2.5 h-2.5 mr-1" /> 원본 보기
                                </Link>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-[#475069]">{item.org}</TableCell>
                          <TableCell className="text-[#7b86a0] font-bold text-xs">{item.period}</TableCell>
                          <TableCell className="text-right px-8">
                            {publishedIds.includes(item.id) ? (
                                <Badge className="bg-green-100 text-green-700 border-2 border-green-200 py-1.5 px-3 rounded-lg font-black">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> 게시됨
                                </Badge>
                            ) : (
                                <Button 
                                    onClick={() => handlePublish(item)} 
                                    disabled={publishingId === item.id}
                                    size="sm"
                                    className="bg-white border-2 border-[#0b50d0] text-[#0b50d0] font-black hover:bg-[#e8f0ff] rounded-xl transition-all shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]"
                                >
                                    {publishingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                    우리 사이트에 게시
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-32">
                    <DownloadCloud className="w-16 h-16 text-[#7b86a0] mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-black text-[#0b2447]">수집된 공고가 없습니다.</p>
                    <p className="text-[#475069] font-bold mt-2">상단의 버튼을 눌러 크롤링을 시작하세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
