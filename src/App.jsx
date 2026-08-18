import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import doctorAvatar from './assets/ai-doctor-avatar.png'
import shenazLogo from './assets/shenaz-logo.png'
import { streamVoiceAgent } from './services/voiceAgent'
import {
  createDeepgramSpeechQueue,
  isDeepgramConfigured,
  isDeepgramPlaybackSupported,
  stopDeepgramSpeech,
  unlockDeepgramPlayback,
} from './services/deepgramTts'
import { createSpeechRecognizer, isSpeechRecognitionSupported } from './utils/browserStt'
import { createPhraseBuffer } from './utils/phraseBuffer'
import './App.css'

const serviceData = [
  ['▣', 'Book Appointments', 'Schedule, reschedule or cancel appointments'],
  ['ⓘ', 'Hospital Information', 'Hours, location, services & policies'],
  ['♙', 'Find Doctors', 'Information about our specialists'],
  ['♡', 'Health Information', 'Guidance on general health questions'],
  ['✚', 'Emergency Support', '24/7 assistance for urgent needs'],
]
const VAD_VOLUME_THRESHOLD = 0.03
const VAD_BARGE_IN_THRESHOLD = 0.065
const VAD_BARGE_IN_FRAMES = 12
const VAD_BARGE_IN_COOLDOWN_MS = 900
const VAD_SILENCE_TIMEOUT_MS = 1000
const VAD_MIN_SPEECH_MS = 400
const MEDIA_RECORDER_TIMESLICE_MS = 250

const navLinks = [['Home', 'home'], ['Services', 'services'], ['About Us', 'about'], ['Contact', 'about']]
const landingNavLinks = [['Home', 'home'], ['Services', 'services'], ['About Us', 'about'], ['Contact', 'contact']]
const voiceProcessSteps = [
  {
    id: 'services',
    n: '1',
    title: 'Services',
    detail: 'Find hospital services',
    tone: 'teal',
    angle: 0,
    side: 'end',
  },
  {
    id: 'doctor',
    n: '2',
    title: 'Find a Doctor',
    detail: 'Check doctor availability',
    tone: 'cyan',
    angle: 90,
    side: 'end',
  },
  {
    id: 'booking',
    n: '3',
    title: 'Book a Visit',
    detail: 'Schedule your appointment',
    tone: 'blue',
    angle: 180,
    side: 'start',
  },
  {
    id: 'support',
    n: '4',
    title: 'Get Support',
    detail: 'Ask anything about the hospital',
    tone: 'violet',
    angle: 270,
    side: 'start',
    showCheck: true,
  },
]
const PROCESS_RING_R = 132
// Orbit SVG is inset 4% (92% of stage); ring r/160 of that half → ~37.95% from center
const PROCESS_STEP_R = 0.3795
// 0° = top, clockwise
function processPolar(angleDeg, r = PROCESS_RING_R, cx = 160, cy = 160) {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}
function stepPercentPos(angleDeg, r = PROCESS_STEP_R) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    left: `${50 + Math.sin(rad) * r * 100}%`,
    top: `${50 - Math.cos(rad) * r * 100}%`,
  }
}
const voiceProcessLinks = voiceProcessSteps.slice(0, -1).map((step, index) => {
  const next = voiceProcessSteps[index + 1]
  const span = next.angle - step.angle
  const length = (2 * Math.PI * PROCESS_RING_R) * (span / 360)
  const [x1, y1] = processPolar(step.angle)
  const [x2, y2] = processPolar(next.angle)
  const largeArc = span > 180 ? 1 : 0
  return {
    id: `${step.id}-${next.id}`,
    d: `M ${x1} ${y1} A ${PROCESS_RING_R} ${PROCESS_RING_R} 0 ${largeArc} 1 ${x2} ${y2}`,
    length,
  }
})
// Smooth circular envelope — gentle lobes, no spikes
const WAVE_TICK_COUNT = 56
const WAVE_TICKS = Array.from({ length: WAVE_TICK_COUNT }, (_, i) => {
  const t = (i / WAVE_TICK_COUNT) * Math.PI * 2
  return 6.5 + Math.sin(t * 3) * 2 + Math.sin(t * 5 + 0.4) * 1.2
})
const STAGE_DUST_COUNT = 10
const benefitItems = [
  ['shield', 'Private & Secure', 'Your data is protected and confidential.'],
  ['clock', 'Always Available', 'Get help anytime, day or night.'],
  ['bolt', 'Fast Assistance', 'Instant answers for your healthcare needs.'],
]
const careCapabilities = [
  ['chat', 'Care guidance', 'Get clear answers about departments, services and the right next step for your needs.', 'Talk it through'],
  ['calendar', 'Easy scheduling', 'Find a convenient appointment and manage your visit without waiting on hold.', 'Plan your visit'],
  ['hospital', 'Hospital navigation', 'Quickly find specialists, visiting hours, locations and patient information.', 'Find your way'],
]
const journeySteps = [
  ['01', 'Start with your voice', 'Tap the microphone and ask your question naturally.'],
  ['02', 'We understand', 'Our assistant finds the most relevant hospital information.'],
  ['03', 'Move forward', 'Get an answer, choose a service or take the next action.'],
]
const chatOrbitSteps = [
  { id: 'listen', icon: 'mic', title: 'Listening', detail: 'Capturing your voice…', angle: 0, side: 'top' },
  { id: 'understand', icon: 'sparkle', title: 'Understanding', detail: 'Analyzing your request…', angle: 72, side: 'end' },
  { id: 'find', icon: 'pin', title: 'Finding Options', detail: 'Searching doctors & availability…', angle: 144, side: 'end' },
  { id: 'action', icon: 'calendar', title: 'Taking Action', detail: 'Working on your request…', angle: 216, side: 'start' },
  { id: 'respond', icon: 'check', title: 'Responding', detail: 'Preparing the best response…', angle: 288, side: 'start' },
]
const CHAT_ORBIT_R = 138
const CHAT_STEP_R = 0.345
const CHAT_WAVE_COUNT = 64
const CHAT_WAVE_TICKS = Array.from({ length: CHAT_WAVE_COUNT }, (_, i) => {
  const t = (i / CHAT_WAVE_COUNT) * Math.PI * 2
  return 5.5 + Math.sin(t * 4) * 2.2 + Math.sin(t * 7 + 0.5) * 1.1
})
function chatOrbitPolar(angleDeg, r = CHAT_ORBIT_R, cx = 200, cy = 200) {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}
function chatStepPercentPos(angleDeg, r = CHAT_STEP_R) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    left: `${50 + Math.sin(rad) * r * 100}%`,
    top: `${50 - Math.cos(rad) * r * 100}%`,
  }
}
function getChatOrbitStep(agentState) {
  switch (agentState) {
    case 'listening':
    case 'user_speaking':
    case 'connecting':
      return 0
    case 'processing':
      return 1
    case 'speaking':
      return 4
    default:
      return null
  }
}
const chatServiceChips = [
  { icon: 'calendar', label: 'Book an appointment' },
  { icon: 'pin', label: 'Find a doctor' },
  { icon: 'hospital', label: 'Hospital services' },
]

