"use client";

import { useEffect, useRef } from "react";
import { SkillGroup } from "@/app/cv/lib/types";
import { useSortableList } from "@/app/cv/lib/useSortableList";

// ── Colour tokens ─────────────────────────────────────────────────────────────

const MUTED_ACCENT = "rgba(0,102,255,0.4)";
const MUTED_GLOW   = "rgba(0,102,255,0.04)";
const MUTED_DRAG   = "rgba(0,102,255,0.05)";
const MUTED_NUMBER = "rgba(0,102,255,0.45)";
const DRAG_BORDER  = "rgba(0,102,255,0.35)";

// ── Icons ─────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const GripDots = ({ size = 8 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 1.5)} viewBox="0 0 8 12" fill="none">
    {[0, 4, 8].map(y => (
      <g key={y}>
        <circle cx="2" cy={y + 2} r="1" fill="var(--text-3)" />
        <circle cx="6" cy={y + 2} r="1" fill="var(--text-3)" />
      </g>
    ))}
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function blank(): SkillGroup {
  return { id: `sk-${Date.now()}`, label: "", items: [] };
}

export const defaultSkillGroups: SkillGroup[] = [
  { id: "sk-languages",      label: "", items: [] },
  { id: "sk-technical",      label: "", items: [] },
  { id: "sk-soft",           label: "", items: [] },
  { id: "sk-certifications", label: "", items: [] },
  { id: "sk-interests",      label: "", items: [] },
];

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "sk-languages":      "Languages",
  "sk-technical":      "Technical Skills",
  "sk-soft":           "Soft Skills",
  "sk-certifications": "Certifications & Training",
  "sk-interests":      "Interests",
};

const ITEMS_PLACEHOLDERS: Record<string, string> = {
  "sk-languages":      "e.g. English (Fluent), Russian (Native)",
  "sk-technical":      "e.g. Python, Excel, Bloomberg Terminal, SQL",
  "sk-soft":           "e.g. Leadership, Communication, Teamwork",
  "sk-certifications": "e.g. J.P. Morgan – IB Job Simulation",
  "sk-interests":      "e.g. Trading and financial markets, Fintech",
};

const ORDERED_CATEGORY_FALLBACKS = [
  "Languages", "Technical Skills", "Soft Skills",
  "Certifications & Training", "Interests",
];
const ORDERED_ITEMS_FALLBACKS = [
  "e.g. English (Fluent), Russian (Native)",
  "e.g. Python, Excel, Bloomberg Terminal, SQL",
  "e.g. Leadership, Communication, Teamwork",
  "e.g. J.P. Morgan – IB Job Simulation",
  "e.g. Trading and financial markets, Fintech",
];

const normalizeLabel = (v: string): string => v.trim().replace(/:+$/, "").trim();

// ── GripStrip ─────────────────────────────────────────────────────────────────

