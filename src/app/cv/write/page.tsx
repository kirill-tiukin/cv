"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CVData } from "@/app/cv/lib/types";
import { defaultCVData } from "@/app/cv/lib/defaults";
import { generateLaTeX } from "@/app/cv/lib/latex";
import PersonalSection from "@/app/cv/components/PersonalSection";
import EducationSection from "@/app/cv/components/EducationSection";
import ExperienceSection from "@/app/cv/components/ExperienceSection";
import ProjectsSection from "@/app/cv/components/ProjectsSection";
import SkillsSection from "@/app/cv/components/SkillsSection";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "personal" | "education" | "experience" | "projects" | "skills";
type ImportState = "idle" | "reading" | "parsing" | "done" | "error";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "personal",   label: "Personal",   desc: "Your contact details at the top of the CV" },
  { id: "education",  label: "Education",  desc: "Universities and academic achievements" },
  { id: "experience", label: "Experience", desc: "Work history, internships, and employment" },
  { id: "projects",   label: "Activities", desc: "Societies, clubs, and extracurricular activities" },
  { id: "skills",     label: "Skills",     desc: "Languages, tools, certifications, and interests" },
];

// ── Sanitizer ─────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function sanitizeCVData(raw: unknown): CVData {
  const d = (raw ?? {}) as Record<string, unknown>;
  const personal = (d.personal ?? {}) as Record<string, unknown>;

  return {
    personal: {
      name:     str(personal.name),
      email:    str(personal.email),
      phone:    str(personal.phone),
      address:  str(personal.location) || str(personal.address),
      website:  str(personal.website),
      linkedin: str(personal.linkedin),
      github:   str(personal.github),
      summary:  str(personal.summary),
    },
    education: Array.isArray(d.education)
      ? d.education.map((e: Record<string, unknown>, i: number) => ({
          id:          str(e.id) || `e${i + 1}`,
          institution: str(e.institution),
          degree:      str(e.degree),
          field:       str(e.field),
          startDate:   str(e.startDate),
          endDate:     str(e.endDate),
          periodStart: str(e.periodStart) || str(e.startDate),
          periodEnd:   str(e.periodEnd)   || str(e.endDate),
          grade:       str(e.grade),
          location:    str(e.location),
          bullets: Array.isArray(e.bullets)
            ? e.bullets.map(str)
            : Array.isArray(e.achievements)
              ? (e.achievements as unknown[]).map(str)
              : [],
        }))
      : [],
    experience: Array.isArray(d.experience)
      ? d.experience.map((e: Record<string, unknown>, i: number) => ({
          id:          str(e.id) || `exp${i + 1}`,
          company:     str(e.company),
          role:        str(e.role),
          startDate:   str(e.startDate),
          endDate:     str(e.endDate),
          periodStart: str(e.periodStart) || str(e.startDate),
          periodEnd:   str(e.periodEnd)   || str(e.endDate),
          location:    str(e.location),
          bullets:     Array.isArray(e.bullets) ? e.bullets.map(str) : [],
        }))
      : [],
    projects: Array.isArray(d.projects)
      ? d.projects.map((e: Record<string, unknown>, i: number) => ({
          id:          str(e.id) || `p${i + 1}`,
          title:       str(e.title) || str(e.name),
          name:        str(e.name)  || str(e.title),
          role:        str(e.role),
          startDate:   str(e.startDate),
          endDate:     str(e.endDate),
          periodStart: str(e.periodStart) || str(e.startDate),
          periodEnd:   str(e.periodEnd)   || str(e.endDate),
          location:    str(e.location),
          bullets:     Array.isArray(e.bullets) ? e.bullets.map(str) : [],
        }))
      : [],
    skills: Array.isArray(d.skills)
      ? d.skills.map((e: Record<string, unknown>, i: number) => ({
          id:    str(e.id) || `s${i + 1}`,
          label: str(e.label),
          items: Array.isArray(e.items) ? e.items.map(str) : [],
        }))
      : [],
    sectionLabels: {
      education: str((d.sectionLabels as Record<string, unknown>)?.education) || "Education",
      experience: str((d.sectionLabels as Record<string, unknown>)?.experience) || "Experience",
      projects: str((d.sectionLabels as Record<string, unknown>)?.projects) || "Extracurricular Activities",
      skills: str((d.sectionLabels as Record<string, unknown>)?.skills) || "Skills & Interests",
    },
  };
}

