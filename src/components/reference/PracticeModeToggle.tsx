import type { PracticeMode } from "@/lib/types";

interface PracticeModeToggleProps {
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

const OPTIONS: { value: PracticeMode; label: string; description: string }[] = [
  {
    value: "free",
    label: "Free Practice",
    description: "No expected material — the app only describes what it measured.",
  },
  {
    value: "reference",
    label: "Reference Practice",
    description: "You supply expected chords/notes to approximately compare against.",
  },
];

export function PracticeModeToggle({ value, onChange }: PracticeModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Practice mode" className="flex flex-col gap-2">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-col gap-0.5 rounded-2xl border p-3 text-left ${
              selected ? "border-primary bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs text-foreground-muted">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
