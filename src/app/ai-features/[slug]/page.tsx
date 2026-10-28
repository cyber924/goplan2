'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import MarketAnalysisFeature from '@/components/features/market-analysis-feature';
import FinancialVisualizationFeature from '@/components/features/financial-visualization-feature';
import ImageGenerationFeature from '@/components/features/image-generation-feature';
import CorporateDiagnosisFeature from '@/components/features/corporate-diagnosis-feature';
import BusinessModelCanvasFeature from '@/components/features/business-model-canvas-feature';
import DocumentAnalysisFeature from '@/components/features/document-analysis-feature';
import InteractiveReportFeature from '@/components/features/interactive-report-feature';
import LeapPackageReportFeature from '@/components/features/leap-package-report-feature';
import FinancialStatementGeneratorFeature from '@/components/features/financial-statement-generator-feature';
import SocialMediaContentGeneratorFeature from '@/components/features/social-media-content-generator-feature';
import DocumentRewriterFeature from '@/components/features/document-rewriter-feature';
import ProPromptGeneratorFeature from '@/components/features/pro-prompt-generator-feature';

function FeatureComponent({ slug }: { slug: string }) {
    switch (slug) {
        case 'market-analysis':
            return <MarketAnalysisFeature />;
        case 'financial-visualization':
            return <FinancialVisualizationFeature />;
        case 'image-generation':
            return <ImageGenerationFeature />;
        case 'corporate-diagnosis':
            return <CorporateDiagnosisFeature />;
        case 'business-model-canvas':
            return <BusinessModelCanvasFeature />;
        case 'document-analysis':
            return <DocumentAnalysisFeature />;
        case 'interactive-report':
            return <InteractiveReportFeature />;
        case 'leap-package-report':
            return <LeapPackageReportFeature />;
        case 'financial-statement-generator':
            return <FinancialStatementGeneratorFeature />;
        case 'social-media-content-generator':
            return <SocialMediaContentGeneratorFeature />;
        case 'document-rewriter':
            return <DocumentRewriterFeature />;
        case 'pro-prompt-generator':
            return <ProPromptGeneratorFeature />;
        default:
            return <div className="text-center py-20">요청한 기능을 찾을 수 없습니다.</div>;
    }
}

export default function AiFeaturePage() {
    const params = useParams();
    const slug = params.slug as string;

    return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header />
            <main className="flex-1 py-24">
                <div className="container mx-auto px-4">
                    <FeatureComponent slug={slug} />
                </div>
            </main>
            <Footer />
        </div>
    );
}
