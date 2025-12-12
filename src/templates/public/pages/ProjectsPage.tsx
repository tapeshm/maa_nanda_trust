/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import ProjectCard from '../components/ProjectCard'
import type { Project } from '../../../data/projects'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

const LABELS = {
  en: {
    title: "Our Projects",
    description: "Current initiatives and ongoing service projects undertaken by the trust."
  },
  hi: {
    title: "हमारी परियोजनाएं",
    description: "न्यास द्वारा शुरू की गई वर्तमान पहल और चल रही सेवा परियोजनाएं।"
  }
};

type ProjectsPageProps = {
  projects: Project[]
  lang?: Language
  activePath?: string
}

const ProjectsPage: FC<ProjectsPageProps> = ({ 
  projects,
  lang = DEFAULT_LANGUAGE,
  activePath = '/projects'
}) => {
  const labels = LABELS[lang];
  const navLinks = getNavLinks(lang);

  return (
    <PublicLayout
      title="Projects — Maa Nanda Kansuwa Trust"
      navLinks={navLinks}
      lang={lang}
      activePath={activePath}
    >
      <main class="py-12 md:py-20 px-4">
        <div class="max-w-6xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

          <section id="projects">
            <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 mb-4 tracking-wider text-center">{labels.title}</h1>
            <p class="text-center text-white/70 mb-10 md:mb-12">{labels.description}</p>
            <div class="flex flex-wrap justify-center gap-8 md:gap-10">
              {projects.map((project) => (
                <a href={lang === 'hi' ? `/hi/projects/${project.id}` : `/projects/${project.id}`}>
                  <ProjectCard project={project} lang={lang} />
                </a>
              ))}
            </div>
          </section>

        </div>
      </main>
    </PublicLayout>
  )
}

export default ProjectsPage