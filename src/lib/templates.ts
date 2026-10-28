
import startupInvestmentProposal from './templates/startup-investment-proposal.json';
import standardRdProposal from './templates/standard-rd-proposal.json';
import newBusinessPlan from './templates/new-business-plan.json';
import smallBusinessStartup from './templates/small-business-startup.json';
import marketingStrategyPlan from './templates/marketing-strategy-plan.json';
import ecommerceBusinessPlan from './templates/ecommerce-business-plan.json';
import saasBusinessPlan from './templates/saas-business-plan.json';
import youtubeContentsPlan from './templates/youtube-contents-plan.json';
import personalBrandingPlan from './templates/personal-branding-plan.json';
import franchiseBusinessPlan from './templates/franchise-business-plan.json';
import npoBusinessPlan from './templates/npo-business-plan.json';
import mobileAppGamePlan from './templates/mobile-app-game-plan.json';
import contentMediaBusinessPlan from './templates/content-media-business-plan.json';
import educationBusinessPlan from './templates/education-business-plan.json';
import healthcareBusinessPlan from './templates/healthcare-business-plan.json';
import realEstateBusinessPlan from './templates/real-estate-business-plan.json';
import aiServiceBusinessPlan from './templates/ai-service-business-plan.json';
import fashionBrandLaunchPlan from './templates/fashion-brand-launch-plan.json';
import smeTechDevelopmentPlan from './templates/sme-tech-development-plan.json';
import preliminaryStartupPackage from './templates/preliminary-startup-package.json';
import leapStartupPackage from './templates/leap-startup-package.json';


import type { Template } from './types';

// Note: We are manually importing and exporting to ensure type safety
// and to avoid issues with dynamic imports in all environments.
export const templates: Template[] = [
    startupInvestmentProposal as Template,
    preliminaryStartupPackage as Template,
    leapStartupPackage as Template,
    smeTechDevelopmentPlan as Template,
    aiServiceBusinessPlan as Template,
    fashionBrandLaunchPlan as Template,
    standardRdProposal as Template,
    newBusinessPlan as Template,
    smallBusinessStartup as Template,
    franchiseBusinessPlan as Template,
    mobileAppGamePlan as Template,
    contentMediaBusinessPlan as Template,
    marketingStrategyPlan as Template,
    ecommerceBusinessPlan as Template,
    saasBusinessPlan as Template,
    youtubeContentsPlan as Template,
    personalBrandingPlan as Template,
    npoBusinessPlan as Template,
    educationBusinessPlan as Template,
    healthcareBusinessPlan as Template,
    realEstateBusinessPlan as Template,
];
