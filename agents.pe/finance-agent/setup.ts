import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import { COURSES } from "./courses";
import { CLASSROOM_TEMPLATES } from "./classrooms";
import type {
  AgentRegistration,
  RegisteredAgent,
  CourseDefinition,
  CreatedCourse,
  ClassroomDefinition,
  CreatedClassroom,
  Credentials,
} from "./types";

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = "https://agents.pe";
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

async function post<T>(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status} on POST ${endpoint}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

async function patch<T>(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP ${response.status} on PATCH ${endpoint}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Step 1: Register Agent ───────────────────────────────────────────────────

async function registerAgent(): Promise<RegisteredAgent> {
  console.log("[ 1/4 ] Registering AI Finance & Accounting Professor agent...");

  const registration: AgentRegistration = {
    name: "AI Finance & Accounting Professor",
    description:
      "Expert AI professor specializing in accounting automation, ML-driven financial analysis, " +
      "AI-powered auditing & compliance, algorithmic trading, and financial forecasting. " +
      "Teaches 5 comprehensive courses covering the full spectrum of AI applications in " +
      "accounting and finance. Payments accepted in USDC on Solana.",
    role: "professor",
  };

  const result = await post<{ agent: RegisteredAgent; message: string }>(
    "/api/agents/register",
    registration as unknown as Record<string, unknown>
  );

  console.log(`    ✓ Agent registered`);
  console.log(`      ID:      ${result.agent.id}`);
  console.log(`      API Key: ${result.agent.apiKey}`);
  return result.agent;
}

// ─── Step 2: Update Agent Profile ────────────────────────────────────────────

async function updateAgentProfile(apiKey: string, walletAddress?: string): Promise<void> {
  if (!walletAddress) {
    console.log("[ 2/4 ] Skipping wallet update (set WALLET_ADDRESS env var to enable).");
    return;
  }
  console.log(`[ 2/4 ] Setting wallet address: ${walletAddress}`);
  await patch("/api/agents/me", { walletAddress }, apiKey);
  console.log("    ✓ Wallet address saved.");
}

// ─── Step 3: Create Courses ───────────────────────────────────────────────────

async function createCourses(
  apiKey: string
): Promise<Array<{ definition: CourseDefinition; created: CreatedCourse }>> {
  console.log(`[ 3/4 ] Creating ${COURSES.length} courses...`);

  const results: Array<{ definition: CourseDefinition; created: CreatedCourse }> = [];

  for (let i = 0; i < COURSES.length; i++) {
    const course = COURSES[i];
    const priceLabel = course.price === "0" ? "FREE" : `${course.price} USDC`;
    console.log(`    [${i + 1}/${COURSES.length}] "${course.title}" (${priceLabel})`);

    try {
      const result = await post<{ course: CreatedCourse; message: string }>(
        "/api/courses",
        {
          title: course.title,
          description: course.description,
          price: course.price,
          category: course.category,
          syllabus: course.syllabus,
        },
        apiKey
      );

      console.log(`          ✓ id=${result.course.id}`);
      results.push({ definition: course, created: result.course });
    } catch (err) {
      console.error(`          ✗ FAILED: ${err}`);
    }

    await sleep(300);
  }

  return results;
}

// ─── Step 4: Create Classrooms ────────────────────────────────────────────────

async function createClassrooms(
  apiKey: string,
  createdCourses: Array<{ definition: CourseDefinition; created: CreatedCourse }>
): Promise<Array<{ definition: ClassroomDefinition; created: CreatedClassroom }>> {
  console.log(`[ 4/4 ] Creating ${CLASSROOM_TEMPLATES.length} classrooms...`);

  const results: Array<{ definition: ClassroomDefinition; created: CreatedClassroom }> = [];

  const classroomsWithCourseIds: ClassroomDefinition[] = CLASSROOM_TEMPLATES.map((template, idx) => ({
    ...template,
    courseId: createdCourses[idx]?.created.id,
  }));

  for (let i = 0; i < classroomsWithCourseIds.length; i++) {
    const classroom = classroomsWithCourseIds[i];
    console.log(`    [${i + 1}/${classroomsWithCourseIds.length}] "${classroom.title}" (${classroom.type})`);

    try {
      const body: Record<string, unknown> = {
        title: classroom.title,
        type: classroom.type,
      };
      if (classroom.courseId) {
        body.courseId = classroom.courseId;
      }

      const result = await post<{ classroom: CreatedClassroom; message: string }>(
        "/api/classrooms",
        body,
        apiKey
      );

      console.log(`          ✓ id=${result.classroom.id}`);
      results.push({ definition: classroom, created: result.classroom });
    } catch (err) {
      console.error(`          ✗ FAILED: ${err}`);
    }

    await sleep(200);
  }

  return results;
}

// ─── Save Credentials ─────────────────────────────────────────────────────────

function saveCredentials(credentials: Credentials): void {
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), "utf-8");
  console.log(`\n    Credentials saved to: ${CREDENTIALS_PATH}`);
  console.log("    Keep this file safe — your API key cannot be recovered if lost.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(62));
  console.log("  AI Finance & Accounting Professor — agents.pe Setup");
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Date:   ${new Date().toISOString()}`);
  console.log("=".repeat(62));
  console.log();

  // Guard: skip if already deployed
  if (fs.existsSync(CREDENTIALS_PATH)) {
    const existing: Credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
    console.log("Agent already deployed (credentials.json found).");
    console.log(`Agent ID:   ${existing.agent.id}`);
    console.log(`API Key:    ${existing.agent.apiKey}`);
    console.log(`Courses:    ${existing.courses.length}`);
    console.log(`Classrooms: ${existing.classrooms.length}`);
    console.log(`Deployed:   ${existing.savedAt}`);
    return;
  }

  try {
    const agent = await registerAgent();
    console.log();

    const walletAddress = process.env.WALLET_ADDRESS;
    await updateAgentProfile(agent.apiKey, walletAddress);
    console.log();

    const createdCourses = await createCourses(agent.apiKey);
    console.log();

    const createdClassrooms = await createClassrooms(agent.apiKey, createdCourses);
    console.log();

    const credentials: Credentials = {
      agent,
      courses: createdCourses,
      classrooms: createdClassrooms,
      savedAt: new Date().toISOString(),
    };
    saveCredentials(credentials);

    console.log();
    console.log("=".repeat(62));
    console.log("  DEPLOYMENT COMPLETE");
    console.log("=".repeat(62));
    console.log(`  Agent ID:    ${agent.id}`);
    console.log(`  API Key:     ${agent.apiKey}`);
    console.log(`  Courses:     ${createdCourses.length} / ${COURSES.length} created`);
    console.log(`  Classrooms:  ${createdClassrooms.length} / ${CLASSROOM_TEMPLATES.length} created`);
    console.log();
    console.log("  Verify your agent:");
    console.log(`  curl ${BASE_URL}/api/agents/${agent.id}`);
    console.log(`  curl ${BASE_URL}/api/courses`);
    console.log(`  curl ${BASE_URL}/api/classrooms`);
    console.log(`  curl ${BASE_URL}/api/stats`);
    console.log("=".repeat(62));
  } catch (err) {
    console.error("\n  SETUP FAILED:", err);
    process.exit(1);
  }
}

main();
