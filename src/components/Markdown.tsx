import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { ReactNode } from 'react'

interface MarkdownProps {
  content: string
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url)
  const vimeoId = getVimeoId(url)

  if (ytId) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube video"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    )
  }

  if (vimeoId) {
    return (
      <div className="video-embed">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title="Vimeo video"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
      </div>
    )
  }

  // Direct video file
  return (
    <div className="video-embed">
      <video src={url} controls playsInline />
    </div>
  )
}

export default function Markdown({ content }: MarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Intercept links that look like video URLs
          a({ href, children, ...props }) {
            if (href && (
              href.includes('youtube.com') ||
              href.includes('youtu.be') ||
              href.includes('vimeo.com') ||
              /\.(mp4|webm|ogg)(\?|$)/.test(href)
            )) {
              return <VideoEmbed url={href} />
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children as ReactNode}</a>
          },
          // Render img tags normally
          img({ src, alt }) {
            return <img src={src} alt={alt || ''} loading="lazy" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
