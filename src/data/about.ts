import type { JSONContent } from '@tiptap/core'

export interface AboutValue {
  title: string;
  description: string;
}

export interface Trustee {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface AboutPageContent {
  hero: {
    title: string;
    description: string;
  };
  mission: {
    title: string;
    description: string; // HTML
  };
  vision: {
    title: string;
    description: string;
  };
  values: AboutValue[];
  trustees: Trustee[];
  story: {
    title: string;
    description: string; // HTML
  };
}

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: {
    title: "About Maa Nanda Kansuwa Trust",
    description: "Dedicated to preserving the spiritual heritage and serving the community of Kansuwa."
  },
  mission: {
    title: "Our Mission",
    description: "<p>To restore and maintain the sacred Rajrajeshwari Mandir while fostering a community grounded in service, devotion, and cultural preservation.</p>"
  },
  vision: {
    title: "Our Vision",
    description: "A thriving spiritual center that uplifts the local community through education, healthcare, and sustainable development."
  },
  values: [
    { title: "Seva (Service)", description: "Selfless service to the deity and the community." },
    { title: "Dharma (Duty)", description: "Upholding righteous conduct and spiritual traditions." },
    { title: "Sangha (Community)", description: "Building a supportive and united community." }
  ],
  trustees: [
    { name: "Smt. Kavita Devi", role: "Temple Caretaker", bio: "Nurturing daily worship and community liaison.", imageUrl: "" },
    { name: "Shri Rajendra Bisht", role: "Seva Coordinator", bio: "Oversees infrastructure work and seva programs.", imageUrl: "" },
    { name: "Smt. Meera Rawat", role: "Cultural Archivist", bio: "Coordinates cultural events and archives oral histories.", imageUrl: "" }
  ],
  story: {
    title: "Our Story",
    description: "<p>The Maa Nanda Kansuwa Trust was established to formalize the centuries-old tradition of worship and community service in Kansuwa village. Rooted in the legend of Maa Nanda, we strive to keep the flame of devotion alive for future generations.</p>"
  }
};