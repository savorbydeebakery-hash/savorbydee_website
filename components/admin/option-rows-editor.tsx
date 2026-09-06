"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { OptionRowDraft } from "@/lib/admin/option-rows";

/**
 * The editor that replaced the JSON textareas.
 *
 * Rows hold raw text, not numbers, and nothing is rejected while it is being
 * typed. That is the point: the old control parsed on every keystroke and
 * discarded anything that did not parse, and because React restores a
 * controlled input's value after a change event, the box could not be typed
 * into at all. Anything that validates mid-keystroke has the same failure
 * waiting in it, so the conversion to numbers happens once, on save.
 */
export interface OptionRowsEditorProps {
  label: string;
  hint?: string;
  rows: OptionRowDraft[];
  onChange: (rows: OptionRowDraft[]) => void;
  /** Column heading for the number, e.g. "Price (₹)" or "Extra (₹)". */
  amountLabel: string;
  /** Placeholder for the label box, e.g. "1 kg" or "Candles". */
  labelPlaceholder: string;
  /** Add-ons get an on/off switch; the other lists do not. */
  withActive?: boolean;
  /** Multipliers are a bare number, not money. */
  amountStep?: string;
}

export function OptionRowsEditor({
  label,
  hint,
  rows,
  onChange,
  amountLabel,
  labelPlaceholder,
  withActive = false,
  amountStep = "0.01",
}: OptionRowsEditorProps) {
  const update = (index: number, patch: Partial<OptionRowDraft>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...rows, { label: "", amount: "", ...(withActive ? { isActive: true } : {}) }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const cell =
    "rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20 transition-colors";

  return (
    <div className="flex flex-col gap-2" data-option-group={label}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {/* Named after the list so a test — and a screen reader — can tell five
            "Add" buttons apart. */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addRow}
          aria-label={`Add a row to ${label}`}
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/15 px-3 py-3 text-xs text-ink-faint">
          None. Customers see no choice here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="grid gap-2 text-xs uppercase tracking-wide text-ink-faint"
            style={{ gridTemplateColumns: withActive ? "1fr 8rem 5rem 2.5rem" : "1fr 8rem 2.5rem" }}
          >
            <span>Name</span>
            <span>{amountLabel}</span>
            {withActive && <span>Shown</span>}
            <span className="sr-only">Remove</span>
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: withActive ? "1fr 8rem 5rem 2.5rem" : "1fr 8rem 2.5rem",
              }}
            >
              <input
                className={cell}
                value={row.label}
                placeholder={labelPlaceholder}
                aria-label={`${label} name, row ${i + 1}`}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <input
                className={`${cell} tabular-nums`}
                type="number"
                step={amountStep}
                value={row.amount}
                placeholder="0"
                aria-label={`${label} ${amountLabel}, row ${i + 1}`}
                onChange={(e) => update(i, { amount: e.target.value })}
              />
              {withActive && (
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={row.isActive !== false}
                    onChange={(e) => update(i, { isActive: e.target.checked })}
                  />
                  On
                </label>
              )}
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`Remove ${row.label.trim() || `row ${i + 1}`}`}
                className="justify-self-center rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
