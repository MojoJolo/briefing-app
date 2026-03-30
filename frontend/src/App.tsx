import { useState, useEffect } from 'react'
import TaskList from './components/TaskList'
import DoneList from './components/DoneList'
import InputBar from './components/InputBar'

const INITIAL_SECTIONS = [
  { category: 'BLOCKER', tasks: [] },
  { category: 'ISSUE', tasks: [] },
  { category: 'PENDING', tasks: [] },
]

type Task = { id: string; text: string; status: number; updatedAt: string; category: string }

function sortTasks(tasks: Task[]): Task[] {
  const undone = tasks.filter(t => t.status !== 1)
  const done = tasks
    .filter(t => t.status === 1)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return [...undone, ...done]
}

function toTask(t: { id: string; task: string; category: string; status: number; updated_at: string }): Task {
  return { id: t.id, text: t.task, status: t.status, updatedAt: t.updated_at, category: t.category.toUpperCase() }
}

function App() {
  const [input, setInput] = useState('')
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [doneTasks, setDoneTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

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

    // Task is in a category section — just update in place (stays with strikethrough)
    setSections(prev =>
      prev.map(section => ({
        ...section,
        tasks: section.tasks.map(t => t.id === id ? task : t),
      }))
    )
  }

  async function handleDoneToggle(id: string) {
    // Unchecking a task from the Done section — move it back to its category
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
          />
        ))}
        {doneTasks.length > 0 && (
          <DoneList
            tasks={doneTasks}
            onToggle={handleDoneToggle}
            onDelete={handleDoneDelete}
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
