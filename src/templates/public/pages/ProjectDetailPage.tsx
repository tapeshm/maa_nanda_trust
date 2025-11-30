/** @jsxImportSource hono/jsx */

import type { FC } from 'hono/jsx'
import PublicLayout from '../layout/PublicLayout'
import type { Project } from '../../../data/projects'
import RichText from '../../components/RichText'
import { resolveMediaUrl } from '../../../utils/pages/media'
import { type Language, DEFAULT_LANGUAGE } from '../../../utils/i18n'
import { getNavLinks } from '../../../config/navigation'

type ProjectDetailPageProps = {
  project: Project
  lang?: Language
  activePath?: string
}

const ProjectDetailPage: FC<ProjectDetailPageProps> = ({ 
  project,
  lang = DEFAULT_LANGUAGE,
  activePath = `/projects/${project.id}`
}) => {
  const navLinks = getNavLinks(lang);

  return (
  <PublicLayout
    title={`${project.title} — Projects`}
    navLinks={navLinks}
    lang={lang}
    activePath={activePath}
  >
    <main class="py-12 md:py-20 px-4">
      <div class="max-w-4xl mx-auto p-8 md:p-12 rounded-xl glass-panel">

        {/* --- Header --- */}
        <section class="text-center mb-10">
          <p class="text-amber-400/80 text-sm mb-2">{project.location}</p>
          <h1 class="text-3xl md:text-4xl font-serif font-light text-amber-100/90 tracking-wider">{project.title}</h1>
        </section>

        {/* --- Description --- */}
        <section class="mb-10">
          <RichText
            html={project.longDescription}
            className="text-base md:text-lg text-white/80 leading-relaxed text-center"
          />
        </section>

        {/* --- Image --- */}
        <section class="mb-10">
            <img src={resolveMediaUrl(project.imageUrl)} alt={`Image of ${project.title}`} class="rounded-lg shadow-lg w-full h-auto max-h-[400px] object-cover mx-auto" />
        </section>

        {/* --- Statistics --- */}
        <section class="mb-10">
            <h2 class="text-2xl font-serif text-center mb-6 text-amber-200/90">Project Details</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6 bg-black/20 p-6 rounded-lg">
                <div class="stat-item">
                    <h4 class="text-sm text-amber-400/80">Location</h4>
                    <p class="text-white/90 font-semibold">{project.location}</p>
                </div>
                <div class="stat-item">
                    <h4 class="text-sm text-amber-400/80">Start Date</h4>
                    <p class="text-white/90 font-semibold">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
                <div class="stat-item">
                    <h4 class="text-sm text-amber-400/80">Status</h4>
                    <p class="text-white/90 font-semibold">{project.status}</p>
                </div>
                <div class="stat-item">
                    <h4 class="text-sm text-amber-400/80">Target End Date</h4>
                    <p class="text-white/90 font-semibold">{project.endDate}</p>
                </div>
                <div class="stat-item col-span-2">
                    <h4 class="text-sm text-amber-400/80">Financials</h4>
                    <div class="w-full bg-black/40 rounded-full h-4 mt-2">
                        <div class="bg-amber-400 h-4 rounded-full" style={`width: ${Math.round((project.spent / project.budget) * 100)}%`}></div>
                    </div>
                    <p class="text-xs text-white/70 mt-1">{`$${project.spent.toLocaleString()} / $${project.budget.toLocaleString()}`}</p>
                </div>
            </div>
        </section>

        {/* --- Team --- */}
        <section>
            <h2 class="text-2xl font-serif text-center mb-6 text-amber-200/90">Key People</h2>
            <div class="flex flex-col items-center">
                <div class="text-center mb-6">
                    <img src={project.contactPerson.avatarUrl} alt={project.contactPerson.name} class="w-24 h-24 rounded-full mx-auto mb-2 border-2 border-amber-400/50" />
                    <h4 class="text-white/90 font-semibold">{project.contactPerson.name}</h4>
                    <p class="text-sm text-amber-400/80">Key Contact</p>
                </div>
                <div>
                    <h4 class="text-lg font-semibold text-center text-amber-300/90 mb-3">Roles & Responsibilities</h4>
                    <ul class="list-disc list-inside text-white/70 text-left max-w-md mx-auto">
                        {project.team.map(member => (
                            <li class="mb-1"><strong>{member.role}:</strong> {member.name}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>

      </div>
    </main>
  </PublicLayout>
)
}

export default ProjectDetailPage