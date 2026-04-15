"use client";

import { useState, useRef } from "react";
import { EducationEntry } from "@/app/cv/lib/types";
import { useSortableList } from "@/app/cv/lib/useSortableList";

// ── Colour tokens ─────────────────────────────────────────────────────────────

const MUTED_ACCENT  = "rgba(0,102,255,0.4)";
const MUTED_GLOW    = "rgba(0,102,255,0.04)";
const MUTED_DRAG    = "rgba(0,102,255,0.05)";
const MUTED_NUMBER  = "rgba(0,102,255,0.45)";
const MUTED_CHEVRON = "rgba(0,102,255,0.5)";
const DRAG_BORDER   = "rgba(0,102,255,0.35)";

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);
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

function blank(): EducationEntry {
  return {
    id:          `edu-${Date.now()}`,
    institution: "",
    location:    "",
    degree:      "",
    periodStart: "",
    periodEnd:   "",
    bullets:     ["", ""],
  };
}

const autoPeriod = (v: string): string => {
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : t + ".";
};

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

// ── BulletList ────────────────────────────────────────────────────────────────

interface BulletListProps {
  entryId:         string;
  bullets:         string[];
  onBulletsChange: (id: string, bullets: string[]) => void;
}

function BulletList({ entryId, bullets, onBulletsChange }: BulletListProps) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  // true only when the last mousedown was on THIS list's grip strip
  const gripPressed = useRef(false);

  const { dragOver, onDragStart, onDragEnter, onDragEnd } = useSortableList(
    bullets,
    (reordered) => onBulletsChange(entryId, reordered),
  );

  const upd  = (i: number, v: string) => {
    const next = [...bullets]; next[i] = v;
    onBulletsChange(entryId, next);
  };
  const blur = (i: number, v: string) => {
    setFocusedIdx(null);
    const next = [...bullets]; next[i] = autoPeriod(v);
    onBulletsChange(entryId, next);
  };
  const del  = (i: number) =>
    onBulletsChange(entryId, bullets.filter((_, j) => j !== i));

  return (
    <div>
      <label className="label" style={{ display: "block", marginBottom: 7 }}>
        Bullet Points
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {bullets.map((b, bi) => {
          const isFocused    = focusedIdx === bi;
          const isDragTarget = dragOver === bi;

          const borderColor = isDragTarget
            ? DRAG_BORDER
            : isFocused
              ? MUTED_ACCENT
              : "var(--border)";

          return (
            <div
              key={bi}
              draggable
              onDragStart={ev => {
  ev.stopPropagation(); // ← stop the card from seeing this drag
  if (gripPressed.current) {
    gripPressed.current = false;
    onDragStart(bi);
  } else {
    ev.preventDefault();
  }
}}
              onDragEnter={() => onDragEnter(bi)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{
                display: "flex", alignItems: "center", gap: 0,
                borderRadius: 9,
                border: `1.5px dashed ${borderColor}`,
                background: isDragTarget
                  ? MUTED_DRAG
                  : isFocused
                    ? MUTED_GLOW
                    : "var(--surface)",
                opacity: isDragTarget ? 0.45 : 1,
                transition: "background 0.15s, border-color 0.15s",
                boxShadow: isFocused ? "0 1px 6px rgba(0,102,255,0.04)" : "none",
              }}
            >
              <GripStrip
                width={24} isActive={isFocused} gripSize={6}
                onMouseDown={() => { gripPressed.current = true; }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "7px 8px 7px 10px" }}>
                <span style={{
                  fontSize: 13, fontWeight: 800, lineHeight: 1,
                  fontFamily: "Syne", flexShrink: 0, minWidth: 18,
                  textAlign: "center", userSelect: "none",
                  color: isFocused ? MUTED_NUMBER : "var(--text-3)",
                  transition: "color 0.15s",
                }}>
                  {bi + 1}
                </span>

                <input
                  value={b}
                  spellCheck="true"
                  onChange={ev => upd(bi, ev.target.value)}
                  onFocus={() => setFocusedIdx(bi)}
                  onBlur={ev => blur(bi, ev.target.value)}
                  placeholder={
                    bi === 0 ? "Grade: First Class Honours"
                    : bi === 1 ? "Activities and Societies: …"
                    : `Bullet ${bi + 1}…`
                  }
                  style={{
                    flex: 1, background: "transparent",
                    border: "none", outline: "none", boxShadow: "none",
                    padding: "3px 0 3px 4px",
                    fontSize: 13, color: "var(--text)", fontFamily: "inherit",
                  }}
                />

                {bullets.length > 1 && (
                  <button
                    onClick={() => del(bi)}
                    style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 5,
                      border: "1.5px solid transparent", background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "var(--text-3)",
                      opacity: isFocused ? 1 : 0.4,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background  = "rgba(255,59,48,0.08)";
                      e.currentTarget.style.borderColor = "rgba(255,59,48,0.18)";
                      e.currentTarget.style.color       = "var(--red, #ff3b30)";
                      e.currentTarget.style.opacity     = "1";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background  = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.color       = "var(--text-3)";
                      e.currentTarget.style.opacity     = isFocused ? "1" : "0.4";
                    }}
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onBulletsChange(entryId, [...bullets, ""])}
        style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 500, fontFamily: "inherit",
          color: "var(--text-3)", cursor: "pointer",
          background: "none", border: "none", padding: "3px 0",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = MUTED_ACCENT; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; }}
      >
        <PlusIcon /> Add bullet
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  data:     EducationEntry[];
  onChange: (d: EducationEntry[]) => void;
}

