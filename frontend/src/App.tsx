import { useState } from 'react'
import TaskList from './components/TaskList'
import InputBar from './components/InputBar'

const INITIAL_SECTIONS = [
  {
    category: 'URGENT',
    tasks: [
      { text: 'Follow up Bernard', priority: 'high' },
      { text: 'Review PR', priority: 'medium' },
    ],
  },
  {
    category: 'BLOCKER',
    tasks: [
      { text: 'Waiting on specs', priority: null },
    ],
  },
  {
    category: 'ISSUE',
    tasks: [
      { text: 'Latency spike', priority: null },
    ],
  },
  {
    category: 'PENDING',
    tasks: [
      { text: 'Sync with Paulyn', priority: null },
      { text: 'Decide infra vendor', priority: null },
    ],
  },
]

function App() {
  const [input, setInput] = useState('')

  function handleSubmit(value: string) {
    setInput('')
    // TODO: handle input
    console.log('submitted:', value)
  }

  return (
    <div className="app">
      <div className="panel">
        <div className="panel-header">Briefing</div>
        <div className="panel-divider" />
        <div className="panel-body">
          {INITIAL_SECTIONS.map((section) => (
            <TaskList
              key={section.category}
              category={section.category}
              tasks={section.tasks}
            />
          ))}
        </div>
        <div className="panel-divider" />
        <InputBar value={input} onChange={setInput} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}

export default App
