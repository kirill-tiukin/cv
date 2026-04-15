"use client";

import Link from "next/link";

const features = [
  {
    slug: "/cv",
    title: "CV Builder",
    description: "Craft a professional CV with expert guidance.",
    emoji: "📄",
  },
  {
    slug: "#",
    title: "Cover Letter",
    description: "Coming soon.",
    emoji: "✉️",
    disabled: true,
  },
  {
    slug: "#",
    title: "LinkedIn Review",
    description: "Coming soon.",
    emoji: "🔗",
    disabled: true,
  },
  {
    slug: "#",
    title: "Interview Prep",
    description: "Coming soon.",
    emoji: "🎤",
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ maxWidth: "900px", width: "100%" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "16px", textAlign: "center", letterSpacing: "-0.02em" }}>Career Tools</h1>
        <p style={{ fontSize: "18px", color: "var(--text-3)", marginBottom: "56px", textAlign: "center" }}>
          Everything you need to land your next role.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {features.map((f) =>
            f.disabled ? (
              <div key={f.title} style={{ borderRadius: "16px", border: "1.5px solid var(--border)", background: "var(--surface)", padding: "32px", opacity: 0.4, cursor: "not-allowed" }}>
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.emoji}</div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>{f.title}</h2>
                <p style={{ fontSize: "14px", color: "var(--text-3)" }}>{f.description}</p>
              </div>
            ) : (
              <Link key={f.title} href={f.slug} style={{ borderRadius: "16px", border: "1.5px solid var(--border)", background: "var(--surface)", padding: "32px", textDecoration: "none", transition: "all 0.15s", cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--accent)";
                  el.style.boxShadow = "0 4px 12px rgba(0, 102, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--border)";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>{f.emoji}</div>
                <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>{f.title}</h2>
                <p style={{ fontSize: "14px", color: "var(--text-3)" }}>{f.description}</p>
              </Link>
            )
          )}
        </div>
      </div>
    </main>
  );
}
