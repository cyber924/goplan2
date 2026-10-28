
export interface Template {
    title: string;
    slug: string;
    description: string;
    image: string;
    tags: string[];
    href: string;
    aiHint: string;
    defaultIdea?: string;
    sections: {
      id: string;
      title: string;
      content: string;
      placeholder?: string;
    }[];
}

// Added this for the report view
export interface DocumentData {
    type: 'template' | 'market-analysis' | 'financial-visualization' | 'corporate-diagnosis' | 'business-model-canvas' | 'form' | 'interactive-report' | 'preliminary-startup-package' | 'leap-startup-package';
    title: string;
    businessIdea?: string;
    sections?: { id: string; title: string; content: string }[];
    fields?: { id: string; label: string; value: string }[];
    content?: any;
}
