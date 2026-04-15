"use client";
import { useRouter } from "next/navigation";

const guideContent = [
  {
    id: 1,
    title: "What is a CV and why is it needed?",
    description: "Your CV provides crucial insights into who you are and why a firm should hire you. A strong CV covers key highlights throughout your career—educational milestones, professional achievements, and extra-curricular involvement. Since recruiters review thousands of applications, your CV is often the first filter. A well-written CV is essential to progress to the next stage.",
  },
  {
    id: 2,
    title: "The 5 Sections of Your CV",
    items: [
      { heading: "Header", text: "Full name, professional email, LinkedIn link" },
      { heading: "Education", text: "University, degree, graduation date, relevant modules, key achievements" },
      { heading: "Work Experience", text: "Listed in reverse chronological order. Maximum 3 bullets per role with clear actions and quantified results." },
      { heading: "Extra-curricular", text: "Skills, certifications, interests, relevant projects, societies, clubs" },
      { heading: "Technical (if applicable)", text: "Programming projects with GitHub links, relevant certifications" },
    ],
  },
  {
    id: 3,
    title: "Work Experience: The Golden Rules",
    tips: [
      "Emphasise soft skills for non-industry roles (communication, time management, pressure handling)",
      "Always quantify achievements – \"Sold £200,000\" sounds far better than \"Sold products\"",
      "Start each bullet with action verbs: Developed, Built, Led, Analysed, Presented, Increased",
      "Use past tense for all previous roles and experiences",
      "For each point, answer: What did I do? What was the impact?",
    ],
  },
  {
    id: 4,
    title: "For Quant & Technical Roles",
    tips: [
      "Include a dedicated projects section with GitHub links to your work",
      "Emphasise academic achievements—Olympiads, competition rankings, test scores",
      "Highlight technical skills, programming languages, and relevant tools",
      "Consider including a portfolio or personal website link",
    ],
  },
  {
    id: 5,
    title: "Your Pre-Submit Checklist",
    checklist: [
      "No spelling, grammar, or formatting errors (read 3 times minimum)",
      "Strictly one page—ruthlessly cut anything not essential",
      "Use professional fonts: Times New Roman, Arial, or Calibri",
      "Each word adds value—no filler content",
      "Consistent formatting throughout (bullets, spacing, font sizes)",
      "Tailored to the firm—mirror job posting keywords",
      "Action words, past tense, quantified results throughout",
    ],
  },
];

export default function CVInfoPage() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 54, flexShrink: 0,
        background: "var(--surface)", borderBottom: "1.5px solid var(--border)",
      }}>
        <button
          onClick={() => router.back()}
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
        <span style={{
          fontFamily: "Syne", fontSize: 15, fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text)",
        }}>
          CV Guide
        </span>
        <div style={{ width: 30 }} />
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "48px 20px 60px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Hero Section */}
          <div style={{ marginBottom: 64 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.2, color: "var(--text)", fontFamily: "Syne", letterSpacing: "-0.02em" }}>
              How to write a CV that gets interviews
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-3)", lineHeight: 1.7, margin: 0 }}>
              A complete guide covering structure, content, and the strategies that recruiters look for.
            </p>
          </div>

          {/* Main Content */}
          {guideContent.map((section, idx) => (
            <div key={section.id} style={{ marginBottom: idx === guideContent.length - 1 ? 48 : 56 }}>
              {/* Section Title */}
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px", color: "var(--text)", fontFamily: "Syne", letterSpacing: "-0.01em" }}>
                {section.title}
              </h2>

              {/* Description */}
              {section.description && (
                <p style={{ fontSize: 15, color: "var(--text-3)", lineHeight: 1.8, marginBottom: 0 }}>
                  {section.description}
                </p>
              )}

              {/* Items (for sections with structured lists) */}
              {section.items && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginTop: 20 }}>
                  {section.items.map((item, i) => (
                    <div key={i} style={{ paddingLeft: 20, borderLeft: "2.5px solid var(--accent)" }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", fontFamily: "Syne" }}>
                        {item.heading}
                      </h3>
                      <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips Section */}
              {section.tips && (
                <div style={{ background: "var(--accent-glow)", border: "1.5px solid var(--accent)", borderRadius: 12, padding: "20px", marginTop: 20 }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {section.tips.map((tip, i) => (
                      <li key={i} style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.7, marginBottom: i === section.tips.length - 1 ? 0 : 12, paddingLeft: 24, position: "relative" }}>
                        <span style={{ position: "absolute", left: 0, color: "var(--accent)", fontWeight: 700 }}>✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Checklist Section */}
              {section.checklist && (
                <div style={{ marginTop: 20 }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {section.checklist.map((item, i) => (
                      <li key={i} style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.7, padding: "12px 0", paddingLeft: 28, position: "relative", borderBottom: i === section.checklist.length - 1 ? "none" : "1px solid var(--border)" }}>
                        <span style={{ position: "absolute", left: 0, color: "var(--accent)", fontWeight: 700 }}>▪</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {/* Final CTA */}
          <div style={{ paddingTop: 32, borderTop: "1.5px solid var(--border)", textAlign: "center" }}>
            <p style={{ fontSize: 15, color: "var(--text-3)", marginBottom: 24 }}>
              Ready to build your CV? Use our editor to bring these principles to life.
            </p>
            <button
              onClick={() => router.push("/cv/write")}
              style={{
                padding: "12px 36px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "Syne",
                borderRadius: 10,
                border: "1.5px solid var(--border)",
                background: "var(--accent)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: "0 4px 12px rgba(0, 102, 255, 0.2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-2)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(0, 102, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(0, 102, 255, 0.2)";
              }}
            >
              Start Building Your CV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}