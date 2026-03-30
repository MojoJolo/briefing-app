import { useState, useEffect } from 'react'
import TaskList from './components/TaskList'
import InputBar from './components/InputBar'

const INITIAL_SECTIONS = [
  { category: 'BLOCKER', tasks: [] },
  { category: 'ISSUE', tasks: [] },
  { category: 'PENDING', tasks: [] },
]

type Task = { id: string; text: string; status: number; updatedAt: string }

function sortTasks(tasks: Task[]): Task[] {
  const undone = tasks.filter(t => t.status !== 1)
  const done = tasks
    .filter(t => t.status === 1)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return [...undone, ...done]
}

function toTask(t: { id: string; task: string; status: number; updated_at: string }): Task {
  return { id: t.id, text: t.task, status: t.status, updatedAt: t.updated_at }
}

function App() {
  const [input, setInput] = useState('')
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then((tasks: { id: string; task: string; category: string; status: number; updated_at: string }[]) => {
        setSections(prev =>
          prev.map(section => ({
            ...section,
            tasks: sortTasks(
              tasks
                .filter(t => t.category.toUpperCase() === section.category)
                .map(toTask)
            ),
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
      setSections(prev =>
        prev.map(section => ({
          ...section,
          tasks: sortTasks([
            ...data.tasks
              .filter((t: { id: string; task: string; category: string; status: number; updated_at: string }) => t.category.toUpperCase() === section.category)
              .map(toTask),
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
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.map(t => t.id === id ? toTask(updated) : t),
      }))
    )
  }

  async function handleEdit(id: string, text: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: text }),
    })
    const updated = await res.json()
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.map(t => t.id === id ? toTask(updated) : t),
      }))
    )
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.filter((t: { id?: string }) => t.id !== id),
      }))
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Briefing</span>
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
          />
        ))}
      </main>
      <div className="app-input">
        <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} disabled={loading} />
      </div>
    </div>
  )
}

export default App
