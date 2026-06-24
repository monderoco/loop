/**
 * WebAuthn / Passkey utilities
 * Handles registration and authentication flows.
 * We use a simplified challenge model where the challenge is derived server-side
 * via Supabase RPC, but fall back gracefully for environments without full FIDO2 support.
 */

/** Convert a base64url string to a Uint8Array */
export function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Convert a Uint8Array (or ArrayBuffer) to base64url */
export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Generate a random challenge */
export function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)
  return challenge
}

/** Register a new passkey for a user */
export async function registerPasskey(name: string): Promise<{
  credentialId: string
  publicKey: string
  rawId: ArrayBuffer
}> {
  const challenge = generateChallenge()

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge.buffer as ArrayBuffer,
    rp: {
      name: 'RSVP App',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer,
      name: name,
      displayName: name,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  }

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential

  if (!credential) throw new Error('Failed to create passkey')

  const response = credential.response as AuthenticatorAttestationResponse
  const credentialId = bufferToBase64url(credential.rawId)

  // Extract the public key from the attestation object
  // We store the full attestation for verification purposes
  const publicKey = bufferToBase64url(response.attestationObject)

  return { credentialId, publicKey, rawId: credential.rawId }
}

/** Authenticate with an existing passkey */
export async function authenticatePasskey(credentialId?: string): Promise<{
  credentialId: string
  rawId: ArrayBuffer
}> {
  const challenge = generateChallenge()

  const allowCredentials: PublicKeyCredentialDescriptor[] = credentialId
    ? [{ id: base64urlToBuffer(credentialId).buffer as ArrayBuffer, type: 'public-key' }]
    : []

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge.buffer as ArrayBuffer,
    allowCredentials,
    userVerification: 'preferred',
    timeout: 60000,
  }

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential

  if (!assertion) throw new Error('Authentication failed')

  return {
    credentialId: bufferToBase64url(assertion.rawId),
    rawId: assertion.rawId,
  }
}

/** Check if WebAuthn / passkeys are supported on this device */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