// ── Guards ────────────────────────────────────────────────────────────────────

function hasContent(data: CVData): boolean {
  return (
    Object.values(data.personal).some(v => typeof v === "string" && v.trim() !== "") ||
    data.education.length > 0 ||
    data.experience.length > 0 ||
    data.projects.length > 0 ||
    data.skills.some(s => s.label.trim() !== "" || s.items.length > 0)
  );
}

function makeGuardedSetter<K extends keyof CVData>(key: K) {
  return (setCVData: React.Dispatch<React.SetStateAction<CVData>>) =>
    (d: CVData[K]) => {
      setCVData(prev => {
        if (JSON.stringify(prev[key]) === JSON.stringify(d)) return prev;
        return { ...prev, [key]: d };
      });
    };
}

const guardedPersonal   = makeGuardedSetter("personal");
const guardedEducation  = makeGuardedSetter("education");
const guardedExperience = makeGuardedSetter("experience");
const guardedProjects   = makeGuardedSetter("projects");
const guardedSkills     = makeGuardedSetter("skills");

// ── File helpers ──────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function parseResumeViaAPI(file: File): Promise<CVData> {
  const base64 = await fileToBase64(file);
  const isPdf  = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const mediaType = isPdf
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const response = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mediaType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string })?.error || `API error ${response.status}`);
  }

  const { data } = await response.json();
  return sanitizeCVData(data);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [cvData, setCVData]           = useState<CVData>(defaultCVData);
  const [tab, setTab]                 = useState<Tab>("personal");
  const [pdfUrl, setPdfUrl]           = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileErr, setCompileErr]   = useState<string | null>(null);
  const [mobileView, setMobileView]   = useState<"form" | "preview">("form");
  const [editingSectionLabel, setEditingSectionLabel] = useState<Tab | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPdfUrl  = useRef<string | null>(null);

  const [importState,    setImportState]    = useState<ImportState>("idle");
  const [importError,    setImportError]    = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const tabIdx  = TABS.findIndex(t => t.id === tab);
  const canPrev = tabIdx > 0;
  const canNext = tabIdx < TABS.length - 1;

  const goNext = useCallback(() =>
    setTab(t => {
      const i = TABS.findIndex(x => x.id === t);
      return i < TABS.length - 1 ? TABS[i + 1].id : t;
    }), []);

  const goPrev = useCallback(() =>
    setTab(t => {
      const i = TABS.findIndex(x => x.id === t);
      return i > 0 ? TABS[i - 1].id : t;
    }), []);

  // ── Compile ──
  const compile = useCallback(async (data: CVData) => {
    setIsCompiling(true);
    setCompileErr(null);
    try {
      const latex = generateLaTeX(data);
      const res   = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setCompileErr(json.message || json.error || "Compilation failed");
        return;
      }
      const bytes = atob(json.pdf);
      const arr   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
      prevPdfUrl.current = url;
      setPdfUrl(url);
    } catch (e: unknown) {
      setCompileErr((e as Error).message || "Network error");
    } finally {
      setIsCompiling(false);
    }
  }, []);

  useEffect(() => {
    if (!hasContent(cvData)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compile(cvData), 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [cvData, compile]);

  const download = useCallback(() => {
    if (!pdfUrl) return;
    const a    = document.createElement("a");
    a.href     = pdfUrl;
    a.download = `${(cvData.personal.name || "cv").replace(/\s+/g, "_")}_CV.pdf`;
    a.click();
  }, [pdfUrl, cvData.personal.name]);

  // ── Resume autofill ──
  const handleResumeFile = useCallback(async (file: File) => {
    const isPdf  = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      setImportError("Please upload a PDF or DOCX file.");
      setImportState("error");
      return;
    }

    setImportFileName(file.name);
    setImportError(null);
    setImportState("reading");

    try {
      setImportState("parsing");
      const parsed = await parseResumeViaAPI(file);
      setCVData(parsed);
      setImportState("done");
      setTab("personal");
    } catch (e: unknown) {
      setImportError((e as Error).message || "Failed to parse resume");
      setImportState("error");
    }
  }, []);

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeFile(file);
    e.target.value = "";
  }, [handleResumeFile]);

const onDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  // Only show the resume overlay for real file drags, not internal reordering
  if (Array.from(e.dataTransfer.types).includes("Files")) {
    setIsDragging(true);
  }
}, []);

const onDragLeave = useCallback((e: React.DragEvent) => {
  // Only clear if leaving the container entirely (not just crossing child elements)
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    setIsDragging(false);
  }
}, []);

const onDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  // Only handle drops that actually contain files
  const file = e.dataTransfer.files?.[0];
  if (file) handleResumeFile(file);
}, [handleResumeFile]);

  // ── Stable setters ──
  const onPersonalChange   = useCallback(guardedPersonal(setCVData),   [setCVData]);
  const onEducationChange  = useCallback(guardedEducation(setCVData),  [setCVData]);
  const onExperienceChange = useCallback(guardedExperience(setCVData), [setCVData]);
  const onProjectsChange   = useCallback(guardedProjects(setCVData),   [setCVData]);
  const onSkillsChange     = useCallback(guardedSkills(setCVData),     [setCVData]);

  const updateSectionLabel = useCallback((tabId: Exclude<Tab, "personal">, newLabel: string) => {
    setCVData(prev => ({
      ...prev,
      sectionLabels: {
        ...prev.sectionLabels,
        [tabId]: newLabel,
      },
    }));
    setEditingSectionLabel(null);
  }, []);

  const isImporting  = importState === "reading" || importState === "parsing";
  const fileImported = importState === "done" && !!importFileName;
  const currentTab   = TABS[tabIdx];

  // ── Import card ──
  const ImportCard = () => (
    <div style={{ marginBottom: 20 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: "none" }}
        onChange={onFileInputChange}
      />

      {isImporting ? (
        <div style={{
          border: "1.5px solid var(--accent)", borderRadius: 12,
          padding: "16px 18px", background: "var(--accent-glow)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div className="spinner" style={{ width: 20, height: 20, flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "Syne", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
              {importState === "reading" ? "Reading file…" : "Extracting with AI…"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {importFileName && <strong style={{ color: "var(--text-2)" }}>{importFileName}</strong>}
              {" · "}AI not always accurate
            </p>
          </div>
        </div>

      ) : fileImported ? (
        <div style={{
          border: "1.5px solid var(--green, #22c55e)", borderRadius: 12,
          padding: "14px 18px", background: "rgba(34,197,94,0.06)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green,#22c55e)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "Syne", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Resume imported</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {importFileName}
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "6px 12px",
              borderRadius: 8, border: "1.5px solid var(--border)",
              background: "var(--surface)", color: "var(--text-2)", cursor: "pointer",
            }}
          >
            Change
          </button>
        </div>

      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--border-strong)", borderRadius: 12,
            padding: "18px 18px", cursor: "pointer",
            background: "var(--surface)", display: "flex", alignItems: "center", gap: 14,
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLDivElement).style.background  = "var(--accent-glow)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
            (e.currentTarget as HTMLDivElement).style.background  = "var(--surface)";
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-2)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: "Syne", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Import existing resume</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Upload a PDF or DOCX — AI will autofill all sections instantly</p>
          </div>
        </div>
      )}

      {importState === "error" && importError && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(255,59,48,0.07)", border: "1.5px solid rgba(255,59,48,0.15)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500, flex: 1 }}>{importError}</span>
          <button onClick={() => setImportState("idle")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <>
      {tab === "personal"   && <><ImportCard /><PersonalSection   data={cvData.personal}   onChange={onPersonalChange} /></>}
      {tab === "education"  && <EducationSection  data={cvData.education}  onChange={onEducationChange} />}
      {tab === "experience" && <ExperienceSection data={cvData.experience} onChange={onExperienceChange} />}
      {tab === "projects"   && <ProjectsSection   data={cvData.projects}   onChange={onProjectsChange} />}
      {tab === "skills"     && <SkillsSection     data={cvData.skills}     onChange={onSkillsChange} />}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 54, flexShrink: 0,
        background: "var(--surface)", borderBottom: "1.5px solid var(--border)", gap: 12,
        position: "relative",
      }}>

        {/* LEFT — back button */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => window.history.back()}
            title="Go back"
            style={{
              width: 30, height: 30, borderRadius: 9,
              background: "var(--surface-2)", border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-glow)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        {/* CENTRE — title, absolutely centred */}
        <span
          className="hidden-mobile"
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            fontFamily: "Syne", fontSize: 15, fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text)",
            pointerEvents: "none", userSelect: "none",
          }}
        >
          CV Builder
        </span>

        {/* RIGHT — mobile preview/edit toggle only */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-ghost show-mobile"
            onClick={() => setMobileView(v => v === "form" ? "preview" : "form")}
            style={{ fontSize: 13, padding: "7px 12px" }}
          >
            {mobileView === "form" ? "Preview" : "Edit"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div
        style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Drag-and-drop overlay */}
        {isDragging && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 100,
            background: "rgba(0,102,255,0.05)", border: "2.5px dashed var(--accent)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            pointerEvents: "none",
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-glow)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              </svg>
            </div>
            <p style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>Drop your resume to autofill</p>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>PDF or DOCX supported</p>
          </div>
        )}

        {/* AI parsing full-screen overlay */}
        {isImporting && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 50,
            background: "rgba(247,246,243,0.9)", backdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-glow)", border: "1.5px solid rgba(0,102,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="spinner" style={{ width: 26, height: 26, borderWidth: 2.5 }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                {importState === "reading" ? "Reading your resume…" : "Extracting with AI…"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 5 }}>
                {importFileName && <><strong style={{ color: "var(--text-2)" }}>{importFileName}</strong> · </>}
                AI not always accurate
              </p>
            </div>
          </div>
        )}

        {/* ── LEFT: form ── */}
        <div
          className="form-panel"
          style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1.5px solid var(--border)", overflow: "hidden" }}
        >
          {/* Tab bar */}
          <div style={{ padding: "10px 16px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 10, padding: 3, gap: 2 }}>
              {TABS.map(t => {
                const label = t.id === "personal" ? t.label : cvData.sectionLabels[t.id as keyof typeof cvData.sectionLabels];
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 8, border: "none",
                      background: tab === t.id ? "var(--surface)" : "transparent",
                      boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      fontFamily: "Syne", fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
                      color: tab === t.id ? "var(--text)" : "var(--text-3)",
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section title */}
          <div style={{ padding: "16px 20px 10px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {editingSectionLabel === tab && tab !== "personal" ? (
                    <input
                      autoFocus
                      type="text"
                      value={cvData.sectionLabels[tab as keyof typeof cvData.sectionLabels]}
                      onChange={e => {
                        setCVData(prev => ({
                          ...prev,
                          sectionLabels: {
                            ...prev.sectionLabels,
                            [tab]: e.target.value,
                          },
                        }));
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          updateSectionLabel(tab as Exclude<Tab, "personal">, cvData.sectionLabels[tab as Exclude<Tab, "personal">]);
                        } else if (e.key === "Escape") {
                          setEditingSectionLabel(null);
                        }
                      }}
                      onBlur={() => updateSectionLabel(tab as Exclude<Tab, "personal">, cvData.sectionLabels[tab as Exclude<Tab, "personal">])}
                      style={{
                        fontFamily: "Syne",
                        fontSize: 18,
                        fontWeight: 800,
                        color: "var(--text)",
                        letterSpacing: "-0.02em",
                        border: "1.5px solid var(--accent)",
                        borderRadius: 8,
                        padding: "6px 10px",
                        background: "var(--surface)",
                        flex: 1,
                      }}
                    />
                  ) : (
                    <h2 style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", margin: 0, flex: 1 }}>
                      {tab === "personal" ? currentTab.label : cvData.sectionLabels[tab as keyof typeof cvData.sectionLabels]}
                    </h2>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3, margin: 0 }}>{currentTab.desc}</p>
              </div>
              {tab !== "personal" && (
                <button
                  onClick={() => setEditingSectionLabel(tab === editingSectionLabel ? null : tab)}
                  title="Edit section name"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1.5px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-glow)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2.5">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable form area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 24px" }}>
            {renderForm()}
          </div>

          {/* ── Bottom nav ── */}
          <div style={{ padding: "12px 20px", borderTop: "1.5px solid var(--border)", flexShrink: 0, display: "flex", gap: 8 }}>
            {canPrev && (
              <button
                onClick={goPrev}
                className="btn-ghost"
                style={{ flex: "0 0 20%", justifyContent: "center", fontSize: 14, padding: "12px 0" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
            )}

            {canNext ? (
              <button
                onClick={goNext}
                className="btn-primary"
                style={{ flex: 1, justifyContent: "center", fontSize: 14, padding: "12px 0" }}
              >
                Continue to {TABS[tabIdx + 1].label}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            ) : (
              <button
                onClick={download}
                disabled={!pdfUrl}
                className="btn-primary"
                style={{ flex: 1, justifyContent: "center", fontSize: 14, padding: "12px 0", opacity: pdfUrl ? 1 : 0.4 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: PDF preview ── */}
        <div
          className="preview-panel"
          style={{ width: "50%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#525659", position: "relative" }}
        >
          {/* macOS title bar */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "0 14px", height: 38,
            background: "#2b2b2b",
            borderBottom: "1px solid #1a1a1a",
            flexShrink: 0,
            position: "relative",
          }}>
            {/* Traffic lights */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, zIndex: 1 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", border: "0.5px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
            </div>

            {/* Centred title */}
            <span style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)",
              fontFamily: "Syne", fontSize: 11, fontWeight: 700,
              color: "rgba(255,255,255,0.38)", letterSpacing: "0.07em",
              textTransform: "uppercase", pointerEvents: "none", userSelect: "none",
            }}>
              Live Preview
            </span>

            {/* Compile status */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
              {isCompiling && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="spinner" style={{ width: 11, height: 11, borderColor: "rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.55)" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Compiling…</span>
                </div>
              )}
              {compileErr && <span style={{ fontSize: 10, color: "#ff7070" }}>⚠ Error</span>}
            </div>
          </div>

          {/* PDF iframe or placeholder */}
          {pdfUrl ? (
            <iframe
              key={pdfUrl}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitV`}
              style={{ flex: 1, border: "none", width: "100%", height: "100%", display: "block" }}
              title="CV Preview"
            />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40 }}>
              {isCompiling ? (
                <>
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.5)" }} />
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Compiling your CV…</p>
                </>
              ) : compileErr ? (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,59,48,0.1)", border: "1.5px solid rgba(255,59,48,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,80,0.8)" strokeWidth="2">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                  </div>
                  <p style={{ color: "rgba(255,100,80,0.8)", fontSize: 13, fontWeight: 600 }}>Compilation error</p>
                  <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 12, maxWidth: 260, textAlign: "center" }}>{compileErr}</p>
                </>
              ) : (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                    </svg>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, fontWeight: 500 }}>Preview generates automatically</p>
                  <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 12 }}>Start typing or import your resume</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .form-panel {
            width: 100% !important;
            position: fixed !important;
            inset: 54px 0 0 0 !important;
            border-right: none !important;
            z-index: 10;
            display: ${mobileView === "form" ? "flex" : "none"} !important;
            background: var(--bg);
          }
          .preview-panel {
            width: 100% !important;
            position: fixed !important;
            inset: 54px 0 0 0 !important;
            display: ${mobileView === "preview" ? "flex" : "none"} !important;
          }
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: inline-flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
