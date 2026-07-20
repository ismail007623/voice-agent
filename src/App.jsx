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

function Brand({ light = false }) {
  return <button className={`brand ${light ? 'brand-light' : ''}`} type="button"><span className="brand-mark">✚</span><span><b>Shenaz</b><small>HOSPITAL</small></span></button>
}

function Header({ goTo }) {
  return <header className="site-header"><Brand /><nav>{['Home', 'Services', 'About Us', 'Contact'].map((item) => <button className={item === 'Home' ? 'active' : ''} onClick={() => goTo(item === 'Home' ? 'home' : item === 'Services' ? 'services' : 'about')} key={item}>{item}</button>)}</nav><button className="button button-small" onClick={() => goTo('chat')}>Get Started</button></header>
}

function Sidebar({ page, goTo }) {
  const links = [['▣', 'Chat', 'chat'], ['◷', 'History', 'history'], ['◉', 'Help', 'about'], ['⚙', 'Settings', 'about']]
  return <aside className="sidebar"><Brand /><div className="side-menu">{links.map(([icon, label, target]) => <button className={page === target ? 'selected' : ''} onClick={() => goTo(target)} key={label}><span>{icon}</span>{label}</button>)}</div><button className="logout">⇥<span>Logout</span></button></aside>
}

function Footer() {
  return <footer><div><Brand light /><p>Compassionate care. Connected healthcare.</p></div><div><strong>Quick Links</strong><a>Home</a><a>Services</a><a>About Us</a><a>Contact</a></div><div><strong>Resources</strong><a>FAQs</a><a>Privacy Policy</a><a>Terms & Conditions</a></div><div><strong>Contact Us</strong><a>☎ +1 (555) 123-4567</a><a>✉ info@shenazhospital.com</a><a>⌖ 123 Health Street, Wellness City</a></div></footer>
}

function Landing({ goTo }) {
  return <div className="landing"><Header goTo={goTo} /><main><section className="hero-section"><div className="hero-copy"><h1>AI Hospital<br />Contact Center</h1><p>Speak to our AI assistant for appointments, hospital information, and more.</p><div className="feature-lines">{[['♟', 'Voice First', 'Simply speak your question'], ['▣', 'Instant Assistance', 'Get quick & accurate answers'], ['♙', 'Private & Secure', 'Your conversation is safe with us']].map(([icon, title, detail]) => <span key={title}><b>{icon}</b><i><strong>{title}</strong><small>{detail}</small></i></span>)}</div><button className="button voice-button" onClick={() => goTo('chat')}><span>♬</span> Start Voice Chat</button><small className="priority">♡ Your health. Our priority.</small></div><div className="hero-art"><div className="cloud c1" /><div className="cloud c2" /><div className="hospital"><span>✚</span><b>HOSPITAL</b><i /></div><div className="doctor"><div className="doctor-head" /><div className="doctor-hair" /><div className="doctor-body">✚</div></div><div className="mic-orbit"><span>♬</span></div></div></section><section className="quick-grid">{serviceData.slice(0, 4).map(([icon, title, detail]) => <button className="quick-card" key={title} onClick={() => goTo('chat')}><span>{icon}</span><i><strong>{title}</strong><small>{detail}</small></i></button>)}</section><section className="trust-strip">{[['♧', 'Trusted Care', 'Advanced AI with human touch'], ['◴', 'Fast & Reliable', 'Quick, accurate answers'], ['☼', 'Always Available', '24/7 assistance for you'], ['♧', 'Secure & Private', 'Your data is protected and confidential']].map(([icon, title, detail]) => <div key={title}><span>{icon}</span><i><strong>{title}</strong><small>{detail}</small></i></div>)}</section></main><Footer /></div>
}

function PageShell({ page, goTo, children }) {
  return <div className="app-shell"><Sidebar page={page} goTo={goTo} /><main className="app-main">{children}</main></div>
}

function Topbar({ title, goTo }) {
  return <div className="topbar"><button className="back" onClick={() => goTo('home')}>←</button><strong>{title}</strong><button className="info">ⓘ</button></div>
}

