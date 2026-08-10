const DEEPGRAM_SPEAK_URL = 'https://api.deepgram.com/v1/speak?model=aura-2-asteria-en&encoding=mp3'
const MIME_TYPE = 'audio/mpeg'

function getDeepgramApiKey() {
  return import.meta.env.VITE_DEEPGRAM_API_KEY?.trim() || ''
}

export function isDeepgramConfigured() {
  return Boolean(getDeepgramApiKey())
}

export function isDeepgramPlaybackSupported() {
  return Boolean(window.MediaSource && MediaSource.isTypeSupported(MIME_TYPE))
}

function waitForSourceBuffer(sourceBuffer) {
  if (!sourceBuffer.updating) return Promise.resolve()
  return new Promise((resolve) => {
    sourceBuffer.addEventListener('updateend', resolve, { once: true })
  })
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
  session.reader?.cancel().catch(() => {})

  const audio = session.audio
  if (audio) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  if (session.objectUrl) {
    URL.revokeObjectURL(session.objectUrl)
    session.objectUrl = null
  }

  const mediaSource = session.mediaSource
  if (mediaSource?.readyState === 'open') {
    try {
      mediaSource.endOfStream()
    } catch {
      // ignore
    }
  }

  session.unsubscribeAbort?.()
}

export function streamDeepgramSpeech(text, { signal, onStart, onSession } = {}) {
  const apiKey = getDeepgramApiKey()
  if (!apiKey) {
    return Promise.reject(new Error('Deepgram API key not configured.'))
  }

  const trimmedText = text?.trim()
  if (!trimmedText) {
    return Promise.resolve(null)
  }

  if (!isDeepgramPlaybackSupported()) {
    return Promise.reject(new Error('Streaming audio playback is not supported in this browser.'))
  }

  const session = {
    aborted: false,
    abortController: new AbortController(),
    audio: null,
    mediaSource: null,
    objectUrl: null,
    reader: null,
    unsubscribeAbort: null,
  }

  session.unsubscribeAbort = linkAbortSignal(signal, session.abortController)
  onSession?.(session)

  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (error) => {
      if (settled) return
      settled = true
      session.unsubscribeAbort?.()
      if (error) {
        stopDeepgramSpeech(session)
        reject(error)
      } else {
        stopDeepgramSpeech(session)
        resolve(session)
      }
    }

    const fetchAndPlay = async () => {
      let response
      try {
        response = await fetch(DEEPGRAM_SPEAK_URL, {
          method: 'POST',
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: trimmedText }),
          signal: session.abortController.signal,
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          finish(error)
          return
        }
        finish(new Error('Could not reach Deepgram. Please try again.'))
        return
      }

      if (session.aborted) {
        finish(new DOMException('Aborted', 'AbortError'))
        return
      }

      if (!response.ok) {
        let message = 'Could not generate speech. Please try again.'
        try {
          const errorBody = await response.json()
          message = errorBody.err_msg || errorBody.message || message
        } catch {
          // ignore parse errors
        }
        finish(new Error(message))
        return
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('audio')) {
        finish(new Error('Deepgram returned an unexpected response.'))
        return
      }

      if (!response.body) {
        finish(new Error('Streaming audio is not available in this browser.'))
        return
      }

      const mediaSource = new MediaSource()
      const audio = new Audio()
      const objectUrl = URL.createObjectURL(mediaSource)

      session.audio = audio
      session.mediaSource = mediaSource
      session.objectUrl = objectUrl
      audio.src = objectUrl

      audio.onended = () => finish(null)
      audio.onerror = () => finish(new Error('Audio playback failed.'))

      mediaSource.addEventListener('sourceopen', async () => {
        if (session.aborted) return

        let sourceBuffer
        try {
          sourceBuffer = mediaSource.addSourceBuffer(MIME_TYPE)
        } catch (error) {
          finish(error instanceof Error ? error : new Error('Could not initialize audio stream.'))
          return
        }

        const reader = response.body.getReader()
        session.reader = reader
        let started = false

        try {
          while (!session.aborted) {
            const { done, value } = await reader.read()
            if (done) break
            if (!value?.byteLength) continue

            await waitForSourceBuffer(sourceBuffer)
            if (session.aborted) break

            sourceBuffer.appendBuffer(value)

            if (!started) {
              started = true
              onStart?.()
              await audio.play().catch(() => {})
            }
          }

          if (session.aborted) {
            finish(new DOMException('Aborted', 'AbortError'))
            return
          }

          await waitForSourceBuffer(sourceBuffer)
          if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream()
          }

          if (!started) {
            finish(null)
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            finish(error)
            return
          }
          finish(error instanceof Error ? error : new Error('Audio streaming failed.'))
        }
      }, { once: true })
    }

    fetchAndPlay().catch((error) => {
      finish(error instanceof Error ? error : new Error('Audio streaming failed.'))
    })
  })
}
