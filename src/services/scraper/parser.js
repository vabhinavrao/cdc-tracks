'use strict';

const cheerio = require('cheerio');

const ROMAN_YEAR_PATTERNS = [
  { pattern: 'IV/IV', year: 4 },
  { pattern: 'III/IV', year: 3 },
  { pattern: 'II/IV', year: 2 },
  { pattern: 'I/IV', year: 1 },
];

const SEMESTER_2_PATTERNS = ['II SEMESTER', '2 SEMESTER', '2ND SEMESTER'];
const SEMESTER_1_PATTERNS = ['I SEMESTER', '1 SEMESTER', '1ST SEMESTER'];

function parseTermLabel(label) {
  const normalized = (label || '').toUpperCase().replace(/\s+/g, ' ').trim();

  let academicYear = null;
  for (const { pattern, year } of ROMAN_YEAR_PATTERNS) {
    if (normalized.includes(pattern)) {
      academicYear = year;
      break;
    }
  }

  let semester = null;
  if (SEMESTER_2_PATTERNS.some((p) => normalized.includes(p))) {
    semester = 2;
  } else if (SEMESTER_1_PATTERNS.some((p) => normalized.includes(p))) {
    semester = 1;
  }

  return { academicYear, semester };
}

function isMalformedSubjectName(value) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return true;
  if (cleaned.length > 120) return true;

  const compact = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const headerTokens = ['SLNO', 'SNO', 'SUBJECT', 'HELD', 'ATTEND', 'TOTAL'];
  const headerHits = headerTokens.reduce((count, token) => (
    compact.includes(token) ? count + 1 : count
  ), 0);

  if (headerHits >= 2 && /\d/.test(compact) && cleaned.length > 24) return true;
  return false;
}

function extractStudentNameFromHtml($) {
  let name = null;
  $('tr').each((_, row) => {
    if (name) return false;
    const cells = $(row).find('td');
    cells.each((i, cell) => {
      if (name) return false;
      const txt = $(cell).text().trim();
      if (/^(Student\s*)?Name\s*:?$/i.test(txt)) {
        const next = cells.eq(i + 1);
        if (next.length) {
          const n = next.text().trim()
            .replace(/^:\s*/, '')
            .replace(/\s+/g, ' ')
            .toUpperCase();
          if (n && n.length > 2 && n !== 'STUDENT' && n.length < 100) {
            name = n;
          }
        }
      }
    });
  });
  if (name) return name;

  const bodyText = $.text();
  const m = bodyText.match(/(?:Student\s*)?Name\s*:?\s*([A-Z][A-Z\s.]+?)(?:\s*(?:Course|Roll|Branch|\n))/i);
  if (m && m[1]) {
    const n = m[1].trim().replace(/\s+/g, ' ').toUpperCase();
    if (n.length > 2 && n.length < 100) return n;
  }
  return null;
}

function getBranchAcronym(branchName) {
  if (!branchName) return null;
  const lower = branchName.toLowerCase();
  if (lower.includes('computer science')) {
    if (lower.includes('artificial intelligence') || lower.includes('ai')) {
      if (lower.includes('machine learning') || lower.includes('ml')) return 'CSE-AIML';
      return 'CSE-AI';
    }
    if (lower.includes('data science') || lower.includes('ds')) return 'CSE-DS';
    if (lower.includes('cyber security') || lower.includes('cyber')) return 'CSE-CS';
    if (lower.includes('iot')) return 'CSE-IOT';
    return 'CSE';
  }
  if (lower.includes('electronics') && lower.includes('communication')) return 'ECE';
  if (lower.includes('electrical')) return 'EEE';
  if (lower.includes('mechanical')) return 'ME';
  if (lower.includes('civil')) return 'CE';
  if (lower.includes('information technology')) return 'IT';

  const words = branchName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
  const initials = words.map((w) => w[0]).join('').toUpperCase();
  return initials.length > 1 ? initials : branchName;
}

