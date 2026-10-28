
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, User, Zap, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, onSnapshot } from 'firebase/firestore';

const navLinks = [
  { name: '홈', href: '/' },
  { name: '마켓', href: '/market' },
  { name: '내 문서', href: '/my-documents' },
  { name: '회사 정보', href: '/company-info' },
  { name: 'AI 기능', href: '/ai-features' },
  { name: '요금제', href: '/pricing' },
  { name: 'AI 양식', href: '/ai-forms' },
  { name: 'AI OCR', href: '/ai-ocr' },
  { name: '템플릿 보기', href: '/templates' },
  { name: '사업공고', href: '/announcements' },
  { name: '관련기관', href: '/related-organizations' },
  { name: '관리자', href: '/admin' },
];

const Header = ({ className }: { className?: string }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemNotice, setSystemNotice] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
  
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemNotice({
          active: data.noticeActive || false,
          message: data.emergencyNotice || ''
        });
      }
    }, (error) => {
      console.warn('System config snapshot read blocked (possibly waiting for auth or rules deploy):', error);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: '로그아웃', description: '성공적으로 로그아웃되었습니다.' });
      router.push('/');
    } catch (error) {
      toast({ variant: 'destructive', title: '오류', description: '로그아웃 중 오류가 발생했습니다.' });
    }
  };

  const isAdmin = user?.email === 'cyber924@naver.com';

  const filteredNavLinks = navLinks.filter(link => {
    if (link.href === '/market') return true;
    if (!user) {
      return !['/my-documents', '/company-info', '/ai-forms', '/ai-ocr', '/admin', '/announcements'].includes(link.href);
    }
    if (link.href === '/admin') {
      return isAdmin;
    }
    return true;
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {/* Emergency Notice Banner - Fixed at the very top */}
      {systemNotice.active && systemNotice.message && (
        <div className="bg-[#0b50d0] text-white py-3 px-4 overflow-hidden relative border-b-2 border-[#0b2447] shadow-md">
          <div className="container mx-auto flex items-center justify-center gap-3">
            <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
            <p className="text-[12px] sm:text-[13px] font-black tracking-tight text-center leading-tight">
              {systemNotice.message}
            </p>
          </div>
        </div>
      )}

      <header
        className={cn(
          'transition-all duration-300 border-b-2 border-[#e2e8f4]',
          scrolled || pathname !== '/' 
            ? 'bg-white/95 backdrop-blur-md shadow-sm h-16' 
            : 'bg-white/80 backdrop-blur-sm h-20',
          className,
        )}
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0b50d0] to-[#1463ff] flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(11,80,208,0.2)] border-2 border-[#0b2447]">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <span className="text-xl font-[900] tracking-tighter text-[#0b2447]">
              GOplan<span className="text-[#0b50d0]">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 mx-4">
            {filteredNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-[13.5px] font-black transition-all rounded-lg whitespace-nowrap border-2 border-transparent",
                  (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)))
                    ? "text-[#0b50d0] bg-[#e8f0ff] border-[#0b50d0]/30 shadow-sm"
                    : "text-[#475069] hover:text-[#0b50d0] hover:bg-[#f4f7fc]",
                  link.href === '/admin' && "text-[#7b86a0] opacity-80"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-11 w-11 rounded-xl bg-[#0b50d0] border-[3px] border-[#0b2447] p-0 flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] hover:translate-y-[-2px] transition-all">
                      <User className="w-5 h-5 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-3 bg-white border-[3px] border-[#0b2447] rounded-[20px] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] z-[100]">
                    <DropdownMenuLabel className="px-2 py-1.5">
                       <p className="text-[10px] font-black text-[#7b86a0] uppercase tracking-wider mb-1">Signed in as</p>
                       <p className="text-sm font-black text-[#0b2447] truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-2 bg-[#e2e8f4] h-0.5" />
                    <DropdownMenuItem asChild>
                      <Link href="/my-profile" className="flex items-center gap-3 cursor-pointer p-3 rounded-xl font-bold hover:bg-[#f4f7fc] text-[#0b2447]">
                        <div className="bg-[#e8f0ff] p-1.5 rounded-lg border-2 border-[#0b50d0]"><User className="w-4 h-4 text-[#0b50d0]" /></div>
                        내 정보 설정
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                        <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-3 cursor-pointer p-3 rounded-xl font-bold hover:bg-[#e8f0ff] text-[#0b50d0]">
                            <div className="bg-[#0b50d0] p-1.5 rounded-lg border-2 border-[#0b2447]"><ShieldCheck className="w-4 h-4 text-white" /></div>
                            관리자 콘솔
                        </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="my-2 bg-[#e2e8f4] h-0.5" />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 text-destructive cursor-pointer p-3 rounded-xl font-bold hover:bg-red-50">
                      <div className="bg-red-100 p-1.5 rounded-lg border-2 border-destructive"><LogOut className="w-4 h-4 text-destructive" /></div>
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-black text-[#0b2447] hover:text-[#0b50d0] transition-colors">로그인</Link>
                  <Button asChild className="h-11 px-6 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] font-black text-white shadow-[4px_4px_0px_0px_rgba(11,36,71,0.15)] hover:translate-y-[-2px] transition-all">
                    <Link href="/signup">시작하기</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Navigation Trigger */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#0b2447] border-[3px] border-[#0b50d0] rounded-xl h-11 w-11 shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)]">
                    <Menu className="w-7 h-7" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[310px] p-0 flex flex-col border-l-[4px] border-[#0b2447]">
                  <SheetHeader className="p-8 border-b-2 border-[#e2e8f4] bg-[#f4f7fc]">
                    <SheetTitle className="text-left flex items-center gap-2">
                        <Zap className="w-6 h-6 text-[#0b50d0] fill-[#0b50d0]" />
                        <span className="font-black text-2xl tracking-tighter text-[#0b2447]">GOplanAI</span>
                    </SheetTitle>
                  </SheetHeader>
                  
                  <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredNavLinks.map((link) => (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-5 py-4 text-base font-black rounded-xl border-2 transition-all",
                          pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                            ? "bg-[#0b50d0] text-white border-[#0b2447] shadow-[4px_4px_0px_0px_rgba(11,36,71,0.2)]" 
                            : "bg-white text-[#0b2447] border-transparent hover:bg-[#f4f7fc] hover:border-[#e2e8f4]"
                        )}
                      >
                        {link.name}
                        <ChevronRight className="w-5 h-5 opacity-40" />
                      </Link>
                    ))}
                  </nav>

                  <div className="p-8 border-t-2 border-[#e2e8f4] bg-[#f4f7fc]">
                    {user ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#0b2447] rounded-xl">
                             <div className="h-10 w-10 rounded-lg bg-[#0b50d0] border-2 border-[#0b2447] flex items-center justify-center text-white">
                                <User className="w-5 h-5 text-white" />
                             </div>
                             <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-black text-[#7b86a0] truncate">{user.email}</p>
                             </div>
                        </div>
                        <Button variant="destructive" className="w-full h-14 rounded-xl font-black border-2 border-[#0b2447] shadow-[4px_4px_0px_0px_rgba(11,36,71,0.1)]" onClick={handleLogout}>
                            로그아웃
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" asChild className="h-14 rounded-xl font-black border-2 border-[#0b2447] hover:bg-white"><Link href="/login" onClick={() => setMobileMenuOpen(false)}>로그인</Link></Button>
                        <Button asChild className="h-14 rounded-xl font-black bg-[#0b50d0] border-2 border-[#0b2447] text-white"><Link href="/signup" onClick={() => setMobileMenuOpen(false)}>가입하기</Link></Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Header;
