export interface PersonalInfo {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  address: string;
  website: string;
  github: string;
  summary: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  location: string;
  degree: string;
  periodStart: string;
  periodEnd: string;
  bullets: string[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  location: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  bullets: string[];
}

export interface ProjectEntry {
  id: string;
  title: string;
  location: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  bullets: string[];
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface SectionLabels {
  education: string;
  experience: string;
  projects: string;
  skills: string;
}

export interface CVData {
  personal: PersonalInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  sectionLabels: SectionLabels;
}