function extractBranchFromHtml($) {
  let branchName = null;
  $('tr').each((_, row) => {
    if (branchName) return false;
    const cells = $(row).find('td');
    cells.each((i, cell) => {
      if (branchName) return false;
      const txt = $(cell).text().trim();
      if (/^Branch\s*:?$/i.test(txt)) {
        let valCell = cells.eq(i + 1);
        if (valCell.length) {
          let text = valCell.text().trim();
          if (text === ':' || text === ':-') {
            valCell = cells.eq(i + 2);
            text = valCell.length ? valCell.text().trim() : '';
          }
          const b = text.replace(/^:\s*/, '').replace(/\s+/g, ' ').trim();
          if (b && b.length > 1 && b.length < 100) {
            branchName = b;
          }
        }
      }
    });
  });

  if (branchName) return getBranchAcronym(branchName);

  const bodyText = $.text();
  const m = bodyText.match(/Branch\s*:?\s*([A-Za-z\s.,()-]+?)(?:\s*(?:Semester|Gender|DOB|Join|\n))/i);
  if (m && m[1]) {
    const b = m[1].trim().replace(/\s+/g, ' ');
    if (b.length > 1 && b.length < 100) return getBranchAcronym(b);
  }
  return null;
}

function extractCurrentSemesterLabelFromHtml($) {
  let label = null;
  $('tr').each((_, row) => {
    if (label) return false;
    const cells = $(row).find('td');
    cells.each((i, cell) => {
      if (label) return false;
      const txt = $(cell).text().trim();
      if (/^Semester\s*:?$/i.test(txt)) {
        let valCell = cells.eq(i + 1);
        if (valCell.length) {
          let text = valCell.text().trim();
          if (text === ':' || text === ':-') {
            valCell = cells.eq(i + 2);
            text = valCell.length ? valCell.text().trim() : '';
          }
          const l = text.replace(/^:\s*/, '').replace(/\s+/g, ' ').trim();
          if (l && l.length > 1 && l.length < 100) label = l;
        }
      }
    });
  });

  if (label) return label;

  const bodyText = $.text();
  const m = bodyText.match(/Semester\s*:?\s*([A-Za-z0-9/.\s]+?)(?:\s*(?:Gender|DOB|Join|\n))/i);
  if (m && m[1]) {
    const l = m[1].trim().replace(/\s+/g, ' ');
    if (l.length > 1 && l.length < 100) return l;
  }
  return null;
}

function parseAttendanceHtml(html) {
  const $ = cheerio.load(html);

  let held = 0;
  let attended = 0;
  let found = false;
  const subjects = [];

  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const firstText = cells.first().text().trim().toUpperCase();
    if (!firstText) return;

    const nums = [];
    cells.each((i, cell) => {
      if (i === 0) return;
      const n = parseInt($(cell).text().trim(), 10);
      if (!isNaN(n) && n >= 0) nums.push(n);
    });

    if (firstText === 'TOTAL') {
      if (nums.length >= 2) {
        held = nums[0];
        attended = nums[1];
        found = true;
      }
    } else if (
      nums.length >= 2 &&
      firstText !== 'S.NO' &&
      firstText !== 'SUBJECT' &&
      firstText !== 'SUBJECTS'
    ) {
      let name = cells.first().text().trim();
      if (/^\d+$/.test(name) && cells.length > 3) {
        name = cells.eq(1).text().trim();
      }
      name = name.replace(/\s+/g, ' ').trim();
      if (!isMalformedSubjectName(name) && name.length > 1) {
        subjects.push({
          name,
          held: nums[0],
          attended: nums[1],
          percentage: nums[0] > 0
            ? parseFloat(((nums[1] / nums[0]) * 100).toFixed(2))
            : 0,
        });
      }
    }
  });

  if (!found) {
    if (html.includes('Database error') || html.includes('No attendance tables')) {
      return { held: 0, attended: 0, subjects: [], studentName: null };
    }
    const preview = $.text().replace(/\s+/g, ' ').trim().substring(0, 200);
    throw new Error(`TOTAL row not found in attendance response. Preview: "${preview}"`);
  }

  const studentName = extractStudentNameFromHtml($);

  return { held, attended, subjects, studentName };
}

