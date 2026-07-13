'use strict';

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');
const crypto = require('crypto');
const config = require('../../config');
const logger = require('../../utils/logger');
const parser = require('./parser');

// AES-128-CBC constants used by the ERP login page's own client-side JS.
// Copied from the ERP vendor's page source.
const AES_KEY = process.env.ERP_AES_KEY || '8701661282118308';
const AES_IV = process.env.ERP_AES_IV || '8701661282118308';

const ERP_BASE_URL = process.env.ERP_BASE_URL || 'https://www.webprosindia.com/hitam/';
const ERP_LOGIN_URL = process.env.ERP_LOGIN_URL || 'https://www.webprosindia.com/hitam/default.aspx';
const HTTP_TIMEOUT = config.scraper.httpTimeoutMs;

const SUPPORTED_MODULES = ['profile', 'attendance', 'marks', 'semester', 'photo'];

class ScraperError extends Error {
  constructor(message, module, cause) {
    super(message);
    this.name = 'ScraperError';
    this.module = module || null;
    if (cause) this.cause = cause;
  }
}

function encryptPassword(plaintext) {
  const key = Buffer.from(AES_KEY, 'utf8');
  const iv = Buffer.from(AES_IV, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  return enc;
}

function extractHiddenFields($) {
  const fields = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) fields[name] = value;
  });
  return fields;
}

function decodeAjaxHtml(raw) {
  if (typeof raw !== 'string') return '';
  if (!(raw.startsWith("'") || raw.startsWith('"'))) return raw;
  return raw.slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\');
}

