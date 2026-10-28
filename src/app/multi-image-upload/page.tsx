'use client';

import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import MultiImageUploadFeature from '@/components/features/multi-image-upload-feature';

export default function MultiImageUploadPage() {
    return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header />
            <main className="flex-1 py-12 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl">
                   <MultiImageUploadFeature />
                </div>
            </main>
            <Footer />
        </div>
    );
}
