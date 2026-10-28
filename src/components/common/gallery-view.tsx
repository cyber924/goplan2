'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Trash2, Loader2, Search, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { db, storage } from '@/lib/firebase/client';
import { listAll, ref, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';


interface ImageInfo {
    url: string;
    prompt: string;
    title: string;
    path: string;
}

interface GalleryViewProps {
    onImageSelect: (imageUrl: string) => void;
}

export default function GalleryView({ onImageSelect }: GalleryViewProps) {
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const { toast } = useToast();
    const { user } = useAuth();

    const fetchClientImages = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchPromises: Promise<ImageInfo[]>[] = [];

            // 1. Fetch public images from 'uploads/'
            const publicFolderRef = ref(storage, 'uploads/');
            fetchPromises.push(processFolder(publicFolderRef));
            
            // 2. If user is logged in, fetch their specific images as well
            if (user) {
                const userFolderRef = ref(storage, `images/${user.uid}/`);
                fetchPromises.push(processFolder(userFolderRef));
            }
            
            const results = await Promise.all(fetchPromises);
            const combinedImages = results.flat();

            combinedImages.sort((a, b) => {
                const timeA = parseInt(a.path.split('/').pop()?.split('-')[0] || '0') || 0;
                const timeB = parseInt(b.path.split('/').pop()?.split('-')[0] || '0') || 0;
                return timeB - timeA;
            });

            setImages(combinedImages);

        } catch (error: any) {
            console.error("Error fetching images from storage:", error);
            toast({ variant: 'destructive', title: '오류', description: error.message || '이미지를 가져오는 데 실패했습니다.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast, user]);
    
    const processFolder = async (folderRef: any): Promise<ImageInfo[]> => {
        const res = await listAll(folderRef);
        const imageInfoPromises = res.items.map(async (itemRef) => {
            try {
                const url = await getDownloadURL(itemRef);
                const metadata = await getMetadata(itemRef);
                return {
                    url,
                    prompt: metadata.customMetadata?.prompt || '프롬프트 정보 없음',
                    title: metadata.customMetadata?.title || itemRef.name.split('/').pop() || '제목 없음',
                    path: itemRef.fullPath
                };
            } catch (e) {
                console.warn(`Could not process file ${itemRef.fullPath}:`, e);
                return null;
            }
        });
        const settledResults = await Promise.all(imageInfoPromises);
        return settledResults.filter(Boolean) as ImageInfo[];
    }


    useEffect(() => {
        fetchClientImages();
    }, [fetchClientImages]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: '복사 완료', description: '이미지 URL이 클립보드에 복사되었습니다.' });
        }).catch(err => {
            toast({ variant: 'destructive', title: '복사 실패' });
            console.error('Copy failed', err);
        });
    };

    const handleDelete = async (path: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: '인증 오류', description: '공용 이미지는 삭제할 수 없습니다. 로그인 후 내 이미지만 삭제 가능합니다.' });
            return;
        }

        const isOwnImage = path.startsWith(`images/${user.uid}/`);
        if (!isOwnImage) {
            toast({ variant: 'destructive', title: '권한 없음', description: '다른 사용자의 이미지는 삭제할 수 없습니다.' });
            return;
        }

        setIsDeleting(path);
        try {
            const imageRef = ref(storage, path);
            const imageURL = await getDownloadURL(imageRef);

            // Delete file from storage
            await deleteObject(imageRef);
            
            // Find and delete firestore document
            const q = query(collection(db, 'documents'), where('imageUrl', '==', imageURL), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            setImages(prev => prev.filter(img => img.path !== path));
            toast({ title: '삭제 완료', description: '이미지와 관련 문서가 삭제되었습니다.' });

        } catch (error: any) {
            toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredImages = useMemo(() => {
        return images.filter(image =>
            image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            image.prompt.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [images, searchTerm]);

    return (
        <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] overflow-hidden bg-white">
            <CardHeader className="border-b-2 border-[#e2e8f4]">
                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-black text-[#0b2447]">갤러리</CardTitle>
                        <CardDescription className="font-bold text-[#475069]">
                            업로드된 모든 이미지를 보고 관리할 수 있습니다.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="제목 또는 프롬프트 검색..."
                                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] border-2 border-[#0b50d0] rounded-xl font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={fetchClientImages} disabled={isLoading} className="border-2 border-[#0b50d0] rounded-xl hover:bg-[#e8f0ff]">
                            <RefreshCcw className={`h-4 w-4 text-[#0b50d0] ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="aspect-square w-full rounded-xl border-2 border-dashed" />
                                <Skeleton className="h-9 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredImages.map((image) => (
                            <div key={image.path} className="space-y-3 group relative">
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl border-[3px] border-[#0b50d0] shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] cursor-pointer hover:translate-y-[-2px] transition-all" onClick={() => onImageSelect(image.url)}>
                                    <Image
                                        src={image.url}
                                        alt={image.title}
                                        fill
                                        className="object-cover bg-muted"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                                    />
                                    {user && image.path.startsWith(`images/${user.uid}/`) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black" onClick={(e) => e.stopPropagation()}>
                                                    {isDeleting === image.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="border-[3px] border-[#0b2447] rounded-2xl shadow-[8px_8px_0px_0px_rgba(11,36,71,0.15)]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-black text-[#0b2447]">정말로 삭제하시겠습니까?</AlertDialogTitle>
                                                    <AlertDialogDescription className="font-bold">이 이미지를 삭제하면 복구할 수 없습니다. 연관된 '내 문서' 항목도 함께 삭제됩니다.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="border-2 rounded-xl font-bold">취소</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(image.path)} className="bg-destructive hover:bg-destructive/90 border-2 border-[#0b2447] rounded-xl font-bold">삭제</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={image.url}
                                        readOnly
                                        className="h-10 text-xs truncate border-2 border-[#0b50d0] rounded-xl font-bold bg-[#f4f7fc]"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <Button size="icon" variant="outline" className="h-10 w-10 flex-shrink-0 border-2 border-[#0b50d0] rounded-xl hover:bg-[#e8f0ff]" onClick={() => copyToClipboard(image.url)}>
                                        <Copy className="h-4 w-4 text-[#0b50d0]" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-[#7b86a0] border-[3px] border-dashed border-[#e2e8f4] rounded-2xl">
                        <ImageIcon className="mx-auto h-16 w-16 opacity-20 mb-4" />
                        <p className="font-black text-[#0b2447]">저장된 이미지가 없습니다.</p>
                        <p className="text-sm font-bold mt-1">'이미지 업로드' 탭에서 이미지를 추가해보세요.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}