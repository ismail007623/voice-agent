import { useEffect, useRef, useState } from 'react'
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
  }
  return <svg viewBox="0 0 24 24" width="1em" height="1em" className={className} aria-hidden="true">{shapes[name]}</svg>
}

function isLikelyAudioResponse(contentType = '', contentDisposition = '') {
  const type = contentType.toLowerCase()
  const disposition = contentDisposition.toLowerCase()
  return type.includes('audio/') || type.includes('video/webm') || type.includes('application/octet-stream') || disposition.includes('attachment')
}

function getConversationId(response) {
  return response.headers.get('x-conversation-id') || response.headers.get('conversation-id') || response.headers.get('conversation_id') || ''
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
  const links = [['▣', 'Chat', 'chat'], ['◷', 'History', 'history'], ['◉', 'Help', 'about'], ['⚙', 'Settings', 'about']]
  return <aside className="sidebar"><Brand onClick={() => goTo('home')} /><div className="side-menu">{links.map(([icon, label, target]) => <button className={page === target ? 'selected' : ''} onClick={() => goTo(target)} key={label}><span>{icon}</span>{label}</button>)}</div><button className="logout">⇥<span>Logout</span></button></aside>
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
    <div className="voice-visual" aria-hidden="true">
      <span className="deco deco-plus dp1">+</span>
      <span className="deco deco-plus dp2">+</span>
      <span className="deco deco-dot dd1" />
      <span className="deco deco-dot dd2" />
      <span className="deco deco-dot dd3" />
      <span className="ring ring-1" />
      <span className="ring ring-2" />
      <span className="ring ring-3" />
      <div className="waveform">{waveHeights.map((height, index) => <i key={index} style={{ height: `${height}px` }} />)}</div>
      <button className="voice-mic" type="button" aria-label="Start Voice Chat" onClick={onStart}><Ic name="mic" /></button>
    </div>
  )
}

function Landing({ goTo }) {
  return (
    <div className="landing-page">
      <div className="landing">
        <Header goTo={goTo} />
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <h1>Your Hospital<br />Assistant,<br />Just a <span>Voice</span> Away</h1>
              <p>Ask about hospital services, get information, or book appointments — simply by speaking.</p>
              <button className="button hero-cta" onClick={() => goTo('chat')}><Ic name="mic" /> Start Voice Chat</button>
              <div className="trust-line"><Ic name="shield" /><span>Private, Secure &amp; Always Here for You</span></div>
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

          <section className="benefits-strip" aria-label="Benefits">
            {benefitItems.map(([icon, title, detail]) => (
              <div className="benefit-item" key={title}>
                <span className="benefit-icon"><Ic name={icon} /></span>
                <i><strong>{title}</strong><small>{detail}</small></i>
              </div>
            ))}
          </section>
        </main>
        <Footer goTo={goTo} />
      </div>
    </div>
  )
}

function PageShell({ page, goTo, children }) {
  return <div className="app-shell"><Sidebar page={page} goTo={goTo} /><main className="app-main">{children}</main></div>
}

function Topbar({ title, goTo, children }) {
  return <div className="topbar"><button className="back" onClick={() => goTo('home')}>←</button><strong>{title}</strong><div className="topbar-actions">{children}<button className="info">ⓘ</button></div></div>
}

