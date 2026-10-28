'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Search, Info, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/client';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ITEMS_PER_PAGE = 6;

export default function AnnouncementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(list);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotices();
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notices, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredNotices.length / ITEMS_PER_PAGE);
  const paginatedNotices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotices, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const renderContentWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0b50d0] font-black underline break-all hover:text-[#1463ff] transition-colors"
          >
            [링크 보기]
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-2.5 rounded-xl shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]">
                <Megaphone className="w-6 h-6 text-[#0b50d0]" />
              </div>
              <div>
                <h1 className="text-3xl font-black font-headline text-[#0b2447]">공지사항</h1>
                <p className="text-xs font-bold text-[#475069] mt-0.5">최신 정부지원사업 소식을 확인하세요.</p>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="검색어 입력..."
                className="pl-9 h-11 border-2 border-[#0b50d0] rounded-xl focus-visible:ring-[#0b50d0] bg-white font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-[#0b50d0]" /></div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paginatedNotices.map((item) => (
                  <Card key={item.id} className="flex flex-col border-[3px] border-[#0b50d0] shadow-[6px_6px_0px_0px_rgba(11,80,208,0.1)] hover:translate-y-[-3px] transition-all duration-300 rounded-[20px] overflow-hidden bg-white h-full">
                    <CardHeader className="bg-white border-b-2 border-[#e2e8f4] p-5">
                      <div className="flex items-center justify-between mb-2">
                         <Badge variant="outline" className="bg-[#e8f0ff] border-2 border-[#0b50d0] text-[#0b50d0] font-black text-[9px] px-2 py-0.5 rounded-lg uppercase">
                           {item.source === 'bizinfo' ? 'EXTERNAL' : 'NOTICE'}
                         </Badge>
                         <span className="text-[10px] font-bold text-[#7b86a0]">
                           {item.createdAt?.toDate().toLocaleDateString()}
                         </span>
                      </div>
                      <CardTitle className="text-lg font-black text-[#0b2447] line-clamp-2 leading-snug">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 flex-grow">
                      <div className="text-xs text-[#475069] font-medium leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {renderContentWithLinks(item.content)}
                      </div>
                      
                      {item.externalLink && (
                        <div className="pt-4 mt-4 border-t-2 border-dashed border-[#e2e8f4]">
                          <Button asChild size="sm" className="w-full h-10 border-2 border-[#0b2447] bg-[#0b50d0] text-white font-black rounded-lg shadow-[3px_3px_0px_0px_rgba(11,36,71,0.1)] hover:bg-[#1463ff] transition-all text-[11px]">
                            <a href={item.externalLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              원본 공고 상세 보기
                            </a>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredNotices.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[26px] border-[3px] border-dashed border-[#0b50d0]">
                  <Info className="w-12 h-12 text-[#7b86a0] mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-black text-[#0b2447]">검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="flex justify-center items-center gap-4 pt-8">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] h-11 w-11 shadow-[3px_3px_0px_0px_rgba(11,80,208,0.1)]"
                    >
                        <ChevronLeft className="h-5 w-5 text-[#0b50d0]" />
                    </Button>
                    <div className="flex items-center bg-white border-2 border-[#0b50d0] px-5 h-11 rounded-xl shadow-[3px_3px_0px_0px_rgba(11,80,208,0.1)]">
                        <span className="text-sm font-black text-[#0b2447]">
                            {currentPage} <span className="text-[#7b86a0] font-bold mx-1">/</span> {totalPages}
                        </span>
                    </div>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] h-11 w-11 shadow-[3px_3px_0px_0px_rgba(11,80,208,0.1)]"
                    >
                        <ChevronRight className="h-5 w-5 text-[#0b50d0]" />
                    </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}