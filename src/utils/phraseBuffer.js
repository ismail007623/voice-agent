const CLAUSE_MIN = 40
const HARD_CAP = 160

const SENTENCE_PATTERN = /^([\s\S]*?[.!?])(?:\s+|$)/

export function createPhraseBuffer({ onPhrase }) {
  let buffer = ''

  const emit = (phrase) => {
    const trimmed = phrase.trim()
    if (trimmed) onPhrase(trimmed)
  }

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
        if (splitIdx > 20) {
          emit(buffer.slice(0, splitIdx + 1))
          buffer = buffer.slice(splitIdx + 1)
          continue
        }
        emit(buffer.slice(0, HARD_CAP))
        buffer = buffer.slice(HARD_CAP)
        continue
      }

      if (buffer.length >= CLAUSE_MIN) {
        const commaIdx = buffer.lastIndexOf(',')
        const semiIdx = buffer.lastIndexOf(';')
        const splitIdx = Math.max(commaIdx, semiIdx)
        if (splitIdx >= 0) {
          emit(buffer.slice(0, splitIdx + 1))
          buffer = buffer.slice(splitIdx + 1)
          continue
        }
      }

      break
    }
  }

  return {
    append(delta) {
      if (!delta) return
      buffer += delta
      tryFlush()
    },
    flush() {
      if (buffer.trim()) {
        emit(buffer)
        buffer = ''
      }
    },
  }
}
