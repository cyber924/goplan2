import { cn } from "@/lib/utils";
import Link from "next/link";
import { Zap } from "lucide-react";

const Footer = ({ className }: { className?: string }) => {
  return (
    <footer className={cn("bg-[#0b2447] text-[#aebbd6] py-16 md:py-20", className)}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-white/10">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-[32px] h-[32px] rounded-[9px] bg-gradient-to-br from-[#0b50d0] to-[#00b8d9] flex items-center justify-center text-white">
                <Zap className="w-4 h-4 fill-white" />
              </span>
              <span className="text-[20px] font-[800] tracking-tight text-white">
                GOplan<span className="text-[#00b8d9]">AI</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-[#8a99ba] max-w-[280px]">
              AI 기반 정부지원사업 사업계획서 자동화 플랫폼. 당신의 아이디어가 합격에 닿을 때까지 함께합니다.
            </p>
          </div>
          
          <div className="space-y-4">
            <h5 className="text-white text-sm font-bold tracking-wider">서비스</h5>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/ai-features" className="hover:text-white transition-colors">AI 기능</Link>
              <Link href="/ai-forms" className="hover:text-white transition-colors">AI 양식</Link>
              <Link href="/ai-ocr" className="hover:text-white transition-colors">AI OCR</Link>
              <Link href="/templates" className="hover:text-white transition-colors">템플릿 보기</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">요금제</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-white text-sm font-bold tracking-wider">정보</h5>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/announcements" className="hover:text-white transition-colors">사업공고</Link>
              <Link href="/related-organizations" className="hover:text-white transition-colors">관련기관</Link>
              <Link href="/company-info" className="hover:text-white transition-colors">회사 정보</Link>
              <Link href="/my-documents" className="hover:text-white transition-colors">내 문서</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-white text-sm font-bold tracking-wider">고객지원</h5>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="#" className="hover:text-white transition-colors">자주 묻는 질문</Link>
              <Link href="#" className="hover:text-white transition-colors">이용 가이드</Link>
              <Link href="#" className="hover:text-white transition-colors">문의하기</Link>
              <Link href="/announcements" className="hover:text-white transition-colors">공지사항</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-2 pt-8 text-[12.5px] text-[#8a99ba]">
          <span><b>회사명</b> 파운드(FOUND)</span>
          <span><b>대표자</b> 윤지윤</span>
          <span><b>사업자등록번호</b> 000-00-00000</span>
          <span><b>주소</b> 서울특별시 강남구 테헤란로</span>
          <span><b>고객센터</b> 1600-0000</span>
          <span><b>이메일</b> help@goplanai.kr</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 text-[12.5px] text-[#7d8cae]">
          <p>© 2026 FOUND Inc. All rights reserved. GOplanAI.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">利用약관</Link>
            <Link href="#" className="hover:text-white transition-colors">개인정보처리방침</Link>
            <Link href="#" className="hover:text-white transition-colors">환불정책</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;