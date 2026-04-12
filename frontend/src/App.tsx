import { useState, useEffect, useRef } from 'react'
import TimelineView from './components/TimelineView'
import InputBar from './components/InputBar'
import AuthPage from './components/AuthPage'
import LabelsManager from './components/LabelsManager'
import { useAuth } from './contexts/AuthContext'

type Label = { id: string; name: string; color: string; description: string }
type Task = { id: string; text: string; originalInput: string; showOriginal: boolean; status: number; createdAt: string; updatedAt: string; category: string; commentCount: number; labelId: string | null; labelName: string | null; labelColor: string | null }
type Comment = { id: string; task_id: string; comment: string; created_at: string; updated_at: string }

function toTask(t: { id: string; task: string; original_input?: string; show_original?: boolean; category: string; status: number; created_at: string; updated_at: string; comment_count?: number; label_id?: string | null; label_name?: string | null; label_color?: string | null }): Task {
  return {
    id: t.id,
    text: t.task,
    originalInput: t.original_input ?? '',
    showOriginal: t.show_original ?? false,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    category: t.category,
    commentCount: t.comment_count ?? 0,
    labelId: t.label_id ?? null,
    labelName: t.label_name ?? null,
    labelColor: t.label_color ?? null,
  }
}

function App() {
  const { session, loading: authLoading, signOut } = useAuth()

  const [input, setInput] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const [justMarkedDone, setJustMarkedDone] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLabelsManager, setShowLabelsManager] = useState(false)
  const contentRef = useRef<HTMLElement>(null)
  const scrolledRef = useRef(false)
  const doneTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session!.access_token}`,
    }
  }

  useEffect(() => {
    if (!session) return
    fetch('/api/tasks', { headers: getHeaders() })
      .then(res => res.json())
      .then((raw: Parameters<typeof toTask>[0][]) => setTasks(raw.map(toTask)))
    fetch('/api/labels', { headers: getHeaders() })
      .then(res => res.json())
      .then((raw: Label[]) => setLabels(raw))
  }, [session])

  useEffect(() => {
    if (tasks.length > 0 && !scrolledRef.current && contentRef.current) {
      scrolledRef.current = true
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [tasks])

  useEffect(() => {
    if (tab === 'open' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [tab])

  async function handleSubmit(value: string) {
    setInput('')
    setSubmitError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input: value }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      const newTasks = data.tasks.map(toTask)
      setTasks(prev => [...newTasks, ...prev])
    } catch {
      setInput(value)
      setSubmitError('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: string, currentStatus: number) {
    const newStatus = currentStatus === 1 ? 0 : 1
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus }),
    })
    const updated = await res.json()
    const task = toTask(updated)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
    if (newStatus === 1) {
      setJustMarkedDone(prev => new Set([...prev, id]))
      doneTimers.current[id] = setTimeout(() => {
        setJustMarkedDone(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        delete doneTimers.current[id]
      }, 3000)
    } else {
      clearTimeout(doneTimers.current[id])
      delete doneTimers.current[id]
      setJustMarkedDone(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleLabelChange(id: string, labelId: string | null) {
    const body = labelId === null
      ? { clear_label: true }
      : { label_id: labelId }
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? toTask(updated) : t))
  }

  async function handleEdit(id: string, text: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ task: text }),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? toTask(updated) : t))
  }

  async function handleShowOriginalChange(id: string, showOriginal: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ show_original: showOriginal }),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? toTask(updated) : t))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: getHeaders() })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Label CRUD handlers
  async function handleCreateLabel(name: string, color: string, description: string): Promise<Label | null> {
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, color, description }),
    })
    if (!res.ok) return null
    const created: Label = await res.json()
    setLabels(prev => [...prev, created].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    return created
  }

  async function handleUpdateLabel(id: string, updates: Partial<Label>): Promise<boolean> {
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    })
    if (!res.ok) return false
    const updated: Label = await res.json()
    setLabels(prev => prev.map(l => l.id === id ? updated : l).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    // Update any tasks that reference this label
    setTasks(prev => prev.map(t => t.labelId === id ? { ...t, labelName: updated.name, labelColor: updated.color } : t))
    return true
  }

  async function handleDeleteLabel(id: string) {
    await fetch(`/api/labels/${id}`, { method: 'DELETE', headers: getHeaders() })
    setLabels(prev => prev.filter(l => l.id !== id))
    setTasks(prev => prev.map(t => t.labelId === id ? { ...t, labelId: null, labelName: null, labelColor: null } : t))
  }

  // Comment handlers
  async function handleFetchComments(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`, { headers: getHeaders() })
    const data = await res.json()
    setCommentsMap(prev => ({ ...prev, [taskId]: data }))
  }

  function updateCommentCount(taskId: string, delta: number) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, commentCount: t.commentCount + delta } : t))
  }

  async function handleAddComment(taskId: string, comment: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
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
      headers: getHeaders(),
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
    await fetch(`/api/comments/${commentId}`, { method: 'DELETE', headers: getHeaders() })
    if (taskId) {
      setCommentsMap(prev => ({
        ...prev,
        [taskId!]: (prev[taskId!] || []).filter(c => c.id !== commentId),
      }))
      updateCommentCount(taskId, -1)
    }
  }

  if (authLoading) {
    return <div className="app-loading" />
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-brand">
            <span className="app-brand-mark" />
            <span className="app-title">Briefing</span>
          </div>
          <div className="app-header-right">
            <div className="app-tabs">
              <button
                className={`app-tab${tab === 'open' ? ' app-tab--active' : ''}`}
                onClick={() => setTab('open')}
              >Open</button>
              <button
                className={`app-tab${tab === 'done' ? ' app-tab--active' : ''}`}
                onClick={() => setTab('done')}
              >Done</button>
            </div>
            <div className="app-menu" ref={menuRef}>
              <button className="app-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Account">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2.5 13.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {menuOpen && (
                <div className="app-menu-popup">
                  <button className="app-menu-item" onClick={() => { setMenuOpen(false); setShowLabelsManager(true) }}>
                    Manage labels
                  </button>
                  <button className="app-menu-item" onClick={() => { setMenuOpen(false); signOut() }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="app-header-line" />
      </header>
      <main className="app-content" ref={contentRef}>
        <TimelineView
          tasks={tasks}
          labels={labels}
          tab={tab}
          justMarkedDone={justMarkedDone}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLabelChange={handleLabelChange}
          onShowOriginalChange={handleShowOriginalChange}
          commentsMap={commentsMap}
          onFetchComments={handleFetchComments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
        />
      </main>
      {tab === 'open' && (
        <div className="app-input">
          <InputBar value={input} onChange={v => { setInput(v); setSubmitError(null) }} onSubmit={handleSubmit} disabled={loading} error={submitError} />
        </div>
      )}
      {showLabelsManager && (
        <LabelsManager
          labels={labels}
          onClose={() => setShowLabelsManager(false)}
          onCreate={handleCreateLabel}
          onUpdate={handleUpdateLabel}
          onDelete={handleDeleteLabel}
        />
      )}
    </div>
  )
}

export default App
