'use strict';

const db = require('../db/pool');

async function getStudentByRoll(rollNumber) {
  const normalized = String(rollNumber || '').trim().toUpperCase();
  const { rows } = await db.query(
    `SELECT id, college_id, roll_number, name, branch, program, status, first_scraped_at, last_success_at
     FROM students
     WHERE roll_number = $1`,
    [normalized]
  );
  return rows[0] || null;
}

async function getSyncStatus(studentId) {
  const { rows } = await db.query(
    `SELECT profile_at, attendance_at, marks_at, semester_at, internal_at, backlogs_at, last_error_code, last_error_at
     FROM sync_status
     WHERE student_id = $1`,
    [studentId]
  );
  return rows[0] || null;
}

async function getCachedAttendance(studentId) {
  const { rows } = await db.query(
    `SELECT term_label, overall_percentage, held, attended, subjects, scraped_at, source_hash
     FROM attendance_cache
     WHERE student_id = $1`,
    [studentId]
  );
  return rows[0] || null;
}

async function getMarksAndSpf(studentId) {
  const marksRes = await db.query(
    `SELECT exam_id, exam_label, payload, scraped_at
     FROM marks
     WHERE student_id = $1
     ORDER BY scraped_at DESC`,
    [studentId]
  );

  const spfRes = await db.query(
    `SELECT semester_label, cycle, band, academic_year, semester, scraped_at
     FROM student_spf_bands
     WHERE student_id = $1
     ORDER BY academic_year DESC, semester DESC, cycle DESC`,
    [studentId]
  );

  return {
    exams: marksRes.rows.map((r) => ({
      examId: r.exam_id,
      examLabel: r.exam_label,
      scrapedAt: r.scraped_at,
      ...(r.payload || {})
    })),
    spfBands: spfRes.rows.map((r) => ({
      semesterLabel: r.semester_label,
      cycle: r.cycle,
      band: r.band,
      academicYear: r.academic_year,
      semester: r.semester,
      scrapedAt: r.scraped_at
    }))
  };
}

module.exports = {
  getStudentByRoll,
  getSyncStatus,
  getCachedAttendance,
  getMarksAndSpf
};
