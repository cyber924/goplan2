'use client';

import { AuthProvider as FirebaseAuthProvider } from '@/contexts/auth-context';
import { Toaster } from "@/components/ui/toaster"
import { LimitReachedDialog } from '@/components/common/limit-reached-dialog';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export default function AuthProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseAuthProvider>
      <FirebaseErrorListener />
      <LimitReachedDialog />
      {children}
      <Toaster />
    </FirebaseAuthProvider>
  );
}
