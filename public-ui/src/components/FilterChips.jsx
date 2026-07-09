export default function FilterChips({ chips, active, onChange }) {
  if (!chips || !chips.length) return null;
  return (
    <div className="filter-bar">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`filter-chip${active === c.key ? ' is-active' : ''}`}
          onClick={() => onChange(c.key)}
        >
          {c.key} ({c.count})
        </button>
      ))}
    </div>
  );
}
