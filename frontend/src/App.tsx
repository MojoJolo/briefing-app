import { useState, useEffect, useRef } from 'react'
import TimelineView from './components/TimelineView'
import InputBar from './components/InputBar'

type Task = { id: string; text: string; status: number; createdAt: string; updatedAt: string; category: string; commentCount: number }
type Comment = { id: string; task_id: string; comment: string; created_at: string; updated_at: string }

function toTask(t: { id: string; task: string; category: string; status: number; created_at: string; updated_at: string; comment_count?: number }): Task {
  return { id: t.id, text: t.task, status: t.status, createdAt: t.created_at, updatedAt: t.updated_at, category: t.category.toUpperCase(), commentCount: t.comment_count ?? 0 }
}

function App() {
  const [input, setInput] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const contentRef = useRef<HTMLElement>(null)
  const scrolledRef = useRef(false)

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then((raw: { id: string; task: string; category: string; status: number; created_at: string; updated_at: string; comment_count?: number }[]) => {
        setTasks(raw.map(toTask))
      })
  }, [])

  useEffect(() => {
    if (tasks.length > 0 && !scrolledRef.current && contentRef.current) {
      scrolledRef.current = true
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [tasks])


  async function handleSubmit(value: string) {
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      })
      const data = await res.json()
      const newTasks = data.tasks.map(toTask)
      setTasks(prev => [...newTasks, ...prev])
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: string, currentStatus: number) {
    const newStatus = currentStatus === 1 ? 0 : 1
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const updated = await res.json()
    const task = toTask(updated)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  async function handleCategoryChange(id: string, newCategory: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory }),
    })
    const updated = await res.json()
    const task = toTask(updated)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  async function handleEdit(id: string, text: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: text }),
    })
    const updated = await res.json()
    const task = toTask(updated)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Comment handlers
  async function handleFetchComments(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`)
    const data = await res.json()
    setCommentsMap(prev => ({ ...prev, [taskId]: data }))
  }

  function updateCommentCount(taskId: string, delta: number) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, commentCount: t.commentCount + delta } : t))
  }

  async function handleAddComment(taskId: string, comment: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    })
    const newComment = await res.json()
    setCommentsMap(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newComment],
    }))
    updateCommentCount(taskId, 1)
  }

  async function handleEditComment(commentId: string, comment: string) {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    })
    const updated = await res.json()
    setCommentsMap(prev => {
      const taskComments = prev[updated.task_id] || []
      return {
        ...prev,
        [updated.task_id]: taskComments.map(c => c.id === commentId ? updated : c),
      }
    })
  }

  async function handleDeleteComment(commentId: string) {
    let taskId: string | null = null
    for (const [tid, comments] of Object.entries(commentsMap)) {
      if (comments.some(c => c.id === commentId)) {
        taskId = tid
        break
      }
    }
    await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (taskId) {
      setCommentsMap(prev => ({
        ...prev,
        [taskId!]: (prev[taskId!] || []).filter(c => c.id !== commentId),
      }))
      updateCommentCount(taskId, -1)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark" />
          <span className="app-title">Briefing</span>
        </div>
        <div className="app-header-line" />
      </header>
      <main className="app-content" ref={contentRef}>
        <TimelineView
          tasks={tasks}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCategoryChange={handleCategoryChange}
          commentsMap={commentsMap}
          onFetchComments={handleFetchComments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
        />
      </main>
      <div className="app-input">
        <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} disabled={loading} />
      </div>
    </div>
  )
}

export default App
