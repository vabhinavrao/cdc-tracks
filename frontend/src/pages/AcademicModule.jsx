// src/pages/AcademicModule.jsx
import { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Calendar, Award, AlertCircle, CheckCircle2, 
  RefreshCw, Lock, BookOpen, TrendingUp, Loader2, Info, 
  ChevronRight, ArrowRight, ShieldAlert, Sparkles, BookMarked, UserCheck
} from 'lucide-react';
import { getAcademicSummary, registerERP, refreshERP } from '../services/academicApi';

// Define the sub-views available in Academic layout
const TABS = [
  { id: 'dashboard', label: 'Academic Dashboard', icon: BookOpen, active: true },
  { id: 'attendance', label: 'Attendance Details', icon: BookMarked, active: true },
  { id: 'marks', label: 'Semester Grades', icon: Award, active: true },
  { id: 'spf', label: 'SPF Band Analyzer', icon: TrendingUp, active: true },
  { id: 'timetable', label: 'Class Timetable', icon: Calendar, active: false, badge: 'Soon' }
];

export default function AcademicModule({ user }) {
  // Main state machine variables
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeInternalTab, setActiveInternalTab] = useState('cie-1');
  const [isFading, setIsFading] = useState(false);
  
  // Registration form states
  const [password, setPassword] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Polling tracker
  const pollTimerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load summary on mount
  useEffect(() => {
    fetchSummary(true);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Adjust active tab state dynamically if current selection is not available (Rules of Hooks safe)
  useEffect(() => {
    if (!data?.data) return;
    const academicDataObj = data.data;
    const marksList = academicDataObj.marks || [];
    const attendanceObj = academicDataObj.attendance || {};
    const spfBandsList = academicDataObj.spfBands || [];
    
    // Sort semesters to find current
    const allSemSet = new Set();
    if (Array.isArray(attendanceObj.previous_semesters)) {
      attendanceObj.previous_semesters.forEach(s => {
        if (s.semesterLabel) allSemSet.add(s.semesterLabel);
      });
    }
    if (attendanceObj.semesterLabel) {
      allSemSet.add(attendanceObj.semesterLabel);
    }
    if (Array.isArray(marksList)) {
      marksList.forEach(exam => {
        if (exam.term) allSemSet.add(exam.term);
      });
    }
    if (Array.isArray(spfBandsList)) {
      spfBandsList.forEach(b => {
        if (b.semesterLabel) allSemSet.add(b.semesterLabel);
      });
    }

    const semsSorted = Array.from(allSemSet).sort((a, b) => {
      const semA = parseSemester(a);
      const semB = parseSemester(b);
      if (semA.year !== semB.year) return semA.year - semB.year;
      return semA.sem - semB.sem;
    });

    const currSem = academicDataObj.student?.currentSemester || attendanceObj.semesterLabel || semsSorted[semsSorted.length - 1] || 'III-I';
    const completedSems = semsSorted.filter(sem => sem !== currSem);
    const activeSem = selectedSemester || completedSems[completedSems.length - 1] || '';

    if (!activeSem) return;

    const semExams = marksList.filter(exam => exam.term === activeSem);
    const hasC1 = semExams.some(e => e.title?.includes('CIE-A1') || e.title?.includes('CIE-B1') || e.title?.includes('CIE-C1'));
    const hasC2 = semExams.some(e => e.title?.includes('CIE-A2') || e.title?.includes('CIE-B2') || e.title?.includes('CIE-C2'));
    const hasAssign = semExams.some(e => e.title?.includes('CIE-C1') || e.title?.includes('CIE-C2') || e.title?.toLowerCase().includes('assignment'));
    const hasLb = semExams.some(e => e.examId?.startsWith('INTERNAL') && !e.title?.includes('CIE-A') && !e.title?.includes('CIE-B') && !e.title?.includes('CIE-C'));

    const tabs = [];
    if (hasC1) tabs.push('cie-1');
    if (hasC2) tabs.push('cie-2');
    if (hasAssign) tabs.push('assignment');
    if (hasLb) tabs.push('lab');

    if (tabs.length > 0 && !tabs.includes(activeInternalTab)) {
      setActiveInternalTab(tabs[0]);
    }
  }, [selectedSemester, data, activeInternalTab]);

  const fetchSummary = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const summary = await getAcademicSummary();
      setData(summary);
      setError('');
      
      // If sync status is active or queued, start polling
      if (summary.registered && (summary.syncStatus === 'active' || summary.syncStatus === 'queued')) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to communicate with academic servers.');
    } finally {
      if (initial) setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      try {
        const summary = await getAcademicSummary();
        setData(summary);
        if (!summary.registered || (summary.syncStatus !== 'active' && summary.syncStatus !== 'queued')) {
          stopPolling();
        }
      } catch (e) {
        console.error('Polling failed:', e);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!password) {
      setRegisterError('Please enter your university portal password.');
      return;
    }
    setSubmittingRegister(true);
    setRegisterError('');
    try {
      await registerERP(password);
      // Immediately pull fresh summary
      await fetchSummary(true);
    } catch (err) {
      console.error(err);
      setRegisterError(err.response?.data?.detail?.message || 'Verification failed. Please check your password and try again.');
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleManualSync = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshERP();
      await fetchSummary(false);
    } catch (err) {
      console.error(err);
      alert('Unable to refresh academic records. Please try again later.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Gracefully handle UI states
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 animate-pulse">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Fetching academic profile and synchronizing credentials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm">
          <ShieldAlert className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Academic Gateway Offline</h3>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            {error || 'The connection to the academic data service (ADS) was refused. Please verify the backend network settings.'}
          </p>
          <button 
            onClick={() => fetchSummary(true)} 
            className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm shadow-md"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // 1. UNREGISTERED STATE (Link ERP Form)
  const isUnregistered = !data?.registered;
  const isCredentialError = data?.registered && data?.syncStatus === 'failed' && data?.errorCode === 'INVALID_CREDENTIALS';

  if (isUnregistered || isCredentialError) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Link University ERP Account</h2>
              <p className="text-slate-500 text-sm">Synchronize attendance, academic results, and performance bands</p>
            </div>
          </div>

          {isCredentialError && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">Authentication Failed</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  The university portal rejected your credentials. Please enter your correct JNTU ERP portal password below.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 space-y-3.5">
            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Student Roll Number</span>
              <span className="font-bold text-slate-800 uppercase bg-slate-200/50 px-3 py-1 rounded-md tracking-wider">
                {user?.roll_number || '25E51A05V0'}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-slate-500 leading-relaxed">
              <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                Your roll number is extracted from your secure login session. We only require your password to query live university databases on your behalf.
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">JNTU Portal Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter ERP Portal Password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none transition-all font-medium text-slate-800"
              />
              {registerError && (
                <p className="text-red-500 text-xs font-semibold mt-2 flex items-center gap-1.5 animate-bounce">
                  <AlertCircle size={14} />
                  {registerError}
                </p>
              )}
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-4 flex gap-3 text-xs text-blue-800 border border-blue-100/50">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h5 className="font-bold mb-0.5">Enterprise Security & Vaulting</h5>
                <p className="leading-relaxed">
                  Credentials are encrypted using industry-standard AES-256 keys and securely vaulted in the academic backend. They are strictly forwarded to the university portal to scrape records, and never shared.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingRegister}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submittingRegister ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Syncing...</span>
                </>
              ) : (
                <>
                  <span>Link Account & Sync Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. PROVISIONING STATE (Syncing in Background)
  const isProvisioning = data?.syncStatus === 'active' || data?.syncStatus === 'queued';
  if (isProvisioning) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600 animate-pulse"></div>
          
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800">Synchronizing Academic Profile</h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">
            Our background scraping workers are connecting to the university server, validating your session, and extracting historical records. This may take up to 2 minutes on first link.
          </p>

          <div className="mt-8 space-y-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-[shimmer_2s_infinite]" style={{ width: '65%' }}></div>
            </div>
            
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
              <span>Validating Portal Session</span>
              <span className="text-blue-600">Scraping Academic Summary (65%)</span>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex justify-center gap-4 text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 size={14} /> ERP Authed
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 animate-pulse">
              <Loader2 size={14} className="animate-spin" /> Attendance & Marks Syncing
            </span>
          </div>
        </div>
      </div>
    );
  }
  // 3. READY STATE (Displaying Academic Dashboard)
  const academicData = data?.data || {};
  const attendance = academicData.attendance || { overallPercentage: 0, held: 0, attended: 0, subjects: [] };
  const marks = academicData.marks || [];
  const spfBands = academicData.spfBands || [];
  const student = academicData.student || {};

  // Roman numerals parsing helper for sorting semesters chronologically
  const parseSemester = (semStr) => {
    if (!semStr) return { year: 0, sem: 0 };
    const parts = semStr.split('/');
    const yearRoman = parts[0]?.trim() || '';
    const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4 };
    const year = romanMap[yearRoman] || 1;
    const semIndex = semStr.toLowerCase().includes('ii semester') ? 2 : 1;
    return { year, sem: semIndex };
  };

  const formatShortSem = (label) => {
    if (!label) return '';
    const parts = label.split('/');
    const year = parts[0]?.trim() || 'I';
    const sem = label.toLowerCase().includes('ii semester') ? 'II' : 'I';
    return `${year}-${sem}`;
  };

  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Build unique semester list
  const allSemestersSet = new Set();
  if (Array.isArray(attendance.previous_semesters)) {
    attendance.previous_semesters.forEach(s => {
      if (s.semesterLabel) allSemestersSet.add(s.semesterLabel);
    });
  }
  if (attendance.semesterLabel) {
    allSemestersSet.add(attendance.semesterLabel);
  }
  if (Array.isArray(marks)) {
    marks.forEach(exam => {
      if (exam.term) allSemestersSet.add(exam.term);
    });
  }
  if (Array.isArray(spfBands)) {
    spfBands.forEach(b => {
      if (b.semesterLabel) allSemestersSet.add(b.semesterLabel);
    });
  }

  const semestersSorted = Array.from(allSemestersSet).sort((a, b) => {
    const semA = parseSemester(a);
    const semB = parseSemester(b);
    if (semA.year !== semB.year) return semA.year - semB.year;
    return semA.sem - semB.sem;
  });

  // Current Semester Info
  const currentSem = student.currentSemester || attendance.semesterLabel || semestersSorted[semestersSorted.length - 1] || 'III-I';

  // Completed Semesters List for Results dropdown
  const completedSemList = semestersSorted.filter(sem => sem !== currentSem);

  const selectedSem = selectedSemester || completedSemList[completedSemList.length - 1] || '';

  // Current Semester Live Attendance (always static and distinct from dropdown selection)
  const liveAttendance = {
    overallPercentage: parseFloat(attendance.overallPercentage || attendance.overall_percentage) || 0,
    held: attendance.held || 0,
    attended: attendance.attended || 0,
    subjects: attendance.subjects || []
  };

  const overallPercentage = liveAttendance.overallPercentage || 0;
  const isShortage = overallPercentage < 75;
  const strokeDash = 2 * Math.PI * 38; // radius = 38
  const strokeOffset = strokeDash - (strokeDash * overallPercentage) / 100;

  // Selected Semester SGPA
  const semesterExternalExam = marks.find(e => e.term === selectedSem && e.examId?.startsWith('EXTERNAL'));
  const semesterSgpa = semesterExternalExam?.sgpa ? semesterExternalExam.sgpa.toFixed(2) : 'N/A';

  // Selected Semester SPF Band
  const semesterSpfBands = spfBands.filter(b => b.semesterLabel === selectedSem);
  const semesterSpfBand = semesterSpfBands.length > 0 ? semesterSpfBands[semesterSpfBands.length - 1].band : 'N/A';

  // Overall CGPA
  const completedSemesters = marks
    .filter(exam => exam.sgpa && exam.examId?.startsWith('EXTERNAL'))
    .sort((a, b) => {
      const semA = parseSemester(a.term);
      const semB = parseSemester(b.term);
      if (semA.year !== semB.year) return semA.year - semB.year;
      return semA.sem - semB.sem;
    });
  const latestSgpa = completedSemesters.length > 0 ? completedSemesters[completedSemesters.length - 1].sgpa.toFixed(2) : 'N/A';
  const overallCgpa = student.cgpa || (completedSemesters.length > 0 ? (completedSemesters.reduce((acc, cur) => acc + (cur.sgpa || 0), 0) / completedSemesters.length).toFixed(2) : 'N/A');
  const creditsEarned = student.cgpaCredits || 'N/A';

  // Latest SPF Band Card Data
  const latestSpf = spfBands.length > 0 ? spfBands[spfBands.length - 1] : null;

  // Compute consolidated internal evaluations
  const getInternalMarksData = () => {
    const semesterExams = marks.filter(exam => exam.term === selectedSem);
    const subNames = new Set();
    semesterExams.forEach(exam => {
      if (exam.examId?.startsWith('INTERNAL')) {
        exam.items?.forEach(item => {
          if (item.name) subNames.add(item.name);
        });
      }
    });

    return Array.from(subNames).map(subName => {
      const subNorm = normalizeName(subName);

      // CIE-1 = CIE-A1 + CIE-B1
      const desc1 = semesterExams.find(e => e.title?.includes('CIE-A1'));
      const obj1 = semesterExams.find(e => e.title?.includes('CIE-B1'));
      const desc1Val = desc1?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;
      const obj1Val = obj1?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;

      let cie1Scored = null;
      if ((desc1Val !== undefined && desc1Val !== null) || (obj1Val !== undefined && obj1Val !== null)) {
        cie1Scored = (parseFloat(desc1Val) || 0) + (parseFloat(obj1Val) || 0);
      }

      // CIE-2 = CIE-A2 + CIE-B2
      const desc2 = semesterExams.find(e => e.title?.includes('CIE-A2'));
      const obj2 = semesterExams.find(e => e.title?.includes('CIE-B2'));
      const desc2Val = desc2?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;
      const obj2Val = obj2?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;

      let cie2Scored = null;
      if ((desc2Val !== undefined && desc2Val !== null) || (obj2Val !== undefined && obj2Val !== null)) {
        cie2Scored = (parseFloat(desc2Val) || 0) + (parseFloat(obj2Val) || 0);
      }

      // Assignment = CIE-C1 + CIE-C2
      const assign1 = semesterExams.find(e => e.title?.includes('CIE-C1'));
      const assign2 = semesterExams.find(e => e.title?.includes('CIE-C2'));
      const assign1Val = assign1?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;
      const assign2Val = assign2?.items?.find(i => normalizeName(i.name) === subNorm)?.scored;

      let assignScored = null;
      if ((assign1Val !== undefined && assign1Val !== null) || (assign2Val !== undefined && assign2Val !== null)) {
        assignScored = (parseFloat(assign1Val) || 0) + (parseFloat(assign2Val) || 0);
      }

      // Total Internal
      let totalScored = null;
      if (cie1Scored !== null || cie2Scored !== null || assignScored !== null) {
        totalScored = (cie1Scored || 0) + (cie2Scored || 0) + (assignScored || 0);
      }

      // Status calculation based on total (out of 80)
      let status = '—';
      let statusColor = 'text-slate-400';
      if (totalScored !== null) {
        const ratio = totalScored / 80;
        if (ratio >= 0.75) {
          status = 'Excellent';
          statusColor = 'text-green-600 bg-green-50 border-green-100';
        } else if (ratio >= 0.50) {
          status = 'Average';
          statusColor = 'text-amber-600 bg-amber-50 border-amber-100';
        } else {
          status = 'Needs Attention';
          statusColor = 'text-orange-600 bg-orange-50 border-orange-100';
        }
      }

      return {
        subject: subName,
        cie1: cie1Scored !== null ? cie1Scored : '—',
        cie2: cie2Scored !== null ? cie2Scored : '—',
        assignment: assignScored !== null ? assignScored : '—',
        total: totalScored !== null ? totalScored : '—',
        status,
        statusColor
      };
    });
  };

  const internalMarksData = getInternalMarksData();

  const handleSemesterChange = (e) => {
    const val = e.target.value;
    setIsFading(true);
    setTimeout(() => {
      setSelectedSemester(val);
      setIsFading(false);
    }, 200);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Sync Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Semester</span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">{currentSem}</h1>
            <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase">Live</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Semester Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1 rounded-xl">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider pl-2.5">Viewing Academic Results</span>
            <select
              value={selectedSem}
              onChange={handleSemesterChange}
              className="bg-white border border-slate-150 text-slate-700 font-extrabold text-xs rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-blue-500 shadow-sm transition-all cursor-pointer"
            >
              {completedSemList.map((sem, idx) => (
                <option key={idx} value={sem}>
                  {formatShortSem(sem)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <RefreshCw size={12} className={`transition-transform duration-700 ${isRefreshing ? 'rotate-180' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync ERP'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-10 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: Academic Snapshot (35% width) */}
        <div className="md:col-span-4 lg:col-span-4 space-y-4">
          
          {/* Card 1: Live Attendance progress */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden">
            <div className="w-full flex justify-between items-start">
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Attendance</span>
                <span className="text-[11px] font-bold text-slate-600 mt-0.5">{formatShortSem(currentSem)} (Live)</span>
              </div>
              <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isShortage ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
              }`}>
                {isShortage ? 'Shortage' : 'On Track'}
              </span>
            </div>

            <div className="flex items-center justify-center my-3 relative">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="38" className="stroke-slate-100 fill-none" strokeWidth="6" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="38" 
                  className={`fill-none transition-all duration-1000 ${
                    isShortage ? 'stroke-red-500' : 'stroke-green-500'
                  }`} 
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-slate-800">{overallPercentage.toFixed(2)}%</span>
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Average</span>
              </div>
            </div>

            <div className="w-full flex justify-around border-t border-slate-100 pt-3 text-center">
              <div>
                <span className="block text-xs font-extrabold text-slate-800">{liveAttendance.attended}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Attended</span>
              </div>
              <div className="border-r border-slate-100 my-1"></div>
              <div>
                <span className="block text-xs font-extrabold text-slate-800">{liveAttendance.held}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Held</span>
              </div>
              <div className="border-r border-slate-100 my-1"></div>
              <div>
                <span className="block text-xs font-extrabold text-slate-800">{liveAttendance.held - liveAttendance.attended}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Missed</span>
              </div>
            </div>

            <div className="w-full text-center mt-2.5 pt-2 border-t border-slate-100 text-[8px] text-slate-400 font-bold">
              Last Synced: {data?.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
            </div>
          </div>

          {/* Card 2: Academic Standing */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Academic Standing</span>
            
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-xl col-span-2">
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Overall CGPA</span>
                <span className="block text-xl font-extrabold text-slate-800 mt-0.5">{overallCgpa}</span>
                <span className="block text-[10px] text-slate-400 font-bold mt-1.5">Credits Earned: {creditsEarned}</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100/50 p-2 rounded-lg">
                <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-wider">Viewing Term</span>
                <span className="block text-[11px] font-extrabold text-slate-700 mt-0.5">{formatShortSem(selectedSem)}</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100/50 p-2 rounded-lg">
                <span className="block text-[7px] text-slate-400 font-bold uppercase tracking-wider">Term SGPA</span>
                <span className="block text-[11px] font-extrabold text-slate-700 mt-0.5">{semesterSgpa}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Semester SPF Band */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Semester SPF Band</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-slate-800">Band {semesterSpfBand}</span>
                <span className="text-[9px] font-bold text-slate-400">({formatShortSem(selectedSem)})</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Latest Status</span>
              <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[8px] mt-1 border ${
                latestSpf?.band === 'A' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'
              }`}>
                Band {latestSpf?.band || 'N/A'} (C{latestSpf?.cycle || '1'})
              </span>
            </div>
          </div>

          {/* Card 4: Horizontal SPF Progression Journey */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SPF Journey</span>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {spfBands.length === 0 ? (
                <span className="text-slate-400 text-[10px] font-bold py-1">No progression found</span>
              ) : (
                spfBands.map((b, idx) => {
                  const isA = b.band === 'A';
                  const isB = b.band === 'B';
                  const isC = b.band === 'C';
                  const bandColor = isA ? 'bg-green-50 text-green-600 border-green-100' :
                                    isB ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    isC ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-red-50 text-red-600 border-red-100';
                  
                  return (
                    <div key={idx} className="flex items-center shrink-0">
                      <div className="flex flex-col items-center text-center p-1.5 bg-slate-50 border border-slate-100 rounded-lg min-w-[64px]">
                        <span className="text-[8px] font-bold text-slate-700">{formatShortSem(b.semesterLabel)}</span>
                        <span className="text-[7px] text-slate-400 font-bold mt-0.5">Cycle {b.cycle}</span>
                        <span className={`px-1 py-0.5 rounded font-extrabold text-[8px] mt-1 border ${bandColor}`}>
                          Band {b.band}
                        </span>
                      </div>
                      {idx < spfBands.length - 1 && (
                        <div className="flex items-center justify-center text-slate-300 font-extrabold ml-2">
                          →
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Semester Workspace (65% width) */}
        <div className={`md:col-span-6 lg:col-span-8 space-y-4 transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Semester Results header */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">Academic Dashboard</span>
              <h2 className="text-xs font-extrabold text-slate-800 mt-0.5">Results: {formatShortSem(selectedSem)}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Semester SGPA</span>
                <span className="text-xs font-extrabold text-slate-800">{semesterSgpa}</span>
              </div>
              <div className="border-r border-slate-150 h-5"></div>
              <div className="text-center">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">SPF Band</span>
                <span className="text-xs font-extrabold text-slate-800">Band {semesterSpfBand}</span>
              </div>
            </div>
          </div>

          {/* Consolidated Evaluations Table (CIE-1, CIE-2, Assignment, Total in one view) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Internal Evaluations Summary</span>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-bold">Subject</th>
                    <th className="py-2.5 px-3 text-center font-bold">CIE-1 <span className="text-[8px] font-normal lowercase">(35)</span></th>
                    <th className="py-2.5 px-3 text-center font-bold">CIE-2 <span className="text-[8px] font-normal lowercase">(35)</span></th>
                    <th className="py-2.5 px-3 text-center font-bold">Assignment <span className="text-[8px] font-normal lowercase">(10)</span></th>
                    <th className="py-2.5 px-3 text-center font-bold">Total <span className="text-[8px] font-normal lowercase">(80)</span></th>
                    <th className="py-2.5 px-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {internalMarksData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400 font-medium">
                        No marks available for this semester.
                      </td>
                    </tr>
                  ) : (
                    internalMarksData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-700">{row.subject}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{row.cie1}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{row.cie2}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{row.assignment}</td>
                        <td className="py-2 px-3 text-center font-extrabold text-blue-600">{row.total}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`inline-block px-2 py-0.5 text-[8px] font-extrabold uppercase rounded border ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance Registry Table Card (Static Current Semester Registry) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Subject Attendance Registry ({formatShortSem(currentSem)})
            </span>
            
            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3 font-bold">Subject</th>
                    <th className="py-2 px-3 text-center font-bold">Attended</th>
                    <th className="py-2 px-3 text-center font-bold">Held</th>
                    <th className="py-2 px-3 font-bold">%</th>
                    <th className="py-2 px-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {liveAttendance.subjects.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400 font-medium">
                        No subject logs parsed.
                      </td>
                    </tr>
                  ) : (
                    liveAttendance.subjects.map((sub, idx) => {
                      const shortage = sub.percentage < 75;
                      const lowShortage = sub.percentage < 65;
                      const barColor = lowShortage ? 'bg-red-500' : shortage ? 'bg-amber-500' : 'bg-green-500';
                      const textColor = lowShortage ? 'text-red-600 bg-red-50 border-red-100' : shortage ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-green-600 bg-green-50 border-green-100';
                      const statusText = shortage ? 'Shortage' : 'On Track';
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-700">{sub.name}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{sub.attended}</td>
                          <td className="py-2 px-3 text-center">{sub.held}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-8 font-bold text-slate-600">{sub.percentage}%</span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${sub.percentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-block px-2 py-0.5 text-[8px] font-extrabold uppercase rounded border ${textColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}