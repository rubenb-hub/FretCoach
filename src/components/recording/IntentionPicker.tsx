import { PRACTICE_INTENTIONS, type PracticeIntention } from "@/lib/types";

interface IntentionPickerProps {
  value: PracticeIntention | null;
  onChange: (value: PracticeIntention | null) => void;
}

export function IntentionPicker({ value, onChange }: IntentionPickerProps) {
  return (
    <div role="group" aria-label="Practice intention" className="flex flex-wrap gap-2">
      {PRACTICE_INTENTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={`min-h-[40px] rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface-muted text-foreground-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
