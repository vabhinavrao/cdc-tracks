// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Award, BookOpen, Search, Filter, RefreshCw, 
  ChevronRight, X, User, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Building2,
  Target, Layers, BarChart3, Mail, CheckCircle, AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminDashboard = ({ user }) => {
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  
  // Modal state for viewing individual student details
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [hoveredTest, setHoveredTest] = useState(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isBranchAdmin = user?.role === 'branch_admin';

  useEffect(() => {
    if (isBranchAdmin && user.assigned_branch) {
      setSelectedBranch(user.assigned_branch);
    }
  }, [user]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedStudentRoll) {
        closeStudentModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudentRoll]);

  // Fetch analytics and student roster whenever branch filter or search changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedBranch]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch analytics
      const analyticsRes = await axios.get(`${API_URL}/api/admin/analytics?branch=${selectedBranch}`, { headers });
      setAnalytics(analyticsRes.data);

      // 2. Fetch student list
      fetchStudentsList(selectedBranch, searchQuery);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsList = async (branchFilter, search) => {
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `${API_URL}/api/admin/students?branch=${branchFilter}&search=${encodeURIComponent(search || '')}`, 
        { headers }
      );
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students list:', err);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchStudentsList(selectedBranch, query);
  };

  const handleSyncSheets = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await axios.post(`${API_URL}/api/student/sync-google-sheets`, {
        sheet1_id: "1U5X1r6ZQv4LH2WEEvmh3bEE4voOdqsIw3YG7DbpivAc",
        sheet2_id: "1yEZgkE2egyQqF67Vzh6LGdjTgh1zXqyjhNcQV38JUTU"
      });
      setSyncMessage({ type: 'success', text: res.data.message || 'Live Google Sheets synchronized successfully!' });
      fetchDashboardData();
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to sync Google Sheets.' });
    } finally {
      setSyncing(false);
    }
  };

  const openStudentModal = async (rollIdentifier) => {
    if (!rollIdentifier) return;
    setSelectedStudentRoll(rollIdentifier);
    setDetailLoading(true);
    setDetailError(null);
    setStudentDetail(null);
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/admin/student/${encodeURIComponent(rollIdentifier)}`, { headers });
      setStudentDetail(res.data);
    } catch (err) {
      console.error('Failed to fetch student detail:', err);
      setDetailError(err.response?.data?.detail || 'Failed to load student details. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeStudentModal = () => {
    setSelectedStudentRoll(null);
    setStudentDetail(null);
    setDetailError(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeStudentModal();
    }
  };

  const getBandBadgeClass = (band) => {
    switch (band?.toUpperCase()) {
      case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'D': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getBandBadgeColor = (band) => {
    switch (band?.toUpperCase()) {
      case 'A': return 'bg-emerald-600 text-white';
      case 'B': return 'bg-emerald-600 text-white';
      case 'C': return 'bg-amber-500 text-white';
      case 'D': return 'bg-rose-600 text-white';
      default:  return 'bg-slate-600 text-white';
    }
  };

  // Helper for computing student test list inside full modal view
  const renderFullStudentView = () => {
    if (!studentDetail) return null;

    const { student, overall, post_assessments, domain_tracks, test_scores, user_profile } = studentDetail;
    const rawScores = test_scores || {};
    const rawEntries = Object.entries(rawScores);

    const getScoreForTest = (num, defaultKey) => {
      if (rawScores[defaultKey] !== undefined && rawScores[defaultKey] !== null && rawScores[defaultKey] !== '') {
        return rawScores[defaultKey];
      }
      const altTestKey = `Test ${num}`;
      if (rawScores[altTestKey] !== undefined && rawScores[altTestKey] !== null && rawScores[altTestKey] !== '') {
        return rawScores[altTestKey];
      }
      if (num === 9) {
        const match = rawEntries.find(([k]) => {
          const kLow = k.toLowerCase().replace(/\s+/g, '');
          return kLow.includes('post') && (kLow.includes('ii-i') || kLow.includes('iii') || kLow.includes('2-1'));
        });
        if (match && match[1] !== null && match[1] !== '') return match[1];
      }
      if (num === 23) {
        const match = rawEntries.find(([k]) => {
          const kLow = k.toLowerCase().replace(/\s+/g, '');
          return kLow.includes('post') && (kLow.includes('ii-ii') || kLow.includes('iiii') || kLow.includes('2-2'));
        });
        if (match && match[1] !== null && match[1] !== '') return match[1];
      }
      return null;
    };

    const testList = Array.from({ length: 30 }, (_, i) => {
      const num = i + 1;
      let key = `Test ${num}`;
      if (num === 9) key = "Post Assess. I";
      if (num === 23) key = "Post Assess. II";
      const scoreVal = getScoreForTest(num, key);
      const isUnattempted = scoreVal === null || scoreVal === undefined || scoreVal === '';

      return {
        name: key,
        num,
        score: isUnattempted ? null : parseFloat(scoreVal),
        isUnattempted
      };
    });

    const attemptedTests = testList.filter(t => !t.isUnattempted);
    const attemptedCount = attemptedTests.length;
    const unattemptedCount = 30 - attemptedCount;
    const attemptedPct = ((attemptedCount / 30) * 100).toFixed(2);

    const excellentCount = attemptedTests.filter(t => t.score >= 80).length;
    const goodCount = attemptedTests.filter(t => t.score >= 50 && t.score < 80).length;
    const needsImpCount = attemptedTests.filter(t => t.score < 50).length;

    const topPeakTest = attemptedTests.reduce((max, t) => (t.score > (max?.score || 0) ? t : max), null);

    const strengths = [];
    const weaknesses = [];
    const topDomains = Object.entries(domain_tracks || {}).filter(([_, d]) => d.performance >= 70);
    if (topDomains.length > 0) {
      strengths.push(`High performance in ${topDomains[0][1].domain}`);
    } else {
      strengths.push('Good foundational performance across core modules');
    }
    if (topPeakTest) strengths.push(`Peak score of ${topPeakTest.score}% in ${topPeakTest.name}`);
    if (overall.cie_score >= 3.5) strengths.push(`Strong internal assessment score (${overall.cie_score}/5)`);

    const weakDomains = Object.entries(domain_tracks || {}).filter(([_, d]) => d.performance < 60);
    if (weakDomains.length > 0) weaknesses.push(`${weakDomains[0][1].domain} domain needs practice`);
    if (needsImpCount > 0) weaknesses.push(`Inconsistent performance in ${needsImpCount} attempted tests`);
    if (unattemptedCount > 0) weaknesses.push(`Complete remaining ${unattemptedCount} unattempted tests`);

    return (
      <div className="space-y-6 text-left">
        
        {/* Modal Top Floating Bar */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between sticky top-0 z-20 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold uppercase">
              Student CDC Inspection
            </span>
            <span className="text-xs text-slate-300 font-mono hidden sm:inline">{student.roll_number}</span>
          </div>
          <button
            onClick={closeStudentModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <X size={16} /> Close View (Esc)
          </button>
        </div>

        {/* Hero Student Profile Header & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-slate-50 rounded-3xl border border-slate-200 p-6 flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-2xl shrink-0">
              {user_profile?.picture ? (
                <img src={user_profile.picture} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                (student.name || 'ST').split(' ').map(n=>n[0]).join('').slice(0,2)
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 truncate">{student.name}</h2>
              <div className="text-xs text-slate-500 font-medium">
                <p>Roll No: <strong className="text-slate-800 font-mono">{student.roll_number}</strong></p>
                <p>Branch: <strong className="text-slate-800">{student.branch}</strong></p>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-1">{student.email}</p>
            </div>
          </div>

          {/* Hero Pills */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">CDC Band</span>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black shadow-sm my-1 ${getBandBadgeColor(overall.cdc_band)}`}>
                {overall.cdc_band || 'B'}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Band Rank</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">CDC Rank</span>
              <div className="my-1 text-2xl font-black text-slate-900">#{overall.cdc_rank || 'N/A'}</div>
              <span className="text-[10px] text-slate-400 font-medium">College Rank</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Grade Score</span>
              <div className="my-1 text-2xl font-black text-slate-900">{overall.cdc_grade_score}%</div>
              <span className="text-[10px] text-slate-400 font-medium">Overall Score</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Tests Attempted</span>
              <div className="my-1 text-2xl font-black text-slate-900">{attemptedCount} <span className="text-xs text-slate-400 font-normal">/30</span></div>
              <span className="text-[10px] text-slate-400 font-medium">{attemptedPct}% Rate</span>
            </div>
          </div>
        </div>

        {/* Secondary Mini Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><TrendingUp size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Avg Performance</span>
              <span className="text-base font-black text-slate-900">{overall.avg_performance}%</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl"><BarChart3 size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Consistency</span>
              <span className="text-base font-black text-slate-900">{overall.consistency_score}%</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><BookOpen size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">CIE I (/ 5)</span>
              <span className="text-base font-black text-slate-900">{Math.min(overall.cie_score || 4, 5)} <span className="text-xs font-normal text-slate-400">/ 5</span></span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl"><BookOpen size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">CIE II (/ 5)</span>
              <span className="text-base font-black text-slate-900">{overall.cie_score !== null && overall.cie_score !== undefined ? Math.ceil(Number(overall.cie_score) * 2) / 2 : 4.5} <span className="text-xs font-normal text-slate-400">/ 5</span></span>
            </div>
          </div>
        </div>


        {/* Visual Analytics Grid (Trend Chart & Donut & Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Column 1: Performance Trend Line Chart (6 cols) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span>PERFORMANCE TREND</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Your performance across all tests and assessments</p>
              </div>
            </div>

            {/* SVG Trend Line Chart */}
            <div className="relative w-full h-48 my-2 pt-6">
              {/* Crisp Un-stretched Milestone Text Labels */}
              <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none z-10">
                <span className="absolute -translate-x-1/2 text-[10px] font-extrabold text-purple-600 tracking-tight whitespace-nowrap" style={{ left: `${(8 / 29) * 100}%` }}>
                  Post Assessment I
                </span>
                <span className="absolute -translate-x-1/2 text-[10px] font-extrabold text-purple-600 tracking-tight whitespace-nowrap" style={{ left: `${(22 / 29) * 100}%` }}>
                  Post Assessment II
                </span>
              </div>

              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" />

                {/* Dynamic Milestone vertical dashed lines perfectly aligned to dots */}
                <line x1={(8 / 29) * 500} y1="0" x2={(8 / 29) * 500} y2="140" stroke="#a855f7" strokeDasharray="3 3" opacity="0.5" strokeWidth="1.5" />
                <line x1={(22 / 29) * 500} y1="0" x2={(22 / 29) * 500} y2="140" stroke="#a855f7" strokeDasharray="3 3" opacity="0.5" strokeWidth="1.5" />

                {/* Polyline path connecting test scores */}
                {(() => {
                  const points = testList.map((t, i) => {
                    const x = (i / 29) * 500;
                    const score = t.isUnattempted ? 30 : t.score;
                    const y = 140 - (score / 100) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  return (
                    <>
                      <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                      {testList.map((t, i) => {
                        const x = (i / 29) * 500;
                        const score = t.isUnattempted ? 30 : t.score;
                        const y = 140 - (score / 100) * 120;
                        const isHovered = hoveredTest?.num === t.num;

                        return (
                          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredTest({...t, x, y})} onMouseLeave={() => setHoveredTest(null)}>
                            {/* Invisible larger target for easy hovering */}
                            <circle cx={x} cy={y} r="10" fill="transparent" />
                            
                            {!t.isUnattempted && (
                              <circle 
                                cx={x} 
                                cy={y} 
                                r={isHovered ? "5" : "3.5"} 
                                fill={isHovered ? "#10b981" : "#ffffff"} 
                                stroke="#10b981" 
                                strokeWidth={isHovered ? "3" : "2"} 
                                className="transition-all duration-150"
                              />
                            )}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              {/* Dynamic Hover Tooltip */}
              {(() => {
                const active = hoveredTest || (topPeakTest ? { ...topPeakTest, x: (testList.findIndex(t=>t.num===topPeakTest.num)/29)*100 } : null);
                if (!active) return null;
                
                const leftPct = hoveredTest ? (hoveredTest.x / 500) * 100 : active.x;
                const isUnatt = active.isUnattempted;

                return (
                  <div 
                    className="absolute top-2 transition-all duration-150 -translate-x-1/2 pointer-events-none z-10"
                    style={{ left: `${Math.max(10, Math.min(90, leftPct))}%` }}
                  >
                    <div className="bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 font-bold border border-slate-700 whitespace-nowrap">
                      <span className="text-emerald-400">{active.name}:</span>
                      <span>{isUnatt ? 'Unattempted' : `${active.score}%`}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100">
              <span>Test 1</span>
              <span>Test 5</span>
              <span>Test 10</span>
              <span>Test 15</span>
              <span>Test 20</span>
              <span>Test 25</span>
              <span>Test 30</span>
            </div>
          </div>

          {/* Column 2: Attempted vs Unattempted Donut Chart (3 cols) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieChartIcon size={16} className="text-emerald-600" />
                <span>ATTEMPTED VS UNATTEMPTED</span>
              </h3>
            </div>

            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 mx-auto my-3 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring (Unattempted) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3.8"
                />
                {/* Foreground Ring (Attempted) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${attemptedPct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">30</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Tests</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 text-xs font-semibold pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Attempted
                </span>
                <span className="text-slate-900 font-bold">{attemptedCount} <span className="text-[10px] text-slate-400">({attemptedPct}%)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Unattempted
                </span>
                <span className="text-slate-900 font-bold">{unattemptedCount} <span className="text-[10px] text-slate-400">({(100 - attemptedPct).toFixed(2)}%)</span></span>
              </div>
            </div>
          </div>

          {/* Column 3: Performance Distribution Bars (3 cols) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-emerald-600" />
                <span>PERFORMANCE DISTRIBUTION</span>
              </h3>
            </div>

            <div className="space-y-3.5 my-auto py-2">
              {/* Excellent */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Excellent (≥80%)</span>
                  <span className="font-bold text-slate-900">{excellentCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(excellentCount/30)*100}%` }}></div>
                </div>
              </div>

              {/* Good */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Good (50-79%)</span>
                  <span className="font-bold text-slate-900">{goodCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${(goodCount/30)*100}%` }}></div>
                </div>
              </div>

              {/* Needs Improvement */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Needs Improvement (&lt;50%)</span>
                  <span className="font-bold text-slate-900">{needsImpCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(needsImpCount/30)*100}%` }}></div>
                </div>
              </div>

              {/* Unattempted */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Unattempted</span>
                  <span className="font-bold text-slate-900">{unattemptedCount}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-300 h-full rounded-full transition-all duration-500" style={{ width: `${(unattemptedCount/30)*100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100 text-center">
              Score breakdown across 30 standard tests
            </div>
          </div>

        </div>


        {/* Semester Tracks & Post Assessments */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-600" /> Semester Domain Tracks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(domain_tracks || {}).map(([semKey, data]) => (
                <div key={semKey} className="bg-white p-3 rounded-2xl border border-slate-200 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md inline-block mb-1">Sem {semKey}</span>
                  <h4 className="font-bold text-slate-800 truncate mb-2">{data.domain}</h4>
                  <div className="flex justify-between font-extrabold text-emerald-600 text-xs">
                    <span>Mastery:</span><span>{data.performance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
              <Target size={14} className="text-emerald-600" /> Post Assessments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(post_assessments || {}).map(([title, score]) => (
                <div key={title} className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">{title}</span>
                  <span className="text-2xl font-black mt-2">{score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 30 Tests Full Grid */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-600" /> All 30 Test Scores
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {testList.map((t) => (
              <div key={t.name} className="p-2 bg-white rounded-xl border border-slate-200 text-center text-xs">
                <div className="text-[10px] font-bold text-slate-500 truncate">{t.name}</div>
                <div className={`font-black mt-0.5 ${t.isUnattempted ? 'text-slate-300' : t.score >= 80 ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {t.isUnattempted ? '-' : `${t.score}%`}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner & Role Profile */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck size={14} />
              {isSuperAdmin ? 'Full Access Admin' : `Branch Administrator (${user?.assigned_branch})`}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              CDC Intelligence Dashboard
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Real-time academic & Career Development Center performance monitoring, branch aggregations, and student level insights.
            </p>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="w-12 h-12 rounded-full ring-2 ring-blue-400 object-cover" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg text-white">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
            )}
            <div>
              <div className="font-bold text-white text-base">{user?.name || 'Administrator'}</div>
              <div className="text-xs text-blue-200">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar & Sync */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-2">
            <Building2 size={16} />
            Branch:
          </span>
          {isSuperAdmin ? (
            ['ALL', 'CSE', 'CSM', 'ECE', 'EEE', 'MECH'].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedBranch === b
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {b === 'ALL' ? 'All Branches' : b}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200">
              {user?.assigned_branch} Branch Only
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {syncMessage && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {syncMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {syncMessage.text}
            </span>
          )}
          <button
            onClick={handleSyncSheets}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing Sheets...' : 'Sync Live Sheets'}</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Metrics Grid */}
      {loading && !analytics ? (
        <div className="py-12 text-center text-slate-400 font-medium">Loading analytics metrics...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics?.total_students || 0}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={24} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Students in target branch scope</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Performance</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics?.avg_performance || 0}%</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Across all technical assessments</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average CIE Score</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics?.avg_cie || 0} <span className="text-sm font-medium text-slate-400">/ 5.0</span></h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Award size={24} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Continuous internal evaluation score</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Consistency</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics?.avg_consistency || 0}%</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><BookOpen size={24} /></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Test participation & regularity rate</p>
          </div>
        </div>
      )}

      {/* CDC Band Distribution Section */}
      {analytics?.band_distribution && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award size={18} className="text-blue-600" /> CDC Performance Band Distribution
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['A', 'B', 'C', 'D'].map((band) => {
              const count = analytics.band_distribution[band] || 0;
              const percent = analytics.total_students ? Math.round((count / analytics.total_students) * 100) : 0;
              return (
                <div key={band} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${getBandBadgeClass(band)}`}>Band {band}</span>
                    <span className="text-xs font-bold text-slate-400">{percent}%</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{count} <span className="text-xs text-slate-400 font-normal">students</span></div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${band === 'A' ? 'bg-emerald-500' : band === 'B' ? 'bg-blue-500' : band === 'C' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Roster Section with Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Student Directory & Performance Roster</h3>
            <p className="text-xs text-slate-500">Click any student row to view their full detailed CDC performance dashboard.</p>
          </div>

          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">CDC Rank</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Band</th>
                <th className="py-3 px-4 text-center">Avg Performance</th>
                <th className="py-3 px-4 text-center">CIE Score</th>
                <th className="py-3 px-4 text-center">Consistency</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">
                    No students found matching the criteria.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr 
                    key={st.roll_number || st.email} 
                    onClick={() => openStudentModal(st.roll_number || st.email)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-extrabold text-slate-700">
                      #{st.cdc_rank || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{st.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{st.roll_number} • {st.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {st.branch}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold border ${getBandBadgeClass(st.cdc_band)}`}>
                        Band {st.cdc_band || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {st.avg_performance}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-indigo-600">
                      {st.cie_score}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {st.consistency_score}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openStudentModal(st.roll_number || st.email);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 group-hover:bg-blue-600 text-blue-700 group-hover:text-white rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect</span> <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Student Detailed CDC Dashboard Modal View */}
      {selectedStudentRoll && (
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 relative my-auto"
          >
            {detailLoading ? (
              <div className="py-24 text-center text-slate-500 font-medium">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                Loading full detailed student CDC dashboard...
              </div>
            ) : detailError ? (
              <div className="py-16 text-center space-y-4">
                <div className="inline-flex bg-rose-100 text-rose-600 p-4 rounded-full">
                  <AlertCircle size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Could not load detailed record</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">{detailError}</p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => openStudentModal(selectedStudentRoll)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Retry Loading
                  </button>
                  <button
                    onClick={closeStudentModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              renderFullStudentView()
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Helper icon component for Donut chart header

const PieChartIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default AdminDashboard;

