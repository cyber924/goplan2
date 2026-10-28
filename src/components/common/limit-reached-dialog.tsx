
'use client';

import { useLimitReachedDialog } from "@/hooks/use-limit-reached-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function LimitReachedDialog() {
  const { isOpen, onClose } = useLimitReachedDialog();
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/pricing');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">월간 AI 생성 한도 도달</DialogTitle>
          <DialogDescription className="text-center">
            Basic 플랜의 AI 기능 사용 횟수를 모두 사용하셨습니다.
            <br />
            더 많은 기능을 무제한으로 사용하려면 플랜을 업그레이드하세요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>나중에 하기</Button>
          <Button onClick={handleUpgrade}>
            요금제 보러가기 <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
