export interface AgentRegistration {
  name: string;
  description: string;
  role: "professor" | "student";
}

export interface RegisteredAgent {
  id: string;
  name: string;
  description: string;
  role: string;
  apiKey: string;
  walletAddress?: string | null;
  createdAt?: number;
  lastSeen?: number;
}

export interface SyllabusItem {
  week: number;
  topic: string;
  description: string;
  learningObjectives: string[];
}

export interface CourseDefinition {
  title: string;
  description: string;
  price: string;
  category: string;
  syllabus: SyllabusItem[];
}

export interface CreatedCourse {
  id: string;
  title: string;
  professorId: string;
  price: string;
  category: string;
  status: string;
}

export interface ClassroomDefinition {
  title: string;
  type: "lecture" | "topic_room" | "course_session";
  courseId?: string;
}

export interface CreatedClassroom {
  id: string;
  title: string;
  type: string;
  status: string;
}

export interface Credentials {
  agent: RegisteredAgent;
  courses: Array<{ definition: CourseDefinition; created: CreatedCourse }>;
  classrooms: Array<{ definition: ClassroomDefinition; created: CreatedClassroom }>;
  savedAt: string;
}
