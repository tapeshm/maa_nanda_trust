import type { FC } from 'hono/jsx'

interface LandingPageProps {
  heroImageUrl?: string
}

/**
 * Landing page component that serves as the main entry point for the Temple Trust website.
 * Features a hero section with dynamic background image from R2 storage.
 */
const LandingPage: FC<LandingPageProps> = ({
  heroImageUrl = '/api/images/hero-bg.jpg' // Default R2 image endpoint
}) => {
  return (
    <>
      {/* Hero Section */}
      <div class="relative isolate overflow-hidden bg-gray-900 min-h-[600px] lg:min-h-[700px]">
        {/* Background Image with Overlay */}
        <img
          src={heroImageUrl}
          alt="Temple Trust Hero Background"
          class="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
        />

        {/* Gradient Overlays for Visual Effect */}
        <div
          aria-hidden="true"
          class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-400 to-yellow-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>

        {/* Hero Content */}
        <div class="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            {/* Announcement Badge */}
            <div class="mt-24 sm:mt-32 lg:mt-16">
              <a href="/activities" class="inline-flex space-x-6">
                <span class="rounded-full bg-orange-600/10 px-3 py-1 text-sm font-semibold leading-6 text-orange-400 ring-1 ring-inset ring-orange-600/10">
                  Latest Updates
                </span>
                <span class="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-300">
                  <span>View our recent activities</span>
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                </span>
              </a>
            </div>

            {/* Main Heading */}
            <h1 class="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Welcome to Temple Trust
            </h1>

            {/* Subtitle */}
            <p class="mt-6 text-lg leading-8 text-gray-300">
              Preserving our spiritual heritage and serving the community through devotion,
              education, and cultural activities. Join us in our mission to maintain and
              celebrate our sacred traditions.
            </p>

            {/* CTA Buttons */}
            <div class="mt-10 flex items-center gap-x-6">
              <a
                href="/about"
                class="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                Learn More
              </a>
              <a
                href="/finance"
                class="text-sm font-semibold leading-6 text-white hover:text-gray-300"
              >
                Support Us <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          {/* Featured Image or Content */}
          <div class="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div class="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div class="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl">
                <img
                  src="/api/images/temple-main.jpg"
                  alt="Temple Trust Main Building"
                  width="2432"
                  height="1442"
                  class="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-orange-400 to-yellow-300 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </div>

      {/* Features Section */}
      <section class="py-24 sm:py-32">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-2xl lg:text-center">
            <h2 class="text-base font-semibold leading-7 text-orange-600">Our Services</h2>
            <p class="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need for spiritual growth
            </p>
            <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              We provide comprehensive services to support your spiritual journey and community engagement.
            </p>
          </div>

          <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Daily Worship */}
              <div class="flex flex-col">
                <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <svg class="h-5 w-5 flex-none text-orange-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
                  </svg>
                  Daily Worship
                </dt>
                <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-400">
                  <p class="flex-auto">
                    Join us for daily prayers and rituals. Experience the peace and tranquility
                    of our sacred space with morning and evening services.
                  </p>
                  <p class="mt-6">
                    <a href="/activities" class="text-sm font-semibold leading-6 text-orange-600 hover:text-orange-500">
                      View schedule <span aria-hidden="true">→</span>
                    </a>
                  </p>
                </dd>
              </div>

              {/* Cultural Events */}
              <div class="flex flex-col">
                <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <svg class="h-5 w-5 flex-none text-orange-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z" clip-rule="evenodd" />
                  </svg>
                  Cultural Events
                </dt>
                <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-400">
                  <p class="flex-auto">
                    Celebrate festivals and cultural programs throughout the year.
                    Participate in traditional ceremonies and community gatherings.
                  </p>
                  <p class="mt-6">
                    <a href="/activities" class="text-sm font-semibold leading-6 text-orange-600 hover:text-orange-500">
                      Upcoming events <span aria-hidden="true">→</span>
                    </a>
                  </p>
                </dd>
              </div>

              {/* Education Programs */}
              <div class="flex flex-col">
                <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                  <svg class="h-5 w-5 flex-none text-orange-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                  </svg>
                  Education Programs
                </dt>
                <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-400">
                  <p class="flex-auto">
                    Learn about our traditions through classes, workshops, and spiritual
                    discourses. Programs available for all age groups.
                  </p>
                  <p class="mt-6">
                    <a href="/activities" class="text-sm font-semibold leading-6 text-orange-600 hover:text-orange-500">
                      Enroll now <span aria-hidden="true">→</span>
                    </a>
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="bg-orange-600">
        <div class="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div class="mx-auto max-w-2xl text-center">
            <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Support Our Mission
            </h2>
            <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-orange-100">
              Your contributions help us maintain our sacred spaces and continue serving
              the community. Every donation makes a difference.
            </p>
            <div class="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/finance"
                class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Make a Donation
              </a>
              <a href="/about" class="text-sm font-semibold leading-6 text-white">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default LandingPage