function parsePreviousSemestersAttendance(html) {
  const $ = cheerio.load(html);
  const results = [];

  let startCell = null;
  $('td').each((_, td) => {
    const text = $(td).text().trim().toUpperCase();
    if (text.includes('PREVIOUS SEMESTERS ATTENDANCE')) {
      startCell = td;
      return false;
    }
  });

  if (!startCell) return results;

  const semHeadingRows = $(startCell).closest('tr').nextAll('.reportHeading2');

  semHeadingRows.each((_, row) => {
    const semesterName = $(row).text().trim();
    const nextRow = $(row).next('tr');
    const nestedTable = nextRow.find('table');

    if (nestedTable.length > 0) {
      const subjects = [];
      let totalHeld = 0;
      let totalAttended = 0;

      const headers = [];
      nestedTable.find('tr').eq(0).find('td').each((_, cell) => {
        headers.push($(cell).text().trim());
      });

      const held = [];
      nestedTable.find('tr').eq(1).find('td').each((_, cell) => {
        held.push($(cell).text().trim());
      });

      const attended = [];
      nestedTable.find('tr').eq(2).find('td').each((_, cell) => {
        attended.push($(cell).text().trim());
      });

      if (headers[0] && headers[0].toLowerCase() === 'subject') {
        for (let i = 1; i < headers.length - 1; i++) {
          const subjectName = headers[i];
          if (!subjectName || subjectName === 'Total') continue;

          const hVal = parseInt(held[i], 10) || 0;
          const aVal = parseInt(attended[i], 10) || 0;

          subjects.push({
            name: subjectName,
            held: hVal,
            attended: aVal,
            percentage: hVal > 0 ? parseFloat(((aVal / hVal) * 100).toFixed(2)) : 0,
          });
        }

        const totalHeldIndex = held.length - 1;
        const totalAttendedIndex = attended.length - 1;
        totalHeld = parseInt(held[totalHeldIndex], 10) || 0;
        totalAttended = parseInt(attended[totalAttendedIndex], 10) || 0;

        results.push({
          semester: semesterName,
          totalHeld,
          totalAttended,
          percentage: totalHeld > 0 ? parseFloat(((totalAttended / totalHeld) * 100).toFixed(2)) : 0,
          subjects,
        });
      }
    }
  });

  return results;
}

