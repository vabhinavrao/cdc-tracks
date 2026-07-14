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
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  // Circle Gauge styling parameters
  const strokeDash = 2 * Math.PI * 54; // radius = 54
  const strokeOffset = strokeDash - (strokeDash * (attendance.overallPercentage || 0)) / 100;
  const isShortage = (attendance.overallPercentage || 0) < 75;

  return (
    <div className="space-y-6">
      {/* Top Section: Header & Sync Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <GraduationCap size={14} />
            <span>Academic Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mt-1">Student ERP Integration</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Verified records from University ERP (Last updated: {data?.lastSuccessAt ? new Date(data.lastSuccessAt).toLocaleString() : 'N/A'})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 disabled:text-blue-400 font-bold text-sm rounded-xl transition-all cursor-pointer grow md:grow-0"
          >
            <RefreshCw size={15} className={`transition-transform duration-700 ${isRefreshing ? 'rotate-180' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync ERP'}</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={!tab.active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                !tab.active 
                  ? 'text-slate-300 cursor-not-allowed border-transparent' 
                  : isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 cursor-pointer'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-400 font-extrabold rounded-full uppercase tracking-wider shrink-0">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab render container */}
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Overall Attendance Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-slate-800">Overall Attendance</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Scraped current semester log</p>
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isShortage ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                  {isShortage ? 'Shortage Warning' : 'On Track'}
                </span>
              </div>

              <div className="flex items-center justify-center my-6 relative">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="54" className="stroke-slate-100 fill-none" strokeWidth="12" />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="54" 
                    className={`fill-none transition-all duration-1000 ${
                      isShortage ? 'stroke-red-500' : 'stroke-green-500'
                    }`} 
                    strokeWidth="12"
                    strokeDasharray={strokeDash}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">{attendance.overallPercentage || 0}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Attendance</span>
                </div>
              </div>

              <div className="flex justify-around border-t border-slate-100 pt-4 text-center">
                <div>
                  <span className="block text-lg font-extrabold text-slate-800">{attendance.attended || 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attended</span>
                </div>
                <div className="border-r border-slate-100 my-1"></div>
                <div>
                  <span className="block text-lg font-extrabold text-slate-800">{attendance.held || 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Held</span>
                </div>
              </div>
            </div>

            {/* SGPA Summary Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800">Academic Standing</h3>
                <p className="text-slate-400 text-xs mt-0.5">Average Semester SGPA History</p>
              </div>

              <div className="my-6 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Award size={24} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Latest SGPA</span>
                    <span className="text-2xl font-extrabold text-slate-800">
                      {marks.length > 0 ? (marks[marks.length - 1].sgpa || '0.00') : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Semesters</span>
                  <span className="text-xl font-extrabold text-slate-700">{marks.length}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Info size={14} className="text-slate-400" /> Subject Grades and Credits Synced</span>
                <span className="font-bold text-slate-700">CGPA: {marks.length > 0 ? (marks.reduce((acc, cur) => acc + (cur.sgpa || 0), 0) / marks.length).toFixed(2) : 'N/A'}</span>
              </div>
            </div>

            {/* Quick Status / Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800">Security Credentials</h3>
                <p className="text-slate-400 text-xs mt-0.5">University integration status</p>
              </div>

              <div className="my-5 space-y-3.5">
                <div className="flex items-center justify-between p-3.5 bg-green-50/50 border border-green-100 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <div>
                      <span className="text-xs font-bold text-green-800 block">JNTU Portal Status</span>
                      <span className="text-[10px] text-green-600 font-medium">Link Authed & Verified</span>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  Your university dashboard updates in real-time on key exam publishes. You can disconnect or revoke access at any time in Profile Settings.
                </div>
              </div>

              <button
                onClick={() => setActiveTab('attendance')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Attendance Logs</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Interactive SGPA History Chart */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-3">
              <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                <span>Semester Performance Trend</span>
              </h3>

              {marks.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No academic semesters synced yet.
                </div>
              ) : (
                <div className="relative">
                  {/* Custom interactive SVG Line Chart */}
                  <svg viewBox="0 0 800 240" className="w-full h-auto">
                    {/* Grids */}
                    <line x1="60" y1="40" x2="740" y2="40" stroke="#f1f5f9" strokeWidth="1.5" />
                    <line x1="60" y1="90" x2="740" y2="90" stroke="#f1f5f9" strokeWidth="1.5" />
                    <line x1="60" y1="140" x2="740" y2="140" stroke="#f1f5f9" strokeWidth="1.5" />
                    <line x1="60" y1="190" x2="740" y2="190" stroke="#f1f5f9" strokeWidth="1.5" />

                    {/* Chart labels */}
                    <text x="35" y="44" className="text-[10px] font-bold fill-slate-400 text-right">10.0</text>
                    <text x="35" y="94" className="text-[10px] font-bold fill-slate-400 text-right">8.0</text>
                    <text x="35" y="144" className="text-[10px] font-bold fill-slate-400 text-right">6.0</text>
                    <text x="35" y="194" className="text-[10px] font-bold fill-slate-400 text-right">4.0</text>

                    {/* Draw SVG Line & Area Path dynamically */}
                    {(() => {
                      const stepX = marks.length > 1 ? (680 / (marks.length - 1)) : 680;
                      const points = marks.map((item, idx) => {
                        const x = 60 + idx * stepX;
                        // Map SGPA (4.0 to 10.0) to Y coordinates (190 to 40)
                        const sgpa = Math.max(4.0, Math.min(10.0, item.sgpa || 0));
                        const y = 190 - ((sgpa - 4.0) / 6.0) * 150;
                        return { x, y, sgpa: item.sgpa, label: item.term || item.semesterLabel || `Sem ${idx+1}` };
                      });

                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = points.length > 0 
                        ? `${linePath} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`
                        : '';

                      return (
                        <>
                          {/* Shaded Area */}
                          {areaPath && <path d={areaPath} fill="url(#sgpa-grad)" className="opacity-10" />}
                          
                          {/* Smooth Line */}
                          {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />}

                          {/* Data points */}
                          {points.map((p, i) => (
                            <g key={i} className="group/dot cursor-pointer">
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="6" 
                                fill="#2563eb" 
                                className="stroke-white stroke-[2.5px] transition-all group-hover/dot:r-8 group-hover/dot:stroke-[3.5px]" 
                              />
                              
                              {/* Labels */}
                              <text x={p.x} y="215" textAnchor="middle" className="text-[10px] font-bold fill-slate-500">
                                {p.label}
                              </text>

                              {/* Value labels */}
                              <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-blue-600 bg-white opacity-0 group-hover/dot:opacity-100 transition-opacity">
                                {p.sgpa?.toFixed(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}

                    {/* Gradient Definitions */}
                    <defs>
                      <linearGradient id="sgpa-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="flex gap-4 text-xs text-slate-400 font-semibold justify-center mt-3">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> SGPA Trend</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Hover dots to view semester scores</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Attendance details */}
        {activeTab === 'attendance' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Subject Attendance Registry</h3>
                <p className="text-slate-400 text-sm mt-0.5">Semester subject-wise class tracking log</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-slate-800">{attendance.overallPercentage}%</span>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Average</span>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Subject / Course Name</th>
                    <th className="py-4 px-6 text-center">Classes Attended</th>
                    <th className="py-4 px-6 text-center">Classes Held</th>
                    <th className="py-4 px-6">Percentage Progress</th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.subjects?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 text-sm">
                        No subject logs parsed yet.
                      </td>
                    </tr>
                  ) : (
                    attendance.subjects?.map((sub, idx) => {
                      const shortage = sub.percentage < 75;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                          <td className="py-4 px-6 font-bold text-slate-800">{sub.name}</td>
                          <td className="py-4 px-6 text-center">{sub.attended}</td>
                          <td className="py-4 px-6 text-center">{sub.held}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="w-10 font-bold text-slate-600 text-xs">{sub.percentage}%</span>
                              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={`h-full rounded-full ${shortage ? 'bg-red-500' : 'bg-green-500'}`} 
                                  style={{ width: `${sub.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              shortage ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                              {shortage ? 'Shortage' : 'On Track'}
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
        )}

        {/* Tab: Semester Marks */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            {marks.map((exam, examIdx) => (
              <div key={examIdx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{exam.examLabel || exam.examId}</span>
                    <h3 className="text-lg font-extrabold text-slate-800 mt-0.5">{exam.title} — Term {exam.term}</h3>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Semester SGPA</span>
                      <span className="text-lg font-extrabold text-slate-800">{exam.sgpa ? exam.sgpa.toFixed(2) : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">Subject / Course Name</th>
                        <th className="py-4 px-6 text-center">Grade Secured</th>
                        <th className="py-4 px-6 text-right">Academic Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exam.items?.map((item, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                          <td className="py-4 px-6 font-bold text-slate-800">{item.name}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block w-8 py-0.5 rounded font-extrabold text-xs text-center ${
                              item.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {item.grade}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-slate-600">{item.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: SPF Band Analyzer */}
        {activeTab === 'spf' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">SPF Band Analyzer</h3>
              <p className="text-slate-400 text-sm mt-0.5">Historical academic performance categories and cycle progress tracking</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Band Explainer */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-700 text-sm">Understanding SPF Bands</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 py-0.5 bg-green-100 text-green-700 font-extrabold text-xs text-center rounded">A</span>
                    <span className="text-xs text-slate-600 font-medium">Outstanding performance (Typically SGPA &ge; 8.0)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 py-0.5 bg-blue-100 text-blue-700 font-extrabold text-xs text-center rounded">B</span>
                    <span className="text-xs text-slate-600 font-medium">Good / Consistent performance (Typically SGPA 7.0 - 7.9)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 py-0.5 bg-amber-100 text-amber-700 font-extrabold text-xs text-center rounded">C</span>
                    <span className="text-xs text-slate-600 font-medium">Average performance (Typically SGPA 6.0 - 6.9)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 py-0.5 bg-red-100 text-red-700 font-extrabold text-xs text-center rounded">D</span>
                    <span className="text-xs text-slate-600 font-medium">Critical performance / Need improvement (SGPA &lt; 6.0)</span>
                  </div>
                </div>
              </div>

              {/* Band Summary Stats */}
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-blue-800 text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-blue-600 animate-pulse" />
                    Latest Academic Band Status
                  </h4>
                  <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                    Based on your parsed ERP performance cycles, the placement team uses these bands to filter profiles for internship and campus recruitment drives.
                  </p>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-blue-100/30">
                  <span className="text-xs font-bold text-slate-500">Latest Active Band</span>
                  <span className={`px-4 py-1 rounded-xl text-sm font-extrabold shadow-sm ${
                    academicData.spfBands?.length > 0 && academicData.spfBands[academicData.spfBands.length - 1].band === 'A'
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    Band {academicData.spfBands?.length > 0 ? academicData.spfBands[academicData.spfBands.length - 1].band : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Table of bands */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Semester Label</th>
                    <th className="py-4 px-6 text-center">Cycle Number</th>
                    <th className="py-4 px-6 text-center">Assigned Band</th>
                    <th className="py-4 px-6 text-right">Synchronization Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {academicData.spfBands?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 text-sm">
                        No SPF Band metrics generated yet.
                      </td>
                    </tr>
                  ) : (
                    academicData.spfBands?.map((b, idx) => {
                      const isA = b.band === 'A';
                      const isB = b.band === 'B';
                      const isC = b.band === 'C';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-sm font-medium text-slate-700">
                          <td className="py-4 px-6 font-bold text-slate-800">{b.semesterLabel}</td>
                          <td className="py-4 px-6 text-center">Cycle {b.cycle}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block w-12 py-1 rounded font-extrabold text-xs text-center ${
                              isA ? 'bg-green-100 text-green-700 border border-green-200' :
                              isB ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              isC ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              Band {b.band}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right text-xs text-slate-400 font-bold">
                            {b.scrapedAt ? new Date(b.scrapedAt).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
