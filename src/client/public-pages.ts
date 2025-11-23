// [D3:pages.step-03:public-client] Client-side interactions for public pages

type DoorState = "closed" | "opening" | "opened" | "closing"

interface DoorOptions {
  autoHide?: boolean
  remember?: boolean
}

const select = (sel: string, root: Document | Element = document) =>
  root.querySelector(sel)

const rootStyles = getComputedStyle(document.documentElement)

const parseTimeVar = (name: string, fallback: number): number => {
  const raw = (rootStyles.getPropertyValue(name) || "").trim()
  if (!raw) return fallback
  if (raw.endsWith("ms")) {
    const value = parseFloat(raw)
    return Number.isNaN(value) ? fallback : value
  }
  if (raw.endsWith("s")) {
    const value = parseFloat(raw)
    return Number.isNaN(value) ? fallback : value * 1000
  }
  const numeric = parseFloat(raw)
  return Number.isNaN(numeric) ? fallback : numeric
}

const parseNumberVar = (name: string, fallback: number): number => {
  const raw = (rootStyles.getPropertyValue(name) || "").trim()
  const numeric = parseFloat(raw)
  return Number.isNaN(numeric) ? fallback : numeric
}

// DOM Elements
const overlay = document.getElementById("doorOverlay") as HTMLElement | null
const enter = select("[data-door-enter]") as HTMLElement | null
const toggle = select("[data-door-toggle]") as HTMLElement | null
const toggleLabel = select("[data-door-toggle-label]") as HTMLElement | null
const interior = select(".temple-interior") as HTMLElement | null
const contentShell = select("[data-content-shell]") as HTMLElement | null
const nav = select(".top-nav") as HTMLElement | null
const scrollMenu = select("[data-scroll-menu]") as HTMLElement | null
const scrollToggle = select("[data-scroll-toggle]") as HTMLElement | null
const scrollPanel = select("[data-scroll-panel]") as HTMLElement | null
const donationButton = document.getElementById(
  "donationButton",
) as HTMLElement | null
const coin = document.getElementById("donationCoin") as HTMLElement | null
const coinSound = document.getElementById("coinSound") as HTMLAudioElement | null

// Configuration
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches
const hasSeenDoor = sessionStorage.getItem("doorOpened") === "1"
const contentRevealDelay = parseTimeVar("--content-reveal-delay", 2000)
const doorAutoDelay = parseTimeVar("--door-auto-delay", 600)
const navCollapseThreshold = Math.max(
  0,
  Math.min(1, parseNumberVar("--nav-collapse-threshold", 0.25)),
)
const SCROLL_MENU_OPEN_CLASS = "is-open"

const STATES = {
  CLOSED: "closed" as DoorState,
  OPENING: "opening" as DoorState,
  OPENED: "opened" as DoorState,
  CLOSING: "closing" as DoorState,
}

let contentTimer = 0
let scrollTick = false

// ==============================
// Scroll Menu Functions
// ==============================
const setScrollMenuState = (open: boolean) => {
  if (!scrollMenu || !scrollToggle || !scrollPanel) return
  const isOpen = scrollMenu.classList.contains(SCROLL_MENU_OPEN_CLASS)
  const isOpening = scrollMenu.classList.contains("is-opening")
  const isClosing = scrollMenu.classList.contains("is-closing")

  scrollToggle.setAttribute("aria-expanded", String(open))
  scrollPanel.setAttribute("aria-hidden", String(!open))

  if (open) {
    if (isOpen && !isClosing) {
      return
    }

    scrollMenu.classList.remove("is-closing")
    scrollMenu.classList.add(SCROLL_MENU_OPEN_CLASS)

    if (!prefersReducedMotion) {
      scrollMenu.classList.remove("is-opening")
      void scrollMenu.offsetWidth
      scrollMenu.classList.add("is-opening")
    }
    return
  }

  if (!isOpen && !isOpening) {
    scrollMenu.classList.remove("is-opening")
    scrollMenu.classList.remove("is-closing")
    return
  }

  if (prefersReducedMotion) {
    scrollMenu.classList.remove("is-opening")
    scrollMenu.classList.remove(SCROLL_MENU_OPEN_CLASS)
    scrollMenu.classList.remove("is-closing")
    return
  }

  if (!isClosing) {
    scrollMenu.classList.remove("is-opening")
    void scrollMenu.offsetWidth
    scrollMenu.classList.add("is-closing")
  }
}

