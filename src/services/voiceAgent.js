const API_BASE_URL = 'https://popular-subheader-endnote.ngrok-free.dev'

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || API_BASE_URL || window.location.origin
}

export async function postVoiceAgent(text, conversationId, signal) {
  const base = getApiBaseUrl().trim().replace(/\/+$/, '')
  const response = await fetch(`${base}/voice-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      conversation_id: conversationId || null,
    }),
    signal,
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Received an invalid response from the voice agent.')
  }

  if (!response.ok || payload.status !== 'success' || !payload.data) {
    throw new Error(payload.message || 'Something went wrong. Please try again.')
  }

  return {
    text: payload.data.text || '',
    conversationId: payload.data.conversation_id || conversationId || '',
  }
}
