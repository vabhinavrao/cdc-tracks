'use strict';

const logger = require('../../utils/logger');

async function processMarks(session, scraper, pgClient) {
  const rollNumber = session.rollNumber;
  const { studentId } = session;

  logger.info({ rollNumber }, 'Fetching marks and SPF bands from ERP');
  const erpData = await scraper._fetchMarks(session, rollNumber);

  // 1. Persist exam marks into marks table
  const exams = erpData.exams || [];
  for (const exam of exams) {
    const payload = {
      title: exam.title,
      term: exam.term,
      sgpa: exam.sgpa,
      items: exam.items || []
    };

    await pgClient.query(
      `INSERT INTO marks (student_id, exam_id, exam_label, payload, scraped_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (student_id, exam_id) DO UPDATE
       SET exam_label = EXCLUDED.exam_label,
           payload = EXCLUDED.payload,
           scraped_at = EXCLUDED.scraped_at,
           updated_at = NOW()`,
      [studentId, exam.examId, exam.title, JSON.stringify(payload)]
    );
  }

  // 2. Persist SPF bands performance
  const spfBands = erpData.spfBands || [];
  for (const band of spfBands) {
    await pgClient.query(
      `INSERT INTO student_spf_bands (student_id, semester_label, cycle, band, academic_year, semester, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (student_id, semester_label, cycle) DO UPDATE
       SET band = EXCLUDED.band,
           academic_year = EXCLUDED.academic_year,
           semester = EXCLUDED.semester,
           scraped_at = NOW()`,
      [studentId, band.semesterLabel, band.cycle, band.band, band.academicYear, band.semester]
    );
  }

  logger.info(
    { rollNumber, examsCount: exams.length, spfCount: spfBands.length },
    'Marks processor completed successfully'
  );
}

module.exports = processMarks;
