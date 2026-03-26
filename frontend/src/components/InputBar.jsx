export default function InputBar({ value, onChange, onSubmit }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault()
      onSubmit(value.trim())
    }
  }

  return (
    <div className="input-bar">
      <span className="input-prompt">&gt;</span>
      <textarea
        className="input-field"
        rows={5}
        placeholder="Type anything..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    </div>
  )
}
