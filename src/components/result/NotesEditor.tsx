interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesEditor({ value, onChange }: NotesEditorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="session-notes" className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Personal notes
      </label>
      <textarea
        id="session-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What did this session feel like? Anything you want to remember for next time?"
        rows={4}
        className="w-full rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
      />
    </div>
  );
}
