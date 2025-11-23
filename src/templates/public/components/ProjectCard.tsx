/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx'
import type { Project } from '../../../data/projects'
import { resolveMediaUrl } from '../../../utils/pages/media'

const ProjectCard: FC<{ project: Project }> = ({ project }) => (
  <div class="project-card bg-white/5 border border-white/10 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 w-full max-w-sm">
    <div class="w-full h-48 bg-white/10 flex items-center justify-center">
      <img src={resolveMediaUrl(project.imageUrl)} alt={project.title} class="w-full h-full object-cover" />
    </div>
    <div class="p-4 md:p-6">
      <h3 class="text-lg md:text-xl font-serif font-semibold mb-2 text-amber-200 h-16">{project.title}</h3>
      <p class="text-white/70 text-sm leading-relaxed h-24 overflow-hidden">{project.description}</p>
      <a href={`/projects/${project.id}`} class="text-amber-400 hover:text-amber-200 mt-4 inline-block text-sm font-semibold">
        Read More &rarr;
      </a>
    </div>
  </div>
);

export default ProjectCard
