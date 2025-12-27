/** @jsxImportSource hono/jsx */

import { Hono } from 'hono'
import type { Context } from 'hono' // Added this line
import type { Bindings } from '../../bindings'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { ensureCsrf } from '../../middleware/csrf'
import { isHtmx } from '../../utils/request'
import AdminLayout, {
  ADMIN_DASHBOARD_PANELS,
  type AdminDashboardPanel,
} from '../../templates/admin/layout'
import { EditorAssets } from '../../templates/components/editor'
import LandingPageForm, { type LandingPageFormProps } from '../../templates/admin/dashboard/LandingPageForm'
import { getLandingContentRaw } from '../../data/landing.data'
import AboutPageForm, { type AboutPageFormProps } from '../../templates/admin/dashboard/AboutPageForm'
import { getAboutContentRaw } from '../../data/about.data'
import TransparencyPageForm, { type TransparencyPageFormProps } from '../../templates/admin/dashboard/TransparencyPageForm'
import { getTransparencyContentRaw } from '../../data/transparency.data'
import DonatePageForm, { type DonatePageFormProps } from '../../templates/admin/dashboard/DonatePageForm'
import { getDonateContentRaw } from '../../data/donate.data'
import ProjectsList from '../../templates/admin/dashboard/ProjectsList'
import ProjectsForm from '../../templates/admin/dashboard/ProjectsForm'
import { getProjects, getProjectByIdRaw } from '../../data/projects.data'
import EventsList from '../../templates/admin/dashboard/EventsList'
import EventsForm from '../../templates/admin/dashboard/EventsForm'
import { getEvents, getEventByIdRaw } from '../../data/events.data'
import DonationRecordsPanel from '../../templates/admin/dashboard/DonationRecordsPanel'
import DonationRecordEditForm from '../../templates/admin/dashboard/DonationRecordEditForm'
import { getAllDonationRecords, getDonationRecordById } from '../../data/donationRecords.data'


type NonHomePanel = Exclude<AdminDashboardPanel, 'home' | 'projects' | 'events' | 'donate' | 'about-us' | 'transparency'>

const PANEL_COPY: Record<AdminDashboardPanel, { heading: string; description: string }> = {
  home: {
    heading: 'Home overview',
    description: 'Landing page summary and quick actions will appear here.',
  },
  'about-us': {
    heading: 'About Us',
    description: 'Manage About Us page content.',
  },
  transparency: {
    heading: 'Transparency',
    description: 'Manage transparency reports and compliance documents.',
  },
  donate: {
    heading: 'Donate',
    description: 'Manage donation page content and QR code.',
  },
  'donation-records': {
    heading: 'Donation Records',
    description: 'View and manage donor information and donation amounts.',
  },
  projects: {
    heading: 'Projects',
    description: 'Create, edit, and manage all trust projects.',
  },
  events: {
    heading: 'Events',
    description: 'Create, edit, and schedule upcoming events.',
  },
}

const adminDashboard = new Hono<{ Bindings: Bindings }>()

// --- Main dashboard routes ---
adminDashboard.get('/dashboard', requireAuth(), requireAdmin, (c) => handleHomeRequest(c))
adminDashboard.get('/dashboard/home', requireAuth(), requireAdmin, (c) => handleHomeRequest(c))

// --- Projects panel routes ---
adminDashboard.get('/dashboard/projects', requireAuth(), requireAdmin, async (c) => {
    const projects = await getProjects(c.env);
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    
    if (!projects || projects.length === 0) {
        const content = <ProjectsForm csrfToken={csrfToken} />
        if (htmx) return c.html(content)
        return c.html(<AdminLayout title="New Project" activePanel="projects" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
    }
    
    const content = <ProjectsList projects={projects} csrfToken={csrfToken} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="Projects" activePanel="projects" csrfToken={csrfToken}>{content}</AdminLayout>)
})
adminDashboard.get('/dashboard/projects/new', requireAuth(), requireAdmin, (c) => {
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    const content = <ProjectsForm csrfToken={csrfToken} />
    
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="New Project" activePanel="projects" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
})
adminDashboard.get('/dashboard/projects/edit/:id', requireAuth(), requireAdmin, async (c) => {
    const id = c.req.param('id');
    const project = await getProjectByIdRaw(c.env, id);
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)

    if (!project) {
        return c.notFound();
    }
    
    const content = <ProjectsForm csrfToken={csrfToken} project={project} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title={`Edit: ${project.title}`} activePanel="projects" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
})