function VoiceChat({ goTo, addHistory, conversationId, setConversationId, startNewChat }) {
  const [status, setStatus] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const recorder = useRef(null)
  const stream = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)
  const controller = useRef(null)
  useEffect(() => () => { clearInterval(timer.current); stream.current?.getTracks().forEach((track) => track.stop()); controller.current?.abort(); if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  useEffect(() => { if (status !== 'processing') return undefined; const interval = setInterval(() => setProgress((value) => (value + 1) % progressCopy.length), 3500); return () => clearInterval(interval) }, [status])
  const releaseStream = () => { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null }
  const reset = () => { clearInterval(timer.current); releaseStream(); setSeconds(0); setError(''); setStatus('idle') }
  const start = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Voice recording is not supported in this browser. Please use a recent browser and try again.'); setStatus('error'); return }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mediaRecorder = new MediaRecorder(stream.current)
      recorder.current = mediaRecorder
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      mediaRecorder.onstop = send
      mediaRecorder.start()
      setStatus('recording')
      timer.current = setInterval(() => setSeconds((value) => { if (value >= 59) { mediaRecorder.stop(); clearInterval(timer.current); return 60 } return value + 1 }), 1000)
    } catch {
      setError('Microphone access is needed to answer your question. Please allow it in browser settings and try again.')
      setStatus('error')
    }
  }
  const stop = () => { if (recorder.current?.state === 'recording') { clearInterval(timer.current); setStatus('processing'); recorder.current.stop() } }
  const cancel = () => { if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop() } reset() }
  const send = async () => {
    releaseStream()
    const blob = new Blob(chunks.current, { type: recorder.current?.mimeType || 'audio/webm' })
    if (!blob.size) { setError('We did not hear any audio. Please speak clearly and try again.'); setStatus('error'); return }
    const formData = new FormData()
    formData.append('file', blob, 'shenaz-question.webm')
    formData.append('conversation_id', conversationId)
    controller.current = new AbortController()
    const timeout = setTimeout(() => controller.current?.abort(), 90000)
    try {
      console.debug('Voice request', { url: `${API_BASE_URL}/voice-chat`, conversationId })
      const response = await fetch(`${API_BASE_URL}/voice-chat`, {
        method: 'POST',
        body: formData,
        signal: controller.current.signal,
        mode: 'cors',
      })
      clearTimeout(timeout)
      console.debug('Voice response status', response.status, response.statusText)
      console.debug('Voice response headers', Array.from(response.headers.entries()))
      const returnedConversationId = getConversationId(response)
      console.debug('Voice conversation ID', { sent: conversationId, received: returnedConversationId })
      const contentType = response.headers.get('content-type') || ''
      const contentDisposition = response.headers.get('content-disposition') || ''
      if (!response.ok) {
        let message = 'We could not get your answer. Please try again.'
        const text = await response.text()
        if (text) {
          try {
            const data = JSON.parse(text)
            message = data.message || data.detail || message
          } catch {
            message = text || message
          }
        }
        throw new Error(message)
      }
      if (!conversationId && !returnedConversationId) {
        throw new Error('The hospital service did not return a conversation ID. Please try again after the server response is updated.')
      }
      if (conversationId && returnedConversationId && returnedConversationId !== conversationId) {
        throw new Error('The hospital service returned a different conversation ID. Your conversation was not continued.')
      }
      if (returnedConversationId) setConversationId(returnedConversationId)
      if (!isLikelyAudioResponse(contentType, contentDisposition)) {
        const text = await response.text()
        let message = 'The hospital service returned an unexpected response. Please try again.'
        if (text) {
          try {
            const data = JSON.parse(text)
            message = data.message || data.detail || message
          } catch {
            message = text || message
          }
        }
        throw new Error(message)
      }
      const url = URL.createObjectURL(await response.blob())
      setAudioUrl(url); setStatus('playing'); addHistory({ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'Answer received', url })
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setAudioUrl(''); reset() }
      audio.play().catch(() => {})
    } catch (requestError) {
      clearTimeout(timeout)
      setError(requestError.name === 'AbortError' ? 'This is taking longer than usual. Please check your connection and try again.' : requestError.message)
      setStatus('error')
      addHistory({ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'Could not complete', url: '' })
    }
  }
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <PageShell page="chat" goTo={goTo}><Topbar title="AI Voice Chat" goTo={goTo}><button className="new-chat-button" onClick={startNewChat}>New Chat</button></Topbar><section className={`voice-panel ${status}`}><div className="voice-heading">{status === 'idle' && <><h2>How can we help?</h2><p>Ask about appointments, hospital services, or anything else.</p></>}{status === 'recording' && <><b>{time}</b><p className="recording-text">Recording...</p></>}{status === 'processing' && <><h2>Getting your answer</h2><p>{progressCopy[progress]}</p></>}{status === 'playing' && <><h2>Here&apos;s your answer</h2><p>Listen to your personalised response.</p></>}{status === 'error' && <><h2>Let&apos;s try again</h2><p>{error}</p></>}</div>{status === 'recording' && <Wave className="wave-red" count={9} />}{status === 'processing' && <Wave className="wave-thinking" count={24} />}{status === 'playing' && <Wave className="wave-playing" count={15} />}{(status === 'idle' || status === 'error') && <button className="mic-button" onClick={status === 'error' ? reset : start}>♬</button>}{status === 'recording' && <button className="stop-button" onClick={stop}>■</button>}{status === 'playing' && <div className="player"><button onClick={() => new Audio(audioUrl).play()}>↻</button><div><i /></div><button onClick={reset}>Done</button></div>}<div className="voice-actions">{status === 'idle' && <p>Tap the microphone<br />to ask your question</p>}{status === 'recording' && <button className="text-button" onClick={cancel}>Cancel recording</button>}{status === 'processing' && <p>Please wait. This may take a few seconds.</p>}{status === 'error' && <button className="button" onClick={start}>Try again</button>}</div></section></PageShell>
}

function Wave({ className, count }) { return <div className={`wave ${className}`}>{Array.from({ length: count }, (_, index) => <i key={index} />)}</div> }
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