export default function EducationSection({ data, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(data[0]?.id ?? null);
  // true only when the last mousedown was on an entry card's grip strip
  const gripPressed = useRef(false);

  const { dragOver, onDragStart, onDragEnter, onDragEnd } = useSortableList(data, onChange);

  const add  = () => { const e = blank(); onChange([...data, e]); setOpen(e.id); };
  const del  = (id: string) => onChange(data.filter(e => e.id !== id));
  const upd  = (id: string, k: keyof EducationEntry, v: string) =>
    onChange(data.map(e => e.id === id ? { ...e, [k]: v } : e));
  const onBulletsChange = (id: string, bullets: string[]) =>
    onChange(data.map(e => e.id === id ? { ...e, bullets } : e));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((e, i) => {
        const isOpen       = open === e.id;
        const isDragTarget = dragOver === i;

        const entryBorderColor = isDragTarget
          ? DRAG_BORDER
          : isOpen
            ? MUTED_ACCENT
            : "var(--border)";

        return (
          <div
            key={e.id}
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
              borderRadius: 12, overflow: "hidden",
              border: `1.5px dashed ${entryBorderColor}`,
              background: "var(--surface)",
              opacity: isDragTarget ? 0.45 : 1,
              boxShadow: isOpen ? "0 2px 12px rgba(0,102,255,0.05)" : "none",
              transition: "all 0.15s",
            }}
          >
            {/* ── Header ── */}
            <div
              onClick={() => setOpen(isOpen ? null : e.id)}
              style={{
                display: "flex", alignItems: "center", gap: 0,
                cursor: "pointer",
                background: isOpen ? MUTED_GLOW : "transparent",
                borderBottom: isOpen ? "1.5px dashed var(--border)" : "none",
                transition: "background 0.15s",
                userSelect: "none",
              }}
            >
              <GripStrip
                width={28} isActive={isOpen} gripSize={8}
                onMouseDown={() => { gripPressed.current = true; }}
                onClick={ev => ev.stopPropagation()}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, padding: "11px 14px" }}>

                <span style={{
                  fontSize: 15, fontWeight: 800, lineHeight: 1,
                  fontFamily: "Syne", flexShrink: 0, minWidth: 22,
                  textAlign: "center", userSelect: "none",
                  color: isOpen ? MUTED_NUMBER : "var(--text-3)",
                  transition: "color 0.15s",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {e.institution
                      ? e.institution
                      : <span style={{ color: "var(--text-3)", fontWeight: 400, fontStyle: "italic" }}>New entry…</span>
                    }
                  </div>
                  {(e.degree || e.periodStart || e.periodEnd) && (
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      {e.degree && <span>{e.degree}</span>}
                      {e.degree && (e.periodStart || e.periodEnd) && (
                        <span style={{ margin: "0 5px", opacity: 0.3 }}>·</span>
                      )}
                      {(e.periodStart || e.periodEnd) && (
                        <span>{e.periodStart}{e.periodEnd ? ` – ${e.periodEnd}` : ""}</span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={ev => { ev.stopPropagation(); del(e.id); }}
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: 7,
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

                <div style={{
                  transition: "transform 0.2s, color 0.15s",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  flexShrink: 0,
                  color: isOpen ? MUTED_CHEVRON : "var(--text-3)",
                }}>
                  <ChevronDown />
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            {isOpen && (
              <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="label">University</label>
                    <input className="input" spellCheck="true" value={e.institution}
                      onChange={ev => upd(e.id, "institution", ev.target.value)}
                      placeholder="University of Bath" />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" spellCheck="true" value={e.location}
                      onChange={ev => upd(e.id, "location", ev.target.value)}
                      placeholder="Bath, United Kingdom" />
                  </div>
                </div>

                <div>
                  <label className="label">Degree / Programme</label>
                  <input className="input" spellCheck="true" value={e.degree}
                    onChange={ev => upd(e.id, "degree", ev.target.value)}
                    placeholder="BSc Business and Finance" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="label">Start Date</label>
                    <input className="input" value={e.periodStart}
                      onChange={ev => upd(e.id, "periodStart", ev.target.value)}
                      placeholder="Sep 2023" />
                  </div>
                  <div>
                    <label className="label">End Date</label>
                    <input className="input" value={e.periodEnd}
                      onChange={ev => upd(e.id, "periodEnd", ev.target.value)}
                      placeholder="Jun 2026 or Present" />
                  </div>
                </div>

                <div style={{ borderTop: "1.5px dashed var(--border)", margin: "2px 0" }} />

                <BulletList
                  entryId={e.id}
                  bullets={e.bullets}
                  onBulletsChange={onBulletsChange}
                />
              </div>
            )}
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
        <PlusIcon /> Add Education
      </button>
    </div>
  );
}
