import { useState } from 'react'
import IdeaItem from './IdeaItem'

const BUCKET_ORDER = ['Older', 'Last Month', 'Four Weeks Ago', 'Three Weeks Ago', 'Two Weeks Ago', 'Last Week', 'This Week', 'Yesterday', 'Today']

function getBucket(dateStr) {
  const now = new Date()
  const taskDate = new Date(dateStr)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisWeekStart = new Date(todayStart.getTime() - daysFromMonday * 86400000)
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000)
  const twoWeeksAgoStart = new Date(thisWeekStart.getTime() - 14 * 86400000)
  const threeWeeksAgoStart = new Date(thisWeekStart.getTime() - 21 * 86400000)
  const fourWeeksAgoStart = new Date(thisWeekStart.getTime() - 28 * 86400000)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  if (taskDate >= todayStart) return 'Today'
  if (taskDate >= yesterdayStart) return 'Yesterday'
  if (taskDate >= thisWeekStart) return 'This Week'
  if (taskDate >= lastWeekStart) return 'Last Week'
  if (taskDate >= twoWeeksAgoStart) return 'Two Weeks Ago'
  if (taskDate >= threeWeeksAgoStart) return 'Three Weeks Ago'
  if (taskDate >= fourWeeksAgoStart) return 'Four Weeks Ago'
  if (taskDate >= lastMonthStart) return 'Last Month'
  return 'Older'
}

function buildBuckets(ideas) {
  const buckets = {}
  for (const idea of ideas) {
    const bucket = getBucket(idea.createdAt)
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(idea)
  }
  for (const bucket of Object.keys(buckets)) {
    buckets[bucket].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
  return buckets
}

export default function IdeasView({ ideas, commentsMap, onEdit, onDelete, onToggle, onConvertToTask, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {
  const [showDone, setShowDone] = useState(false)

  const activeIdeas = ideas.filter(i => i.status !== 1)
  const doneIdeas = ideas.filter(i => i.status === 1)

  const buckets = buildBuckets(activeIdeas)
  const visibleBuckets = BUCKET_ORDER.filter(b => buckets[b]?.length > 0)

  function renderIdeaItem(idea, i) {
    return (
      <IdeaItem
        key={idea.id ?? i}
        id={idea.id}
        text={idea.text}
        done={idea.status === 1}
        commentCount={idea.commentCount || 0}
        onToggle={() => onToggle(idea.id, idea.status)}
        onEdit={(text) => onEdit(idea.id, text)}
        onDelete={() => onDelete(idea.id)}
        onConvertToTask={() => onConvertToTask(idea.id)}
        comments={commentsMap[idea.id]}
        onFetchComments={onFetchComments}
        onAddComment={onAddComment}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />
    )
  }

  if (visibleBuckets.length === 0 && doneIdeas.length === 0) {
    return (
      <div className="empty-state">
        <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="20" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 30v2a4 4 0 0 0 8 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="24" y1="10" x2="24" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="14" y1="14" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="34" y1="14" x2="35.5" y2="12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="empty-state-title">No ideas yet</p>
        <p className="empty-state-hint">Capture your first thought below</p>
      </div>
    )
  }

  return (
    <div className="timeline">
      {visibleBuckets.map(bucket => (
        <div key={bucket} className="timeline-section">
          <div className="timeline-header">{bucket}</div>
          <div className="timeline-items">
            {buckets[bucket].map((idea, i) => renderIdeaItem(idea, i))}
          </div>
        </div>
      ))}
      {doneIdeas.length > 0 && (
        <button className="done-toggle" onClick={() => setShowDone(d => !d)}>
          <span className="done-toggle-label">{showDone ? '▾' : '▸'} Done</span>
          <span className="done-toggle-count">{doneIdeas.length}</span>
        </button>
      )}
      {showDone && (
        <div className="timeline-items">
          {doneIdeas.map((idea, i) => renderIdeaItem(idea, i))}
        </div>
      )}
    </div>
  )
}
