// src/pages/CDCDashboard.jsx
import { useState, useEffect } from 'react';
import { 
  Award, TrendingUp, CheckCircle2, Target, BookOpen, Layers, 
  BarChart3, ShieldCheck, Star, Calendar, Bell, Mail, Phone, 
  User, CheckCircle, AlertTriangle, ArrowUpRight, ChevronDown 
} from 'lucide-react';
import axios from 'axios';

const CDCDashboard = ({ user }) => {
  const [cdcData, setCdcData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [hoveredTest, setHoveredTest] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchCDCData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_URL}/api/student/cdc-dashboard-data`, {
          headers: {
            'Authorization': `Bearer ${user.email}`
          }
        });
        setCdcData(response.data);
      } catch (err) {
        console.error('Error fetching CDC dashboard data:', err);
        setError(err.response?.data?.detail || 'Failed to load CDC Performance data.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchCDCData();
    }
  }, [user, API_URL]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm">Loading your CDC Performance Overview...</p>
      </div>
    );
  }

  if (error || !cdcData) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-3xl text-center shadow-sm">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target size={24} />
        </div>
        <h3 className="text-xl font-bold text-red-900 mb-2">CDC Performance Record Not Found</h3>
        <p className="text-red-700 text-sm mb-6">{error || 'No CDC metrics recorded for your account yet.'}</p>
      </div>
    );
  }

  const { student, overall, post_assessments, domain_tracks, test_scores } = cdcData;

  // Generate comprehensive list of all 30 tests
  const rawScores = test_scores || {};
  const rawEntries = Object.entries(rawScores);

  const getScoreForTest = (num, defaultKey) => {
    // 1. Try defaultKey (e.g. "Track Name I")
    if (rawScores[defaultKey] !== undefined && rawScores[defaultKey] !== null && rawScores[defaultKey] !== '') {
      return rawScores[defaultKey];
    }
    // 2. Try legacy post assessment keys
    if (num === 9) {
      if (rawScores["Post Assess. I"] !== undefined) return rawScores["Post Assess. I"];
      if (rawScores["Post Assessment I"] !== undefined) return rawScores["Post Assessment I"];
      if (rawScores["Post Assessment II-I"] !== undefined) return rawScores["Post Assessment II-I"];
    }
    if (num === 23) {
      if (rawScores["Post Assess. II"] !== undefined) return rawScores["Post Assess. II"];
      if (rawScores["Post Assessment II"] !== undefined) return rawScores["Post Assessment II"];
      if (rawScores["Post Assessment II-II"] !== undefined) return rawScores["Post Assessment II-II"];
    }
    // 3. Try standard "Test N" key
    const altTestKey = `Test ${num}`;
    if (rawScores[altTestKey] !== undefined && rawScores[altTestKey] !== null && rawScores[altTestKey] !== '') {
      return rawScores[altTestKey];
    }
    // 4. Try matching on substring (with collision prevention)
    if (num === 9) {
      const match = rawEntries.find(([k, v]) => {
        const kLow = k.toLowerCase().replace(/\s+/g, '');
        if (kLow.includes('ii-ii') || kLow.includes('2-2')) return false;
        return (kLow.includes('post') || kLow.includes('track')) && (kLow.includes('ii-i') || kLow.includes('iii') || kLow.includes('2-1') || kLow.includes('i') || kLow.includes('1'));
      });
      if (match && match[1] !== null && match[1] !== '') return match[1];
    }
    if (num === 23) {
      const match = rawEntries.find(([k, v]) => {
        const kLow = k.toLowerCase().replace(/\s+/g, '');
        return (kLow.includes('post') || kLow.includes('track')) && (kLow.includes('ii-ii') || kLow.includes('iiii') || kLow.includes('2-2') || kLow.includes('ii') || kLow.includes('2'));
      });
      if (match && match[1] !== null && match[1] !== '') return match[1];
    }
    return null;
  };

  const testList = Array.from({ length: 30 }, (_, i) => {
    const num = i + 1;
    let key = `Test ${num}`;
    if (num === 9) key = "Track Name I";
    if (num === 23) key = "Track Name II";

    const scoreVal = getScoreForTest(num, key);
    const isUnattempted = scoreVal === null || scoreVal === undefined || scoreVal === '';

    return {
      name: key,
      num,
      score: isUnattempted ? null : parseFloat(scoreVal),
      isUnattempted
    };
  });

  // Analytics Calculations
  const attemptedTests = testList.filter(t => !t.isUnattempted);
  const attemptedCount = attemptedTests.length;
  const unattemptedCount = 30 - attemptedCount;
  const attemptedPct = ((attemptedCount / 30) * 100).toFixed(2);

  const excellentCount = attemptedTests.filter(t => t.score >= 80).length;
  const goodCount = attemptedTests.filter(t => t.score >= 50 && t.score < 80).length;
  const needsImpCount = attemptedTests.filter(t => t.score < 50).length;

  // Band badge colors
  const getBandBadgeColor = (band) => {
    switch (band?.toUpperCase()) {
      case 'A': return 'bg-emerald-600 text-white';
      case 'B': return 'bg-emerald-600 text-white';
      case 'C': return 'bg-amber-500 text-white';
      case 'D': return 'bg-rose-600 text-white';
      default:  return 'bg-slate-600 text-white';
    }
  };

  // Peak tests for trend chart callouts
  const topPeakTest = attemptedTests.reduce((max, t) => (t.score > (max?.score || 0) ? t : max), null);

  // Generate dynamic strengths & weaknesses
  const strengths = [];
  const weaknesses = [];

  const topDomains = Object.entries(domain_tracks || {}).filter(([_, d]) => d.performance >= 70);
  if (topDomains.length > 0) {
    strengths.push(`High performance in ${topDomains[0][1].domain}`);
  } else {
    strengths.push('Good foundational performance across core technical modules');
  }

  if (topPeakTest) {
    strengths.push(`Peak score of ${topPeakTest.score}% in ${topPeakTest.name}`);
  }

  if (overall.cie_score >= 3.5) {
    strengths.push(`Strong internal assessment score (${overall.cie_score}/5)`);
  }

  const weakDomains = Object.entries(domain_tracks || {}).filter(([_, d]) => d.performance < 60);
  if (weakDomains.length > 0) {
    weaknesses.push(`${weakDomains[0][1].domain} domain needs focused practice`);
  } else {
    weaknesses.push('Maintain consistency across higher complexity modules');
  }

  if (needsImpCount > 0) {
    weaknesses.push(`Inconsistent performance in ${needsImpCount} attempted tests`);
  }

  if (unattemptedCount > 0) {
    weaknesses.push(`Complete remaining ${unattemptedCount} unattempted evaluation tests`);
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 bg-slate-50/50 min-h-screen">
      
      {/* 1. Top Welcome Header Row */}
      <div className="pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          Welcome back, <span className="text-emerald-600">{student.name || user.name}</span> 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-medium">Here's your CDC performance overview</p>
      </div>

      {/* 2. Top Hero Student Profile & High Level Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Card: Student Info */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 font-black text-2xl shadow-inner overflow-hidden">
            {user.picture ? (
              <img src={user.picture} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              (student.name || 'ST').split(' ').map(n=>n[0]).join('').slice(0,2)
            )}
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 truncate tracking-tight">{student.name}</h2>
            <div className="text-xs text-slate-500 font-medium space-y-0.5">
              <p>Roll No: <strong className="text-slate-700 font-mono">{student.roll_number}</strong></p>
              <p>Branch: <strong className="text-slate-700">{student.branch}</strong></p>
            </div>
            <div className="pt-1 flex flex-col gap-0.5 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 truncate"><Mail size={12} className="shrink-0" /> {student.email}</span>
            </div>
          </div>
        </div>

        {/* Right Hero Metrics Pill Grid (4 Cards) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* CDC Band */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CDC Band</span>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-md my-1 ${getBandBadgeColor(overall.cdc_band)}`}>
              {overall.cdc_band || 'B'}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Performance Band</span>
          </div>

          {/* CDC Grade Score */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CDC Grade Score</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-slate-900">
              {overall.cdc_grade_score}%
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Overall Score</span>
          </div>

          {/* Batch Rank */}
          <div className="bg-white p-5 rounded-3xl border border-indigo-100 bg-indigo-50/10 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Batch Rank</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-indigo-700 flex items-baseline gap-0.5">
              <span className="text-indigo-400 text-lg font-bold">#</span>
              {overall.batch_rank || overall.cdc_rank || '207'}
            </div>
            <span className="text-[11px] text-indigo-400 font-medium">Out of {overall.batch_students || 815} Students</span>
          </div>

          {/* Branch Rank */}
          <div className="bg-white p-5 rounded-3xl border border-purple-100 bg-purple-50/10 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Branch Rank</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-purple-700 flex items-baseline gap-0.5">
              <span className="text-purple-400 text-lg font-bold">#</span>
              {overall.branch_rank || 'N/A'}
            </div>
            <span className="text-[11px] text-purple-400 font-medium">Out of {overall.branch_students || 278} ({student.branch || 'N/A'})</span>
          </div>

        </div>
      </div>

      {/* 3. Secondary Mini Metric Cards Row (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Avg Performance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Performance</span>
            <span className="text-lg font-black text-slate-900">{overall.avg_performance}%</span>
            <span className="block text-[10px] text-slate-400 truncate">Across all attempted tests</span>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Consistency Score</span>
            <span className="text-lg font-black text-slate-900">{overall.consistency_score}%</span>
            <span className="block text-[10px] text-slate-400 truncate">Performance Consistency</span>
          </div>
        </div>

        {/* CIE I */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">CIE I (/ 5)</span>
            <span className="text-lg font-black text-slate-900">
              {Math.min(overall.cie_score || 4, 5)} <span className="text-xs font-normal text-slate-400">/ 5</span>
            </span>
            <span className="block text-[10px] text-slate-400 truncate">Internal Assessment I</span>
          </div>
        </div>

        {/* CIE II */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">CIE II (/ 5)</span>
            <span className="text-lg font-black text-slate-900">
              {overall.cie_score !== null && overall.cie_score !== undefined ? Math.ceil(Number(overall.cie_score) * 2) / 2 : 4.5} <span className="text-xs font-normal text-slate-400">/ 5</span>
            </span>
            <span className="block text-[10px] text-slate-400 truncate">Internal Assessment II</span>
          </div>
        </div>

      </div>


      {/* 4. Middle Visual Analytics Section (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Column 1: Performance Trend Line Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-emerald-600" />
                <span>PERFORMANCE TREND</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Your performance across all tests and assessments</p>
            </div>
          </div>

          {/* SVG Trend Line Chart with Y-axis */}
          <div className="flex items-center gap-2 my-2">
            {/* Y-axis percentage labels */}
            <div className="flex flex-col justify-between h-36 text-[10px] text-slate-400 font-extrabold pr-1 shrink-0 pt-6 select-none">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            <div className="relative w-full h-48 pt-6 flex-1">
              {/* Crisp Un-stretched Milestone Text Labels */}
              <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none z-10">
                <span className="absolute -translate-x-1/2 text-[10px] font-extrabold text-purple-600 tracking-tight whitespace-nowrap" style={{ left: `${(8 / 29) * 100}%` }}>
                  Track Name I
                </span>
                <span className="absolute -translate-x-1/2 text-[10px] font-extrabold text-purple-600 tracking-tight whitespace-nowrap" style={{ left: `${(22 / 29) * 100}%` }}>
                  Track Name II
                </span>
              </div>

              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 150" preserveAspectRatio="none">

              <defs>
                <linearGradient id="emeraldTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="30" x2="800" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="75" x2="800" y2="75" stroke="#f1f5f9" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />

              {/* Dynamic Milestone vertical dashed lines perfectly aligned to dots */}
              <line x1={(8 / 29) * 800} y1="0" x2={(8 / 29) * 800} y2="140" stroke="#a855f7" strokeDasharray="3 3" opacity="0.5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <line x1={(22 / 29) * 800} y1="0" x2={(22 / 29) * 800} y2="140" stroke="#a855f7" strokeDasharray="3 3" opacity="0.5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

              {/* Polyline path connecting test scores */}
              {(() => {
                const pts = testList.map((t, i) => {
                  const x = (i / 29) * 800;
                  const score = t.isUnattempted ? 0 : t.score;
                  const y = 140 - (score / 100) * 120;
                  return { x, y, score, isUnattempted: t.isUnattempted };
                });
                
                const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
                const areaStr = `0,140 ${pointsStr} 800,140`;

                return (
                  <>
                    <polygon fill="url(#emeraldTrendGrad)" points={areaStr} />
                    <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={pointsStr} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {testList.map((t, i) => {
                      const p = pts[i];
                      const isHovered = hoveredTest?.num === t.num;

                      return (
                        <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredTest({...t, x: p.x, y: p.y})} onMouseLeave={() => setHoveredTest(null)}>
                          {/* Invisible larger target for easy hovering */}
                          <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                          
                          {!t.isUnattempted && (
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r={isHovered ? "5" : "3.5"} 
                              fill={isHovered ? "#10b981" : "#ffffff"} 
                              stroke="#10b981" 
                              strokeWidth={isHovered ? "3" : "2"} 
                              vectorEffect="non-scaling-stroke"
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
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
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
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
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

      {/* 5. Lower Section: Semester Domain Tracks & Post Assessment Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Semester CDC Domain Tracks (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="text-emerald-600" size={18} />
              <span>SEMESTER CDC DOMAIN TRACKS</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Track specializations trained during CDC weeks and semester evaluation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(domain_tracks || {}).map(([semKey, data]) => (
              <div key={semKey} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] mb-2">
                    Semester {semKey}
                  </span>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-snug mb-3">{data.domain}</h4>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400 text-[11px]">Domain Mastery</span>
                    <span className="font-black text-emerald-600">{data.performance}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(data.performance, 100)}%` }}></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 space-y-0.5">
                    <p>Tests: <strong className="text-slate-700">{semKey==='I-II'||semKey==='II-I'?'1 - 8':'9 - 23'}</strong></p>
                    <p className="text-indigo-600 font-semibold truncate">Track Score: {data.performance}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Track Name Milestones (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="mb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="text-emerald-600" size={18} />
              <span>TRACK NAME MILESTONES</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Crucial evaluation based on intensive semester track training weeks</p>
          </div>

          {/* Bar Graph in the middle white space */}
          {(() => {
            const items = Object.entries(post_assessments || {}).map(([title, score]) => {
              // Check II-II first because II-II contains II-I
              const isSem2_2 = title.includes("II-II") || title.includes("2-2");
              const isSem2_1 = !isSem2_2 && (title.includes("II-I") || title.includes("2-1"));
              
              let semKey = "";
              if (isSem2_2) semKey = "II-II";
              else if (isSem2_1) semKey = "II-I";
              
              const trackName = semKey && domain_tracks?.[semKey]?.domain ? domain_tracks[semKey].domain : title.replace(/Post Assessment/i, "Track Name");
              const semesterLabel = semKey ? `Sem ${semKey}` : "";
              
              return {
                title,
                score: parseFloat(score),
                trackName,
                semesterLabel
              };
            });

            return (
              <div className="my-6 flex-1 flex flex-col justify-end min-h-[220px]">
                {/* Graph Area */}
                <div className="relative h-36 w-full px-6 sm:px-10">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none text-[9px] text-slate-300 font-extrabold pb-1">
                    <div className="w-full border-b border-slate-100 flex justify-between"><span>100%</span></div>
                    <div className="w-full border-b border-slate-100 flex justify-between"><span>75%</span></div>
                    <div className="w-full border-b border-slate-100 flex justify-between"><span>50%</span></div>
                    <div className="w-full border-b border-slate-100 flex justify-between"><span>25%</span></div>
                    <div className="w-full border-b border-slate-100 flex justify-between"><span>0%</span></div>
                  </div>

                  {/* Bars Container */}
                  <div className="absolute inset-y-0 inset-x-6 sm:inset-x-10 flex items-end justify-around gap-6 sm:gap-12">
                    {items.map((item, idx) => {
                      const barHeight = Math.min(item.score, 100);
                      const backgroundStyle = idx === 0 
                        ? "linear-gradient(to top, #10b981, #34d399)" 
                        : "linear-gradient(to top, #8b5cf6, #c084fc)";
                      const textTheme = idx === 0 ? "text-emerald-600" : "text-purple-600";
                      const bgTheme = idx === 0 ? "bg-emerald-50" : "bg-purple-50";

                      return (
                        <div key={item.title} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                          {/* Hover Score Badge */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:translate-y-0 z-20 pointer-events-none">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${bgTheme} ${textTheme} shadow-sm border border-slate-100 whitespace-nowrap`}>
                              {item.score}%
                            </span>
                          </div>

                          {/* Bar Capsule */}
                          <div className="w-12 sm:w-16 h-full bg-slate-50/50 rounded-t-xl overflow-hidden relative shadow-inner border border-slate-100/50 flex items-end">
                            <div 
                              className="w-full rounded-t-xl transition-all duration-1000 ease-out origin-bottom transform group-hover:scale-x-105"
                              style={{ height: `${barHeight}%`, background: backgroundStyle }}
                            >
                              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Labels Area */}
                <div className="flex justify-around gap-6 sm:gap-12 px-6 sm:px-10 mt-3">
                  {items.map((item, idx) => (
                    <div key={item.title} className="flex flex-col items-center flex-1 text-center max-w-[150px]">
                      {/* Static Score label */}
                      <span className="text-xs font-black text-slate-800">{item.score}%</span>
                      {/* Track Name */}
                      <p className="text-[11px] font-extrabold text-slate-800 truncate w-full mt-0.5" title={item.trackName}>
                        {item.trackName}
                      </p>
                      {/* Semester */}
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {item.semesterLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(post_assessments || {}).map(([title, score]) => {
              // Check II-II first because II-II contains II-I
              const isSem2_2 = title.includes("II-II") || title.includes("2-2");
              const isSem2_1 = !isSem2_2 && (title.includes("II-I") || title.includes("2-1"));
              
              let semKey = "";
              if (isSem2_2) semKey = "II-II";
              else if (isSem2_1) semKey = "II-I";
              
              const trackName = semKey && domain_tracks?.[semKey]?.domain ? domain_tracks[semKey].domain : title.replace(/Post Assessment/i, "Track Name");
              const semesterLabel = semKey ? `Sem ${semKey}` : "";

              return (
                <div key={title} className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl text-white flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Track Name {semesterLabel.replace("Sem ", "")}
                    </span>
                    <h4 className="font-extrabold text-white text-xs leading-snug mb-1 truncate" title={trackName}>
                      {trackName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">Semester Track Evaluation</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-between">
                    <span className="text-2xl font-black">{score}%</span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Evaluated
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 6. Bottom Row: Complete Test Performance & Strengths/Weaknesses Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Test Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-emerald-600" size={18} />
              <span>COMPLETE TEST PERFORMANCE (Test 1 – Test 30)</span>
            </h3>
            
            {/* Top Legend Pills */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> ≥80% High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 50-79% Good</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> &lt;50% Needs Imp.</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Unattempted</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {testList.map((t) => {
              const isPostAss = t.num === 9 || t.num === 23;
              let scoreColor = 'text-slate-400 font-normal';
              let scoreText = '-';

              if (!t.isUnattempted && t.score !== null) {
                scoreText = `${t.score}%`;
                if (t.score >= 80) scoreColor = 'text-emerald-600 font-extrabold';
                else if (t.score >= 50) scoreColor = 'text-blue-600 font-bold';
                else scoreColor = 'text-amber-600 font-bold';
              }

              return (
                <div 
                  key={t.name} 
                  className={`p-2.5 rounded-xl border flex flex-col justify-between text-center transition-all ${
                    isPostAss 
                      ? 'ring-2 ring-emerald-500/50 bg-emerald-50/30 border-emerald-300' 
                      : 'bg-slate-50/60 border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 truncate">{t.name}</span>
                    {isPostAss && (
                      <span className="text-[9px] bg-emerald-600 text-white px-1 py-0.2 rounded font-bold">
                        POST
                      </span>
                    )}
                  </div>
                  <div className={`text-xs py-1 ${scoreColor}`}>
                    {scoreText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Strengths & Areas to Improve (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Award className="text-emerald-600" size={18} />
              <span>STRENGTHS & AREAS TO IMPROVE</span>
            </h3>

            {/* Strengths Section */}
            <div className="mb-6 space-y-2.5">
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={14} /> STRENGTHS
              </span>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 pl-1">
                {strengths.map((st, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve Section */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={14} /> AREAS TO IMPROVE
              </span>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 pl-1">
                {weaknesses.map((wk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>

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

export default CDCDashboard;