const toggleScrollMenu = () => {
  if (!scrollMenu) return
  const isOpen = scrollMenu.classList.contains(SCROLL_MENU_OPEN_CLASS)
  setScrollMenuState(!isOpen)
}

// ==============================
// Door Animation Functions
// ==============================
const setInteriorState = (state: DoorState) => {
  if (!interior) return
  interior.style.opacity = state === STATES.OPENED ? "0.95" : "0"
}

const updateToggleState = (state: DoorState) => {
  if (!toggle || !toggleLabel) return
  const isClosed = state === STATES.CLOSED
  toggle.setAttribute("aria-pressed", String(isClosed))
  toggleLabel.textContent = isClosed ? "Open Door" : "Close Door"
}

const NAV_CONDENSED_CLASS = "is-condensed"
const CONTENT_CONDENSED_CLASS = "has-condensed-nav"

const updateNavOnScroll = () => {
  if (!nav) return
  const threshold = window.innerHeight * navCollapseThreshold
  const shouldCollapse = window.scrollY > threshold
  nav.classList.toggle(NAV_CONDENSED_CLASS, shouldCollapse)
  contentShell?.classList.toggle(CONTENT_CONDENSED_CLASS, shouldCollapse)
}

const hideContent = () => {
  if (!contentShell) return
  window.clearTimeout(contentTimer)
  contentShell.classList.remove("is-visible")
  contentShell.classList.remove(CONTENT_CONDENSED_CLASS)
  if (nav) {
    nav.classList.remove(NAV_CONDENSED_CLASS)
  }
}

const showContent = (delay = 0) => {
  if (!contentShell) return
  window.clearTimeout(contentTimer)
  contentTimer = window.setTimeout(() => {
    contentShell.classList.add("is-visible")
    setScrollMenuState(false)
    updateNavOnScroll()
  }, delay)
}

const playState = (state: DoorState, options: DoorOptions = {}) => {
  const { autoHide = false, remember = false } = options
  if (!overlay) return
  if (state === overlay.dataset.doorState) return

  if (state === STATES.OPENING) {
    hideContent()
    overlay.hidden = false
    overlay.style.opacity = "1"
    overlay.setAttribute("aria-hidden", "false")
    overlay.dataset.doorState = STATES.CLOSED
    void overlay.offsetWidth
    overlay.dataset.doorState = STATES.OPENING
    setInteriorState(STATES.OPENED)

    const onOpenEnd = (event: AnimationEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.classList.contains("door-panel--right")
      ) {
        return
      }
      overlay.removeEventListener("animationend", onOpenEnd)
      overlay.dataset.doorState = STATES.OPENED
      if (autoHide) {
        overlay.style.opacity = "0"
        window.setTimeout(() => {
          overlay.hidden = true
          overlay.style.opacity = ""
          overlay.setAttribute("aria-hidden", "true")
        }, 200)
      }
      if (remember) {
        sessionStorage.setItem("doorOpened", "1")
      }
      updateToggleState(STATES.OPENED)
      setInteriorState(STATES.OPENED)
      showContent(contentRevealDelay)
    }

    overlay.addEventListener("animationend", onOpenEnd)
  }

  if (state === STATES.CLOSING) {
    hideContent()
    overlay.hidden = false
    overlay.style.opacity = "1"
    overlay.setAttribute("aria-hidden", "false")
    overlay.dataset.doorState = STATES.OPENED
    void overlay.offsetWidth
    overlay.dataset.doorState = STATES.CLOSING
    setInteriorState(STATES.CLOSED)

    const onCloseEnd = (event: AnimationEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.classList.contains("door-panel--right")
      ) {
        return
      }
      overlay.removeEventListener("animationend", onCloseEnd)
      overlay.dataset.doorState = STATES.CLOSED
      overlay.style.opacity = ""
      updateToggleState(STATES.CLOSED)
    }

    overlay.addEventListener("animationend", onCloseEnd)
  }

  updateToggleState(state)
}

