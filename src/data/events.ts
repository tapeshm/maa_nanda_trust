export interface Event {
  id: string;
  name: string;
  location: string;
  status: 'Upcoming' | 'Completed' | 'Postponed';
  contactPerson: {
    name: string;
    avatarUrl: string;
  };
  date: string;
  description: string;
}

export const EVENTS_EXAMPLE: Event[] = [
  {
    id: 'praan-pratishtha-2026',
    name: 'Praan-Pratishtha Mahotsav 2026',
    location: 'Rajrajeshwari Mandir, Kansuwa',
    status: 'Upcoming',
    contactPerson: {
      name: 'Smt. Kavita Devi',
      avatarUrl: '/assets/images/avatar-kavita.jpg'
    },
    date: 'January 19-25, 2026',
    description: 'The grand Praan-Pratishtha ceremony to welcome and consecrate the murti of Rajrajeshwari Maa Nanda at the new temple.'
  },
  {
    id: 'manauti-2026',
    name: 'Manauti for Raj-Jaat 2026',
    location: 'Rajrajeshwari Mandir, Kansuwa',
    status: 'Upcoming',
    contactPerson: {
      name: 'Shri Rajendra Bisht',
      avatarUrl: '/assets/images/avatar-rajendra.jpg'
    },
    date: 'January 22-23, 2026',
    description: 'Special Manauti ceremonies to invoke blessings from Maa Nanda for the upcoming Nanda Devi Raj Jaat pilgrimage.'
  },
  {
    id: 'sharad-navaratri-2025',
    name: 'Sharad Navaratri 2025',
    location: 'Kansuwa Village Temple',
    status: 'Completed',
    contactPerson: {
      name: 'Smt. Meera Rawat',
      avatarUrl: '/assets/images/avatar-meera.jpg'
    },
    date: 'October 3-12, 2025',
    description: 'Nine sacred evenings of bhajan, aarti, and community langar celebrating the goddess\'s victory of light and compassion.'
  }
];
