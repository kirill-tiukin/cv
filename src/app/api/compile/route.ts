import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

// Read the .cls file at startup (relative to project root)
const CLS_CONTENT = `\\NeedsTeXFormat{LaTeX2e}
\\ProvidesClass{sample}

\\LoadClass[12pt]{article}
\\frenchspacing

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%         Class Packages         %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\RequirePackage{cmap}
\\RequirePackage[utf8]{inputenc}
\\RequirePackage[T1]{fontenc}
\\RequirePackage{newtxtext}

\\RequirePackage[left=0.4in, right=0.6in, top=0in, bottom=0in]{geometry}
\\RequirePackage{titlesec}
\\RequirePackage{enumitem}
\\RequirePackage{hyperref}
\\RequirePackage{etoolbox}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%         Class Options          %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\DeclareOption{a4paper}{
    \\setlength\\paperheight{297mm}
    \\setlength\\paperwidth{210mm}
}

\\DeclareOption{letterpaper}{
    \\setlength\\paperheight{11in}
    \\setlength\\paperwidth{8.5in}
}

\\DeclareOption{noline}{
    \\renewcommand{\\sectionline}{}
}

\\DeclareOption{resume}{
    \\renewcommand{\\cvinclude}[1]{}
}

\\DeclareOption{caps}{
    \\renewcommand{\\cvsectioncaps}[1]{\\MakeUppercase{#1}}
    \\renewcommand{\\cvsectionsize}[1]{\\normalsize{#1}}
}

\\DeclareOption{english}{
    \\newcommand{\\textEducation}{Education}
    \\newcommand{\\textExperience}{Work Experience}
    \\newcommand{\\textProjects}{Extracurricular Activities}
    \\newcommand{\\textSkills}{Skills \\& Interests}
}

\\DeclareOption{defaultoptions}{
    \\newcommand{\\cvsectionsize}[1]{\\large{#1}}
    \\newcommand{\\cvsectioncaps}[1]{{#1}}
    \\newcommand{\\cvinclude}[1]{{#1}}
    \\newcommand{\\sectionline}{\\par\\vspace{-0.5mm}\\hrule\\par\\vspace{-0.5mm}}
    \\titlespacing\\section{0pt}{6pt}{0pt}
}

\\ExecuteOptions{a4paper,defaultoptions,english}
\\ProcessOptions

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Personal Information      %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\DeclareRobustCommand\\name[1]{\\gdef\\@name{#1}}
\\DeclareRobustCommand\\email[1]{\\gdef\\@email{#1}}
\\DeclareRobustCommand\\phone[1]{\\gdef\\@phone{#1}}
\\DeclareRobustCommand\\address[1]{\\gdef\\@address{#1}}
\\DeclareRobustCommand\\linkedin[1]{\\gdef\\@linkedin{#1}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Header (NO ICONS)         %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\newlength{\\headergap}
\\setlength{\\headergap}{0.2cm}

\\renewcommand{\\maketitle}{
    \\begin{center}
        \\begin{minipage}[t]{0.9\\textwidth}
            \\centering
            \\vspace*{50pt}
            {\\fontsize{30pt}{33pt}\\selectfont \\@name\\par}
            \\vspace*{\\headergap}
            \\normalsize
            \\ifdefined\\@phone\\@phone\\fi
            \\ifdefined\\@email\\separator\\href{mailto:\\@email}{\\@email}\\fi
            \\ifdefined\\@linkedin\\separator
                \\href{https://www.linkedin.com/in/\\@linkedin}{linkedin/in/\\@linkedin}\\fi
            \\ifdefined\\@address\\separator\\@address\\fi
        \\end{minipage}
    \\end{center}
    % SAME gap as section transitions
    \\vspace{\\sectiontightgap}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Section Spacing Control   %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\newlength{\\cventrygap}
\\setlength{\\cventrygap}{0.6em}

% Unified section transition gap
\\newlength{\\sectiontightgap}
\\setlength{\\sectiontightgap}{-0.25cm}

% Flag to detect first section
\\newif\\iffirstcvsection
\\firstcvsectiontrue

\\titlespacing{\\section}{0pt}{*0}{0pt}

\\newcommand{\\cvsection}[1]{%
    \\par
    \\iffirstcvsection
        \\firstcvsectionfalse
    \\else
        \\removelastskip\\vspace{\\sectiontightgap}
    \\fi
    \\section*{{\\cvsectionsize{\\cvsectioncaps{#1}}}}%
    \\addcontentsline{toc}{section}{#1}%
    \\sectionline{}\\vspace{0.2cm}\\par
}

\\newcommand{\\education}{\\cvsection{\\textEducation}}
\\newcommand{\\experience}{\\cvsection{\\textExperience}}
\\newcommand{\\leadership}{\\cvsection{\\textLeadership}}
\\newcommand{\\projects}{\\cvsection{\\textProjects}}
\\newcommand{\\skills}{\\cvsection{\\textSkills}}
\\newcommand{\\awards}{\\cvsection{\\textAwards}}
\\newcommand{\\publications}{\\cvsection{\\textPublications}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Content Blocks            %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\newcommand{\\cvbullet}[1]{%
  \\par\\noindent
  \\hangindent=1em
  \\hangafter=1
  \\raggedright
  \\textbullet\\hspace{0.6em}#1\\par\\vspace{0.15em}
}

\\newcommand{\\cvrole}[2]{\\noindent\\emph{#2}\\hfill #1 \\par}

\\newcommand{\\cvjob}[4]{%
    \\noindent\\textbf{#2}\\hfill\\textbf{#1}\\par
    #3\\par
    #4\\par
    \\vspace{\\cventrygap}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Projects / Skills         %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\newcommand{\\project}[6]{%
    \\cvjob{#2}{#3\\ifstrempty{#6}{}{ \\separator\\href{#6}{#6}}}{%
        \\cvrole{#1}{#4}%
    }{#5}%
}

\\newcommand{\\skillgroup}[2]{%
  \\noindent
  \\textbf{#1}: #2\\par
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%      Utilities                 %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\\newcommand{\\separator}{\\;\\textbar\\;}
\\newcommand{\\link}[2]{\\href{#1}{#2}}

\\AtBeginDocument{\\maketitle}

\\pagestyle{empty}
\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=blue,
    citecolor=black,
}
`;

