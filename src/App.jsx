import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import doctorAvatar from './assets/ai-doctor-avatar.png'
import './App.css'

const serviceData = [
  ['▣', 'Book Appointments', 'Schedule, reschedule or cancel appointments'],
  ['ⓘ', 'Hospital Information', 'Hours, location, services & policies'],
  ['♙', 'Find Doctors', 'Information about our specialists'],
  ['♡', 'Health Information', 'Guidance on general health questions'],
  ['✚', 'Emergency Support', '24/7 assistance for urgent needs'],
]
const progressCopy = ['Transcribing your question...', 'Finding the right information...', 'Preparing your answer...']
const API_BASE_URL = 'https://popular-subheader-endnote.ngrok-free.dev'
const VAD_VOLUME_THRESHOLD = 0.03
const VAD_SILENCE_TIMEOUT_MS = 1000
const VAD_MIN_SPEECH_MS = 400
const MEDIA_RECORDER_TIMESLICE_MS = 250
const processingStageMessages = {
  transcribing: 'Transcribing...',
  loading_context: 'Loading conversation...',
  generating_response: 'Generating response...',
  saving_conversation: 'Saving conversation...',
  synthesizing_audio: 'Creating voice response...',
  streaming_audio: 'Receiving response...',
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || API_BASE_URL || window.location.origin
}

