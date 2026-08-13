const CLAUSE_MIN = 18
const FIRST_PHRASE_MIN = 12
const HARD_CAP = 120
const FLUSH_DELAY_MS = 350

const SENTENCE_PATTERN = /^([\s\S]*?[.!?])(?:\s+|$)/

export function createPhraseBuffer({ onPhrase }) {
  let buffer = ''
  let hasEmitted = false
  let flushTimer = null

  const clearFlushTimer = () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const emit = (phrase) => {
    const trimmed = phrase.trim()
    if (!trimmed) return
    hasEmitted = true
    onPhrase(trimmed)
  }

  const minPhraseLength = () => (hasEmitted ? CLAUSE_MIN : FIRST_PHRASE_MIN)

  const tryFlush = () => {
    while (buffer.length > 0) {
      const sentenceMatch = buffer.match(SENTENCE_PATTERN)
      if (sentenceMatch) {
        emit(sentenceMatch[1])
        buffer = buffer.slice(sentenceMatch[0].length)
        continue
      }

      if (buffer.length >= HARD_CAP) {
        const commaIdx = buffer.lastIndexOf(',', HARD_CAP)
        const semiIdx = buffer.lastIndexOf(';', HARD_CAP)
        const splitIdx = Math.max(commaIdx, semiIdx)
        if (splitIdx > 12) {
          emit(buffer.slice(0, splitIdx + 1))
          buffer = buffer.slice(splitIdx + 1)
          continue
        }
        const spaceIdx = buffer.lastIndexOf(' ', HARD_CAP)
        if (spaceIdx > 12) {
          emit(buffer.slice(0, spaceIdx))
          buffer = buffer.slice(spaceIdx + 1)
          continue
        }
        emit(buffer.slice(0, HARD_CAP))
        buffer = buffer.slice(HARD_CAP)
        continue
      }

      if (buffer.length >= minPhraseLength()) {
        const commaIdx = buffer.lastIndexOf(',')
        const semiIdx = buffer.lastIndexOf(';')
        const splitIdx = Math.max(commaIdx, semiIdx)
        if (splitIdx >= 0) {
          emit(buffer.slice(0, splitIdx + 1))
          buffer = buffer.slice(splitIdx + 1)
          continue
        }

        const spaceIdx = buffer.lastIndexOf(' ')
        if (spaceIdx >= minPhraseLength() - 4) {
          emit(buffer.slice(0, spaceIdx))
          buffer = buffer.slice(spaceIdx + 1)
          continue
        }
      }

      break
    }

    if (buffer.length === 0) {
      clearFlushTimer()
    }
  }

  const scheduleTimeFlush = () => {
    clearFlushTimer()
    if (buffer.length < minPhraseLength()) return

    flushTimer = setTimeout(() => {
      flushTimer = null
      if (buffer.length < minPhraseLength()) return

      const spaceIdx = buffer.lastIndexOf(' ')
      if (spaceIdx >= minPhraseLength() - 4) {
        emit(buffer.slice(0, spaceIdx))
        buffer = buffer.slice(spaceIdx + 1)
      } else if (buffer.length >= minPhraseLength()) {
        emit(buffer)
        buffer = ''
      }

      tryFlush()
      if (buffer.length >= minPhraseLength()) {
        scheduleTimeFlush()
      }
    }, FLUSH_DELAY_MS)
  }

  return {
    append(delta) {
      if (!delta) return
      buffer += delta
      tryFlush()
      if (buffer.length >= minPhraseLength()) {
        scheduleTimeFlush()
      }
    },
    flush() {
      clearFlushTimer()
      if (buffer.trim()) {
        emit(buffer)
        buffer = ''
      }
    },
  }
}
