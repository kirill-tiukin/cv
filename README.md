# CV Builder

A professional CV builder with live LaTeX preview and PDF export.  
Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install LaTeX (required for PDF compilation)

**Ubuntu / Debian:**
```bash
sudo apt-get install texlive-full
```

**macOS:**
```bash
brew install --cask mactex
```

**Windows:**
Install [MiKTeX](https://miktex.org/download) or [TeX Live](https://tug.org/texlive/)

> The `texlive-full` package includes `newtxtext`, `enumitem`, `titlesec`, and all other packages your template needs.  
> A lighter alternative: `texlive-latex-extra texlive-fonts-recommended` — but `texlive-full` is safest.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How it works

1. Fill in your details across the 5 sections (Personal, Education, Experience, Activities, Skills)
2. Click **Generate PDF Preview** — the server compiles your LaTeX template via `pdflatex`
3. The PDF renders in the built-in browser viewer with full zoom/print controls
4. Click **Download PDF** to save your CV

---

## Project structure

```
src/
├── app/
│   ├── api/compile/route.ts   # LaTeX → PDF API endpoint
│   ├── globals.css            # Global styles
│   ├── layout.tsx
│   └── page.tsx               # Main builder UI
├── components/
│   ├── PersonalSection.tsx
│   ├── EducationSection.tsx
│   ├── ExperienceSection.tsx
│   ├── ProjectsSection.tsx
│   ├── SkillsSection.tsx
│   └── PDFPreview.tsx
└── lib/
    ├── types.ts               # TypeScript types
    ├── latex.ts               # LaTeX generation utility
    └── defaults.ts            # Default form data
```

---

## Customising the template

The LaTeX class (`sample.cls`) is embedded in `src/app/api/compile/route.ts`.  
To update the template, edit the `CLS_CONTENT` constant in that file.

---

## Production build

```bash
npm run build
npm start
```