function VoiceChat({ goTo, addHistory }) {
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
    controller.current = new AbortController()
    const timeout = setTimeout(() => controller.current?.abort(), 90000)
    try {
      const baseUrl = 'https://popular-subheader-endnote.ngrok-free.dev'
      const response = await fetch(`${baseUrl}/voice-chat`, { method: 'POST', body: formData, signal: controller.current.signal })
      clearTimeout(timeout)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || contentType.includes('application/json')) {
        let message = 'We could not get your answer. Please try again.'
        if (contentType.includes('application/json')) { const data = await response.json(); message = data.message || message }
        throw new Error(message)
      }
      if (!contentType.includes('audio')) throw new Error('The hospital service returned an unexpected response. Please try again.')
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
  return <PageShell page="chat" goTo={goTo}><Topbar title="AI Voice Chat" goTo={goTo} /><section className={`voice-panel ${status}`}><div className="voice-heading">{status === 'idle' && <><h2>How can we help?</h2><p>Ask about appointments, hospital services, or anything else.</p></>}{status === 'recording' && <><b>{time}</b><p className="recording-text">Recording...</p></>}{status === 'processing' && <><h2>Getting your answer</h2><p>{progressCopy[progress]}</p></>}{status === 'playing' && <><h2>Here&apos;s your answer</h2><p>Listen to your personalised response.</p></>}{status === 'error' && <><h2>Let&apos;s try again</h2><p>{error}</p></>}</div>{status === 'recording' && <Wave className="wave-red" count={9} />}{status === 'processing' && <Wave className="wave-thinking" count={24} />}{status === 'playing' && <Wave className="wave-playing" count={15} />}{(status === 'idle' || status === 'error') && <button className="mic-button" onClick={status === 'error' ? reset : start}>♬</button>}{status === 'recording' && <button className="stop-button" onClick={stop}>■</button>}{status === 'playing' && <div className="player"><button onClick={() => new Audio(audioUrl).play()}>↻</button><div><i /></div><button onClick={reset}>Done</button></div>}<div className="voice-actions">{status === 'idle' && <p>Tap the microphone<br />to ask your question</p>}{status === 'recording' && <button className="text-button" onClick={cancel}>Cancel recording</button>}{status === 'processing' && <p>Please wait. This may take a few seconds.</p>}{status === 'error' && <button className="button" onClick={start}>Try again</button>}</div></section></PageShell>
}

function Wave({ className, count }) { return <div className={`wave ${className}`}>{Array.from({ length: count }, (_, index) => <i key={index} />)}</div> }
function Services({ goTo }) { return <PageShell page="services" goTo={goTo}><Topbar title="Our Services" goTo={goTo} /><div className="content-page"><p className="eyebrow">CARE AT YOUR CONVENIENCE</p><h1>We&apos;re here to help</h1><p className="lead">Get answers and support from Shenaz Hospital whenever you need it.</p><div className="service-list">{serviceData.map(([icon, title, detail]) => <button key={title} onClick={() => goTo('chat')}><span>{icon}</span><i><strong>{title}</strong><small>{detail}</small></i><b>›</b></button>)}</div></div></PageShell> }
function About({ goTo }) { return <PageShell page="about" goTo={goTo}><Topbar title="About Us" goTo={goTo} /><div className="content-page about"><div className="about-mark">✚</div><h1>Shenaz Hospital</h1><p className="lead">Compassionate care. Advanced healthcare.</p><p>Shenaz Hospital is dedicated to providing exceptional medical care with compassion and excellence. Our AI Contact Center is here to help you 24/7 with your healthcare needs.</p><div className="contact-card"><h3>⌖ Location</h3><p>123 Health Street, Wellness City, HC 12345</p><h3>☎ Phone</h3><p>+1 (555) 123-4567</p><h3>✉ Email</h3><p>info@shenazhospital.com</p></div></div></PageShell> }
function History({ goTo, history }) { return <PageShell page="history" goTo={goTo}><Topbar title="Conversation History" goTo={goTo} /><div className="content-page history"><div className="search">⌕ <span>Search conversations...</span></div><div className="filters"><button className="active">All</button><button>Appointments</button><button>FAQs</button><button>General</button></div>{history.length ? history.map((item, index) => <article className="history-row" key={`${item.time}-${index}`}><span className={item.url ? 'history-icon success' : 'history-icon'}>{item.url ? '♬' : '!'}</span><i><strong>{item.status}</strong><small>Voice conversation · {item.time}</small></i>{item.url && <button onClick={() => new Audio(item.url).play()}>▶</button>}</article>) : <div className="empty-history"><span>◷</span><h2>No conversations yet</h2><p>Your voice conversations will appear here.</p><button className="button" onClick={() => goTo('chat')}>Start a voice chat</button></div>}</div></PageShell> }

function App() {
  const [page, setPage] = useState('home')
  const [history, setHistory] = useState([])
  if (page === 'home') return <Landing goTo={setPage} />
  if (page === 'chat') return <VoiceChat goTo={setPage} addHistory={(item) => setHistory((previous) => [item, ...previous])} />
  if (page === 'services') return <Services goTo={setPage} />
  if (page === 'history') return <History goTo={setPage} history={history} />
  return <About goTo={setPage} />
}

export default App