function Ic({ name, className }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const shapes = {
    mic: <g {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3" /></g>,
    shield: <path {...p} d="M12 3l7 3v5c0 4.2-3 7-7 8.5C8 18 5 15.2 5 11V6z M9.5 11.5l1.8 1.8 3.5-3.6" />,
    phone: <path {...p} d="M6.5 3.5h3l1.5 4.5-2 1.2a11 11 0 0 0 5 5l1.2-2 4.5 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />,
    calendar: <g {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4M9 13l2 2 4-4" /></g>,
    clock: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>,
    bolt: <path {...p} d="M13 3L5 13h6l-1 8 8-11h-6z" />,
    mail: <g {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M4 7l8 6 8-6" /></g>,
    pin: <g {...p}><path d="M12 21c4-4.5 6-7.6 6-10.5a6 6 0 1 0-12 0C6 13.4 8 16.5 12 21z" /><circle cx="12" cy="10.5" r="2.2" /></g>,
    hospital: <g {...p}><path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" /><path d="M2 21h20M9 21v-5h6v5M12 5v6M9 8h6" /></g>,
    menu: <path {...p} d="M4 7h16M4 12h16M4 17h16" />,
    chat: <g {...p}><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.2V16.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" /><circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" /><circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" /><circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" /></g>,
    history: <g {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 5.5v4h4" /><path d="M12 8v4.2l2.8 1.7" /></g>,
    help: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.1.9-1.1 1.7" /><circle cx="12" cy="16.4" r="0.8" fill="currentColor" stroke="none" /></g>,
    settings: <g {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6" /></g>,
    logout: <g {...p}><path d="M10 5.5H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /><path d="M14 8.5 17.5 12 14 15.5M10 12h7.5" /></g>,
    hangup: <g {...p} transform="rotate(135 12 12)"><path d="M6.5 3.5h3l1.5 4.5-2 1.2a11 11 0 0 0 5 5l1.2-2 4.5 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" /></g>,
    info: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5" /><circle cx="12" cy="7.8" r="0.8" fill="currentColor" stroke="none" /></g>,
    arrowLeft: <path {...p} d="M15 5.5 8.5 12 15 18.5M8.5 12H20" />,
    arrowRight: <path {...p} d="M9 5.5 15.5 12 9 18.5M15.5 12H4" />,
    sparkle: <path {...p} d="M12 3.5c.7 4.2 2.8 6.3 7 7-4.2.7-6.3 2.8-7 7-.7-4.2-2.8-6.3-7-7 4.2-.7 6.3-2.8 7-7z" />,
    check: <path {...p} d="m6.5 12.5 3.4 3.4 7.6-8" />,
  }
  return <svg viewBox="0 0 24 24" width="1em" height="1em" className={className} aria-hidden="true">{shapes[name]}</svg>
}

function Brand({ light = false, onClick }) {
  return (
    <button className={`brand ${light ? 'brand-light' : ''}`} type="button" onClick={onClick} aria-label="Shenaz Hospital home">
      <img src={shenazLogo} alt="Shenaz Hospital" className="brand-logo" />
    </button>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24)
      const marker = window.scrollY + Math.min(220, window.innerHeight * .32)
      let currentSection = 'home'
      landingNavLinks.forEach(([, sectionId]) => {
        const section = document.getElementById(sectionId)
        if (section && section.offsetTop <= marker) currentSection = sectionId
      })
      setActiveSection(currentSection)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(sectionId)
    setMenuOpen(false)
  }

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <Brand onClick={() => scrollToSection('home')} />
      <nav className={menuOpen ? 'open' : ''} aria-label="Primary">
        {landingNavLinks.map(([label, target]) => (
          <button className={activeSection === target ? 'active' : ''} aria-current={activeSection === target ? 'page' : undefined} onClick={() => scrollToSection(target)} key={label}>{label}</button>
        ))}
      </nav>
      <button className="menu-toggle" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
        <Ic name="menu" />
      </button>
    </header>
  )
}

function Sidebar({ page, goTo }) {
  const links = [['chat', 'Chat', 'chat'], ['history', 'History', 'history'], ['help', 'Help', 'help'], ['settings', 'Settings', 'settings']]
  return (
    <aside className="sidebar">
      <button className="sidebar-brand" type="button" onClick={() => goTo('home')} aria-label="Shenaz home">
        <img src={shenazLogo} alt="Shenaz Hospital" className="brand-logo brand-logo-sidebar" />
      </button>
      <nav className="side-menu" aria-label="App">
        {links.map(([icon, label, target]) => (
          <button
            className={page === target ? 'selected' : ''}
            onClick={() => goTo(target)}
            key={label}
            type="button"
            title={label}
          >
            <span className="side-icon"><Ic name={icon} /></span>
            <span className="side-label">{label}</span>
          </button>
        ))}
      </nav>
      <button className="logout" type="button" title="Logout">
        <span className="side-icon"><Ic name="logout" /></span>
        <span className="side-label">Logout</span>
      </button>
    </aside>
  )
}

function Footer({ goTo }) {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-brand">
          <Brand onClick={() => goTo('home')} />
          <p>Compassionate care. Connected healthcare.</p>
        </div>
        <div className="footer-col">
          <strong>Quick Links</strong>
          {navLinks.map(([label, target]) => <button key={label} type="button" onClick={() => goTo(target)}>{label}</button>)}
        </div>
        <div className="footer-col contact">
          <strong>Contact Us</strong>
          <span><Ic name="phone" /> +1 (555) 123-4567</span>
          <span><Ic name="mail" /> info@shenazhospital.com</span>
          <span><Ic name="pin" /> 123 Health Street, Wellness City</span>
        </div>
        <div className="footer-col copyright">
          <p>© 2025 Shenaz Hospital.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function VoiceAgentVisualizer({ voiceState = 'idle', onStart }) {
  const rootRef = useRef(null)
  const [activeStep, setActiveStep] = useState(0)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const context = gsap.context(() => {
      const steps = [...root.querySelectorAll('.vav-step')]
      const nodes = [...root.querySelectorAll('.vav-step-node')]
      const dots = [...root.querySelectorAll('.vav-step-dot')]
      const links = [...root.querySelectorAll('.vav-link-active')]
      const beacon = root.querySelector('.vav-beacon')
      const ticks = root.querySelectorAll('.vav-wave-tick')
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const applyStep = (index, { pulse = true } = {}) => {
        setActiveStep(index)
        steps.forEach((step, i) => {
          step.classList.toggle('is-active', i === index)
          step.classList.toggle('is-done', i < index)
          step.classList.toggle('is-upcoming', i > index)
        })
        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === index)
          dot.classList.toggle('is-done', i < index)
        })
        links.forEach((link, i) => {
          link.classList.toggle('is-lit', i < index)
          link.classList.toggle('is-drawing', false)
        })
        gsap.to(nodes, { scale: 1, duration: 0.28, ease: 'power2.out', overwrite: 'auto' })
        if (nodes[index] && pulse) {
          gsap.fromTo(
            nodes[index],
            { scale: 1 },
            { scale: 1.16, duration: 0.38, ease: 'back.out(1.8)', yoyo: true, repeat: 1, overwrite: 'auto' },
          )
        } else if (nodes[index]) {
          gsap.to(nodes[index], { scale: 1.1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
        }
      }

      links.forEach((link, i) => {
        const len = voiceProcessLinks[i]?.length || 100
        gsap.set(link, { strokeDasharray: len, strokeDashoffset: len, opacity: 0.25 })
      })
      gsap.set(beacon, { rotation: voiceProcessSteps[0].angle, transformOrigin: '50% 50%' })
      gsap.set(steps, { clearProps: 'opacity,visibility' })
      applyStep(0, { pulse: false })

      if (reduceMotion) {
        links.forEach((link) => gsap.set(link, { strokeDashoffset: 0, opacity: 1 }))
        links.forEach((link) => link.classList.add('is-lit'))
        steps.forEach((step) => {
          step.classList.add('is-done')
          step.classList.remove('is-upcoming', 'is-active')
        })
        steps[0]?.classList.add('is-active')
        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === 0)
          dot.classList.toggle('is-done', i > 0)
        })
        return
      }

      const timeline = gsap.timeline({ repeat: -1, defaults: { ease: 'power1.inOut' } })

      // Hold on step → draw connector to next → glow arrives on destination
      voiceProcessSteps.forEach((step, index) => {
        const label = `step${index}`
        timeline.add(label)
        if (index === 0) {
          timeline.add(() => applyStep(0, { pulse: false }), label)
        }
        timeline.to({}, { duration: 0.55 })

        if (index < voiceProcessLinks.length) {
          const link = links[index]
          const next = voiceProcessSteps[index + 1]
          timeline.add(() => {
            link.classList.add('is-drawing')
            link.classList.remove('is-lit')
          })
          timeline.fromTo(
            link,
            { strokeDashoffset: voiceProcessLinks[index].length, opacity: 0.45 },
            { strokeDashoffset: 0, opacity: 1, duration: 1.35, ease: 'power1.inOut' },
          )
          timeline.to(beacon, { rotation: next.angle, duration: 1.35, ease: 'power1.inOut' }, '<')
          timeline.add(() => {
            link.classList.remove('is-drawing')
            link.classList.add('is-lit')
            applyStep(index + 1, { pulse: true })
          })
          timeline.to({}, { duration: 0.4 })
        } else {
          timeline.to({}, { duration: 1.0 })
        }
      })

      timeline
        .to(links, {
          strokeDashoffset: (i) => voiceProcessLinks[i]?.length || 100,
          opacity: 0.25,
          duration: 0.5,
          stagger: 0.03,
          ease: 'power2.in',
        })
        .to(beacon, { rotation: voiceProcessSteps[0].angle + 360, duration: 0.5, ease: 'power2.in' }, '<')
        .set(beacon, { rotation: voiceProcessSteps[0].angle })
        .add(() => {
          links.forEach((link) => {
            link.classList.remove('is-lit', 'is-drawing')
          })
          steps.forEach((step) => {
            step.classList.remove('is-active', 'is-done')
            step.classList.add('is-upcoming')
          })
          dots.forEach((dot) => {
            dot.classList.remove('is-active', 'is-done')
          })
        })

      gsap.to(root.querySelector('.vav-mic'), {
        scale: 1.03,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      if (ticks.length) {
        gsap.to(ticks, {
          scaleY: 0.82,
          duration: 0.85,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: { each: 0.028, from: 'start' },
        })
      }
    }, root)

    return () => context.revert()
  }, [])

  return (
    <div
      ref={rootRef}
      className={`voice-visual vav vav-radial-wrap vav-${voiceState}`}
      data-voice-state={voiceState}
      data-active-step={voiceProcessSteps[activeStep]?.id}
    >
      <div className="vav-radial">
        <div className="vav-stage-bg" aria-hidden="true">
          <span className="vav-grid" />
          <span className="vav-aura vav-aura-1" />
          <span className="vav-aura vav-aura-2" />
          <span className="vav-aura vav-aura-3" />
          <span className="vav-glow" />
          {Array.from({ length: STAGE_DUST_COUNT }, (_, i) => (
            <i className={`vav-dust vav-dust-${i + 1}`} key={i} />
          ))}
        </div>

        <svg className="vav-orbit" viewBox="0 0 320 320" aria-hidden="true">
          <defs>
            <linearGradient id="vavProcessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#55f2af" />
              <stop offset="35%" stopColor="#29d7b3" />
              <stop offset="70%" stopColor="#47d9ed" />
              <stop offset="100%" stopColor="#7eb4ff" />
            </linearGradient>
            <filter id="vavGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle className="vav-ring-track" cx="160" cy="160" r={PROCESS_RING_R} fill="none" />
          <circle className="vav-ring-dots" cx="160" cy="160" r={PROCESS_RING_R} fill="none" />
          {voiceProcessLinks.map((seg) => (
            <path key={`base-${seg.id}`} className="vav-link-base" d={seg.d} fill="none" />
          ))}
          {voiceProcessLinks.map((seg) => (
            <path
              key={`active-${seg.id}`}
              className="vav-link-active"
              d={seg.d}
              fill="none"
              filter="url(#vavGlow)"
            />
          ))}
          {voiceProcessSteps.map((step) => {
            const [cx, cy] = processPolar(step.angle)
            return (
              <circle
                key={`dot-${step.id}`}
                className={`vav-step-dot vav-step-dot-${step.tone}`}
                cx={cx}
                cy={cy}
                r="4.5"
              />
            )
          })}
        </svg>

        <div className="vav-beacon" aria-hidden="true"><i /></div>

        <div className="vav-wave-ring" aria-hidden="true">
          {WAVE_TICKS.map((height, index) => (
            <span
              key={index}
              className="vav-wave-spoke"
              style={{ '--tick-angle': `${(360 / WAVE_TICKS.length) * index}deg` }}
            >
              <i className="vav-wave-tick" style={{ '--tick-h': `${height}px` }} />
            </span>
          ))}
        </div>

        {voiceProcessSteps.map((step, index) => {
          const pos = stepPercentPos(step.angle)
          return (
            <div
              className={`vav-step vav-step-${step.tone} vav-side-${step.side}${activeStep === index ? ' is-active' : index < activeStep ? ' is-done' : ' is-upcoming'}`}
              key={step.id}
              style={pos}
            >
              <div className="vav-step-inner">
                <span className="vav-step-node">
                  {step.showCheck && activeStep >= index ? <Ic name="check" /> : step.n}
                </span>
                <div className="vav-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </div>
              </div>
            </div>
          )
        })}

        <button className="vav-mic" type="button" aria-label="Start Voice Chat" onClick={onStart}>
          <span className="vav-mic-glass" />
          <span className="vav-mic-icon"><Ic name="mic" /></span>
        </button>

        <div className="vav-ready" aria-live="polite">READY</div>
      </div>
    </div>
  )
}

