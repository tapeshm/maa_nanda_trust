import type { Localized } from '../utils/i18n';

export interface LandingPageContent {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
  };
  welcome: {
    title: string;
    description: string;
  };
  projectsSection: {
    title: string;
    description: string;
  };
  eventsSection: {
    title: string;
    description: string;
  };
}

export interface LandingPageContentRaw {
  hero: {
    eyebrow: Localized<string>;
    title: Localized<string>;
    description: Localized<string>;
  };
  welcome: {
    title: Localized<string>;
    description: Localized<string>;
  };
  projectsSection: {
    title: Localized<string>;
    description: Localized<string>;
  };
  eventsSection: {
    title: Localized<string>;
    description: Localized<string>;
  };
}