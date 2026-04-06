const TOKEN_REGEX = /(https?:\/\/[^\s]+|@\w+)/g

function truncateUrl(url, maxLen = 50) {
  if (url.length <= maxLen) return url
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname.length > 20 ? pathname.slice(0, 17) + '...' : pathname
    return hostname + path
  } catch {
    return url.slice(0, maxLen) + '...'
  }
}

export function renderTextWithLinks(text) {
  const parts = text.split(TOKEN_REGEX)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" title={part}>
          {truncateUrl(part)}
        </a>
      )
    }
    if (/^@\w+$/.test(part)) {
      return <span key={i} className="mention">{part}</span>
    }
    return part
  })
}
