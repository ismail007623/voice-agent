const DEEPGRAM_SPEAK_URL = 'https://api.deepgram.com/v1/speak?model=aura-2-asteria-en&encoding=mp3'

function getDeepgramApiKey() {
  return import.meta.env.VITE_DEEPGRAM_API_KEY?.trim() || ''
}

let playbackAudio = null

export function isDeepgramConfigured() {
  return Boolean(getDeepgramApiKey())
}

export function isDeepgramPlaybackSupported() {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

export function unlockDeepgramPlayback() {
  if (!isDeepgramPlaybackSupported()) {
    return Promise.resolve()
  }

  if (!playbackAudio) {
    playbackAudio = new Audio()
  }

  playbackAudio.muted = true
  playbackAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

  return playbackAudio.play()
    .then(() => {
      playbackAudio.pause()
      playbackAudio.muted = false
      playbackAudio.removeAttribute('src')
      playbackAudio.load()
    })
    .catch(() => {})
}

function linkAbortSignal(sourceSignal, targetController) {
  if (!sourceSignal) return () => {}
  if (sourceSignal.aborted) {
    targetController.abort()
    return () => {}
  }
  const onAbort = () => targetController.abort()
  sourceSignal.addEventListener('abort', onAbort)
  return () => sourceSignal.removeEventListener('abort', onAbort)
}

export function stopDeepgramSpeech(session) {
  if (!session) return

  session.aborted = true
  session.abortController?.abort()

  const audio = session.audio
  if (audio) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
  }

  if (session.objectUrl) {
    URL.revokeObjectURL(session.objectUrl)
    session.objectUrl = null
  }

  session.unsubscribeAbort?.()
}

function getPlaybackError(error) {
  if (error?.name === 'NotAllowedError') {
    return new Error('Audio playback was blocked by the browser. Click Start Voice Chat again and allow sound.')
  }
  return new Error('Could not play the assistant response.')
}

function playBlob(blob, session, onStart) {
  const objectUrl = URL.createObjectURL(blob)
  session.objectUrl = objectUrl

  const audio = playbackAudio || new Audio()
  session.audio = audio
  if (!playbackAudio) {
    playbackAudio = audio
  }

  return new Promise((resolve, reject) => {
    const cleanupListeners = () => {
      audio.onended = null
      audio.onerror = null
    }

    audio.onended = () => {
      cleanupListeners()
      resolve()
    }
    audio.onerror = () => {
      cleanupListeners()
      reject(new Error('Audio playback failed.'))
    }

    audio.src = objectUrl
    onStart?.()

    audio.play().catch((error) => {
      cleanupListeners()
      reject(getPlaybackError(error))
    })
  })
}

async function fetchDeepgramBlob(text, signal) {
  const apiKey = getDeepgramApiKey()
  if (!apiKey) {
    throw new Error('Deepgram API key not configured.')
  }

  const trimmedText = text?.trim()
  if (!trimmedText) {
    return null
  }

  let response
  try {
    response = await fetch(DEEPGRAM_SPEAK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmedText }),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach Deepgram. Please try again.')
  }

  if (!response.ok) {
    let message = 'Could not generate speech. Please try again.'
    try {
      const errorBody = await response.json()
      message = errorBody.err_msg || errorBody.message || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  if (!blob.size) {
    throw new Error('Deepgram returned an empty audio response.')
  }

  if (!blob.type.includes('audio') && !blob.type.includes('mpeg') && !blob.type.includes('octet-stream')) {
    throw new Error('Deepgram returned an unexpected response.')
  }

  return blob
}

async function playFetchedBlob(blob, session, onStart) {
  if (!blob) return

  await playBlob(blob, session, onStart)

  if (session.objectUrl) {
    URL.revokeObjectURL(session.objectUrl)
    session.objectUrl = null
  }
}

export function createDeepgramSpeechQueue({ signal, onStart, onSession } = {}) {
  if (!isDeepgramPlaybackSupported()) {
    throw new Error('Audio playback is not supported in this browser.')
  }

  const queue = []
  let flushed = false
  let stopped = false
  let started = false
  let running = false
  let currentSession = null

  const abortController = new AbortController()
  const unlinkAbort = linkAbortSignal(signal, abortController)

  let resolveDone
  let rejectDone
  let settled = false
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  const settleDone = (error) => {
    if (settled) return
    settled = true
    unlinkAbort()
    if (error) rejectDone(error)
    else resolveDone()
  }

  const finishIfReady = () => {
    if (flushed && queue.length === 0 && !running) {
      settleDone()
    }
  }

  const takeNextFetch = () => {
    if (queue.length === 0) return null
    const text = queue.shift()
    return fetchDeepgramBlob(text, abortController.signal)
  }

  const runWorker = async () => {
    if (running || stopped) return
    running = true

    let pendingFetch = takeNextFetch()

    try {
      while (!stopped && !abortController.signal.aborted && pendingFetch) {
        let blob
        try {
          blob = await pendingFetch
        } catch (error) {
          if (error.name === 'AbortError' || stopped || abortController.signal.aborted) {
            return
          }
          settleDone(error)
          throw error
        }

        pendingFetch = takeNextFetch()

        if (!blob) {
          continue
        }

        const session = {
          aborted: false,
          abortController: new AbortController(),
          audio: null,
          objectUrl: null,
        }

        currentSession = session
        onSession?.(session)

        const onPlaybackStart = () => {
          if (!started) {
            started = true
            onStart?.()
          }
        }

        try {
          await playFetchedBlob(blob, session, onPlaybackStart)
        } catch (error) {
          if (error.name === 'AbortError' || stopped || abortController.signal.aborted) {
            return
          }
          settleDone(error)
          throw error
        } finally {
          currentSession = null
        }
      }
    } finally {
      running = false
      if (queue.length > 0 && !stopped && !abortController.signal.aborted) {
        kickWorker()
      } else {
        finishIfReady()
      }
    }
  }

  const kickWorker = () => {
    if (!stopped) {
      runWorker().catch((error) => {
        if (error.name !== 'AbortError') {
          settleDone(error)
        }
      })
    }
  }

  return {
    enqueue(text) {
      if (stopped || !text?.trim()) return
      queue.push(text.trim())
      kickWorker()
    },
    flush() {
      flushed = true
      finishIfReady()
    },
    stop() {
      stopped = true
      flushed = true
      abortController.abort()
      stopDeepgramSpeech(currentSession)
      currentSession = null
      queue.length = 0
      settleDone()
    },
    done,
  }
}

export function streamDeepgramSpeech(text, { signal, onStart, onSession } = {}) {
  const trimmedText = text?.trim()
  if (!trimmedText) {
    return Promise.resolve(null)
  }

  const queue = createDeepgramSpeechQueue({ signal, onStart, onSession })
  queue.enqueue(trimmedText)
  queue.flush()
  return queue.done
}