function parsePreviousSemestersMarks(html) {
  const $ = cheerio.load(html);
  const result = {
    cgpa: null,
    cgpaCredits: null,
    cgpaPercentage: null,
    externalMarks: [],
    internalMarks: [],
  };

  $('span.reportHeading2, .reportHeading2').each((_, el) => {
    const t = $(el).text().replace(/\u00a0/g, ' ').trim();
    if (!t.startsWith('CGPA:')) return;
    const cgpaM = t.match(/CGPA:\s*([\d.]+)/);
    const credM = t.match(/Credits:([\d/]+)/);
    const pctM = t.match(/([\d.]+)\s*%/);
    if (cgpaM) result.cgpa = parseFloat(cgpaM[1]);
    if (credM) result.cgpaCredits = credM[1];
    if (pctM) result.cgpaPercentage = parseFloat(pctM[1]);
  });

  let extStartEl = null;
  $('span, td, b, center').each((_, el) => {
    const t = $(el).text().trim().toUpperCase();
    if (t === 'EXTERNAL MARKS') { extStartEl = el; return false; }
  });

  if (extStartEl) {
    const attIdx = html.indexOf('PREVIOUS SEMESTERS ATTENDANCE');
    const extEndIdx = attIdx > 0 ? attIdx : html.length;
    const extHtml = html.substring(html.indexOf('EXTERNAL MARKS'), extEndIdx);
    const $ext = cheerio.load(extHtml);

    $ext('span.reportHeading2').each((_, span) => {
      const label = $ext(span).text().replace(/\u00a0/g, ' ').trim();
      if (!label.includes('Semester') && !label.includes('semester')) return;

      const nextTable = $ext(span).nextAll('table').first();
      if (!nextTable.length) return;

      const rows = nextTable.find('tr');
      if (rows.length < 2) return;

      const headers = [];
      rows.eq(0).find('td').each((_, td) => headers.push($ext(td).text().trim()));

      const gradeRow = [];
      rows.eq(1).find('td').each((_, td) => gradeRow.push($ext(td).text().trim()));

      const creditRow = [];
      if (rows.length > 2) {
        rows.eq(2).find('td').each((_, td) => creditRow.push($ext(td).text().trim()));
      }

      const sgpaIdx = headers.findIndex((h) => h.toUpperCase() === 'SGPA');
      const sgpa = sgpaIdx >= 0 && gradeRow[sgpaIdx] ? parseFloat(gradeRow[sgpaIdx]) || null : null;

      const subjects = [];
      for (let i = 1; i < headers.length; i++) {
        const name = headers[i];
        if (!name || name.toUpperCase() === 'SGPA') continue;
        subjects.push({
          name,
          grade: gradeRow[i] || null,
          credits: creditRow[i] || null,
        });
      }

      result.externalMarks.push({ semesterLabel: label, sgpa, subjects });
    });
  }

  let internalStartCell = null;
  $('td, b').each((_, el) => {
    const t = $(el).text().trim().toUpperCase();
    if (t.includes('PREVIOUS SEMESTERS INTERNAL MARKS')) {
      internalStartCell = el;
      return false;
    }
  });

  if (internalStartCell) {
    const parentRow = $(internalStartCell).closest('tr');
    parentRow.nextAll('tr').each((_, tr) => {
      const semLabel = $(tr).filter('.reportHeading2').find('td').text().trim() ||
        ($(tr).hasClass('reportHeading2') ? $(tr).find('td').text().trim() : null);

      if (semLabel && (semLabel.includes('Semester') || semLabel.includes('semester'))) {
        const nextDataRow = $(tr).next('tr');
        const innerTable = nextDataRow.find('table').first();
        if (!innerTable.length) return;

        const innerRows = innerTable.find('tr');
        if (innerRows.length < 2) return;

        const examHeaders = [];
        innerRows.eq(0).find('td').each((_, td) => examHeaders.push($(td).text().trim()));
        const subjectNames = examHeaders.slice(1);

        const exams = [];
        innerRows.slice(1).each((_, row) => {
          const cells = [];
          $(row).find('td').each((_, td) => {
            const v = $(td).text().replace(/\u00a0/g, '').trim();
            cells.push(v || null);
          });
          const examName = cells[0];
          if (!examName) return;
          const subjects = subjectNames.map((name, i) => ({
            name,
            marks: cells[i + 1] !== undefined ? (cells[i + 1] || null) : null,
          }));
          exams.push({ examName, subjects });
        });

        result.internalMarks.push({ semesterLabel: semLabel, exams });
      }
    });
  }

  return result;
}

