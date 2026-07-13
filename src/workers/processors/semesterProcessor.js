'use strict';

const logger = require('../../utils/logger');

async function processSemester(session, scraper, pgClient) {
  const rollNumber = session.rollNumber;
  const { studentId } = session;

  logger.info({ rollNumber }, 'Fetching profile and semester results from ERP');
  const profile = await scraper.fetchProfile(session);
  const semesterData = await scraper.fetchPreviousSemesters(session);

  // 1. Update Student Profile summary in students table
  await pgClient.query(
    `UPDATE students
     SET name = COALESCE($2, name),
         branch = COALESCE($3, branch),
         program = COALESCE($4, program),
         updated_at = NOW()
     WHERE id = $1`,
    [studentId, profile.name, profile.branch, profile.program || 'B.Tech']
  );

  // 2. Persist previous semesters' attendance into semester_results
  const previousSemesters = semesterData.previousSemesters || [];
  
  for (const sem of previousSemesters) {
    const payload = {
      totalHeld: sem.totalHeld,
      totalAttended: sem.totalAttended,
      percentage: sem.percentage,
      subjects: sem.subjects || []
    };

    await pgClient.query(
      `INSERT INTO semester_results (student_id, semester_label, academic_year, payload, scraped_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (student_id, semester_label) DO UPDATE
       SET academic_year = EXCLUDED.academic_year,
           payload = EXCLUDED.payload,
           scraped_at = EXCLUDED.scraped_at,
           updated_at = NOW()`,
      [studentId, sem.semesterLabel, String(sem.academicYear || ''), JSON.stringify(payload)]
    );
  }

  logger.info({ rollNumber, semestersCount: previousSemesters.length }, 'Semester processor completed successfully');
}

module.exports = processSemester;
