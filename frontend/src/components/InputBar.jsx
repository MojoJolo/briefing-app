export default function InputBar({ value, onChange, onSubmit }) {
  function handleSubmit() {
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className="input-bar">
      <textarea
        className="input-field"
        rows={4}
        placeholder="What's on your mind..."
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus
      />
      <div className="input-footer">
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!value.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
