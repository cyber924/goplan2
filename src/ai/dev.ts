
import { config } from 'dotenv';
config();

// 기존 flow들
import '@/ai/flows/generate-plan-preview.ts';
import '@/ai/flows/generate-section-draft.ts';
import '@/ai/flows/generate-image.ts';
import '@/ai/flows/analyze-financials.ts';
import '@/ai/flows/analyze-market.ts';
import '@/ai/flows/corporate-diagnosis.ts';
import '@/ai/flows/generate-bmc.ts';
import '@/ai/flows/generate-plan-from-idea.ts';
import '@/ai/flows/generate-simple-plan.ts';
import '@/ai/flows/generate-form-fields.ts';
import '@/ai/flows/analyze-document-form.ts';
import '@/ai/flows/analyze-document.ts';
import '@/ai/flows/generate-form-content.ts';
import '@/ai/flows/generate-image-tags.ts';
import '@/ai/flows/generate-interactive-report.ts';
import '@/ai/flows/generate-leap-report.ts';
import '@/ai/flows/generate-financial-statement.ts';
import '@/ai/flows/generate-social-media-content.ts';
import '@/ai/flows/rewrite-document.ts';

// 새롭게 추가된 관리자 및 테스트용 flow
import '@/ai/flows/admin-special-flow.ts';
import '@/ai/flows/pro-prompt-generator.ts';
import '@/ai/flows/scrape-bizinfo-flow.ts';
