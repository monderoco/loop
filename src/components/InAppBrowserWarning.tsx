import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function InAppBrowserWarning() {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
    
    // Common in-app browser identifiers
    const rules = [
      'FBAV', // Facebook App
      'FBAN', // Facebook App
      'Instagram', // Instagram
      'Snapchat', // Snapchat
      'MicroMessenger', // WeChat
      'Line', // Line
      'TikTok', // TikTok
      'Bytedance', // TikTok
    ]

    const matchesRule = rules.some(rule => ua.includes(rule))
    const noWebAuthn = typeof window.PublicKeyCredential === 'undefined'

    if (matchesRule || noWebAuthn) {
      setIsInAppBrowser(true)
    }
  }, [])

  if (!isInAppBrowser) return null

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      borderTop: '3px solid var(--accent-amber)',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'flex-start',
      position: 'relative',
      zIndex: 100,
    }}>
      <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
          Unsupported Browser Detected
        </h4>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          This app requires a feature (Passkeys) that is blocked by this in-app browser. 
          Please tap the menu icon (usually <b>...</b> or <b>⋮</b>) and select <strong>Open in System Browser</strong> (Safari/Chrome) to continue.
        </p>
      </div>
    </div>
  )
}
