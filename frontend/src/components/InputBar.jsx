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
        rows={5}
        placeholder="Type anything..."
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus
      />
      <button
        className="submit-button"
        onClick={handleSubmit}
        disabled={!value.trim()}
      >
        Submit
      </button>
    </div>
  )
}
