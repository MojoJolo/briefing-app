import { useState, useEffect } from 'react'
import TaskList from './components/TaskList'
import DoneList from './components/DoneList'
import InputBar from './components/InputBar'

const INITIAL_SECTIONS = [
  { category: 'BLOCKER', tasks: [] },
  { category: 'ISSUE', tasks: [] },
  { category: 'PENDING', tasks: [] },
]

type Task = { id: string; text: string; status: number; updatedAt: string; category: string; commentCount: number }
type Comment = { id: string; task_id: string; comment: string; created_at: string; updated_at: string }

function sortTasks(tasks: Task[]): Task[] {
  const undone = tasks.filter(t => t.status !== 1)
  const done = tasks
    .filter(t => t.status === 1)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return [...undone, ...done]
}

function toTask(t: { id: string; task: string; category: string; status: number; updated_at: string; comment_count?: number }): Task {
  return { id: t.id, text: t.task, status: t.status, updatedAt: t.updated_at, category: t.category.toUpperCase(), commentCount: t.comment_count ?? 0 }
}

function App() {
  const [input, setInput] = useState('')
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [doneTasks, setDoneTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then((tasks: { id: string; task: string; category: string; status: number; updated_at: string }[]) => {
        const all = tasks.map(toTask)
        const done = all
          .filter(t => t.status === 1)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        const undone = all.filter(t => t.status !== 1)

        setDoneTasks(done)
        setSections(prev =>
          prev.map(section => ({
            ...section,
            tasks: undone.filter(t => t.category === section.category),
          }))
        )
      })
  }, [])

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
      setSections(prev =>
        prev.map(section => ({
          ...section,
          tasks: sortTasks([
            ...newTasks.filter((t: Task) => t.category === section.category),
            ...section.tasks,
          ]),
        }))
      )
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

    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.map(t => t.id === id ? task : t),
      }))
    )
  }

  async function handleDoneToggle(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 0 }),
    })
    const updated = await res.json()
    const task = toTask(updated)

    setDoneTasks(prev => prev.filter(t => t.id !== id))
    setSections(prev =>
      prev.map(section =>
        section.category === task.category
          ? { ...section, tasks: [task, ...section.tasks] }
          : section
      )
    )
  }

  async function handleEdit(id: string, text: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: text }),
    })
    const updated = await res.json()
    const task = toTask(updated)
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.map(t => t.id === id ? task : t),
      }))
    )
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.filter(t => t.id !== id),
      }))
    )
  }

  async function handleDoneDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setDoneTasks(prev => prev.filter(t => t.id !== id))
  }

  // Comment handlers
  async function handleFetchComments(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`)
    const data = await res.json()
    setCommentsMap(prev => ({ ...prev, [taskId]: data }))
  }

  function updateCommentCount(taskId: string, delta: number) {
    const updateTasks = (tasks: Task[]) =>
      tasks.map(t => t.id === taskId ? { ...t, commentCount: t.commentCount + delta } : t)
    setSections(prev => prev.map(s => ({ ...s, tasks: updateTasks(s.tasks) })))
    setDoneTasks(prev => updateTasks(prev))
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
    // Find which task owns this comment
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
      <main className="app-content">
        {sections.map((section) => (
          <TaskList
            key={section.category}
            category={section.category}
            tasks={section.tasks}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            commentsMap={commentsMap}
            onFetchComments={handleFetchComments}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        ))}
        {doneTasks.length > 0 && (
          <DoneList
            tasks={doneTasks}
            onToggle={handleDoneToggle}
            onDelete={handleDoneDelete}
            commentsMap={commentsMap}
            onFetchComments={handleFetchComments}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
      </main>
      <div className="app-input">
        <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} disabled={loading} />
      </div>
    </div>
  )
}

export default App
