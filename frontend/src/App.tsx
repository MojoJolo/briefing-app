import { useState } from 'react'
import TaskList from './components/TaskList'
import InputBar from './components/InputBar'

const INITIAL_SECTIONS = [
  {
    category: 'BLOCKER',
    tasks: [
      { text: 'Waiting on specs' },
    ],
  },
  {
    category: 'ISSUE',
    tasks: [
      { text: 'Latency spike' },
    ],
  },
  {
    category: 'PENDING',
    tasks: [
      { text: 'Sync with Paulyn' },
      { text: 'Decide infra vendor' },
    ],
  },
]

function App() {
  const [input, setInput] = useState('')
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [loading, setLoading] = useState(false)

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
          tasks: [
            ...section.tasks,
            ...data.tasks.filter((t: { category: string }) => t.category === section.category),
          ],
        }))
      )
    } finally {
      setLoading(false)
    }
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
