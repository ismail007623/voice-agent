const API_BASE_URL = 'https://popular-subheader-endnote.ngrok-free.dev'

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || API_BASE_URL || window.location.origin
}

function voiceAgentUrl() {
  return `${getApiBaseUrl().trim().replace(/\/+$/, '')}/voice-agent`
}

function handleStreamPayload(payload, { onTextChunk, onConversationId }) {
  if (payload.event) {
    if (payload.conversation_id) {
      onConversationId?.(payload.conversation_id)
    }

    if (payload.event === 'error') {
      throw new Error(payload.message || 'Something went wrong. Please try again.')
    }

    if (payload.event === 'chunk' && payload.text) {
      onTextChunk?.(payload.text)
    }

    return
  }

  if (payload.status === 'error') {
    throw new Error(payload.message || 'Something went wrong. Please try again.')
  }

  if (payload.status !== 'success') {
    return
  }

  if (payload.data?.conversation_id) {
    onConversationId?.(payload.data.conversation_id)
  }

  if (payload.data?.text) {
    onTextChunk?.(payload.data.text)
  }
}

async function readNdjsonStream(response, callbacks) {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Streaming is not supported in this browser.')
  }

  const decoder = new TextDecoder()
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      handleStreamPayload(JSON.parse(trimmed), callbacks)
    }
  }

  const trailing = lineBuffer.trim()
  if (trailing) {
    handleStreamPayload(JSON.parse(trailing), callbacks)
  }
}

export async function streamVoiceAgent(text, conversationId, { signal, onTextChunk, onConversationId } = {}) {
  const response = await fetch(voiceAgentUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      conversation_id: conversationId || null,
    }),
    signal,
  })

  const conversationHeader = response.headers.get('X-Conversation-Id')
  if (conversationHeader) {
    onConversationId?.(conversationHeader)
  }

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const errorBody = await response.json()
      message = errorBody.message || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('ndjson')) {
    await readNdjsonStream(response, { onTextChunk, onConversationId })
    return
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Received an invalid response from the voice agent.')
  }

  if (payload.status !== 'success' || !payload.data) {
    throw new Error(payload.message || 'Something went wrong. Please try again.')
  }

  if (payload.data.conversation_id) {
    onConversationId?.(payload.data.conversation_id)
  }

  if (payload.data.text) {
    onTextChunk?.(payload.data.text)
  }
}

export async function postVoiceAgent(text, conversationId, signal) {
  let fullText = ''
  let resolvedConversationId = conversationId || ''

  await streamVoiceAgent(text, conversationId, {
    signal,
    onTextChunk: (chunk) => {
      fullText += chunk
    },
    onConversationId: (id) => {
      resolvedConversationId = id
    },
  })

  return {
    text: fullText,
    conversationId: resolvedConversationId,
  }
}
