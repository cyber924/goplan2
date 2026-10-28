
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import TemplatesSection from '@/components/landing/templates-section';
import TemplateSelectModal from '@/components/landing/template-select-modal';
import type { Template } from '@/lib/types';

export default function TemplatesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ title: string; businessIdea: string } | null>(null);
  const router = useRouter();

  useState(() => {
    const data = sessionStorage.getItem('initial-plan-data');
    if (data) {
      setInitialData(JSON.parse(data));
      setIsModalOpen(true);
    }
  });

  const handleSelectTemplate = (template: Template) => {
    // sessionStorage is already set from home page
    router.push(template.href);
    setIsModalOpen(false);
  };
  
  const handleTemplateClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const initialData = sessionStorage.getItem('initial-plan-data');
    if (initialData) {
      router.push(href);
    } else {
      // If no data, just go to the template page to start fresh
      router.push(href);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <TemplatesSection onTemplateClick={handleTemplateClick} />
      </main>
      <Footer />
       <TemplateSelectModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            // Clear session storage if modal is closed without selection
            sessionStorage.removeItem('initial-plan-data');
        }}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}