export async function POST(request: NextRequest) {
  let workDir: string | null = null;

  try {
    // Parse request body with error handling
    let body: any;
    try {
      body = await request.json();
    } catch (parseErr) {
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: String(parseErr) },
        { status: 400 }
      );
    }

    const { latex } = body as { latex: string };

    if (!latex) {
      return NextResponse.json({ error: "No LaTeX content provided" }, { status: 400 });
    }

    // Create temp directory
    workDir = join(tmpdir(), `cv-build-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(workDir, { recursive: true });

    // Write files
    await writeFile(join(workDir, "sample.cls"), CLS_CONTENT, "utf8");
    await writeFile(join(workDir, "cv.tex"), latex, "utf8");

    // Check if pdflatex is available
    try {
      await execAsync("which pdflatex");
    } catch {
      return NextResponse.json(
        {
          error: "pdflatex not installed",
          message: "Please install TeX Live: sudo apt-get install texlive-full",
          latex,
        },
        { status: 503 }
      );
    }

    // Run pdflatex twice for proper rendering
    const cmd = `cd "${workDir}" && pdflatex -interaction=nonstopmode -halt-on-error cv.tex 2>&1`;

    let compileOutput = "";
    try {
      const { stdout } = await execAsync(cmd, { timeout: 30000 });
      compileOutput = stdout;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      compileOutput = (err.stdout || "") + (err.stderr || "");
      // Try to read PDF anyway (pdflatex exits non-zero on warnings)
    }

    // Read the generated PDF
    const pdfPath = join(workDir, "cv.pdf");
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await readFile(pdfPath);
    } catch {
      return NextResponse.json(
        {
          error: "PDF generation failed",
          log: compileOutput.slice(-3000),
          latex,
        },
        { status: 422 }
      );
    }

    // Return PDF as base64
    const base64 = pdfBuffer.toString("base64");
    return NextResponse.json({ pdf: base64 });
  } catch (error: unknown) {
    const e = error as Error;
    console.error("Compile error:", e);
    return NextResponse.json(
      { error: "Compilation failed", message: e.message, details: String(e) },
      { status: 500 }
    );
  } finally {
    // Cleanup
    if (workDir) {
      try {
        await rm(workDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
