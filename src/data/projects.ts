export interface Project {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  imageUrl: string;
  location: string;
  startDate: string;
  status: 'Ongoing' | 'Completed' | 'Planned';
  endDate: string;
  budget: number;
  spent: number;
  contactPerson: {
    name: string;
    avatarUrl: string;
  };
  team: {
    role: string;
    name: string;
  }[];
}

export const PROJECTS_EXAMPLE: Project[] = [
  {
    id: 'temple-construction',
    title: 'Rajrajeshwari Temple Construction',
    description: 'Construction of new temple of Rajrajeshwari Maa Nanda in Kansuwa village.',
    longDescription: 'The flagship project to build a new, larger temple for Rajrajeshwari Maa Nanda in her ancestral village of Kansuwa. This project involves traditional stone masonry, intricate woodwork, and creating facilities for pilgrims and daily worship.',
    imageUrl: '/assets/images/project-temple.jpg',
    location: 'Kansuwa Village, Rudraprayag',
    startDate: '2024-03-01',
    status: 'Ongoing',
    endDate: '2026-01-15',
    budget: 150000,
    spent: 45000,
    contactPerson: {
      name: 'Shri Rajendra Bisht',
      avatarUrl: '/assets/images/avatar-rajendra.jpg'
    },
    team: [
      { role: 'Project Lead', name: 'Shri Rajendra Bisht' },
      { role: 'Head Mason', name: 'Shri Mohan Singh' },
      { role: 'Woodcarving Lead', name: 'Smt. Deepa Devi' },
    ]
  },
  {
    id: 'community-support',
    title: 'Community Support Initiatives',
    description: 'Community support initiatives including healthcare camps and livelihood programs.',
    longDescription: 'A series of ongoing programs to support the local community. This includes free monthly healthcare camps, skill development workshops for women, and educational support for children in remote villages.',
    imageUrl: '/assets/images/project-community.jpg',
    location: 'Various villages, Rudraprayag',
    startDate: '2023-01-01',
    status: 'Ongoing',
    endDate: 'N/A',
    budget: 50000,
    spent: 35000,
    contactPerson: {
      name: 'Smt. Kavita Devi',
      avatarUrl: '/assets/images/avatar-kavita.jpg'
    },
    team: [
      { role: 'Program Coordinator', name: 'Smt. Kavita Devi' },
      { role: 'Healthcare Lead', name: 'Dr. Anil Sharma' },
      { role: 'Education Lead', name: 'Smt. Meera Rawat' },
    ]
  }
];