function getVoiceChatWsUrl() {
  const base = getApiBaseUrl().trim().replace(/\/+$/, '')
  const url = new URL(base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const basePath = url.pathname.replace(/\/+$/, '')
  url.pathname = basePath.endsWith('/voice-chat/ws')
    ? basePath
    : `${basePath}/voice-chat/ws`.replace(/\/{2,}/g, '/')
  url.search = ''
  url.hash = ''
  return url.toString()
}

function createRequestId() {
  return crypto.randomUUID?.() || `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const navLinks = [['Home', 'home'], ['Services', 'services'], ['About Us', 'about'], ['Contact', 'about']]
const actionCards = [
  ['hospital', 'Hospital Services', 'Explore our departments and healthcare services.', 'services'],
  ['calendar', 'Book Appointment', 'Schedule appointments quickly and easily.', 'chat'],
]
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
const waveHeights = [18, 28, 42, 56, 70, 52, 36, 48, 64, 40, 24, 34, 50, 62, 44, 30, 22]

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
    check: <path {...p} d="m6.5 12.5 3.4 3.4 7.6-8" />,
  }
  return <svg viewBox="0 0 24 24" width="1em" height="1em" className={className} aria-hidden="true">{shapes[name]}</svg>
}

function Brand({ light = false, onClick }) {
  return <button className={`brand ${light ? 'brand-light' : ''}`} type="button" onClick={onClick}><span className="brand-mark">✚</span><span><b>Shenaz</b><small>HOSPITAL</small></span></button>
}

function Header({ goTo }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="site-header">
      <Brand onClick={() => goTo('home')} />
      <nav className={menuOpen ? 'open' : ''} aria-label="Primary">
        {navLinks.map(([label, target], index) => (
          <button className={index === 0 ? 'active' : ''} onClick={() => { goTo(target); setMenuOpen(false) }} key={label}>{label}</button>
        ))}
      </nav>
      <button className="menu-toggle" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
        <Ic name="menu" />
      </button>
      <button className="button header-cta" onClick={() => goTo('chat')}><Ic name="mic" /> Start Voice Chat</button>
    </header>
  )
}

function Sidebar({ page, goTo }) {
  const links = [['chat', 'Chat', 'chat'], ['history', 'History', 'history'], ['help', 'Help', 'about'], ['settings', 'Settings', 'about']]
  return (
    <aside className="sidebar">
      <button className="sidebar-brand" type="button" onClick={() => goTo('home')} aria-label="Shenaz home">
        <span className="sidebar-brand-mark">✚</span>
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

function VoiceAssistantVisual({ onStart }) {
  return (
    <div className="voice-visual">
      <span className="visual-glow" aria-hidden="true" />
      <span className="deco deco-plus dp1" aria-hidden="true">+</span>
      <span className="deco deco-plus dp2" aria-hidden="true">+</span>
      <span className="deco deco-dot dd1" aria-hidden="true" />
      <span className="deco deco-dot dd2" aria-hidden="true" />
      <span className="deco deco-dot dd3" aria-hidden="true" />
      <span className="ring ring-1" aria-hidden="true" />
      <span className="ring ring-2" aria-hidden="true" />
      <span className="ring ring-3" aria-hidden="true" />
      <div className="waveform" aria-hidden="true">{waveHeights.map((height, index) => <i key={index} style={{ height: `${height}px` }} />)}</div>
      <button className="voice-mic" type="button" aria-label="Start Voice Chat" onClick={onStart}><Ic name="mic" /></button>
      <div className="visual-float visual-float-status" aria-hidden="true"><span /><i><strong>Assistant online</strong><small>Ready to help 24/7</small></i></div>
      <div className="visual-float visual-float-secure" aria-hidden="true"><Ic name="shield" /><span>Private by design</span></div>
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
        .from('.voice-visual', { x: 80, scale: 0.82, opacity: 0, rotation: 4, duration: 1.15 }, '-=0.95')
        .from('.action-card', { y: 42, opacity: 0, duration: 0.7, stagger: 0.13 }, '-=0.5')

      gsap.to('.gradient-orb-one', { xPercent: 42, yPercent: 28, scale: 1.18, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.gradient-orb-two', { xPercent: -34, yPercent: 32, scale: .86, duration: 9, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.ring-1', { rotation: 360, duration: 22, repeat: -1, ease: 'none' })
      gsap.to('.ring-2', { rotation: -360, duration: 28, repeat: -1, ease: 'none' })
      gsap.to('.visual-glow', { scale: 1.16, opacity: .66, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.waveform i', { scaleY: 1.35, duration: .75, repeat: -1, yoyo: true, stagger: { each: .055, from: 'center' }, ease: 'sine.inOut' })
      gsap.to('.visual-float-status', { y: -14, x: 5, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.visual-float-secure', { y: 12, x: -5, duration: 2.9, repeat: -1, yoyo: true, ease: 'sine.inOut' })

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
        <Header goTo={goTo} />
        <main>
          <section className="hero-section">
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
            <VoiceAssistantVisual onStart={() => goTo('chat')} />
          </section>

          <section className="action-cards" aria-label="Quick actions">
            {actionCards.map(([icon, title, detail, target]) => (
              <button className="action-card" key={title} type="button" onClick={() => goTo(target)}>
                <span className="action-icon"><Ic name={icon} /></span>
                <i><strong>{title}</strong><small>{detail}</small></i>
              </button>
            ))}
          </section>

          <section className="capabilities-section">
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

          <section className="journey-section">
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

          <section className="closing-cta" data-reveal>
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

function getAgentStateLabel(agentState, processingMessage, error) {
  switch (agentState) {
    case 'disconnected':
      return 'Start Voice Agent'
    case 'connecting':
      return 'Connecting...'
    case 'listening':
      return 'Listening...'
    case 'user_speaking':
      return "I'm listening..."
    case 'processing':
      return processingMessage || progressCopy[0]
    case 'speaking':
      return 'AI is speaking...'
    case 'error':
      return error || 'Something went wrong.'
    default:
      return ''
  }
}

function getVoiceStatus(agentState, processingMessage, error) {
  switch (agentState) {
    case 'disconnected':
      return { tone: 'idle', text: 'Ready when you are' }
    case 'connecting':
      return { tone: 'connecting', text: 'Connecting to agent…' }
    case 'listening':
      return { tone: 'listening', text: 'Listening' }
    case 'user_speaking':
      return { tone: 'listening', text: 'Hearing you…' }
    case 'processing':
      return { tone: 'processing', text: processingMessage || progressCopy[0] }
    case 'speaking':
      return { tone: 'speaking', text: 'Speaking' }
    case 'error':
      return { tone: 'error', text: error || 'Something went wrong' }
    default:
      return { tone: 'idle', text: getAgentStateLabel(agentState, processingMessage, error) }
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

function VoiceWave({ side, agentState, vadLevel }) {
  const heights = side === 'left' ? [...waveHeights].reverse() : waveHeights
  const active = agentState === 'user_speaking' || agentState === 'speaking' || agentState === 'listening'

  return (
    <div className={`voice-flank-wave voice-flank-${side} ${active ? 'is-active' : ''}`} aria-hidden="true">
      {heights.map((height, index) => {
        let scale = 0.45
        if (agentState === 'user_speaking') scale = 0.55 + Math.min(vadLevel, 0.25) * 4
        else if (agentState === 'speaking') scale = 0.85
        else if (agentState === 'listening') scale = 0.55
        const barHeight = Math.max(8, Math.round(height * scale * (side === 'left' ? 0.85 : 0.85)))
        return <i key={`${side}-${index}`} style={{ height: `${barHeight}px`, animationDelay: `${(index % 8) * 0.08}s` }} />
      })}
    </div>
  )
}

function VoiceAgentAvatar({ agentState, vadLevel }) {
  return (
    <div className={`voice-agent voice-agent-${agentState}`} aria-hidden="true">
      <VoiceWave side="left" agentState={agentState} vadLevel={vadLevel} />
      <div className="voice-portrait">
        <span className="voice-portrait-glow" />
        <span className="voice-portrait-ring" />
        <img src={doctorAvatar} alt="" />
      </div>
      <VoiceWave side="right" agentState={agentState} vadLevel={vadLevel} />
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
  const [userTranscript, setUserTranscript] = useState('')
  const [assistantText, setAssistantText] = useState('')
  const [vadLevel, setVadLevel] = useState(0)
  const [activeRequestId, setActiveRequestId] = useState('')

  const socket = useRef(null)
  const stream = useRef(null)
  const recorder = useRef(null)
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const analyserBuffer = useRef(null)
  const vadFrameId = useRef(null)
  const silenceTimer = useRef(null)
  const speechStartTime = useRef(0)
  const responseAudioChunks = useRef([])
  const assistantAudio = useRef(null)
  const audioUrlRef = useRef('')
  const responseComplete = useRef(true)
  const playbackComplete = useRef(true)
  const isReceivingAudio = useRef(false)
  const vadPaused = useRef(false)
  const intentionalClose = useRef(false)
  const handleVoiceEventRef = useRef(() => {})
  const agentStateRef = useRef('disconnected')
  const agentConnectedRef = useRef(false)
  const agentConnectingRef = useRef(false)
  const activeRequestIdRef = useRef('')
  const conversationIdRef = useRef(conversationId)
  const beginUserTurnRef = useRef(() => {})
  const finishUserTurnRef = useRef(() => {})
  const tryResumeListeningRef = useRef(() => {})
  const startVadLoopRef = useRef(() => {})
  const stopVadLoopRef = useRef(() => {})
  const vadLevelFrame = useRef(0)

  const agentConnected = ['listening', 'user_speaking', 'processing', 'speaking'].includes(agentState)
  const agentConnecting = agentState === 'connecting'

  useEffect(() => {
    agentStateRef.current = agentState
    agentConnectedRef.current = agentConnected
    agentConnectingRef.current = agentConnecting
  }, [agentState, agentConnected, agentConnecting])

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId
  }, [activeRequestId])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const syncAgentState = (nextState) => {
    agentStateRef.current = nextState
    agentConnectedRef.current = ['listening', 'user_speaking', 'processing', 'speaking'].includes(nextState)
    agentConnectingRef.current = nextState === 'connecting'
    setAgentState(nextState)
  }

  const sendJson = (payload) => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(payload))
    }
  }

  const sendFrontendRecordingEnd = (requestId) => {
    if (!requestId) return
    sendJson({ event: 'audio_end', request_id: requestId })
  }

  const sendBinaryChunk = async (blob) => {
    if (!blob.size || socket.current?.readyState !== WebSocket.OPEN) return
    const buffer = await blob.arrayBuffer()
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(buffer)
    }
  }

  const revokeAudioUrl = (url = audioUrlRef.current) => {
    if (url) URL.revokeObjectURL(url)
  }

  const resetMessageUi = () => {
    setProcessingMessage('')
    setUserTranscript('')
    setAssistantText('')
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
  }

  const canStartTurn = () => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false
    if (agentStateRef.current !== 'listening') return false
    if (activeRequestIdRef.current) return false
    if (isReceivingAudio.current) return false
    if (!playbackComplete.current) return false
    const audio = assistantAudio.current
    if (audio && !audio.paused && !audio.ended) return false
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

      if (state === 'listening' || state === 'user_speaking') {
        vadFrameId.current = requestAnimationFrame(tick)
      }
    }

    console.debug('[voice] VAD started', { agentState: agentStateRef.current })
    vadFrameId.current = requestAnimationFrame(tick)
  }

  const tryResumeListening = () => {
    if (
      !agentConnectedRef.current ||
      !responseComplete.current ||
      !playbackComplete.current ||
      activeRequestIdRef.current
    ) {
      return
    }
    vadPaused.current = false
    syncAgentState('listening')
    startVadLoop()
  }

  const playResponseAudio = (url) => {
    audioUrlRef.current = url
    playbackComplete.current = false
    syncAgentState('speaking')
    vadPaused.current = true
    stopVadLoop()

    if (!assistantAudio.current) {
      assistantAudio.current = new Audio()
    }

    const audio = assistantAudio.current
    audio.onended = () => {
      revokeAudioUrl(url)
      audioUrlRef.current = ''
      playbackComplete.current = true
      tryResumeListeningRef.current()
    }
    audio.onerror = () => {
      revokeAudioUrl(url)
      audioUrlRef.current = ''
      playbackComplete.current = true
      tryResumeListeningRef.current()
    }
    audio.src = url
    addHistory({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Answer received',
      url,
    })
    audio.play().catch(() => {
      playbackComplete.current = true
      tryResumeListeningRef.current()
    })
  }

  const handleBackendAudioEnd = () => {
    isReceivingAudio.current = false
    if (!responseAudioChunks.current.length) {
      responseAudioChunks.current = []
      playbackComplete.current = true
      tryResumeListeningRef.current()
      return
    }

    const blob = new Blob(responseAudioChunks.current, { type: 'audio/mpeg' })
    responseAudioChunks.current = []
    revokeAudioUrl()
    const url = URL.createObjectURL(blob)
    playResponseAudio(url)
  }

  const beginUserTurn = () => {
    if (!canStartTurn() || !stream.current) return

    console.debug('[voice] speech detected')
    clearSilenceTimer()
    stopVadLoop()

    const requestId = createRequestId()
    activeRequestIdRef.current = requestId
    setActiveRequestId(requestId)
    responseComplete.current = false
    playbackComplete.current = true
    speechStartTime.current = Date.now()
    setError('')
    setUserTranscript('')
    setAssistantText('')

    sendJson({
      event: 'start',
      request_id: requestId,
      conversation_id: conversationIdRef.current || null,
      audio_format: 'audio/webm',
    })
    console.debug('[voice] start sent', { request_id: requestId })

    const mediaRecorder = new MediaRecorder(stream.current)
    recorder.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) console.debug('[voice] chunk sent', event.data.size)
      sendBinaryChunk(event.data)
    }

    mediaRecorder.onstop = () => {
      recorder.current = null
    }

    mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS)
    syncAgentState('user_speaking')
    startVadLoop()
  }

  const finishUserTurn = () => {
    clearSilenceTimer()
    stopVadLoop()
    vadPaused.current = true

    const requestId = activeRequestIdRef.current
    const speechDuration = Date.now() - speechStartTime.current
    const isShortSpeech = speechDuration < VAD_MIN_SPEECH_MS

    if (recorder.current?.state === 'recording') {
      const currentRecorder = recorder.current
      currentRecorder.onstop = () => {
        recorder.current = null
        sendFrontendRecordingEnd(requestId)
        console.debug('[voice] audio_end sent', { request_id: requestId })
        syncAgentState('processing')
        setProcessingMessage(progressCopy[0])
        if (isShortSpeech) {
          setError('')
        }
      }
      currentRecorder.stop()
    } else {
      sendFrontendRecordingEnd(requestId)
      console.debug('[voice] audio_end sent', { request_id: requestId })
      syncAgentState('processing')
      setProcessingMessage(progressCopy[0])
    }
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

  const stopAssistantPlayback = () => {
    const audio = assistantAudio.current
    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    revokeAudioUrl()
    audioUrlRef.current = ''
    playbackComplete.current = true
  }

  const teardownVoiceSession = ({ closeSocket = true, sendActiveRecordingEnd = false } = {}) => {
    intentionalClose.current = true
    vadPaused.current = true
    stopVadLoop()

    const requestId = activeRequestIdRef.current
    if (sendActiveRecordingEnd && requestId) {
      sendFrontendRecordingEnd(requestId)
    }

    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null
      recorder.current.stop()
      recorder.current = null
    }

    stopAssistantPlayback()
    releaseStream()
    releaseAudioGraph()

    if (closeSocket && socket.current) {
      socket.current.onopen = null
      socket.current.onmessage = null
      socket.current.onerror = null
      socket.current.onclose = null
      if (socket.current.readyState === WebSocket.OPEN || socket.current.readyState === WebSocket.CONNECTING) {
        socket.current.close()
      }
      socket.current = null
    }

    setActiveRequestId('')
    activeRequestIdRef.current = ''
    responseAudioChunks.current = []
    isReceivingAudio.current = false
    responseComplete.current = true
    playbackComplete.current = true
    intentionalClose.current = false
  }

  const endVoiceAgent = (closeMessage = '') => {
    const wasRecording = recorder.current?.state === 'recording'
    const requestId = activeRequestIdRef.current
    if (wasRecording && requestId) {
      sendFrontendRecordingEnd(requestId)
    }

    teardownVoiceSession({ closeSocket: true })
    setConversationId('')
    resetMessageUi()
    setError(closeMessage)
    syncAgentState('disconnected')
    setVadLevel(0)
  }

  const handleVoiceEvent = (message) => {
    const { event: eventName } = message

    switch (eventName) {
      case 'connected':
        console.debug('[voice] connected', message)
        if (message.conversation_id) setConversationId(message.conversation_id)
        responseComplete.current = true
        playbackComplete.current = true
        setError('')
        syncAgentState('listening')
        startVadLoopRef.current()
        break
      case 'recording_started':
      case 'recording_received':
        break
      case 'processing':
        setProcessingMessage(processingStageMessages[message.stage] || progressCopy[0])
        syncAgentState('processing')
        vadPaused.current = true
        stopVadLoopRef.current()
        break
      case 'transcription':
        setUserTranscript(message.text || message.transcript || message.content || '')
        break
      case 'assistant_text':
        setAssistantText(message.text || message.content || '')
        break
      case 'audio_start':
        responseAudioChunks.current = []
        isReceivingAudio.current = true
        vadPaused.current = true
        stopVadLoopRef.current()
        break
      case 'audio_end':
        handleBackendAudioEnd()
        break
      case 'response_complete':
        responseComplete.current = true
        activeRequestIdRef.current = ''
        setActiveRequestId('')
        setProcessingMessage('')
        isReceivingAudio.current = false
        tryResumeListeningRef.current()
        break
      case 'error': {
        const recoverable = message.recoverable !== false
        const errorMessage = message.message || 'Something went wrong. Please try again.'
        responseComplete.current = true
        activeRequestIdRef.current = ''
        setActiveRequestId('')
        setProcessingMessage('')
        isReceivingAudio.current = false
        responseAudioChunks.current = []
        addHistory({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Could not complete',
          url: '',
        })
        if (recoverable) {
          setError(errorMessage)
          playbackComplete.current = true
          tryResumeListeningRef.current()
        } else {
          endVoiceAgent(errorMessage)
          syncAgentState('error')
        }
        break
      }
      default:
        break
    }
  }

  beginUserTurnRef.current = beginUserTurn
  finishUserTurnRef.current = finishUserTurn
  tryResumeListeningRef.current = tryResumeListening
  startVadLoopRef.current = startVadLoop
  stopVadLoopRef.current = stopVadLoop
  handleVoiceEventRef.current = handleVoiceEvent

  const setupAudioInput = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error('Voice recording is not supported in this browser. Please use a recent browser and try again.')
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
    if (agentConnecting || agentConnected || socket.current) return

    setError('')
    syncAgentState('connecting')

    try {
      await setupAudioInput()
    } catch (setupError) {
      setError(setupError.message || 'Microphone access is needed. Please allow it in browser settings and try again.')
      syncAgentState('error')
      teardownVoiceSession({ closeSocket: false })
      return
    }

    const ws = new WebSocket(getVoiceChatWsUrl())
    ws.binaryType = 'arraybuffer'
    socket.current = ws

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          handleVoiceEventRef.current(JSON.parse(event.data))
        } catch {
          setError('Received an invalid message from the voice service.')
          syncAgentState('error')
        }
        return
      }
      if (isReceivingAudio.current) {
        responseAudioChunks.current.push(event.data)
      }
    }

    ws.onerror = () => {
      if (intentionalClose.current) return
      if (!agentConnectedRef.current) {
        setError('Could not connect to the voice agent. Please try again.')
        syncAgentState('error')
        teardownVoiceSession({ closeSocket: true })
      }
    }

    ws.onclose = () => {
      if (intentionalClose.current) {
        socket.current = null
        return
      }
      if (agentStateRef.current === 'connecting') {
        setError((current) => current || 'Voice agent connection closed before it was ready.')
        syncAgentState('error')
        teardownVoiceSession({ closeSocket: false })
      } else if (agentConnectedRef.current) {
        setError((current) => current || 'Voice agent disconnected.')
        syncAgentState('disconnected')
        teardownVoiceSession({ closeSocket: false })
      }
      socket.current = null
    }
  }

  const handleNewChat = () => {
    endVoiceAgent()
    startNewChat()
  }

  useEffect(() => () => {
    const requestId = activeRequestIdRef.current
    if (recorder.current?.state === 'recording' && requestId) {
      sendFrontendRecordingEnd(requestId)
    }
    teardownVoiceSession({ closeSocket: true })
    setConversationId('')
  }, [setConversationId])

  const voiceStatus = getVoiceStatus(agentState, processingMessage, error)
  const showTranscript = Boolean(userTranscript || assistantText)

  return (
    <PageShell page="chat" goTo={goTo}>
      <Topbar title="Shenaz Assistant" goTo={goTo}>
        <button className="new-chat-button" type="button" onClick={handleNewChat}>New session</button>
      </Topbar>
      <section className={`voice-panel voice-panel-agent ${agentState}`}>
        <div className="voice-stage">
          <VoiceAgentAvatar agentState={agentState} vadLevel={vadLevel} />
          <div className={`voice-status voice-status-${voiceStatus.tone}`} aria-live="polite">
            <span className="voice-status-dot" />
            <span>{voiceStatus.text}</span>
          </div>
          <div className="voice-actions-row">
            <button
              className="call-button call-start"
              type="button"
              onClick={startVoiceAgent}
              disabled={agentConnected || agentConnecting}
            >
              <Ic name="mic" />
              <span>Start</span>
            </button>
            <button
              className="call-button call-end"
              type="button"
              onClick={() => endVoiceAgent()}
              disabled={!agentConnected && !agentConnecting}
            >
              <Ic name="hangup" />
              <span>End</span>
            </button>
          </div>
          {showTranscript && (
            <div className="voice-transcript">
              {userTranscript && (
                <p className="voice-line voice-line-user">
                  <span>You</span>
                  {userTranscript}
                </p>
              )}
              {assistantText && (
                <p className="voice-line voice-line-assistant">
                  <span>Assistant</span>
                  {assistantText}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  )
}

function Services({ goTo }) { return <PageShell page="services" goTo={goTo}><Topbar title="Our Services" goTo={goTo} /><div className="content-page"><p className="eyebrow">CARE AT YOUR CONVENIENCE</p><h1>We&apos;re here to help</h1><p className="lead">Get answers and support from Shenaz Hospital whenever you need it.</p><div className="service-list">{serviceData.map(([icon, title, detail]) => <button key={title} onClick={() => goTo('chat')}><span>{icon}</span><i><strong>{title}</strong><small>{detail}</small></i><b>›</b></button>)}</div></div></PageShell> }
function About({ goTo }) { return <PageShell page="about" goTo={goTo}><Topbar title="About Us" goTo={goTo} /><div className="content-page about"><div className="about-mark">✚</div><h1>Shenaz Hospital</h1><p className="lead">Compassionate care. Advanced healthcare.</p><p>Shenaz Hospital is dedicated to providing exceptional medical care with compassion and excellence. Our AI Contact Center is here to help you 24/7 with your healthcare needs.</p><div className="contact-card"><h3>⌖ Location</h3><p>123 Health Street, Wellness City, HC 12345</p><h3>☎ Phone</h3><p>+1 (555) 123-4567</p><h3>✉ Email</h3><p>info@shenazhospital.com</p></div></div></PageShell> }
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
  return <About goTo={setPage} />
}

export default App