function Landing({ goTo }) {
  const landingRef = useRef(null)

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      intro
        .from('.site-header', { y: -34, opacity: 0, duration: 0.75 })
        .from('.hero-copy h1', { y: 72, opacity: 0, skewY: 4, duration: 1.05 }, '-=0.35')
        .from('.hero-copy > p, .hero-actions, .hero-proof', { y: 34, opacity: 0, duration: 0.75, stagger: 0.13 }, '-=0.6')
        .from('.vav-radial', { x: 56, scale: 0.9, opacity: 0, duration: 1.05 }, '-=0.95')
        .from('.vav-mic, .vav-ready', { opacity: 0, scale: 0.92, duration: 0.55 }, '-=0.35')

      gsap.to('.gradient-orb-one', { xPercent: 42, yPercent: 28, scale: 1.18, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.gradient-orb-two', { xPercent: -34, yPercent: 32, scale: .86, duration: 9, repeat: -1, yoyo: true, ease: 'sine.inOut' })

      gsap.utils.toArray('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 42,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 84%', once: true },
        })
      })

      gsap.from('.capability-card', {
        y: 38,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.capability-grid', start: 'top 82%', once: true },
      })

      gsap.from('.journey-step', {
        x: -24,
        opacity: 0,
        duration: 0.65,
        stagger: 0.14,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.journey-grid', start: 'top 82%', once: true },
      })

      gsap.to('.capabilities-section', {
        backgroundPosition: '100% 50%',
        ease: 'none',
        scrollTrigger: { trigger: '.capabilities-section', start: 'top bottom', end: 'bottom top', scrub: 1 },
      })

      gsap.to('.closing-glow', {
        x: -90,
        y: 70,
        scale: 1.25,
        ease: 'none',
        scrollTrigger: { trigger: '.closing-cta', start: 'top bottom', end: 'bottom top', scrub: 1 },
      })
    }, landingRef)

    return () => context.revert()
  }, [])

  return (
    <div className="landing-page" ref={landingRef}>
      <div className="landing">
        <div className="gradient-orb gradient-orb-one" aria-hidden="true" />
        <div className="gradient-orb gradient-orb-two" aria-hidden="true" />
        <Header />
        <main>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <h1 className="hero-reveal">Care begins with<br />a simple <span>hello.</span></h1>
              <p className="hero-reveal"><span className="hero-lead">Meet your always-available hospital assistant.</span> Ask about services, find the right doctor or book an appointment—just by speaking.</p>
              <div className="hero-actions hero-reveal">
                <button className="button hero-cta" onClick={() => goTo('chat')}><Ic name="mic" /> Start Voice Chat</button>
                <button className="hero-link" type="button" onClick={() => goTo('services')}>Explore services <Ic name="arrowRight" /></button>
              </div>
              <div className="hero-proof hero-reveal">
                <span><strong>24/7</strong><small>Always available</small></span>
                <span><strong>&lt; 30 sec</strong><small>To get started</small></span>
                <span><strong>Secure</strong><small>Private support</small></span>
              </div>
            </div>
            <VoiceAgentVisualizer voiceState="idle" onStart={() => goTo('chat')} />
          </section>

          <section className="capabilities-section" id="services">
            <div className="section-heading" data-reveal>
              <div>
                <p className="section-kicker">One connected experience</p>
                <h2>Everything you need,<br />without the runaround.</h2>
              </div>
              <p>From the first question to the next step, Shenaz helps you navigate care with clarity, speed and confidence.</p>
            </div>
            <div className="capability-grid">
              {careCapabilities.map(([icon, title, detail, action], index) => (
                <button className={`capability-card capability-card-${index + 1}`} type="button" key={title} onClick={() => goTo(index === 1 ? 'chat' : 'services')}>
                  <span className="capability-number">0{index + 1}</span>
                  <span className="capability-icon"><Ic name={icon} /></span>
                  <i><strong>{title}</strong><small>{detail}</small></i>
                  <b>{action} <Ic name="arrowRight" /></b>
                </button>
              ))}
            </div>
          </section>

          <section className="journey-section" id="about">
            <div className="journey-intro" data-reveal>
              <p className="section-kicker">Designed around you</p>
              <h2>Help that feels effortless.</h2>
              <p>No forms to hunt down. No complicated menus. Just a natural conversation that helps you move forward.</p>
              <div className="journey-note"><Ic name="check" /><span>Simple, human and available on your schedule.</span></div>
            </div>
            <div className="journey-grid">
              {journeySteps.map(([number, title, detail]) => (
                <article className="journey-step" key={number}>
                  <span>{number}</span>
                  <i><strong>{title}</strong><small>{detail}</small></i>
                </article>
              ))}
            </div>
          </section>

          <section className="benefits-strip" aria-label="Benefits">
            {benefitItems.map(([icon, title, detail]) => (
              <div className="benefit-item" key={title}>
                <span className="benefit-icon"><Ic name={icon} /></span>
                <i><strong>{title}</strong><small>{detail}</small></i>
              </div>
            ))}
          </section>

          <section className="closing-cta" id="contact" data-reveal>
            <span className="closing-glow" aria-hidden="true" />
            <div>
              <p className="section-kicker">Here when you need us</p>
              <h2>Your care journey can start right now.</h2>
              <p>Speak with the Shenaz voice assistant for fast, friendly guidance—day or night.</p>
            </div>
            <button className="button closing-button" onClick={() => goTo('chat')}><Ic name="mic" /> Talk to the assistant <Ic name="arrowRight" /></button>
          </section>
        </main>
        <Footer goTo={goTo} />
      </div>
    </div>
  )
}

