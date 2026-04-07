import { useState } from 'react'
import TaskItem from './TaskItem'

const BUCKET_ORDER = ['Older', 'Last Month', 'Four Weeks Ago', 'Three Weeks Ago', 'Two Weeks Ago', 'Last Week', 'This Week', 'Yesterday', 'Today']

function getBucket(dateStr) {
  const now = new Date()
  const taskDate = new Date(dateStr)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const dayOfWeek = now.getDay() // 0 = Sunday
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

function buildBuckets(tasks, dateField, sortAsc) {
  const buckets = {}
  for (const task of tasks) {
    const bucket = getBucket(task[dateField])
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(task)
  }
  for (const bucket of Object.keys(buckets)) {
    buckets[bucket].sort((a, b) => {
      const diff = new Date(a[dateField]) - new Date(b[dateField])
      return sortAsc ? diff : -diff
    })
  }
  return buckets
}

export default function TimelineView({ tasks, tab, justMarkedDone, onToggle, onEdit, onDelete, onCategoryChange, commentsMap, onFetchComments, onAddComment, onEditComment, onDeleteComment }) {

  function renderTask(task, i, opts = {}) {
    return (
      <TaskItem
        key={task.id ?? i}
        id={task.id}
        text={task.text}
        done={task.status === 1}
        strikethrough={opts.strikethrough}
        fading={opts.fading}
        category={task.category}
        commentCount={task.commentCount || 0}
        onToggle={() => onToggle(task.id, task.status)}
        onEdit={(text) => onEdit(task.id, text)}
        onDelete={() => onDelete(task.id)}
        onCategoryChange={(cat) => onCategoryChange(task.id, cat)}
        comments={commentsMap[task.id]}
        onFetchComments={onFetchComments}
        onAddComment={onAddComment}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />
    )
  }

  if (tab === 'done') {
    const doneTasks = tasks.filter(t => t.status === 1 && !justMarkedDone.has(t.id))
    const buckets = buildBuckets(doneTasks, 'updatedAt', false)
    const visibleBuckets = BUCKET_ORDER.filter(b => buckets[b]?.length > 0)

    if (visibleBuckets.length === 0) {
      return <div className="task-list-empty" style={{ padding: '12px 8px' }}>No done items</div>
    }

    return (
      <div className="timeline">
        {visibleBuckets.map(bucket => (
          <div key={bucket} className="timeline-section">
            <div className="timeline-header">{bucket}</div>
            <div className="timeline-items">
              {buckets[bucket].map((task, i) => renderTask(task, i, { strikethrough: false }))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Open tab: show open tasks + tasks just marked done in this session (in-place, with strikethrough)
  const activeTasks = tasks.filter(t => t.status === 0 || justMarkedDone.has(t.id))
  const buckets = buildBuckets(activeTasks, 'createdAt', true)
  const visibleBuckets = BUCKET_ORDER.filter(b => buckets[b]?.length > 0)

  if (visibleBuckets.length === 0) {
    return <div className="task-list-empty" style={{ padding: '12px 8px' }}>No items</div>
  }

  return (
    <div className="timeline">
      {visibleBuckets.map(bucket => (
        <div key={bucket} className="timeline-section">
          <div className="timeline-header">{bucket}</div>
          <div className="timeline-items">
            {buckets[bucket].map((task, i) => renderTask(task, i, { fading: justMarkedDone.has(task.id) }))}
          </div>
        </div>
      ))}
    </div>
  )
}
