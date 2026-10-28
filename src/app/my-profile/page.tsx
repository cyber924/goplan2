'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save, User, Camera, Upload, Trash2, RotateCcw, Video, HelpCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { BASIC_GENERATION_LIMIT } from '@/lib/usage-limiter';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImage } from '@/lib/image-compression';

const AVATAR_PRESETS = {
  male: [
    { id: 'm1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80', label: '신뢰감 대표' },
    { id: 'm2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80', label: '스마트 기획자' },
    { id: 'm3', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&h=300&q=80', label: '클래식 포멀' },
    { id: 'm4', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&h=300&q=80', label: '스타트업 리더' },
  ],
  female: [
    { id: 'f1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80', label: '크리에이티브' },
    { id: 'f2', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&h=300&q=80', label: '세련된 오피스' },
    { id: 'f3', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80', label: '전문 컨설턴트' },
    { id: 'f4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80', label: '스마트 이사' },
  ],
};

const profileSchema = z.object({
  displayName: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().readonly(),
  grade: z.enum(['BASIC', 'PREMIUM', 'VIP']).readonly(),
  generationCount: z.number().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function MyProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [photoURL, setPhotoURL] = useState<string>('');
  
  // Camera & Upload States
  const [isOpen, setIsOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Help Guide States
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpStep, setHelpStep] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      phoneNumber: '',
      email: '',
      grade: 'BASIC',
      generationCount: 0,
    },
  });

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/my-profile');
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        const defaultValues: Partial<ProfileFormValues> = {
            email: user.email || '',
        };

        if (docSnap.exists()) {
            const userData = docSnap.data();
            setPhotoURL(userData.photoURL || user.photoURL || '');
            form.reset({
                ...defaultValues,
                displayName: userData.displayName || user.email?.split('@')[0] || '',
                phoneNumber: userData.phoneNumber || '',
                grade: userData.grade || 'BASIC',
                generationCount: userData.generationCount || 0,
            });
        } else {
             setPhotoURL(user.photoURL || '');
             form.reset({
                ...defaultValues,
                displayName: user.displayName || user.email?.split('@')[0] || '',
                phoneNumber: user.phoneNumber || '',
                grade: 'BASIC',
                generationCount: 0,
            });
        }
        setIsFetching(false);
    }, async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsFetching(false);
    });

    return () => unsubscribe();
  }, [user, router, toast, form]);

  const handleSave = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);
    
    const userDocRef = doc(db, 'users', user.uid);
    const dataToSave: any = {
      uid: user.uid,
      email: user.email,
      displayName: values.displayName,
      phoneNumber: values.phoneNumber,
      updatedAt: serverTimestamp(),
    };

    setDoc(userDocRef, dataToSave, { merge: true })
      .then(() => {
        toast({ title: '저장 완료', description: '프로필 정보가 성공적으로 업데이트되었습니다.' });
        setIsLoading(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
      });
  };
  
  // Camera and Upload Handlers
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setUploadMode('camera');
    } catch (err: any) {
      console.error('카메라 권한 오류:', err);
      setCameraError('카메라를 시작할 수 없습니다. 장치의 카메라 권한을 허용해 주시거나 다른 브라우저를 이용해 주세요.');
      setUploadMode('camera');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        
        // Center crop
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        context.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setUploadMode('preview');
        stopCamera();
      }
    }
  };

  const uploadPhoto = async (imageSource: string, skipCompression: boolean = false) => {
    if (!user) return;
    setIsUploadingPhoto(true);
    try {
      let finalImageSource = imageSource;
      
      // 기기 업로드 이미지인 경우 100KB 이하로 스마트 압축 및 리사이징 적용
      if (!skipCompression && imageSource.startsWith('data:')) {
        try {
          finalImageSource = await compressImage(imageSource, 100, 320);
        } catch (compressErr) {
          console.warn('압축 과정 도중 예외 발생, 원본 전송 시도:', compressErr);
        }
      }

      const response = await fetch(finalImageSource);
      const blob = await response.blob();
      
      const fileExtension = blob.type.split('/')[1] || 'jpg';
      const path = `images/${user.uid}/profile-${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { photoURL: downloadURL }, { merge: true });
      
      setPhotoURL(downloadURL);
      toast({
        title: '프로필 사진 변경 완료',
        description: '프로필 사진이 업로드되었습니다. (100KB 이하 스마트 최적화 완료!)',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('프로필 사진 업로드 오류:', error);
      toast({
        title: '업로드 실패',
        description: '사진 업로드 중 오류가 발생했습니다. 다시 시도해 주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const selectPresetAvatar = async (url: string) => {
    if (!user) return;
    setIsUploadingPhoto(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { photoURL: url }, { merge: true });
      
      setPhotoURL(url);
      toast({
        title: '추천 프로필 설정 완료',
        description: '비즈니스 언플래쉬 프리셋 이미지로 프로필 사진이 설정되었습니다.',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('프리셋 아바타 설정 오류:', error);
      toast({
        title: '설정 실패',
        description: '프로필 변경 도중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { photoURL: '' }, { merge: true });
      
      setPhotoURL('');
      toast({
        title: '프로필 사진 삭제 완료',
        description: '프로필 사진이 성공적으로 삭제되었습니다.',
      });
    } catch (error) {
      console.error('프로필 사진 삭제 에러:', error);
      toast({
        title: '삭제 실패',
        description: '사진 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          uploadPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setUploadMode('select');
      setCameraError(null);
      setCapturedImage(null);
    }
  }, [isOpen]);

  const GradeBadge = ({ grade }: { grade: string }) => {
    const variant = grade === 'VIP' ? 'default' : grade === 'PREMIUM' ? 'secondary' : 'outline';
    return <Badge variant={variant} className="text-lg px-4 py-1">{grade}</Badge>;
  };


  if (isFetching) {
     return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header />
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </main>
            <Footer />
        </div>
     )
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header />
      <main className="flex-1 py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <User className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-3xl font-bold font-headline">내 정보</CardTitle>
                  <CardDescription>프로필 정보를 확인하고 수정할 수 있습니다.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center justify-center pb-8 border-b mb-8 gap-4">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                    {photoURL ? (
                      <AvatarImage src={photoURL} alt="프로필 사진" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        <User className="w-16 h-16 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all cursor-pointer hover:scale-110 active:scale-95"
                    title="프로필 사진 변경"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    사진 변경
                  </Button>
                  {photoURL && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDeletePhoto}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      사진 삭제
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[#555] hover:text-primary hover:border-primary/50 transition-all"
                    onClick={() => {
                      setHelpStep(1);
                      setIsHelpOpen(true);
                    }}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    도움말
                  </Button>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-muted" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이름 (실명)</FormLabel>
                        <FormControl>
                          <Input placeholder="홍길동" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>휴대폰 번호</FormLabel>
                        <FormControl>
                          <Input placeholder="010-1234-5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="grid grid-cols-2 gap-8">
                    <FormItem>
                        <FormLabel>현재 등급</FormLabel>
                        <div className="flex items-center gap-4 pt-2">
                            <GradeBadge grade={form.getValues('grade')} />
                            <Button type="button" variant="outline" size="sm" asChild>
                                <Link href="/pricing">업그레이드</Link>
                            </Button>
                        </div>
                    </FormItem>
                    {form.getValues('grade') === 'BASIC' && (
                        <FormItem>
                            <FormLabel>이번 달 AI 생성</FormLabel>
                             <div className="flex items-center gap-4 pt-2">
                                <p className="text-lg font-semibold">
                                    {form.getValues('generationCount') || 0} / {BASIC_GENERATION_LIMIT} 회
                                </p>
                             </div>
                        </FormItem>
                    )}
                   </div>

                  <div className="flex justify-end pt-6 border-t">
                    <Button type="submit" size="lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                      변경사항 저장
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Photo Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg border-3 border-[#0b2447] bg-white rounded-[24px] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] z-[100] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline text-[#0b2447] flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              프로필 사진 설정
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7b86a0] font-medium">
              직접 사진을 올리거나 엄선된 고화질 비즈니스 스타일 프리셋을 즉시 사용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 pt-4">
            {/* 1. File Upload Section */}
            <div>
              <p className="text-xs font-black text-[#7b86a0] uppercase tracking-wider mb-2">기기에서 직접 업로드</p>
              <Button
                type="button"
                variant="outline"
                className="w-full h-20 flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ccc] hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <div className="text-left">
                  <p className="font-bold text-sm text-[#0b2447] group-hover:text-primary transition-colors">내 사진 가져오기</p>
                  <p className="text-[10px] text-muted-foreground">자동 스마트 리사이징 및 100KB 이내 WebP/JPEG 압축 저장</p>
                </div>
              </Button>
            </div>

            {/* 2. Male Presets Row */}
            <div>
              <p className="text-xs font-black text-[#7b86a0] uppercase tracking-wider mb-3">추천 비즈니스 스타일 (남성)</p>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_PRESETS.male.map((preset) => {
                  const isSelected = photoURL === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => !isUploadingPhoto && selectPresetAvatar(preset.url)}
                      disabled={isUploadingPhoto}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-sm focus:outline-none group cursor-pointer"
                      title={preset.label}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/75 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                          <Check className="w-6 h-6 text-white stroke-[3.5px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Female Presets Row */}
            <div>
              <p className="text-xs font-black text-[#7b86a0] uppercase tracking-wider mb-3">추천 비즈니스 스타일 (여성)</p>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_PRESETS.female.map((preset) => {
                  const isSelected = photoURL === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => !isUploadingPhoto && selectPresetAvatar(preset.url)}
                      disabled={isUploadingPhoto}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-sm focus:outline-none group cursor-pointer"
                      title={preset.label}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/75 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                          <Check className="w-6 h-6 text-white stroke-[3.5px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-[10px] text-[#7b86a0] bg-secondary/30 p-2.5 rounded-xl border border-[#e5e5e5] leading-relaxed">
              💡 <strong>스마트 사진 관리 가이드:</strong> 프리셋 이미지는 고성능 글로벌 CDN 기반으로 지연시간 없이 렌더링됩니다. 직접 소장 파일을 올리시는 경우 브라우저 레벨에서 가로세로 320px의 완벽한 1:1 비율 크롭 후 100KB 미만으로 완벽 압축 전송되어 고속 서빙됩니다.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Guide Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="sm:max-w-md border-3 border-[#0b2447] bg-white rounded-[20px] shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)] z-[110]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-headline text-[#0b2447] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              프로필 관리 도움말
            </DialogTitle>
            <DialogDescription className="text-xs text-[#7b86a0]">
              추천 프리셋 및 스마트 압축 업로드에 관한 유용한 정보를 확인하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4">
            {/* Steps Rendering */}
            {helpStep === 1 && (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0b2447]">1단계. 비즈니스 프리셋 선택</h3>
                <p className="text-sm text-[#555] leading-relaxed max-w-[280px]">
                  성별 및 이미지 스타일별로 제안된 <strong>고화질 비즈니스 인물화</strong>를 한번의 클릭으로 쉽고 빠르게 지정할 수 있습니다.
                </p>
              </div>
            )}

            {helpStep === 2 && (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0b2447]">2단계. 스마트 100KB 압축</h3>
                <p className="text-sm text-[#555] leading-relaxed max-w-[280px]">
                  개인 촬영 이미지를 수동으로 올릴 시, 브라우저가 똑똑하게 <strong>용량을 100KB 이내로 자동 조절 및 압축</strong>하여 서빙 속도를 최적화합니다.
                </p>
              </div>
            )}

            {helpStep === 3 && (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Save className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#0b2447]">3단계. 실시간 실서버 반영</h3>
                <p className="text-sm text-[#555] leading-relaxed max-w-[280px]">
                  사진 변경 완료와 동시에 파이어베이스 데이터베이스 및 스토리지 연동이 활성화되어, 새로고침 없이도 프로필 사진이 모든 페이지에 실시간 반영됩니다.
                </p>
              </div>
            )}

            {/* Stepper Dots Indicator */}
            <div className="flex items-center gap-2 mt-6">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  onClick={() => setHelpStep(step)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    helpStep === step ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Step Controls */}
            <div className="flex justify-between items-center w-full mt-8 pt-4 border-t border-[#f0f0f0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHelpStep((prev) => Math.max(1, prev - 1))}
                disabled={helpStep === 1}
                className="font-semibold text-xs border-[#ccc] hover:bg-[#f9f9f9]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>

              {helpStep < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setHelpStep((prev) => Math.min(3, prev + 1))}
                  className="font-semibold text-xs"
                >
                  다음 단계
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsHelpOpen(false)}
                  className="font-semibold text-xs bg-[#0b2447] hover:bg-[#0b2447]/90 text-white"
                >
                  확인 완료
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