class ScraperClient {
  _createSession() {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar,
      withCredentials: true,
      maxRedirects: 10,
      timeout: HTTP_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    }));
    return { jar, client };
  }

  async _login(session, rollNumber, password) {
    let loginPageResp;
    try {
      loginPageResp = await session.client.get(ERP_LOGIN_URL);
    } catch (err) {
      throw new ScraperError(`ERP unavailable: failed to load login page (${err.message})`, null, err);
    }

    const $page = cheerio.load(loginPageResp.data);
    const hiddenFields = extractHiddenFields($page);

    const encPwd = encryptPassword(password);
    const form = new URLSearchParams();

    for (const [key, val] of Object.entries(hiddenFields)) {
      if (!key.startsWith('hdnpwd')) form.append(key, val);
    }

    form.append('txtId2', rollNumber);
    form.append('txtPwd2', encPwd);
    form.append('hdnpwd2', encPwd);
    form.append('txtId1', '');
    form.append('txtPwd1', '');
    form.append('hdnpwd1', '');
    form.append('txtId3', '');
    form.append('txtPwd3', '');
    form.append('hdnpwd3', '');
    form.append('imgBtn2.x', '50');
    form.append('imgBtn2.y', '15');

    let loginResp;
    try {
      loginResp = await session.client.post(
        ERP_LOGIN_URL,
        form.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: ERP_LOGIN_URL,
            Origin: new URL(ERP_LOGIN_URL).origin,
          },
          maxRedirects: 10,
          validateStatus: (s) => s >= 200 && s < 400,
        },
      );
    } catch (err) {
      throw new ScraperError(`ERP unavailable: login request failed (${err.message})`, null, err);
    }

    const $resp = cheerio.load(loginResp.data);

    for (const sel of ['#lblError', '#lblMsg', '#lblMessage', '.alert-danger', '.error']) {
      const txt = $resp(sel).text().trim();
      if (txt) throw new ScraperError(`Login failed: ${txt}`, null);
    }

    const stillOnLogin = $resp('#txtId2').length > 0 && $resp('#imgBtn2').length > 0;
    if (stillOnLogin) {
      const bodySnippet = $resp('body').text().substring(0, 500).toLowerCase();
      if (bodySnippet.includes('invalid') || bodySnippet.includes('incorrect')) {
        throw new ScraperError('Login failed: Invalid username or password', null);
      }
      throw new ScraperError('Login failed: Credentials rejected (still on login page)', null);
    }
  }

  async _logout(session) {
    try {
      await session.client.get(ERP_BASE_URL + 'logout.aspx', {
        validateStatus: () => true,
        timeout: 5000,
      });
    } catch (err) {
      logger.warn({ err: err.message }, '[ScraperClient] logout failed (non-fatal)');
    } finally {
      try {
        session.jar.removeAllCookiesSync();
      } catch (_) {
        // best-effort
      }
    }
  }

  async _postAjax(session, url, bodyLines, referer, moduleForError) {
    let resp;
    try {
      resp = await session.client.post(url, bodyLines.join('\r\n'), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: referer,
        },
        validateStatus: (s) => s >= 200 && s < 400,
      });
    } catch (err) {
      throw new ScraperError(`ERP unavailable: AJAX request failed (${err.message})`, moduleForError, err);
    }

    const raw = typeof resp.data === 'string' ? resp.data : '';
    if (raw.includes('ajax_error')) {
      const m = raw.match(/ajax_error\([^,]+,\s*['"]([^'"]+)['"]/);
      throw new ScraperError(`ERP AJAX error: ${m ? m[1] : 'unknown'}`, moduleForError);
    }
    return decodeAjaxHtml(raw);
  }

  async _fetchAttendanceHtml(session, rollNumber, subjecttype) {
    const ajaxUrl = ERP_BASE_URL +
      'ajax/StudentAttendance,App_Web_studentattendance.aspx.a2a1b31c.ashx' +
      '?_method=ShowAttendance&_session=r';
    return this._postAjax(
      session,
      ajaxUrl,
      [
        `rollNo=${encodeURIComponent(rollNumber)}`,
        'fromDate=',
        'toDate=',
        `subjecttype=${subjecttype}`,
      ],
      ERP_BASE_URL + 'Academics/StudentAttendance.aspx',
      'attendance',
    );
  }

  async _fetchProfileHtml(session, rollNumber, moduleForError) {
    const ajaxUrl = ERP_BASE_URL +
      'ajax/StudentProfile,App_Web_studentprofile.aspx.a2a1b31c.ashx' +
      '?_method=ShowStudentProfileNew&_session=rw';
    return this._postAjax(
      session,
      ajaxUrl,
      [
        `RollNo=${encodeURIComponent(rollNumber)}`,
        'isImageDisplay=false',
      ],
      ERP_BASE_URL + 'Academics/StudentProfile.aspx',
      moduleForError,
    );
  }

  async _fetchProfile(session, rollNumber) {
    const html = await this._fetchProfileHtml(session, rollNumber, 'profile');
    const $ = cheerio.load(html);

    const name = parser.extractStudentNameFromHtml($);
    const branch = parser.extractBranchFromHtml($);
    const currentTermId = parser.extractCurrentSemesterLabelFromHtml($);

    let cgpa = null;
    let cgpaCredits = null;
    let cgpaPercentage = null;
    try {
      const marksData = parser.parsePreviousSemestersMarks(html);
      cgpa = marksData.cgpa;
      cgpaCredits = marksData.cgpaCredits;
      cgpaPercentage = marksData.cgpaPercentage;
    } catch (err) {
      logger.warn({ err: err.message }, '[ScraperClient] profile: cgpa parse failed (non-fatal)');
    }

    return {
      name: name || null,
      branch: branch || null,
      cgpa,
      cgpaCredits,
      cgpaPercentage,
      currentTermId: currentTermId || null,
    };
  }

  async _fetchAttendance(session, rollNumber) {
    const html = await this._fetchAttendanceHtml(session, rollNumber, 'B');

    if (html.includes('Database error') || html.includes('No attendance tables')) {
      return {
        termLabel: null,
        overallPercentage: 0,
        subjects: [],
        held: 0,
        attended: 0,
        studentName: null,
        erpDbError: true,
      };
    }

    const parsed = parser.parseAttendanceHtml(html);
    const overallPercentage = parsed.held > 0
      ? parseFloat(((parsed.attended / parsed.held) * 100).toFixed(2))
      : 0;

    return {
      termLabel: null,
      overallPercentage,
      subjects: parsed.subjects,
      held: parsed.held,
      attended: parsed.attended,
      studentName: parsed.studentName || null,
      erpDbError: false,
    };
  }

  async _fetchMarks(session, rollNumber) {
    const html = await this._fetchProfileHtml(session, rollNumber, 'marks');
    const marksData = parser.parsePreviousSemestersMarks(html);
    const spfBands = parser.parseSpfBands(html);

    const exams = [];

    for (const sem of marksData.externalMarks) {
      exams.push({
        examId: `EXTERNAL-${sem.semesterLabel}`,
        title: 'External Marks',
        term: sem.semesterLabel,
        sgpa: sem.sgpa,
        items: sem.subjects.map((s) => ({
          code: null,
          name: s.name,
          grade: s.grade,
          credits: s.credits,
        })),
      });
    }

    for (const sem of marksData.internalMarks) {
      for (const exam of sem.exams) {
        exams.push({
          examId: `INTERNAL-${exam.examName}-${sem.semesterLabel}`,
          title: exam.examName,
          term: sem.semesterLabel,
          items: exam.subjects.map((s) => ({
            code: null,
            name: s.name,
            scored: s.marks,
          })),
        });
      }
    }

    return { exams, spfBands };
  }

  async _fetchSemester(session, rollNumber) {
    const html = await this._fetchProfileHtml(session, rollNumber, 'semester');
    const $ = cheerio.load(html);

    const currentTermId = parser.extractCurrentSemesterLabelFromHtml($) || null;
    const rawSemesters = parser.parsePreviousSemestersAttendance(html);

    const previousSemesters = rawSemesters
      .map((sem) => {
        const { academicYear, semester } = parser.parseTermLabel(sem.semester);
        return {
          semesterLabel: sem.semester,
          academicYear,
          semester,
          totalHeld: sem.totalHeld,
          totalAttended: sem.totalAttended,
          percentage: sem.percentage,
          subjects: sem.subjects,
        };
      })
      .filter((sem) => sem.totalHeld > 0);

    return { currentTermId, previousSemesters };
  }

  async _fetchPhoto(session, rollNumber) {
    const html = await this._fetchProfileHtml(session, rollNumber, 'photo');
    const $ = cheerio.load(html);

    const imgSrc = $('img').first().attr('src');
    if (!imgSrc) {
      throw new ScraperError('Profile photo not found in ERP response (no <img> element)', 'photo');
    }

    let photoUrl = imgSrc.trim();
    if (photoUrl.startsWith('/')) {
      photoUrl = new URL(photoUrl, ERP_BASE_URL).toString();
    }

    let resp;
    try {
      resp = await session.client.get(photoUrl, {
        responseType: 'arraybuffer',
        timeout: HTTP_TIMEOUT,
        validateStatus: (s) => s >= 200 && s < 300,
      });
    } catch (err) {
      throw new ScraperError(`Failed to download profile photo (${err.message})`, 'photo', err);
    }

    const buffer = Buffer.from(resp.data);
    if (!buffer || buffer.length === 0) {
      throw new ScraperError('Profile photo download returned empty body', 'photo');
    }

    let contentType = String(resp.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    let ext = null;
    const extMatch = photoUrl.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    if (extMatch) ext = extMatch[1].toLowerCase();

    if (contentType === 'image/jpg') contentType = 'image/jpeg';
    if (!contentType || !['image/jpeg', 'image/png'].includes(contentType)) {
      if (ext === 'png') contentType = 'image/png';
      else contentType = 'image/jpeg';
    }
    if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
      ext = contentType === 'image/png' ? 'png' : 'jpg';
    }
    if (ext === 'jpeg') ext = 'jpg';

    return {
      contentType,
      ext,
      bytesBase64: buffer.toString('base64'),
    };
  }

  async fetch(module, credential) {
    if (!SUPPORTED_MODULES.includes(module)) {
      throw new ScraperError(`Unsupported module: ${module}`, module);
    }
    if (!credential || !credential.rollNumber || !credential.password) {
      throw new ScraperError('credential.rollNumber and credential.password are required', module);
    }

    const session = await this.login(credential.rollNumber, credential.password);
    try {
      return await this._dispatch(module, session, credential.rollNumber);
    } finally {
      await this.logout(session);
    }
  }

  async _dispatch(module, session, rollNumber) {
    switch (module) {
      case 'profile':
        return await this._fetchProfile(session, rollNumber);
      case 'attendance':
        return await this._fetchAttendance(session, rollNumber);
      case 'marks':
        return await this._fetchMarks(session, rollNumber);
      case 'semester':
        return await this._fetchSemester(session, rollNumber);
      case 'photo':
        return await this._fetchPhoto(session, rollNumber);
      default:
        throw new ScraperError(`Unsupported module: ${module}`, module);
    }
  }

  async login(rollNumber, password) {
    if (!rollNumber || !password) {
      throw new ScraperError('rollNumber and password are required', null);
    }
    const session = this._createSession();
    await this._login(session, rollNumber, password);
    session.rollNumber = rollNumber;
    return session;
  }

  async fetchProfile(session) {
    return this._fetchProfile(session, session.rollNumber);
  }

  async fetchAttendance(session, rollNumber) {
    return this._fetchAttendance(session, rollNumber || session.rollNumber);
  }

  async fetchPreviousSemesters(session, rollNumber) {
    return this._fetchSemester(session, rollNumber || session.rollNumber);
  }

  async logout(session) {
    return this._logout(session);
  }
}

module.exports = ScraperClient;
module.exports.ScraperClient = ScraperClient;
module.exports.ScraperError = ScraperError;
module.exports.SUPPORTED_MODULES = SUPPORTED_MODULES;
