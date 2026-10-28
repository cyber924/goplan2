'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase/client';
import { collection, query, orderBy, getDocs, deleteDoc, doc, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Check, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface DbImage {
  id: string;
  imageUrl: string; // Compressed Data URI
  prompt: string;
  createdAt: any;
}

interface DbImageGalleryProps {
  onSelect?: (imageUrl: string) => void;
  selectable?: boolean;
}

export default function DbImageGallery({ onSelect, selectable = false }: DbImageGalleryProps) {
  const [images, setImages] = useState<DbImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'public_images'), orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DbImage));
      setImages(list);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: 'public_images',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const docRef = doc(db, 'public_images', id);
    deleteDoc(docRef)
      .then(() => {
        setImages(prev => prev.filter(img => img.id !== id));
        toast({ title: '이미지 삭제 완료' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (isLoading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#0b50d0]" />
        <p className="font-bold">갤러리 데이터를 불러오고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-1">
      {images.map((img) => (
        <Card 
          key={img.id} 
          className={cn(
            "group relative overflow-hidden border-[3px] border-[#0b50d0] shadow-[4px_4px_0px_0px_rgba(11,80,208,0.1)] transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(11,80,208,0.15)]",
            selectable && "cursor-pointer"
          )}
          onClick={() => selectable && onSelect?.(img.imageUrl)}
        >
          <div className="aspect-square relative bg-[#f4f7fc]">
            <Image 
              src={img.imageUrl} 
              alt={img.prompt} 
              fill 
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {selectable ? (
                <Check className="text-white w-10 h-10" />
              ) : (
                <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-10 w-10 border-2 border-black"
                    onClick={(e) => handleDelete(e, img.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="p-3 bg-white border-t-2 border-[#0b50d0]">
            <p className="text-[10px] font-bold text-[#475069] line-clamp-2 leading-tight">
              {img.prompt}
            </p>
          </div>
        </Card>
      ))}
      {images.length === 0 && (
        <div className="col-span-full py-20 text-center border-[3px] border-dashed border-[#0b50d0] rounded-2xl bg-white">
          <ImageIcon className="mx-auto w-12 h-12 text-[#7b86a0] mb-4 opacity-20" />
          <p className="font-black text-[#0b2447]">갤러리가 비어 있습니다.</p>
          <p className="text-sm font-bold text-[#475069] mt-1">이미지를 생성하고 저장해보세요!</p>
        </div>
      )}
    </div>
  );
}
