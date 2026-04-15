import { CVData } from "./types";

export const defaultCVData: CVData = {
  personal: {
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    address: "",
    website: "",
    github: "",
    summary: "",
  },
  education: [],
  experience: [],
  projects: [],
  skills: [
    { id: "sk-1", label: "", items: [] },
  ],
  sectionLabels: {
    education: "Education",
    experience: "Experience",
    projects: "Extracurricular Activities",
    skills: "Skills & Interests",
  },
};
