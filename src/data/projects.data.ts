import type { Bindings } from '../bindings'
import type { Project } from './projects'

// The functions in this file are adapted from src/utils/db.ts

export async function getProjects(env: Bindings): Promise<Project[]> {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all<Project>()
  return results.map(p => ({
      ...p,
      contactPerson: typeof p.contactPerson === 'string' ? JSON.parse(p.contactPerson) : p.contactPerson,
      team: typeof p.team === 'string' ? JSON.parse(p.team) : p.team,
  }));
}

export async function getProjectById(env: Bindings, id: string): Promise<Project | null> {
  const stmt = env.DB.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1');
  const project = await stmt.bind(id).first<Project | null>();

  if (!project) {
    return null;
  }

  return {
    ...project,
    contactPerson: typeof project.contactPerson === 'string' ? JSON.parse(project.contactPerson) : project.contactPerson,
    team: typeof project.team === 'string' ? JSON.parse(project.team) : project.team,
  };
}

export async function upsertProject(env: Bindings, project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { id, title, description, longDescription, imageUrl, location, startDate, status, endDate, budget, spent, contactPerson, team } = project;
    
    const contactPersonJson = JSON.stringify(contactPerson);
    const teamJson = JSON.stringify(team);

    await env.DB.prepare(
        `INSERT INTO projects (id, title, description, longDescription, imageUrl, location, startDate, status, endDate, budget, spent, contactPerson, team)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           longDescription = excluded.longDescription,
           imageUrl = excluded.imageUrl,
           location = excluded.location,
           startDate = excluded.startDate,
           status = excluded.status,
           endDate = excluded.endDate,
           budget = excluded.budget,
           spent = excluded.spent,
           contactPerson = excluded.contactPerson,
           team = excluded.team`
    )
    .bind(id, title, description, longDescription, imageUrl, location, startDate, status, endDate, budget, spent, contactPersonJson, teamJson)
    .run()
}

export async function deleteProject(env: Bindings, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
}
