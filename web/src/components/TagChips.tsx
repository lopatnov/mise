/** Known tags as toggle chips over the comma-separated tag input of the recipe form. */
export default function TagChips({
  allTags,
  value,
  onChange,
}: {
  allTags: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const toggle = (tag: string) => {
    const next = selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag];
    onChange(next.join(', '));
  };

  return (
    <div className="tag-chips">
      {allTags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`tag tag--btn tag--large${active ? ' tag--active' : ''}`}
            aria-pressed={active}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
