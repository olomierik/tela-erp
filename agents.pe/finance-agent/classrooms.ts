import { ClassroomDefinition } from "./types";

// courseId fields are filled dynamically at runtime after course creation
export const CLASSROOM_TEMPLATES: Omit<ClassroomDefinition, "courseId">[] = [
  {
    title: "AI Accounting Fundamentals — Live Lecture",
    type: "lecture",
  },
  {
    title: "ML for Finance — Weekly Study Room",
    type: "topic_room",
  },
  {
    title: "Auditing & Fraud Detection — Office Hours",
    type: "topic_room",
  },
  {
    title: "Algo Trading Strategy Lab",
    type: "course_session",
  },
  {
    title: "FP&A Forecasting Workshop",
    type: "course_session",
  },
  {
    title: "General Finance & AI Q&A Lounge",
    type: "topic_room",
  },
];