const initializeDoor = () => {
  hideContent()

  if (!overlay) {
    showContent(0)
    return
  }

  const initialState = (overlay.dataset.doorState as DoorState) || STATES.CLOSED
  updateToggleState(initialState)
  setInteriorState(prefersReducedMotion ? STATES.OPENED : initialState)

  if (prefersReducedMotion) {
    overlay.hidden = true
    overlay.dataset.doorState = STATES.OPENED
    overlay.setAttribute("aria-hidden", "true")
    showContent(0)
    return
  }

  const shouldAutoPlay = !hasSeenDoor
  if (shouldAutoPlay) {
    setInteriorState(STATES.CLOSED)
    window.setTimeout(() => {
      playState(STATES.OPENING, { autoHide: true, remember: true })
    }, doorAutoDelay)
  } else {
    overlay.hidden = true
    overlay.dataset.doorState = STATES.OPENED
    overlay.setAttribute("aria-hidden", "true")
    setInteriorState(STATES.OPENED)
    updateToggleState(STATES.OPENED)
    showContent(0)
  }
}

// ==============================
// Event Handlers
// ==============================

// Scroll menu toggle
scrollToggle?.addEventListener("click", () => {
  toggleScrollMenu()
})

// Close scroll menu when clicking link
scrollPanel?.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) return
  if (event.target.closest("a")) {
    window.setTimeout(() => setScrollMenuState(false), 200)
  }
})

// Cleanup scroll menu animation classes
const handleScrollMenuAnimationEnd = (event: AnimationEvent) => {
  if (!scrollMenu || !scrollPanel) return
  if (!(event.target instanceof Element)) return
  if (!event.target.classList.contains("scroll-menu-scroll")) return

  if (event.animationName === "scroll-reveal") {
    scrollMenu.classList.remove("is-opening")
    return
  }

  if (event.animationName === "scroll-hide") {
    scrollMenu.classList.remove("is-closing")
    scrollMenu.classList.remove(SCROLL_MENU_OPEN_CLASS)
  }
}

scrollPanel?.addEventListener("animationend", handleScrollMenuAnimationEnd)

// Close scroll menu on outside click
window.addEventListener("click", (event) => {
  if (!scrollMenu || !scrollPanel) return
  if (!scrollMenu.classList.contains(SCROLL_MENU_OPEN_CLASS)) return
  if (!(event.target instanceof Node)) return
  if (scrollMenu.contains(event.target)) return
  setScrollMenuState(false)
})

// Close scroll menu on ESC
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setScrollMenuState(false)
  }
})

// Door enter button
enter?.addEventListener("click", () => {
  playState(STATES.OPENING, { autoHide: true, remember: true })
})

// Door toggle button
toggle?.addEventListener("click", () => {
  if (!overlay) return
  const current = (overlay.dataset.doorState as DoorState) || STATES.CLOSED
  if (current === STATES.OPENING || current === STATES.CLOSING) {
    return
  }
  if (current === STATES.OPENED) {
    playState(STATES.CLOSING)
  } else {
    playState(STATES.OPENING, { autoHide: true })
  }
})

// Scroll handler
window.addEventListener("scroll", () => {
  if (!contentShell?.classList.contains("is-visible")) return
  if (scrollTick) return
  scrollTick = true
  window.requestAnimationFrame(() => {
    updateNavOnScroll()
    scrollTick = false
  })
})

// Resize handler
window.addEventListener("resize", () => {
  if (!contentShell?.classList.contains("is-visible")) return
  setScrollMenuState(false)
  updateNavOnScroll()
})

// ==============================
// Donation Interaction
// ==============================
const donationHref =
  donationButton instanceof HTMLAnchorElement
    ? donationButton.getAttribute("href")
    : null

const performCoinAnimation = () => {
  if (coin) {
    coin.classList.remove("animate")
    void coin.offsetWidth
    coin.classList.add("animate")
  }
  coinSound?.play?.()
}

donationButton?.addEventListener("click", (event) => {
  performCoinAnimation()
  if (!(donationButton instanceof HTMLAnchorElement) || !donationHref) {
    return
  }
  if (event instanceof MouseEvent && event.button !== 0) {
    return
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }
  event.preventDefault()
  window.setTimeout(() => {
    window.location.assign(donationHref)
  }, 420)
})

// ==============================
// Global API
// ==============================
interface TempleDoorAPI {
  open: () => void
  close: () => void
  state: () => DoorState
}

;(window as any).templeDoor = {
  open: () => playState(STATES.OPENING, { autoHide: true }),
  close: () => playState(STATES.CLOSING),
  state: () => (overlay?.dataset.doorState as DoorState) ?? STATES.CLOSED,
} as TempleDoorAPI

// ==============================
// Initialize
// ==============================
initializeDoor()
