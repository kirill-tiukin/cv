import { CVData, ExperienceEntry, EducationEntry, ProjectEntry, SkillGroup } from "./types";

function esc(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Escape bullet text but preserve \href{url}{label} commands.
 */
function escapeBullet(str: string): string {
  if (!str) return "";
  const parts = str.split(/(\\href\{[^\}]*\}\{[^\}]*\})/g);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : esc(part)))
    .join("");
}

/** Collapse multiple spaces to one, trim, then ensure ends with a full stop */
function cleanBullet(raw: string): string {
  const s = raw.replace(/\s{2,}/g, " ").trim();
  if (!s) return s;
  if (/[.!?]$/.test(s)) return s;
  return s + ".";
}

function period(start: string, end: string): string {
  if (!start && !end) return "";
  if (!end) return esc(start);
  return `${esc(start)} -- ${esc(end)}`;
}

function bullets(lines: string[]): string {
  return lines
    .map(cleanBullet)
    .filter(Boolean)
    .map(b => `\\cvbullet{${escapeBullet(b)}}`)
    .join("\n");
}

function linkedinHandle(val: string): string {
  return val
    .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

export function generateLaTeX(data: CVData): string {
  const { personal, education, experience, projects, skills, sectionLabels } = data;

  const handle = linkedinHandle(personal.linkedin);
  const header = [
    `\\name{${esc(personal.name)}}`,
    personal.phone.trim()   && `\\phone{${esc(personal.phone)}}`,
    personal.email.trim()   && `\\email{${esc(personal.email)}}`,
    handle                  && `\\linkedin{${esc(handle)}}`,
    personal.address.trim() && `\\address{${esc(personal.address)}}`,
  ].filter(Boolean).join("\n");

  const eduBlocks = education
    .filter(e => e.institution)
    .map((e: EducationEntry) => {
      const role = `\\cvrole{${period(e.periodStart, e.periodEnd)}}{${esc(e.degree)}}`;
      const body = bullets(e.bullets);
      return `\\cvjob{${esc(e.location)}}{${esc(e.institution)}}{${role}}{${body}}`;
    }).join("\n\n");

  const expBlocks = experience
    .filter(e => e.company)
    .map((e: ExperienceEntry) => {
      const role = `\\cvrole{${period(e.periodStart, e.periodEnd)}}{${esc(e.role)}}`;
      const body = bullets(e.bullets);
      return `\\cvjob{${esc(e.location)}}{${esc(e.company)}}{${role}}{${body}}`;
    }).join("\n\n");

  const projBlocks = projects
    .filter(p => p.title)
    .map((p: ProjectEntry) => {
      const body = bullets(p.bullets);
      return `\\project{${period(p.periodStart, p.periodEnd)}}{${esc(p.location)}}{${esc(p.title)}}{${esc(p.role)}}{${body}}{}`;
    }).join("\n\n");

  const skillLines = skills
    .filter(s => s.label && s.items.length)
    .map((s: SkillGroup) => {
      const itemStr = s.items
        .map(i => esc(i.replace(/\s{2,}/g, " ").trim()))
        .filter(Boolean)
        .join(", ");
      const withPeriod = /[.!?]$/.test(itemStr) ? itemStr : itemStr + ".";
      return `\\skillgroup{${esc(s.label)}}{${withPeriod}}`;
    })
    .join("\n");

  const customLabels = [
    `\\renewcommand{\\textEducation}{${esc(sectionLabels.education)}}`,
    `\\renewcommand{\\textExperience}{${esc(sectionLabels.experience)}}`,
    `\\renewcommand{\\textProjects}{${esc(sectionLabels.projects)}}`,
    `\\renewcommand{\\textSkills}{${esc(sectionLabels.skills)}}`,
  ].join("\n");

  return `\\documentclass[caps]{sample}
${header}
${customLabels}
\\begin{document}
${eduBlocks ? `\\education\n\n${eduBlocks}` : ""}
${expBlocks ? `\\experience\n\n${expBlocks}` : ""}
${projBlocks ? `\\projects\n\n${projBlocks}` : ""}
${skillLines ? `\\skills\n\n${skillLines}` : ""}
\\end{document}
`;
}
