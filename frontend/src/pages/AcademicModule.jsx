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
    return `${year}-${sem} Sem`;
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

  const selectedSem = selectedSemester || semestersSorted[semestersSorted.length - 1] || '';

  // Get dynamic data for selected semester
  const getSemesterAttendance = (sem) => {
    if (!sem) return { overallPercentage: 0, held: 0, attended: 0, subjects: [] };
    const isCurrent = sem === semestersSorted[semestersSorted.length - 1];
    
    if (isCurrent) {
      return {
        overallPercentage: parseFloat(attendance.overall_percentage || attendance.overallPercentage) || 0,
        held: attendance.held || 0,
        attended: attendance.attended || 0,
        subjects: attendance.subjects || []
      };
    }
    
    const prevSem = Array.isArray(attendance.previous_semesters)
      ? attendance.previous_semesters.find(s => s.semesterLabel === sem)
      : null;
      
    if (prevSem) {
      return {
        overallPercentage: parseFloat(prevSem.percentage) || 0,
        held: prevSem.totalHeld || 0,
        attended: prevSem.totalAttended || 0,
        subjects: prevSem.subjects || []
      };
    }
    
    return { overallPercentage: 0, held: 0, attended: 0, subjects: [] };
  };

  const semAttendance = getSemesterAttendance(selectedSem);
  
  // Selected Semester SGPA
  const semesterExternalExam = marks.find(e => e.term === selectedSem && e.examId?.startsWith('EXTERNAL'));
  const semesterSgpa = semesterExternalExam?.sgpa ? semesterExternalExam.sgpa.toFixed(2) : 'N/A';

  // Selected Semester SPF Band
  const semesterSpfBands = spfBands.filter(b => b.semesterLabel === selectedSem);
  const semesterSpfBand = semesterSpfBands.length > 0 ? semesterSpfBands[semesterSpfBands.length - 1].band : 'N/A';

  // Latest Completed SGPA & Overall CGPA Card Data
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
  const creditsEarned = student.cgpa_credits || 'N/A';

  // Latest SPF Band Card Data
  const latestSpf = spfBands.length > 0 ? spfBands[spfBands.length - 1] : null;

  // Semester Exams for current Workspace
  const semesterExams = marks.filter(exam => exam.term === selectedSem);

  // Compute internal marks table data
  const getInternalTabMarks = (tabId) => {
    return (semAttendance.subjects || []).map(sub => {
      let scored = null;
      let total = 0;
      const subNorm = normalizeName(sub.name);
      
      if (tabId === 'cie-1' || tabId === 'cie-2') {
        const cycle = tabId === 'cie-1' ? '1' : '2';
        const descExam = semesterExams.find(e => e.title?.includes(`CIE-A${cycle}`));
        const objExam = semesterExams.find(e => e.title?.includes(`CIE-B${cycle}`));
        const assignExam = semesterExams.find(e => e.title?.includes(`CIE-C${cycle}`));
        
        const descItem = descExam?.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
        const objItem = objExam?.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
        const assignItem = assignExam?.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
        
        const hasDesc = !!descItem && descItem.scored !== null;
        const hasObj = !!objItem && objItem.scored !== null;
        const hasAssign = !!assignItem && assignItem.scored !== null;
        
        if (hasDesc || hasObj || hasAssign) {
          const descVal = parseFloat(descItem?.scored) || 0;
          const objVal = parseFloat(objItem?.scored) || 0;
          const assignVal = parseFloat(assignItem?.scored) || 0;
          scored = descVal + objVal + assignVal;
          total = (descItem ? 25 : 0) + (objItem ? 10 : 0) + (assignItem ? 5 : 0);
        }
      } 
      else if (tabId === 'assignment') {
        const assign1Exam = semesterExams.find(e => e.title?.includes('CIE-C1'));
        const assign2Exam = semesterExams.find(e => e.title?.includes('CIE-C2'));
        const item1 = assign1Exam?.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
        const item2 = assign2Exam?.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
        
        if ((item1 && item1.scored !== null) || (item2 && item2.scored !== null)) {
          scored = (parseFloat(item1?.scored) || 0) + (parseFloat(item2?.scored) || 0);
          total = (item1 ? 5 : 0) + (item2 ? 5 : 0);
        }
      } 
      else if (tabId === 'lab') {
        const labExams = semesterExams.filter(e => !e.title?.includes('CIE-A') && !e.title?.includes('CIE-B') && !e.title?.includes('CIE-C'));
        let labScore = 0;
        let found = false;
        labExams.forEach(e => {
          const item = e.items?.find(i => normalizeName(i.name).includes(subNorm) || subNorm.includes(normalizeName(i.name)));
          if (item && item.scored !== null) {
            labScore += parseFloat(item.scored) || 0;
            found = true;
          }
        });
        if (found) {
          scored = labScore;
          total = 30;
        }
      }
      
      let status = 'Pending';
      let statusColor = 'bg-slate-50 text-slate-500';
      if (scored !== null && total > 0) {
        const ratio = scored / total;
        if (ratio >= 0.75) {
          status = 'Excellent';
          statusColor = 'bg-green-50 text-green-600';
        } else if (ratio >= 0.50) {
          status = 'Average';
          statusColor = 'bg-amber-50 text-amber-600';
        } else {
          status = 'Needs Focus';
          statusColor = 'bg-red-50 text-red-600';
        }
      }
      
      return {
        subject: sub.name,
        scored,
        total,
        status,
        statusColor
      };
    }).filter(row => row.scored !== null);
  };

  const internalMarksData = getInternalTabMarks(activeInternalTab);

  // Circle Gauge styling parameters
  const strokeDash = 2 * Math.PI * 54; // radius = 54
  const overallPercentage = semAttendance.overallPercentage || 0;
  const strokeOffset = strokeDash - (strokeDash * overallPercentage) / 100;
  const isShortage = overallPercentage < 75;

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
      {/* Top Section: Header & Sync Controls */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <GraduationCap size={14} />
            <span>Academic Portal</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-800 mt-0.5 font-sans">Student ERP Integration</h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Semester Selector Dropdown */}
          <div className="flex items-center gap-2 grow md:grow-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Semester</span>
            <select
              value={selectedSem}
              onChange={handleSemesterChange}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 transition-all grow md:grow-0 cursor-pointer"
            >
              {semestersSorted.map((sem, idx) => (
                <option key={idx} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 disabled:text-blue-400 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} className={`transition-transform duration-700 ${isRefreshing ? 'rotate-180' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync ERP'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-10 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Academic Snapshot (35% width on desktop) */}
        <div className="md:col-span-4 lg:col-span-4 space-y-4">
          
          {/* Card 1: Attendance Circular Progress */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between items-center text-center relative overflow-hidden">
            <div className="w-full flex justify-between items-start mb-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Attendance</span>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isShortage ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {isShortage ? 'Shortage Warning' : 'On Track'}
              </span>
            </div>

            <div className="flex items-center justify-center my-4 relative">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="42" className="stroke-slate-100 fill-none" strokeWidth="8" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="42" 
                  className={`fill-none transition-all duration-1000 ${
                    isShortage ? 'stroke-red-500' : 'stroke-green-500'
                  }`} 
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 - (2 * Math.PI * 42 * overallPercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-slate-800">{overallPercentage.toFixed(2)}%</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Average</span>
              </div>
            </div>

            <div className="w-full flex justify-around border-t border-slate-100 pt-3 text-center">
              <div>
                <span className="block text-sm font-extrabold text-slate-800">{semAttendance.attended}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Attended</span>
              </div>
              <div className="border-r border-slate-100 my-1"></div>
              <div>
                <span className="block text-sm font-extrabold text-slate-800">{semAttendance.held}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Held</span>
              </div>
            </div>

            <div className="w-full text-center mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
              Last Synced: {data?.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
            </div>
          </div>

          {/* Card 2: Overall CGPA */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Academic Standing</span>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/50 p-2 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Overall CGPA</span>
                <span className="block text-base font-extrabold text-slate-800 mt-1">{overallCgpa}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100/50 p-2 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Latest SGPA</span>
                <span className="block text-base font-extrabold text-slate-800 mt-1">{latestSgpa}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100/50 p-2 rounded-xl">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Credits Earned</span>
                <span className="block text-base font-extrabold text-slate-800 mt-1">{creditsEarned}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Latest SPF Band */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Latest SPF Band</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-slate-800">Band {latestSpf?.band || 'N/A'}</span>
                <span className="text-[10px] font-bold text-slate-400">Cycle {latestSpf?.cycle || '1'}</span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Last Updated</span>
              <span className="text-xs font-bold text-slate-700">
                {latestSpf?.scrapedAt ? new Date(latestSpf.scrapedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>

          {/* Card 4: ERP Connection status */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <UserCheck size={16} />
              </div>
              <div>
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">ERP Connected</span>
                <span className="text-xs font-bold text-slate-700">Verified</span>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Last Sync</span>
              <span className="text-xs font-bold text-slate-700">
                {data?.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Semester Workspace (65% width on desktop) */}
        <div className={`md:col-span-6 lg:col-span-8 space-y-4 transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Semester Overview Title Badge */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">Selected Semester</span>
              <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedSem}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Semester SGPA</span>
                <span className="text-sm font-extrabold text-slate-800">{semesterSgpa}</span>
              </div>
              <div className="border-r border-slate-100 h-5"></div>
              <div className="text-center">
                <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">SPF Band</span>
                <span className="text-sm font-extrabold text-slate-800">Band {semesterSpfBand}</span>
              </div>
            </div>
          </div>

          {/* Tabbed Internal Evaluations Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Internal Evaluations</span>
              
              {/* Tab selector */}
              <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100/50">
                {['cie-1', 'cie-2', 'assignment', 'lab'].map(tabId => (
                  <button
                    key={tabId}
                    onClick={() => setActiveInternalTab(tabId)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer uppercase ${
                      activeInternalTab === tabId
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tabId === 'cie-1' ? 'CIE-1' : tabId === 'cie-2' ? 'CIE-2' : tabId}
                  </button>
                ))}
              </div>
            </div>

            {/* Table layout for internal results */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3 font-bold">Subject</th>
                    <th className="py-2 px-3 text-center font-bold">Marks</th>
                    <th className="py-2 px-3 text-center font-bold">Total</th>
                    <th className="py-2 px-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {internalMarksData.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-5 text-center text-slate-400 font-medium">
                        No marks available for this evaluation tab.
                      </td>
                    </tr>
                  ) : (
                    internalMarksData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-700">{row.subject}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{row.scored}</td>
                        <td className="py-2 px-3 text-center">{row.total}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={`inline-block px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full ${row.statusColor}`}>
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

          {/* Attendance Table Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Subject Attendance Registry</span>
            
            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
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
                  {semAttendance.subjects.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-5 text-center text-slate-400 font-medium">
                        No subject logs parsed.
                      </td>
                    </tr>
                  ) : (
                    semAttendance.subjects.map((sub, idx) => {
                      const shortage = sub.percentage < 75;
                      const lowShortage = sub.percentage < 65;
                      const barColor = lowShortage ? 'bg-red-500' : shortage ? 'bg-amber-500' : 'bg-green-500';
                      const textColor = lowShortage ? 'text-red-600 bg-red-50' : shortage ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';
                      const statusText = shortage ? 'Shortage' : 'On Track';
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
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
                            <span className={`inline-block px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full ${textColor}`}>
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

          {/* Performance Trend Graph */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SGPA Performance Trend</span>
            
            <div className="flex justify-center items-center py-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
              {completedSemesters.length === 0 ? (
                <div className="py-12 text-slate-400 font-semibold text-[10px]">No SGPA records to draw trend.</div>
              ) : (
                <div className="w-full px-2">
                  <svg className="w-full h-[180px]" viewBox="0 0 600 220" preserveAspectRatio="none">
                    <line x1="50" y1="30" x2="570" y2="30" className="stroke-slate-200/60 stroke-[1px] stroke-dasharray" strokeDasharray="3 3" />
                    <line x1="50" y1="75" x2="570" y2="75" className="stroke-slate-200/60 stroke-[1px] stroke-dasharray" strokeDasharray="3 3" />
                    <line x1="50" y1="120" x2="570" y2="120" className="stroke-slate-200/60 stroke-[1px] stroke-dasharray" strokeDasharray="3 3" />
                    <line x1="50" y1="165" x2="570" y2="165" className="stroke-slate-200/60 stroke-[1px] stroke-dasharray" strokeDasharray="3 3" />
                    <line x1="50" y1="210" x2="570" y2="210" className="stroke-slate-200 stroke-[1.5px]" />

                    <text x="35" y="34" className="text-[9px] font-bold fill-slate-400 text-right">10.0</text>
                    <text x="35" y="79" className="text-[9px] font-bold fill-slate-400 text-right">8.0</text>
                    <text x="35" y="124" className="text-[9px] font-bold fill-slate-400 text-right">6.0</text>
                    <text x="35" y="169" className="text-[9px] font-bold fill-slate-400 text-right">4.0</text>

                    {(() => {
                      const stepX = completedSemesters.length > 1 ? (520 / (completedSemesters.length - 1)) : 520;
                      const points = completedSemesters.map((item, idx) => {
                        const x = 50 + idx * stepX;
                        const sgpa = Math.max(4.0, Math.min(10.0, item.sgpa || 0));
                        const y = 210 - ((sgpa - 4.0) / 6.0) * 180;
                        return { x, y, sgpa: item.sgpa, label: formatShortSem(item.term) };
                      });

                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = points.length > 0 
                        ? `${linePath} L ${points[points.length - 1].x} 210 L ${points[0].x} 210 Z`
                        : '';

                      return (
                        <>
                          {areaPath && <path d={areaPath} fill="url(#sgpa-grad-unified)" className="opacity-5" />}
                          {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />}
                          
                          {points.map((p, i) => (
                            <g key={i} className="group/dot cursor-pointer">
                              <title>{`${p.label}: ${p.sgpa.toFixed(2)}`}</title>
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="4" 
                                fill="#2563eb" 
                                className="stroke-white stroke-[2px] transition-all group-hover/dot:r-6 group-hover/dot:stroke-[3px]" 
                              />
                              <text x={p.x} y="220" textAnchor="middle" className="text-[8px] font-bold fill-slate-400">
                                {p.label}
                              </text>
                              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-bold fill-blue-600 bg-white opacity-0 group-hover/dot:opacity-100 transition-opacity">
                                {p.sgpa.toFixed(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}

                    <defs>
                      <linearGradient id="sgpa-grad-unified" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* SPF History Table Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SPF Performance History</span>
            
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3 font-bold">Semester</th>
                    <th className="py-2 px-3 text-center font-bold">Cycle</th>
                    <th className="py-2 px-3 text-center font-bold">Band</th>
                    <th className="py-2 px-3 text-right font-bold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {spfBands.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-5 text-center text-slate-400 font-medium">
                        No SPF Band records parsed.
                      </td>
                    </tr>
                  ) : (
                    spfBands.map((b, idx) => {
                      const isA = b.band === 'A';
                      const isB = b.band === 'B';
                      const isC = b.band === 'C';
                      const bandColor = isA ? 'bg-green-50 text-green-600 border border-green-100' :
                                        isB ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        isC ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-red-50 text-red-600 border border-red-100';
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-700">{b.semesterLabel}</td>
                          <td className="py-2 px-3 text-center">Cycle {b.cycle}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block w-12 py-0.5 rounded font-extrabold text-[9px] text-center border ${bandColor}`}>
                              Band {b.band}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400 font-bold">
                            {b.scrapedAt ? new Date(b.scrapedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
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
