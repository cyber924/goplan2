
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytes, getDownloadURL, updateMetadata } from 'firebase/storage';
import { generateImageTags } from '@/ai/flows/generate-image-tags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, FileImage, X, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { checkAndIncrementUsage } from '@/lib/usage-limiter';
import { useLimitReachedDialog } from '@/hooks/use-limit-reached-dialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadableFile {
    file: File;
    id: string;
    preview: string;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
    tags?: string[];
    errorMessage?: string;
}

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function MultiImageUploadFeature() {
    const [files, setFiles] = useState<UploadableFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const { onOpen: openLimitReachedDialog } = useLimitReachedDialog();

    const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
        if (fileRejections.length > 0) {
            fileRejections.forEach(({ errors }) => {
                errors.forEach((err: any) => {
                    toast({
                        variant: "destructive",
                        title: "파일 업로드 오류",
                        description: err.message,
                    });
                });
            });
        }
        
        const newFiles = acceptedFiles.map(file => ({
            file,
            id: `${file.name}-${file.lastModified}-${Math.random()}`,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: 'pending' as const,
        }));
        setFiles(prev => [...prev, ...newFiles]);
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] },
        maxSize: MAX_FILE_SIZE,
    });

    const removeFile = (id: string) => {
        const fileToRemove = files.find(f => f.id === id);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        setFiles(prev => prev.filter(file => file.id !== id));
    };

    const updateFileState = (id: string, newState: Partial<UploadableFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...newState } : f));
    };


    const handleUpload = async () => {
        const pendingFiles = files.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0) {
            toast({ variant: 'default', title: '파일 없음', description: '업로드할 파일을 먼저 추가해주세요.' });
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: '로그인 필요', description: '이미지를 업로드하려면 로그인이 필요합니다.' });
            return;
        }

        setIsUploading(true);

        const uploadPromises = pendingFiles.map(async (uploadableFile) => {
            const { file, id } = uploadableFile;
            try {
                const canProceed = await checkAndIncrementUsage(user.uid);
                if (!canProceed) {
                    throw new Error("월간 생성 한도를 초과했습니다.");
                }

                updateFileState(id, { status: 'uploading', progress: 25 });
                
                const path = user ? `images/${user.uid}/${Date.now()}-${file.name}` : `uploads/${Date.now()}-${file.name}`;
                const storageRef = ref(storage, path);
                
                const response = await fetch(uploadableFile.preview);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);

                updateFileState(id, { progress: 50, status: 'processing' });
                
                const dataUri = await fileToDataUri(file);
                const { tags } = await generateImageTags({ imageDataUri: dataUri });
                
                updateFileState(id, { progress: 75 });
                
                const title = `Uploaded: ${file.name}`;
                await updateMetadata(storageRef, {
                    customMetadata: {
                        tags: JSON.stringify(tags),
                        prompt: `Uploaded image: ${file.name}`,
                        title,
                    }
                });

                updateFileState(id, { status: 'success', tags, progress: 100 });
            } catch (error: any) {
                console.error(`Failed to upload ${file.name}:`, error);
                if (error.message.includes("한도")) {
                    openLimitReachedDialog();
                }
                updateFileState(id, { status: 'error', errorMessage: error.message || '업로드 실패' });
            }
        });
        
        await Promise.all(uploadPromises);
        
        setIsUploading(false);
        const errorCount = files.filter(f => f.status === 'error').length;
        if (errorCount > 0) {
             toast({ variant: 'destructive', title: '일부 업로드 실패', description: `${errorCount}개의 파일 업로드 중 오류가 발생했습니다.` });
        } else {
             toast({ title: '업로드 완료', description: '모든 파일이 성공적으로 업로드 및 처리되었습니다.' });
        }
    };

    const readyToUploadCount = useMemo(() => files.filter(f => f.status === 'pending').length, [files]);

    return (
        <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
            <CardHeader className="border-b-2 border-[#e2e8f4] p-8">
                <CardTitle className="text-3xl font-black text-[#0b2447]">멀티 이미지 업로드</CardTitle>
                <CardDescription className="text-lg font-bold text-[#475069]">
                    여러 이미지를 한 번에 올리고, AI가 자동으로 태그를 생성하여 체계적인 관리를 돕습니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div {...getRootProps()} className={cn("relative group w-full p-12 border-[3px] border-dashed border-[#0b50d0] rounded-[22px] bg-[#f4f7fc] transition-all duration-300 cursor-pointer hover:bg-[#e8f0ff]", isDragActive && 'bg-[#e8f0ff]')}>
                    <input {...getInputProps()} disabled={isUploading} />
                    <div className="flex flex-col items-center justify-center text-center">
                        <UploadCloud className="w-16 h-16 text-[#0b50d0] group-hover:scale-110 transition-transform" />
                        <p className="mt-4 text-xl font-black text-[#0b2447]">클릭 또는 드래그하여 파일 추가</p>
                        <p className="mt-1 text-sm font-bold text-[#7b86a0]">PNG, JPG, WEBP (최대 5MB)</p>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-[#0b2447]">업로드 대기열 ({files.length})</h3>
                        </div>
                        <ScrollArea className="h-80 w-full rounded-xl border-2 border-[#e2e8f4] p-4 bg-white">
                            {files.map(f => (
                                <div key={f.id} className="flex items-center gap-4 mb-4 p-3 rounded-lg border-2 border-transparent hover:border-[#e8f0ff] hover:bg-[#f4f7fc] transition-all">
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-[#0b50d0]">
                                        <Image src={f.preview} alt={f.file.name} fill className="object-cover" />
                                    </div>
                                    <div className="flex-grow space-y-1">
                                        <p className="font-bold text-sm text-[#0b2447] truncate">{f.file.name}</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-[#7b86a0]">
                                            {f.status === 'pending' && <><FileImage className="w-3 h-3" /><span>대기중</span></>}
                                            {f.status === 'uploading' && <><Loader2 className="w-3 h-3 animate-spin text-[#0b50d0]" /><span>업로드 중...</span></>}
                                            {f.status === 'processing' && <><Sparkles className="w-3 h-3 animate-spin text-yellow-500" /><span>AI 태그 생성 중...</span></>}
                                            {f.status === 'success' && <><CheckCircle className="w-3 h-3 text-green-500" /><span>완료</span></>}
                                            {f.status === 'error' && <><AlertCircle className="w-3 h-3 text-destructive" /><span>오류</span></>}
                                        </div>
                                        { (f.status === 'uploading' || f.status === 'processing') && <Progress value={f.progress} className="h-2 bg-[#e2e8f4]"/> }
                                        {f.tags && <div className="flex flex-wrap gap-1 mt-1">{f.tags.map(t => <span key={t} className="text-[10px] bg-[#e8f0ff] text-[#0b50d0] px-2 py-0.5 rounded-full font-bold">#{t}</span>)}</div>}
                                        {f.errorMessage && <p className="text-[10px] text-destructive font-bold">{f.errorMessage}</p>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFile(f.id)} disabled={isUploading && f.status !== 'pending' && f.status !== 'error'}>
                                        <X className="w-4 h-4"/>
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                        <Button size="lg" className="w-full h-14 rounded-xl bg-[#0b50d0] border-2 border-[#0b2447] text-white hover:bg-[#1463ff] font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] transition-all hover:translate-y-[-2px]" onClick={handleUpload} disabled={isUploading || readyToUploadCount === 0}>
                            {isUploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <UploadCloud className="mr-2 h-5 w-5"/>}
                            {isUploading ? '업로드 및 분석 진행 중...' : `선택한 파일 ${readyToUploadCount}개 업로드 시작`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
