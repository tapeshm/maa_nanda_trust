import type { Localized } from '../utils/i18n';

export interface DonatePageContent {
  qrCodeUrl: string;
  appeal: string; // HTML content
}

export interface DonatePageContentRaw {
  qrCodeUrl: string;
  appeal: Localized<string>;
}

export const DEFAULT_DONATE_CONTENT: DonatePageContent = {
  qrCodeUrl: '',
  appeal: '<p>Your support helps us maintain the temple and serve the community. Every contribution, big or small, makes a difference.</p>'
};