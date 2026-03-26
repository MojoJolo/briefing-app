export default function InputBar({ value, onChange, onSubmit }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className="input-bar">
      <span className="input-prompt">&gt;</span>
      <input
        className="input-field"
        type="text"
        placeholder="Type anything..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    </div>
  )
}
