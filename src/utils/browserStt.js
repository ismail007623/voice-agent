export function isSpeechRecognitionSupported() {
  return Boolean(
    typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition),
  )
}

export function createSpeechRecognizer({ lang = 'en-US', continuous = true, interimResults = true } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    throw new Error('Speech recognition is not supported in this browser.')
  }

  const recognition = new SpeechRecognition()
  recognition.lang = lang
  recognition.continuous = continuous
  recognition.interimResults = interimResults

  let finalTranscript = ''
  let interimTranscript = ''
  let resolveStop = null
  let rejectStop = null
  let stopped = false

  recognition.onresult = (event) => {
    interimTranscript = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const text = result[0]?.transcript || ''
      if (result.isFinal) {
        finalTranscript += text
      } else {
        interimTranscript += text
      }
    }
  }

  recognition.onerror = (event) => {
    if (stopped) return
    stopped = true
    rejectStop?.(new Error(event.error === 'no-speech'
      ? 'No speech detected. Please try again.'
      : 'Could not transcribe your speech. Please try again.'))
    resolveStop = null
    rejectStop = null
  }

  recognition.onend = () => {
    if (stopped) return
    stopped = true
    const transcript = `${finalTranscript}${interimTranscript}`.trim()
    resolveStop?.(transcript)
    resolveStop = null
    rejectStop = null
  }

  return {
    start() {
      stopped = false
      finalTranscript = ''
      interimTranscript = ''
      recognition.start()
    },
    stop() {
      return new Promise((resolve, reject) => {
        if (stopped) {
          resolve(`${finalTranscript}${interimTranscript}`.trim())
          return
        }
        resolveStop = resolve
        rejectStop = reject
        try {
          recognition.stop()
        } catch {
          stopped = true
          resolve(`${finalTranscript}${interimTranscript}`.trim())
        }
      })
    },
    abort() {
      stopped = true
      resolveStop = null
      rejectStop = null
      try {
        recognition.abort()
      } catch {
        // ignore
      }
    },
  }
}