function PageShell({ page, goTo, children }) {
  return (
    <div className="app-shell">
      <div className="app-shell-bg" aria-hidden="true" />
      <div className="app-frame">
        <Sidebar page={page} goTo={goTo} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}

function getVoiceStatus(agentState, processingMessage, error) {
  switch (agentState) {
    case 'disconnected':
      return { tone: 'idle', text: 'Ready to help.' }
    case 'connecting':
      return { tone: 'connecting', text: 'Starting voice chat…' }
    case 'listening':
      return { tone: 'listening', text: 'Listening…' }
    case 'user_speaking':
      return { tone: 'listening', text: 'Hearing you…' }
    case 'processing':
      return { tone: 'processing', text: processingMessage || 'Processing…' }
    case 'speaking':
      return { tone: 'speaking', text: 'Speaking…' }
    case 'error':
      return { tone: 'error', text: error || 'Something went wrong' }
    default:
      return { tone: 'idle', text: 'Ready to help.' }
  }
}

function computeAnalyserRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (let index = 0; index < buffer.length; index += 1) {
    const sample = (buffer[index] - 128) / 128
    sum += sample * sample
  }
  return Math.sqrt(sum / buffer.length)
}

function VoiceAgentAvatar({ agentState, vadLevel }) {
  const rootRef = useRef(null)
  const [activeStep, setActiveStep] = useState(0)
  const liveStep = getChatOrbitStep(agentState)
  void vadLevel

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const steps = [...root.querySelectorAll('.voice-orbit-step')]
    const nodes = [...root.querySelectorAll('.voice-orbit-node')]
    const beacon = root.querySelector('.voice-orbit-beacon')
    const ticks = [...root.querySelectorAll('.voice-orbit-tick')]
    const portrait = root.querySelector('.voice-portrait')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resetOrbit = () => {
      setActiveStep(0)
      steps.forEach((step, i) => {
        step.classList.toggle('is-active', i === 0)
        step.classList.toggle('is-done', false)
        step.classList.toggle('is-upcoming', i > 0)
      })

      const targets = [...nodes, beacon, portrait, ...ticks].filter(Boolean)
      gsap.killTweensOf(targets)
      gsap.set(nodes, { scale: 1, clearProps: 'transform' })
      if (beacon) {
        gsap.set(beacon, { rotation: 0, transformOrigin: '50% 50%', clearProps: 'transform' })
      }
      if (portrait) {
        gsap.set(portrait, { scale: 1, clearProps: 'transform' })
      }
      if (ticks.length) {
        gsap.set(ticks, { scaleY: 1, clearProps: 'transform' })
      }
    }

    if (liveStep === null) {
      resetOrbit()
      return
    }

    const context = gsap.context(() => {
      const applyStep = (index, { pulse = true } = {}) => {
        setActiveStep(index)
        steps.forEach((step, i) => {
          step.classList.toggle('is-active', i === index)
          step.classList.toggle('is-done', i < index)
          step.classList.toggle('is-upcoming', i > index)
        })
        gsap.to(nodes, { scale: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto' })
        if (nodes[index] && pulse) {
          gsap.fromTo(
            nodes[index],
            { scale: 1 },
            { scale: 1.12, duration: 0.35, ease: 'back.out(1.6)', yoyo: true, repeat: 1, overwrite: 'auto' },
          )
        } else if (nodes[index]) {
          gsap.to(nodes[index], { scale: 1.08, duration: 0.28, ease: 'power2.out', overwrite: 'auto' })
        }
        if (beacon) {
          gsap.to(beacon, {
            rotation: chatOrbitSteps[index].angle,
            duration: 0.85,
            ease: 'power1.inOut',
            overwrite: 'auto',
          })
        }
      }

      gsap.set(beacon, { rotation: chatOrbitSteps[0].angle, transformOrigin: '50% 50%' })

      if (portrait && !reduceMotion) {
        gsap.to(portrait, {
          scale: 1.02,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      if (ticks.length && !reduceMotion) {
        gsap.to(ticks, {
          scaleY: 0.85,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: { each: 0.02, from: 'start' },
        })
      }

      applyStep(liveStep, { pulse: agentState !== 'connecting' })
    }, root)

    return () => context.revert()
  }, [agentState, liveStep])

  return (
    <div
      ref={rootRef}
      className={`voice-orbit voice-agent voice-agent-${agentState}`}
      data-active-step={chatOrbitSteps[activeStep]?.id}
      aria-hidden="true"
    >
      <div className="voice-orbit-stage">
        <svg className="voice-orbit-svg" viewBox="0 0 400 400">
          <circle className="voice-orbit-dash" cx="200" cy="200" r={CHAT_ORBIT_R} fill="none" />
          {chatOrbitSteps.map((step) => {
            const [cx, cy] = chatOrbitPolar(step.angle)
            return <circle key={`anchor-${step.id}`} className="voice-orbit-anchor" cx={cx} cy={cy} r="3.5" />
          })}
        </svg>

        <div className="voice-orbit-beacon"><i /></div>

        <div className="voice-orbit-wave">
          {CHAT_WAVE_TICKS.map((height, index) => (
            <span
              key={index}
              className="voice-orbit-spoke"
              style={{ '--tick-angle': `${(360 / CHAT_WAVE_TICKS.length) * index}deg` }}
            >
              <i className="voice-orbit-tick" style={{ '--tick-h': `${height}px` }} />
            </span>
          ))}
        </div>

        <div className="voice-portrait">
          <span className="voice-portrait-glow" />
          <span className="voice-portrait-ring" />
          <img src={doctorAvatar} alt="" />
        </div>

        {chatOrbitSteps.map((step, index) => (
          <div
            key={step.id}
            className={`voice-orbit-step voice-orbit-side-${step.side}${activeStep === index ? ' is-active' : index < activeStep ? ' is-done' : ' is-upcoming'}`}
            style={chatStepPercentPos(step.angle)}
          >
            <div className="voice-orbit-inner">
              <span className="voice-orbit-node"><Ic name={step.icon} /></span>
            </div>
            <div className="voice-orbit-copy">
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Topbar({ title, goTo, children }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="back" type="button" onClick={() => goTo('home')} aria-label="Back">
          <Ic name="arrowLeft" />
        </button>
        <div className="topbar-title">
          <p className="topbar-kicker">Voice Agent</p>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="topbar-actions">
        {children}
        <button className="info" type="button" aria-label="Info"><Ic name="info" /></button>
      </div>
    </header>
  )
}

function VoiceChat({ goTo, addHistory, conversationId, setConversationId, startNewChat }) {
  const [agentState, setAgentState] = useState('disconnected')
  const [error, setError] = useState('')
  const [processingMessage, setProcessingMessage] = useState('')
  const [vadLevel, setVadLevel] = useState(0)

  const stream = useRef(null)
  const recorder = useRef(null)
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const analyserBuffer = useRef(null)
  const vadFrameId = useRef(null)
  const silenceTimer = useRef(null)
  const speechStartTime = useRef(0)
  const recordingChunks = useRef([])
  const speechRecognizer = useRef(null)
  const abortController = useRef(null)
  const ttsAbortController = useRef(null)
  const ttsSession = useRef(null)
  const ttsQueueRef = useRef(null)
  const vadPaused = useRef(false)
  const sessionActive = useRef(false)
  const turnInProgress = useRef(false)
  const ttsSpeaking = useRef(false)
  const turnGenerationRef = useRef(0)
  const activeTurnIdRef = useRef(null)
  const agentStateRef = useRef('disconnected')
  const conversationIdRef = useRef(conversationId)
  const beginUserTurnRef = useRef(() => {})
  const finishUserTurnRef = useRef(() => {})
  const tryResumeListeningRef = useRef(() => {})
  const vadLevelFrame = useRef(0)
  const bargeInFrameCountRef = useRef(0)
  const bargeInAllowedAfterRef = useRef(0)

  const agentConnected = ['listening', 'user_speaking', 'processing', 'speaking'].includes(agentState)
  const agentConnecting = agentState === 'connecting'

  useEffect(() => {
    agentStateRef.current = agentState
  }, [agentState])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const syncAgentState = (nextState) => {
    agentStateRef.current = nextState
    setAgentState(nextState)
  }

  const resetMessageUi = () => {
    setProcessingMessage('')
  }

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current)
      silenceTimer.current = null
    }
  }

  const stopVadLoop = () => {
    if (vadFrameId.current) {
      cancelAnimationFrame(vadFrameId.current)
      vadFrameId.current = null
    }
    clearSilenceTimer()
    bargeInFrameCountRef.current = 0
  }

  const markBargeInCooldown = () => {
    bargeInAllowedAfterRef.current = Date.now() + VAD_BARGE_IN_COOLDOWN_MS
    bargeInFrameCountRef.current = 0
  }

  const canStartTurn = () => {
    if (!sessionActive.current) return false
    if (agentStateRef.current !== 'listening') return false
    if (turnInProgress.current) return false
    if (ttsSpeaking.current) return false
    return true
  }

  const startVadLoop = () => {
    stopVadLoop()
    if (!analyser.current) return
    vadPaused.current = false
    if (!analyserBuffer.current) {
      analyserBuffer.current = new Uint8Array(analyser.current.fftSize)
    }

    const tick = () => {
      if (!analyser.current || vadPaused.current) return

      const state = agentStateRef.current
      const rms = computeAnalyserRms(analyser.current, analyserBuffer.current)
      vadLevelFrame.current += 1
      if (vadLevelFrame.current % 6 === 0) {
        setVadLevel(rms)
      }

      if (state === 'listening' && canStartTurn() && rms >= VAD_VOLUME_THRESHOLD) {
        beginUserTurnRef.current()
        return
      }

      if (state === 'speaking' && !turnInProgress.current && sessionActive.current) {
        if (Date.now() < bargeInAllowedAfterRef.current) {
          bargeInFrameCountRef.current = 0
        } else if (rms >= VAD_BARGE_IN_THRESHOLD) {
          bargeInFrameCountRef.current += 1
          if (bargeInFrameCountRef.current >= VAD_BARGE_IN_FRAMES) {
            bargeInFrameCountRef.current = 0
            interruptAssistantResponseRef.current()
            beginUserTurnRef.current({ bargeIn: true })
            return
          }
        } else {
          bargeInFrameCountRef.current = 0
        }
      } else {
        bargeInFrameCountRef.current = 0
      }

      if (state === 'user_speaking') {
        if (rms < VAD_VOLUME_THRESHOLD) {
          if (!silenceTimer.current) {
            silenceTimer.current = setTimeout(() => {
              silenceTimer.current = null
              finishUserTurnRef.current()
            }, VAD_SILENCE_TIMEOUT_MS)
          }
        } else {
          clearSilenceTimer()
        }
      }

      if (state === 'listening' || state === 'user_speaking' || state === 'speaking' || state === 'processing') {
        vadFrameId.current = requestAnimationFrame(tick)
      }
    }

    vadFrameId.current = requestAnimationFrame(tick)
  }

  const interruptAssistantResponse = () => {
    turnGenerationRef.current += 1
    activeTurnIdRef.current = null
    abortController.current?.abort()
    abortController.current = null
    stopTts()
    setProcessingMessage('')
    ttsSpeaking.current = false
    bargeInFrameCountRef.current = 0
    bargeInAllowedAfterRef.current = 0
  }

  const interruptAssistantResponseRef = useRef(interruptAssistantResponse)
  interruptAssistantResponseRef.current = interruptAssistantResponse

  const tryResumeListening = () => {
    if (!sessionActive.current || turnInProgress.current || ttsSpeaking.current) return
    if (agentStateRef.current === 'processing') return
    vadPaused.current = false
    setError('')
    setProcessingMessage('')
    syncAgentState('listening')
    startVadLoop()
  }

  const stopTts = () => {
    ttsAbortController.current?.abort()
    ttsAbortController.current = null
    ttsQueueRef.current?.stop()
    ttsQueueRef.current = null
    stopDeepgramSpeech(ttsSession.current)
    ttsSession.current = null
    ttsSpeaking.current = false
  }

  const submitTurn = async (transcript) => {
    turnGenerationRef.current += 1
    const generation = turnGenerationRef.current
    activeTurnIdRef.current = null

    syncAgentState('processing')
    setProcessingMessage('Processing…')

    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller

    stopTts()
    const ttsController = new AbortController()
    ttsAbortController.current = ttsController

    let ttsQueue
    const phraseBuffer = createPhraseBuffer({
      onPhrase: (phrase) => {
        if (generation !== turnGenerationRef.current) return
        ttsQueue.enqueue(phrase)
      },
    })

    ttsQueue = createDeepgramSpeechQueue({
      signal: ttsController.signal,
      onStart: () => {
        if (generation !== turnGenerationRef.current) return
        ttsSpeaking.current = true
        syncAgentState('speaking')
        markBargeInCooldown()
        startVadLoop()
      },
      onSession: (session) => {
        ttsSession.current = session
      },
    })
    ttsQueueRef.current = ttsQueue

    const isCurrentTurn = (turnId) => {
      if (generation !== turnGenerationRef.current) return false
      if (!activeTurnIdRef.current) return true
      if (!turnId) return true
      return turnId === activeTurnIdRef.current
    }

    try {
      await streamVoiceAgent(transcript, conversationIdRef.current || null, {
        signal: controller.signal,
        onConversationId: (id) => {
          if (generation !== turnGenerationRef.current) return
          if (id) setConversationId(id)
        },
        onTurnId: (turnId) => {
          if (generation !== turnGenerationRef.current) return
          if (turnId) activeTurnIdRef.current = turnId
        },
        onTextChunk: (delta, turnId) => {
          if (!isCurrentTurn(turnId)) return
          phraseBuffer.append(delta)
        },
      })

      if (generation !== turnGenerationRef.current) return
      if (!sessionActive.current) return

      phraseBuffer.flush()
      ttsQueue.flush()

      setProcessingMessage('')
      setError('')

      addHistory({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: transcript.slice(0, 60) || 'Voice turn',
        url: '',
      })

      turnInProgress.current = false

      try {
        await ttsQueue.done
      } catch (ttsError) {
        if (ttsError.name === 'AbortError') return
        throw ttsError
      }

      if (generation !== turnGenerationRef.current) return
      if (!sessionActive.current) return

      ttsSpeaking.current = false
      ttsQueueRef.current = null
      ttsSession.current = null
      if (ttsAbortController.current === ttsController) {
        ttsAbortController.current = null
      }
      tryResumeListeningRef.current()
    } catch (requestError) {
      if (requestError.name === 'AbortError') return
      if (generation !== turnGenerationRef.current) return
      if (!sessionActive.current) return

      turnInProgress.current = false
      setProcessingMessage('')
      setError(requestError.message || 'Something went wrong. Please try again.')
      addHistory({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Could not complete',
        url: '',
      })
      stopTts()
      tryResumeListeningRef.current()
    } finally {
      if (abortController.current === controller) {
        abortController.current = null
      }
    }
  }

  const beginUserTurn = ({ bargeIn = false } = {}) => {
    if (!sessionActive.current || !stream.current) return
    if (!bargeIn && !canStartTurn()) return
    if (bargeIn && turnInProgress.current) return

    clearSilenceTimer()
    stopVadLoop()

    turnInProgress.current = true
    speechStartTime.current = Date.now()
    recordingChunks.current = []
    setError('')

    try {
      speechRecognizer.current = createSpeechRecognizer({ lang: 'en-US' })
      speechRecognizer.current.start()
    } catch {
      turnInProgress.current = false
      setError('Speech recognition failed to start. Please try again.')
      tryResumeListeningRef.current()
      return
    }

    const mediaRecorder = new MediaRecorder(stream.current)
    recorder.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) recordingChunks.current.push(event.data)
    }

    mediaRecorder.onstop = () => {
      recorder.current = null
    }

    mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS)
    syncAgentState('user_speaking')
    startVadLoop()
  }

  const finishUserTurn = async () => {
    clearSilenceTimer()
    stopVadLoop()
    vadPaused.current = true

    const speechDuration = Date.now() - speechStartTime.current
    const isShortSpeech = speechDuration < VAD_MIN_SPEECH_MS

    const stopRecorder = () => new Promise((resolve) => {
      if (recorder.current?.state === 'recording') {
        const currentRecorder = recorder.current
        currentRecorder.onstop = () => {
          recorder.current = null
          resolve()
        }
        currentRecorder.stop()
      } else {
        resolve()
      }
    })

    await stopRecorder()

    let transcript = ''
    try {
      if (speechRecognizer.current) {
        transcript = await speechRecognizer.current.stop()
        speechRecognizer.current = null
      }
    } catch (sttError) {
      speechRecognizer.current = null
      turnInProgress.current = false
      if (!isShortSpeech) {
        setError(sttError.message || 'Could not transcribe your speech. Please try again.')
      }
      tryResumeListeningRef.current()
      return
    }

    if (isShortSpeech || !transcript.trim()) {
      turnInProgress.current = false
      if (!isShortSpeech) {
        setError('No speech detected. Please try again.')
      }
      tryResumeListeningRef.current()
      return
    }

    await submitTurn(transcript.trim())
  }

  const releaseAudioGraph = async () => {
    stopVadLoop()
    if (audioContext.current && audioContext.current.state !== 'closed') {
      await audioContext.current.close().catch(() => {})
    }
    audioContext.current = null
    analyser.current = null
    analyserBuffer.current = null
  }

  const releaseStream = () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }

  const teardownVoiceSession = () => {
    sessionActive.current = false
    vadPaused.current = true
    stopVadLoop()
    turnInProgress.current = false

    abortController.current?.abort()
    abortController.current = null

    stopTts()

    speechRecognizer.current?.abort()
    speechRecognizer.current = null

    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null
      recorder.current.stop()
      recorder.current = null
    }

    releaseStream()
    releaseAudioGraph()
    recordingChunks.current = []
  }

  const endVoiceAgent = (closeMessage = '') => {
    teardownVoiceSession()
    setConversationId('')
    resetMessageUi()
    setError(closeMessage)
    syncAgentState('disconnected')
    setVadLevel(0)
  }

  beginUserTurnRef.current = beginUserTurn
  finishUserTurnRef.current = finishUserTurn
  tryResumeListeningRef.current = tryResumeListening

  const setupAudioInput = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error('Voice recording is not supported in this browser. Please use a recent browser and try again.')
    }
    if (!isSpeechRecognitionSupported()) {
      throw new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
    }
    if (!isDeepgramConfigured()) {
      throw new Error('Deepgram API key not configured.')
    }
    if (!isDeepgramPlaybackSupported()) {
      throw new Error('Streaming audio playback is not supported in this browser.')
    }

    stream.current = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    const context = new AudioContext()
    audioContext.current = context
    const source = context.createMediaStreamSource(stream.current)
    const node = context.createAnalyser()
    node.fftSize = 2048
    source.connect(node)
    analyser.current = node
    analyserBuffer.current = new Uint8Array(node.fftSize)

    if (context.state === 'suspended') {
      await context.resume()
    }
  }

  const startVoiceAgent = async () => {
    if (agentConnecting || agentConnected) return

    setError('')
    syncAgentState('connecting')
    await unlockDeepgramPlayback()

    try {
      await setupAudioInput()
    } catch (setupError) {
      setError(setupError.message || 'Microphone access is needed. Please allow it in browser settings and try again.')
      syncAgentState('error')
      teardownVoiceSession()
      return
    }

    sessionActive.current = true
    syncAgentState('listening')
    startVadLoop()
  }

  const handleNewChat = () => {
    endVoiceAgent()
    startNewChat()
  }

  useEffect(() => () => {
    teardownVoiceSession()
    setConversationId('')
  }, [setConversationId])

  const voiceStatus = getVoiceStatus(agentState, processingMessage, error)

  return (
    <PageShell page="chat" goTo={goTo}>
      <Topbar title="Shenaz Assistant" goTo={goTo}>
        <button className="new-chat-button" type="button" onClick={handleNewChat}>New session</button>
      </Topbar>
      <section className={`voice-panel voice-panel-agent ${agentState}`}>
        <div className="voice-stage">
          <div className="voice-intro">
            <div className={`voice-status voice-status-${voiceStatus.tone}`} aria-live="polite">
              <span className="voice-status-dot" />
              <span>{voiceStatus.text}</span>
            </div>
            <p className="voice-hint">Ask about appointments, doctors, departments or hospital services.</p>
          </div>
          <VoiceAgentAvatar agentState={agentState} vadLevel={vadLevel} />
          <div className="voice-service-chips">
            {chatServiceChips.map((chip) => (
              <button
                key={chip.label}
                className="voice-service-chip"
                type="button"
                onClick={startVoiceAgent}
                disabled={agentConnected || agentConnecting}
              >
                <Ic name={chip.icon} />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
          <div className="voice-actions-row">
            <button
              className="call-button call-start"
              type="button"
              onClick={startVoiceAgent}
              disabled={agentConnected || agentConnecting}
            >
              <Ic name="mic" />
              <span>Start Voice Chat</span>
            </button>
            <button
              className="call-button call-end"
              type="button"
              onClick={() => endVoiceAgent()}
              disabled={!agentConnected && !agentConnecting}
            >
              <Ic name="hangup" />
              <span>End Session</span>
            </button>
          </div>
          <p className="voice-privacy"><Ic name="shield" /> Your conversation is secure and private</p>
        </div>
      </section>
    </PageShell>
  )
}

function Services({ goTo }) { return <PageShell page="services" goTo={goTo}><Topbar title="Our Services" goTo={goTo} /><div className="content-page"><p className="eyebrow">CARE AT YOUR CONVENIENCE</p><h1>We&apos;re here to help</h1><p className="lead">Get answers and support from Shenaz Hospital whenever you need it.</p><div className="service-list">{serviceData.map(([icon, title, detail]) => <button key={title} onClick={() => goTo('chat')}><span>{icon}</span><i><strong>{title}</strong><small>{detail}</small></i><b>›</b></button>)}</div></div></PageShell> }
function About({ goTo, page = 'about', title = 'About Us' }) { return <PageShell page={page} goTo={goTo}><Topbar title={title} goTo={goTo} /><div className="content-page about"><h1>Shenaz Hospital</h1><p className="lead">Compassionate care. Advanced healthcare.</p><p>Shenaz Hospital is dedicated to providing exceptional medical care with compassion and excellence. Our AI Contact Center is here to help you 24/7 with your healthcare needs.</p><div className="contact-card"><h3>⌖ Location</h3><p>123 Health Street, Wellness City, HC 12345</p><h3>☎ Phone</h3><p>+1 (555) 123-4567</p><h3>✉ Email</h3><p>info@shenazhospital.com</p></div></div></PageShell> }
function Help({ goTo }) { return <About goTo={goTo} page="help" title="Help" /> }
function Settings({ goTo }) {
  return (
    <PageShell page="settings" goTo={goTo}>
      <Topbar title="Settings" goTo={goTo} />
      <div className="content-page empty-history">
        <span><Ic name="settings" /></span>
        <h2>Coming soon</h2>
        <p>Settings will be available in a future update.</p>
      </div>
    </PageShell>
  )
}
function History({ goTo, history }) { return <PageShell page="history" goTo={goTo}><Topbar title="Conversation History" goTo={goTo} /><div className="content-page history"><div className="search">⌕ <span>Search conversations...</span></div><div className="filters"><button className="active">All</button><button>Appointments</button><button>FAQs</button><button>General</button></div>{history.length ? history.map((item, index) => <article className="history-row" key={`${item.time}-${index}`}><span className={item.url ? 'history-icon success' : 'history-icon'}>{item.url ? '♬' : '!'}</span><i><strong>{item.status}</strong><small>Voice conversation · {item.time}</small></i>{item.url && <button onClick={() => new Audio(item.url).play()}>▶</button>}</article>) : <div className="empty-history"><span>◷</span><h2>No conversations yet</h2><p>Your voice conversations will appear here.</p><button className="button" onClick={() => goTo('chat')}>Start a voice chat</button></div>}</div></PageShell> }

function App() {
  const [page, setPage] = useState('home')
  const [history, setHistory] = useState([])
  const [conversationId, setConversationId] = useState('')
  const startNewChat = () => {
    console.debug('Starting a new conversation', { previousConversationId: conversationId })
    setConversationId('')
  }
  if (page === 'home') return <Landing goTo={setPage} />
  if (page === 'chat') return <VoiceChat goTo={setPage} addHistory={(item) => setHistory((previous) => [item, ...previous])} conversationId={conversationId} setConversationId={setConversationId} startNewChat={startNewChat} />
  if (page === 'services') return <Services goTo={setPage} />
  if (page === 'history') return <History goTo={setPage} history={history} />
  if (page === 'help') return <Help goTo={setPage} />
  if (page === 'settings') return <Settings goTo={setPage} />
  if (page === 'about') return <About goTo={setPage} />
  return <About goTo={setPage} />
}

export default App
