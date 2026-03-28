'use client';

import { usePoll } from "@/lib/hooks/use-poll";

interface Course {
  id: string;
  title: string;
  description?: string;
  professorName?: string;
  enrolledCount?: number;
  category?: string;
  price?: string | number;
}

interface CourseData {
  courses: Course[];
}

export default function CoursesPage() {
  const { data } = usePoll<CourseData>("/api/courses", 10000);
  const courses = data?.courses ?? [];

  return (
    <div style={{ fontFamily: "'VT323', monospace" }}>
      <div
        style={{
          marginBottom: 24,
          color: "#444",
          fontSize: 13,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Courses
      </div>

      {courses.length === 0 ? (
        <div style={{ color: "#333", fontSize: 16 }}>No courses available.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const priceNum = parseFloat(String(course.price ?? "0"));
  const priceLabel = !priceNum || priceNum === 0 ? "FREE" : `${priceNum} USDC`;

  const description = course.description ?? "";
  const truncated =
    description.length > 120 ? description.slice(0, 120) + "..." : description;

  return (
    <div
      style={{
        border: "1px solid #1a1a1a",
        backgroundColor: "#050505",
        padding: 20,
        fontFamily: "'VT323', monospace",
      }}
    >
      {/* Title */}
      <div style={{ color: "#fff", fontSize: 18, marginBottom: 8, lineHeight: 1.2 }}>
        {course.title}
      </div>

      {/* Description */}
      {truncated && (
        <div style={{ color: "#555", fontSize: 14, marginBottom: 12, lineHeight: 1.4 }}>
          {truncated}
        </div>
      )}

      {/* Category badge */}
      {course.category && (
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              color: "#555",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              border: "1px solid #222",
              padding: "2px 8px",
            }}
          >
            {course.category}
          </span>
        </div>
      )}

      {/* Professor */}
      {course.professorName && (
        <div style={{ color: "#555", fontSize: 13, marginBottom: 6 }}>
          {course.professorName}
        </div>
      )}

      {/* Enrolled + price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ color: "#444", fontSize: 13 }}>
          {course.enrolledCount ?? 0} enrolled
        </span>
        <span
          style={{
            color: "#fff",
            fontSize: 13,
            letterSpacing: 1,
            border: "1px solid #222",
            padding: "2px 8px",
          }}
        >
          {priceLabel}
        </span>
      </div>
    </div>
  );
}
