/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { PublicNavLink } from '../layout/PublicTopNav'
import ProjectCard from '../components/ProjectCard'
import type { Project } from '../../../data/projects'

const NAV_LINKS: PublicNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/projects', label: 'Projects' },
  { href: '/events', label: 'Events' },
  { href: '/transparency', label: 'Transparency' },
]

const ProjectsPage: FC<{ projects: Project[] }> = ({ projects }) => (
  <PublicLayout
    title="Projects — Maa Nanda Kansuwa Trust"
    navLinks={NAV_LINKS}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl" style="background: rgba(14, 8, 4, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">

        <section id="projects">
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider text-center">Our Projects</h1>
          <p class="text-center text-white/70 mb-10 md:mb-12">Current initiatives and ongoing service projects undertaken by the trust.</p>
          <div class="flex flex-wrap justify-center gap-8 md:gap-10">
            {projects.map((project) => (
              <ProjectCard project={project} />
            ))}
          </div>
        </section>

      </div>
    </main>
  </PublicLayout>
)

export default ProjectsPage