function GripStrip({
  width,
  isActive,
  gripSize,
  onMouseDown,
  onClick,
}: {
  width:       number;
  isActive:    boolean;
  gripSize:    number;
  onMouseDown: () => void;
  onClick?:    (e: React.MouseEvent) => void;
}) {
  return (
    <div
      title="Drag to reorder"
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        cursor: "grab", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        width, alignSelf: "stretch", position: "relative",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = MUTED_DRAG; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <GripDots size={gripSize} />
      <svg
        style={{ position: "absolute", right: 0, top: 0, height: "100%", overflow: "visible" }}
        width="1" height="100%" preserveAspectRatio="none"
      >
        <line
          x1="0.5" y1="0" x2="0.5" y2="100%"
          stroke={isActive ? MUTED_ACCENT : "var(--border)"}
          strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round"
          style={{ transition: "stroke 0.15s" }}
        />
      </svg>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  data:     SkillGroup[];
  onChange: (d: SkillGroup[]) => void;
}

export default function SkillsSection({ data, onChange }: Props) {
  useEffect(() => {
    if (data.length === 0) onChange(defaultSkillGroups);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gripPressed = useRef(false);

  const { dragOver, onDragStart, onDragEnter, onDragEnd } = useSortableList(data, onChange);

  const add      = () => onChange([...data, blank()]);
  const del      = (id: string) => onChange(data.filter(s => s.id !== id));
  const updLabel = (id: string, v: string) =>
    onChange(data.map(s => s.id === id ? { ...s, label: v } : s));
  const updText  = (id: string, raw: string) => {
    const items = raw.split(",").map(s => s.trimStart());
    onChange(data.map(s => s.id === id ? { ...s, items } : s));
  };
  const toText   = (items: string[]) => items.join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((s, i) => {
        const isDragTarget = dragOver === i;
        const borderColor  = isDragTarget ? DRAG_BORDER : "var(--border)";

        return (
          <div
            key={s.id}
            draggable
            onDragStart={ev => {
              if (gripPressed.current) {
                gripPressed.current = false;
                onDragStart(i);
              } else {
                ev.preventDefault();
              }
            }}
            onDragEnter={() => onDragEnter(i)}
            onDragEnd={onDragEnd}
            onDragOver={ev => ev.preventDefault()}
            style={{
              display: "flex", alignItems: "stretch",
              borderRadius: 12, overflow: "hidden",
              border: `1.5px dashed ${borderColor}`,
              background: "var(--surface)",
              opacity: isDragTarget ? 0.45 : 1,
              transition: "all 0.15s",
            }}
          >
            <GripStrip
              width={28} isActive={false} gripSize={8}
              onMouseDown={() => { gripPressed.current = true; }}
            />

            <div style={{ flex: 1, padding: "14px 14px 14px 12px" }}>

              {/* Row: number + delete */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{
                  fontSize: 15, fontWeight: 800, lineHeight: 1,
                  fontFamily: "Syne", userSelect: "none",
                  color: "var(--text-3)", transition: "color 0.15s",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>

                {data.length > 1 && (
                  <button
                    onClick={() => del(s.id)}
                    style={{
                      width: 26, height: 26, borderRadius: 7,
                      border: "1.5px solid transparent", background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "var(--text-3)", transition: "all 0.12s",
                    }}
                    onMouseEnter={ev => {
                      ev.currentTarget.style.background  = "rgba(255,59,48,0.08)";
                      ev.currentTarget.style.borderColor = "rgba(255,59,48,0.18)";
                      ev.currentTarget.style.color       = "var(--red, #ff3b30)";
                    }}
                    onMouseLeave={ev => {
                      ev.currentTarget.style.background  = "transparent";
                      ev.currentTarget.style.borderColor = "transparent";
                      ev.currentTarget.style.color       = "var(--text-3)";
                    }}
                  >
                    <XIcon />
                  </button>
                )}
              </div>

              {/* Category input */}
              <div style={{ marginBottom: 10 }}>
                <label className="label">Category</label>
                <input
                  className="input"
                  value={s.label}
                  onChange={e => updLabel(s.id, e.target.value)}
                  onBlur={e  => updLabel(s.id, normalizeLabel(e.target.value))}
                  placeholder={
                    CATEGORY_PLACEHOLDERS[s.id] ??
                    ORDERED_CATEGORY_FALLBACKS[i] ??
                    "e.g. Category Name"
                  }
                />
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1.5px dashed var(--border)", margin: "0 0 10px" }} />

              {/* Items textarea */}
              <div>
                <label className="label">
                  Items{" "}
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, color: "var(--text-3)" }}>
                    — separate with commas
                  </span>
                </label>
                <textarea
                  className="input"
                  value={toText(s.items)}
                  onChange={e => updText(s.id, e.target.value)}
                  placeholder={
                    ITEMS_PLACEHOLDERS[s.id] ??
                    ORDERED_ITEMS_FALLBACKS[i] ??
                    "e.g. Python, Excel, Financial Modelling..."
                  }
                  style={{ resize: "vertical", minHeight: 72, lineHeight: 1.6 }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={add}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "11px 0", borderRadius: 12,
          border: "1.5px dashed var(--border-strong)",
          background: "transparent", color: "var(--text-3)",
          fontSize: 13, fontWeight: 500, fontFamily: "inherit",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = MUTED_ACCENT;
          e.currentTarget.style.color       = MUTED_ACCENT;
          e.currentTarget.style.background  = MUTED_GLOW;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.color       = "var(--text-3)";
          e.currentTarget.style.background  = "transparent";
        }}
      >
        <PlusIcon /> Add Skill Group
      </button>
    </div>
  );
}
