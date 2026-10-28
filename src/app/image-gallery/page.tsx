
'use client';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MultiImageUploadFeature from '@/components/features/multi-image-upload-feature';
import GalleryView from '@/components/common/gallery-view';


export default function ImageGalleryPage() {
    return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header />
            <main className="flex-1 py-12 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="flex items-center mb-8">
                        <h1 className="font-semibold text-3xl md:text-4xl font-headline">이미지 갤러리</h1>
                    </div>
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList>
                            <TabsTrigger value="upload">이미지 업로드</TabsTrigger>
                            <TabsTrigger value="gallery">갤러리</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="pt-6">
                            <MultiImageUploadFeature />
                        </TabsContent>
                        <TabsContent value="gallery" className="pt-6">
                            <GalleryView onImageSelect={() => {}} />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}
