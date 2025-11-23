export interface Document {
  name: string;
  url: string;
  description: string;
}

export interface TransparencyPageContent {
  hero: {
    title: string;
    description: string;
  };
  trustDetails: {
    trustName: string;
    registrationNumber: string;
    dateOfRegistration: string;
  };
  propertyDetails: string[];
  documents: Document[];
}

export const DEFAULT_TRANSPARENCY_CONTENT: TransparencyPageContent = {
  hero: {
    title: "Transparency & Compliance",
    description: "Official documents, financial reports, and registration details of the Maa Nanda Kansuwa Trust."
  },
  trustDetails: {
    trustName: 'Maa Nanda Kansuwa Trust',
    registrationNumber: 'UK1234567890',
    dateOfRegistration: '2023-01-15'
  },
  propertyDetails: [
    'Temple land and premises at Kansuwa Village, Rudraprayag, Uttarakhand.',
    'Community hall adjacent to the temple.',
    'Agricultural land for community farming initiatives.',
  ],
  documents: [
    {
      name: 'Trust Deed',
      url: '/documents/trust-deed.pdf',
      description: 'The official legal document establishing the trust and its objectives.'
    },
    {
      name: 'Annual Report 2024',
      url: '/documents/annual-report-2024.pdf',
      description: 'A summary of the trust\'s activities and financial statements for the fiscal year 2024.'
    },
    {
      name: '80G Tax Exemption Certificate',
      url: '/documents/80g-certificate.pdf',
      description: 'Certificate granting tax exemption for donations made to the trust.'
    }
  ]
};