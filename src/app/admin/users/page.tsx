'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, ArrowLeft, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface UserProfile {
  id: string; // Document ID (same as uid)
  uid: string;
  email: string;
  createdAt: Timestamp | Date;
  displayName: string;
  grade: 'BASIC' | 'PREMIUM' | 'VIP';
}

export default function CustomerManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/admin/users');
      return;
    }
    if (user.email !== 'cyber924@naver.com') {
        router.push('/');
        return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            grade: doc.data().grade || 'BASIC' 
        })) as UserProfile[];
        
        userList.sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });

        setUsers(userList);
      } catch (error: any) {
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: 'users',
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
          }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user, router, toast]);

  const handleDeleteUser = async (userId: string) => {
    const userDocRef = doc(db, "users", userId);
    deleteDoc(userDocRef)
      .then(() => {
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        toast({ title: '성공', description: '사용자 정보가 삭제되었습니다.' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleGradeChange = async (userId: string, newGrade: 'BASIC' | 'PREMIUM' | 'VIP') => {
    const userDocRef = doc(db, 'users', userId);
    const dataToUpdate = { grade: newGrade };
    
    updateDoc(userDocRef, dataToUpdate)
      .then(() => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, grade: newGrade } : u);
        setUsers(updatedUsers);
        toast({ title: '등급 변경', description: `사용자의 등급이 ${newGrade}(으)로 변경되었습니다.` });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const formatDate = (date: Timestamp | Date | null) => {
    if (!date) return 'N/A';
    const jsDate = date instanceof Timestamp ? date.toDate() : new Date(date);
    return jsDate.toLocaleDateString('ko-KR');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <Button asChild variant="outline" className="mb-6 border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />관리 대시보드로 돌아가기</Link>
          </Button>
          <Card className="border-[3px] border-[#0b50d0] shadow-[10px_10px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
            <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
              <div className="flex items-center gap-4">
                <div className="bg-[#e8f0ff] border-2 border-[#0b50d0] p-3 rounded-xl">
                  <Users className="w-8 h-8 text-[#0b50d0]" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black font-headline text-[#0b2447]">고객 관리</CardTitle>
                  <CardDescription className="text-lg font-bold text-[#475069]">가입한 사용자 목록을 확인하고 서비스 이용 등급을 조정합니다.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col justify-center items-center h-64 text-[#7b86a0]">
                  <Loader2 className="w-12 h-12 animate-spin text-[#0b50d0] mb-4" />
                  <p className="font-bold">사용자 정보를 불러오는 중...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4] hover:bg-[#f4f7fc]">
                        <TableHead className="font-black text-[#0b2447] h-14 px-8">이메일</TableHead>
                        <TableHead className="font-black text-[#0b2447] h-14">이름</TableHead>
                        <TableHead className="font-black text-[#0b2447] h-14">가입일</TableHead>
                        <TableHead className="font-black text-[#0b2447] h-14">등급</TableHead>
                        <TableHead className="text-right font-black text-[#0b2447] h-14 px-8">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-b-[1px] border-[#e2e8f4] hover:bg-[#f4f7fc]/50 transition-colors">
                          <TableCell className="font-bold text-[#0b2447] py-5 px-8">{u.email}</TableCell>
                          <TableCell className="font-medium text-[#475069]">{u.displayName}</TableCell>
                          <TableCell className="text-[#7b86a0] font-medium">{formatDate(u.createdAt)}</TableCell>
                          <TableCell>
                            <Select
                              value={u.grade}
                              onValueChange={(newGrade: 'BASIC' | 'PREMIUM' | 'VIP') => handleGradeChange(u.id, newGrade)}
                            >
                              <SelectTrigger className="w-[120px] h-10 border-2 border-[#0b50d0] rounded-xl font-black bg-white focus:ring-[#0b50d0]">
                                <SelectValue placeholder="등급 선택" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-2 border-[#0b50d0] font-bold">
                                <SelectItem value="BASIC">BASIC</SelectItem>
                                <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                                <SelectItem value="VIP">VIP</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right px-8">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="border-[4px] border-[#0b2447] rounded-[26px] shadow-[12px_12px_0px_0px_rgba(11,36,71,0.2)]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-black text-2xl text-[#0b2447]">사용자 영구 삭제</AlertDialogTitle>
                                  <AlertDialogDescription className="font-bold text-base text-[#475069]">
                                    <span className="text-[#0b50d0]">{u.email}</span> 님의 모든 정보를 삭제하시겠습니까?<br />
                                    이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="pt-4">
                                  <AlertDialogCancel className="border-2 rounded-xl font-black h-12">취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-black h-12">영구 삭제</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