// --- Events panel routes ---
adminDashboard.get('/dashboard/events', requireAuth(), requireAdmin, async (c) => {
    const events = await getEvents(c.env);
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    
    if (!events || events.length === 0) {
        const content = <EventsForm csrfToken={csrfToken} />
        if (htmx) return c.html(content)
        return c.html(<AdminLayout title="New Event" activePanel="events" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
    }
    
    const content = <EventsList events={events} csrfToken={csrfToken} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="Events" activePanel="events" csrfToken={csrfToken}>{content}</AdminLayout>)
})
adminDashboard.get('/dashboard/events/new', requireAuth(), requireAdmin, (c) => {
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    const content = <EventsForm csrfToken={csrfToken} />
    
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="New Event" activePanel="events" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
})
adminDashboard.get('/dashboard/events/edit/:id', requireAuth(), requireAdmin, async (c) => {
    const id = c.req.param('id');
    const event = await getEventByIdRaw(c.env, id);
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)

    if (!event) {
        return c.notFound();
    }

    const content = <EventsForm csrfToken={csrfToken} event={event} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title={`Edit: ${event.title}`} activePanel="events" csrfToken={csrfToken} extraHead={<EditorAssets />}>{content}</AdminLayout>)
})

// --- Donation Records panel routes ---
adminDashboard.get('/dashboard/donation-records', requireAuth(), requireAdmin, async (c) => {
    const records = await getAllDonationRecords(c.env)
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    const success = c.req.query('success')
    const error = c.req.query('error')

    const content = <DonationRecordsPanel records={records} csrfToken={csrfToken} success={success} error={error} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="Donation Records" activePanel="donation-records" csrfToken={csrfToken}>{content}</AdminLayout>)
})

adminDashboard.get('/dashboard/donation-records/edit/:id', requireAuth(), requireAdmin, async (c) => {
    const id = c.req.param('id')
    const record = await getDonationRecordById(c.env, id)
    const csrfToken = ensureCsrf(c)
    const htmx = isHtmx(c)
    const error = c.req.query('error')

    if (!record) {
        return c.notFound()
    }

    const content = <DonationRecordEditForm record={record} csrfToken={csrfToken} error={error} />
    if (htmx) return c.html(content)
    return c.html(<AdminLayout title="Edit Donation Record" activePanel="donation-records" csrfToken={csrfToken}>{content}</AdminLayout>)
})

// --- Generic panel handler ---
adminDashboard.get('/dashboard/:panel', requireAuth(), requireAdmin, async (c) => {
  const slug = c.req.param('panel')
  
  if (slug === 'about-us') {
      return handleAboutRequest(c);
  }

  if (slug === 'transparency') {
      return handleTransparencyRequest(c);
  }

  if (slug === 'donate') {
      return handleDonateRequest(c);
  }
  
  // All valid panels are handled above or by specific routes.
  return c.notFound()
})

export default adminDashboard

async function handleHomeRequest(
  c: Context<{ Bindings: Bindings }>,
) {
  const landingContent = await getLandingContentRaw(c.env)
  const htmx = isHtmx(c)
  const csrfToken = ensureCsrf(c)
  
  const content = <LandingPageForm landingContent={landingContent} csrfToken={csrfToken} />

  if (htmx) {
    return c.html(content)
  }

  const title = `Admin Dashboard – ${PANEL_COPY.home.heading}`
  return c.html(
    <AdminLayout title={title} activePanel="home" csrfToken={csrfToken} extraHead={<EditorAssets />}>
      {content}
    </AdminLayout>,
  )
}

async function handleAboutRequest(
  c: Context<{ Bindings: Bindings }>,
) {
  const aboutContent = await getAboutContentRaw(c.env)
  const htmx = isHtmx(c)
  const csrfToken = ensureCsrf(c)
  
  const content = <AboutPageForm aboutContent={aboutContent} csrfToken={csrfToken} />

  if (htmx) {
    return c.html(content)
  }

  const title = `Admin Dashboard – ${PANEL_COPY['about-us'].heading}`
  return c.html(
    <AdminLayout title={title} activePanel="about-us" csrfToken={csrfToken} extraHead={<EditorAssets />}>
      {content}
    </AdminLayout>,
  )
}

async function handleDonateRequest(
  c: Context<{ Bindings: Bindings }>,
) {
  const donateContent = await getDonateContentRaw(c.env)
  const htmx = isHtmx(c)
  const csrfToken = ensureCsrf(c)
  
  const content = <DonatePageForm donateContent={donateContent} csrfToken={csrfToken} />

  if (htmx) {
    return c.html(content)
  }

  const title = `Admin Dashboard – ${PANEL_COPY['donate'].heading}`
  return c.html(
    <AdminLayout title={title} activePanel="donate" csrfToken={csrfToken} extraHead={<EditorAssets />}>
      {content}
    </AdminLayout>,
  )
}

async function handleTransparencyRequest(
  c: Context<{ Bindings: Bindings }>,
) {
  const transparencyContent = await getTransparencyContentRaw(c.env)
  const htmx = isHtmx(c)
  const csrfToken = ensureCsrf(c)
  
  const content = <TransparencyPageForm transparencyContent={transparencyContent} csrfToken={csrfToken} />

  if (htmx) {
    return c.html(content)
  }

  const title = `Admin Dashboard – ${PANEL_COPY['transparency'].heading}`
  return c.html(
    <AdminLayout title={title} activePanel="transparency" csrfToken={csrfToken} extraHead={<EditorAssets />}>
      {content}
    </AdminLayout>,
  )
}
