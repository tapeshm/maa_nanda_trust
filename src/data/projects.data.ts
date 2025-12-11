import type { Bindings } from '../bindings'
import type { Project, ProjectRaw } from './projects'
import {
  type Language,
  DEFAULT_LANGUAGE,
  parseLocalized,
  parseLocalizedRaw,
  serializeLocalized,
  resolveLocalizedObject,
  resolveLocalizedObjectRaw
} from '../utils/i18n'

// The functions in this file are adapted from src/utils/db.ts

export async function getProjects(env: Bindings, lang: Language = DEFAULT_LANGUAGE): Promise<Project[]> {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all<any>()
  return results.map(p => {
    const contactPerson = typeof p.contactPerson === 'string' ? JSON.parse(p.contactPerson) : p.contactPerson;
    const rawTeam = typeof p.team === 'string' ? JSON.parse(p.team) : p.team;

    return {
      ...p,
      title: parseLocalized(p.title, lang),
      description: parseLocalized(p.description, lang),
      longDescription: parseLocalized(p.longDescription, lang),
      location: parseLocalized(p.location, lang),
      contactPerson,
      team: Array.isArray(rawTeam) ? rawTeam.map((member: any) => ({
        role: resolveLocalizedObject(member.role, lang),
        name: member.name,
      })) : rawTeam,
    };
  });
}

export async function getProjectById(env: Bindings, id: string, lang: Language = DEFAULT_LANGUAGE): Promise<Project | null> {
  const stmt = env.DB.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1');
  const project = await stmt.bind(id).first<any>();

  if (!project) {
    return null;
  }

  const contactPerson = typeof project.contactPerson === 'string' ? JSON.parse(project.contactPerson) : project.contactPerson;
  const rawTeam = typeof project.team === 'string' ? JSON.parse(project.team) : project.team;

  return {
    ...project,
    title: parseLocalized(project.title, lang),
    description: parseLocalized(project.description, lang),
    longDescription: parseLocalized(project.longDescription, lang),
    location: parseLocalized(project.location, lang),
    contactPerson,
    team: Array.isArray(rawTeam) ? rawTeam.map((member: any) => ({
      role: resolveLocalizedObject(member.role, lang),
      name: member.name,
    })) : rawTeam,
  };
}

export async function getProjectByIdRaw(env: Bindings, id: string): Promise<ProjectRaw | null> {
  const stmt = env.DB.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1');
  const project = await stmt.bind(id).first<any>();

  if (!project) {
    return null;
  }

  const contactPerson = typeof project.contactPerson === 'string' ? JSON.parse(project.contactPerson) : project.contactPerson;
  const rawTeam = typeof project.team === 'string' ? JSON.parse(project.team) : project.team;

  return {
    ...project,
    title: parseLocalizedRaw(project.title),
    description: parseLocalizedRaw(project.description),
    longDescription: parseLocalizedRaw(project.longDescription),
    location: parseLocalizedRaw(project.location),
    contactPerson,
    team: Array.isArray(rawTeam) ? rawTeam.map((member: any) => ({
      role: resolveLocalizedObjectRaw(member.role),
      name: member.name,
    })) : rawTeam,
  };
}

export async function upsertProject(env: Bindings, project: Omit<ProjectRaw, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { id, title, description, longDescription, imageUrl, location, startDate, status, endDate, budget, spent, contactPerson, team } = project;

    const titleJson = serializeLocalized(title.en, title.hi);
    const descriptionJson = serializeLocalized(description.en, description.hi);
    const longDescriptionJson = serializeLocalized(longDescription.en, longDescription.hi);
    const locationJson = serializeLocalized(location.en, location.hi);
    const contactPersonJson = JSON.stringify(contactPerson);
    const teamJson = JSON.stringify(team.map(member => ({
      role: { en: member.role.en, hi: member.role.hi },
      name: member.name,
    })));

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
    .bind(id, titleJson, descriptionJson, longDescriptionJson, imageUrl, locationJson, startDate, status, endDate, budget, spent, contactPersonJson, teamJson)
    .run()
}

export async function deleteProject(env: Bindings, id: string): Promise<void> {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
}
