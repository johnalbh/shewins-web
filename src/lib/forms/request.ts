// A slow MailerLite or MailerSend must not hold the function open.
const TIMEOUT_MS = 8_000;

/** A JSON request to a provider's API with its bearer token. */
export function apiCall(method: 'GET' | 'POST', url: string, token: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
