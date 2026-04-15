"use client";
import { PersonalInfo } from "@/app/cv/lib/types";

interface Props { data: PersonalInfo; onChange: (d: PersonalInfo) => void; }

// Strip URL to just handle on blur
function toHandle(val: string): string {
  return val
    .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

export default function PersonalSection({ data, onChange }: Props) {
  const set = (k: keyof PersonalInfo, v: string) => onChange({ ...data, [k]: v });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="label">Full Name</label>
        <input className="input" spellCheck="true" value={data.name} onChange={e => set("name", e.target.value)} placeholder="Alex Carter" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={data.email} onChange={e => set("email", e.target.value)} placeholder="alex@example.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="+44 7700 555555" />
        </div>
        <div>
          <label className="label">LinkedIn</label>
          <input
            className="input"
            spellCheck="true"
            value={data.linkedin}
            onChange={e => set("linkedin", e.target.value)}
            onBlur={e => set("linkedin", toHandle(e.target.value))}
            placeholder="alex-carter or full URL"
          />
          {data.linkedin && (
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>
              linkedin.com/in/<span style={{ color: "var(--accent)" }}>{toHandle(data.linkedin)}</span>
            </div>
          )}
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" spellCheck="true" value={data.address} onChange={e => set("address", e.target.value)} placeholder="England, Bath, BA2 7AY" />
        </div>
      </div>
    </div>
  );
}