function parseSpfBands(html) {
  const $ = cheerio.load(html);
  const bands = [];
  const table = $('#divProfile_SPF table').first();
  if (!table.length) return bands;

  let currentLabel = null;
  table.find('tr').each((idx, tr) => {
    if (idx === 0) return;
    const cells = [];
    $(tr).find('td').each((_, td) => {
      cells.push($(td).text().replace(/\u00a0/g, ' ').trim());
    });
    if (cells.length === 0) return;

    let semesterLabel;
    let cycle;
    let band;
    if (cells.length >= 3) {
      semesterLabel = cells[0];
      cycle = parseInt(cells[1], 10);
      band = cells[2];
      currentLabel = semesterLabel;
    } else if (cells.length === 2 && currentLabel) {
      semesterLabel = currentLabel;
      cycle = parseInt(cells[0], 10);
      band = cells[1];
    } else {
      return;
    }

    if (!semesterLabel || !Number.isFinite(cycle) || !band) return;
    const { academicYear, semester } = parseTermLabel(semesterLabel);
    bands.push({
      semesterLabel,
      cycle,
      band: String(band).trim().toUpperCase(),
      academicYear,
      semester,
    });
  });

  return bands;
}

function parseTransposedRegister(headers, rows) {
  const dateColumns = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    const m = h.match(/^(\d{1,2})[/-](\d{1,2})$/);
    if (m) {
      const day = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const monthNum = parseInt(month, 10);

      let year = currentYear;
      if (monthNum > 10 && currentMonth < 2) {
        year = currentYear - 1;
      } else if (monthNum < 3 && currentMonth > 9) {
        year = currentYear + 1;
      }

      const isoDate = `${year}-${month}-${day}`;
      dateColumns.push({ colIdx: i, dateStr: h, isoDate });
    }
  }

  if (dateColumns.length === 0) {
    return [];
  }

  let subjectColIdx = 1;
  for (let i = 0; i < Math.min(headers.length, 3); i++) {
    const h = headers[i].toUpperCase();
    if (h === 'SUBJECT' || h === 'SUBJECTS' || h === 'COURSE') {
      subjectColIdx = i;
      break;
    }
  }

  const subjectRows = [];
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r];
    let name = (cells[subjectColIdx] || '').trim();
    if (!name || name === '-') continue;
    if (/^(TOTAL|S\.?\s*NO|SL\.?\s*NO)$/i.test(name)) continue;

    if (/^\d+$/.test(name) && cells.length > subjectColIdx + 1) {
      const altName = (cells[subjectColIdx + 1] || '').trim();
      if (altName && altName !== '-' && !/^\d+$/.test(altName)) {
        name = altName;
      } else {
        continue;
      }
    }

    subjectRows.push({ name, rowCells: cells });
  }

  const dateMap = new Map();

  for (const dc of dateColumns) {
    const dayData = {
      date: dc.isoDate,
      subjects: [],
      totalHeld: 0,
      totalAttended: 0,
    };

    for (const sr of subjectRows) {
      const cellValue = (sr.rowCells[dc.colIdx] || '').trim();
      if (!cellValue || cellValue === '-') continue;

      const markers = cellValue.split(/\s+/).filter((m) => /^[PApa]$/i.test(m));
      if (markers.length === 0) continue;

      for (const marker of markers) {
        const isPresent = marker.toUpperCase() === 'P';
        dayData.subjects.push({
          name: sr.name,
          status: isPresent ? 'P' : 'A',
        });
        dayData.totalHeld++;
        if (isPresent) dayData.totalAttended++;
      }
    }

    if (dayData.totalHeld > 0) {
      dateMap.set(dc.isoDate, dayData);
    }
  }

  const records = [];
  for (const [isoDate, data] of dateMap) {
    records.push({
      date: isoDate,
      subjects: data.subjects,
      dailyStats: {
        totalHeld: data.totalHeld,
        totalAttended: data.totalAttended,
        percentage: data.totalHeld > 0
          ? parseFloat(((data.totalAttended / data.totalHeld) * 100).toFixed(2))
          : 0,
      },
    });
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  parseTermLabel,
  parseAttendanceHtml,
  parsePreviousSemestersAttendance,
  parsePreviousSemestersMarks,
  parseSpfBands,
  parseTransposedRegister,
  extractStudentNameFromHtml,
  extractBranchFromHtml,
  extractCurrentSemesterLabelFromHtml,
};
