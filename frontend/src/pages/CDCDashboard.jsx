// src/pages/CDCDashboard.jsx
import { useState, useEffect } from 'react';
import { 
  Award, TrendingUp, CheckCircle2, Target, BookOpen, Layers, 
  BarChart3, ShieldCheck, Star, Calendar, Bell, Mail, Phone, 
  User, CheckCircle, AlertTriangle, ArrowUpRight, ChevronDown, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const shortenTestName = (name) => {
  if (!name) return "";
  return name
    .replace(/Quantitative Aptitude/gi, "QA")
    .replace(/Logical Reasoning/gi, "LR")
    .replace(/Post As+es+ment/gi, "PA")
    .replace(/Post Assess\./gi, "PA")
    .replace(/\s+/g, " ")
    .trim();
};

const formatYear = (yr) => {
  if (yr === 1) return "1st Year";
  if (yr === 2) return "2nd Year";
  if (yr === 3) return "3rd Year";
  if (yr === 4) return "4th Year";
  return `${yr}th Year`;
};

const CDCDashboard = ({ user }) => {
  const [cdcData, setCdcData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All Semesters');
  const [hoveredTest, setHoveredTest] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchCDCData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_URL}/api/student/cdc-dashboard-data`, {
          params: selectedYear ? { academic_year: selectedYear } : {},
          headers: {
            'Authorization': `Bearer ${user.email}`
          }
        });
        setCdcData(response.data);
        if (response.data.available_years) {
          setAvailableYears(response.data.available_years);
        }
        if (response.data.student && selectedYear === null) {
          setSelectedYear(response.data.student.academic_year);
        }
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
  }, [user, API_URL, selectedYear]);

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

  const { student, overall, post_assessments, domain_tracks, test_scores, test_mappings } = cdcData;

  // ── Dynamic test list: built from actual data keys, not hardcoded 30 ──
  const rawScores = test_scores || {};
  const mappings = test_mappings || {};

  // Detect if a test key represents a post assessment score
  const isPostAssessment = (key) => {
    const lower = (key || '').toLowerCase();
    return lower.includes('post') || lower.includes('track name');
  };

  // Natural sort: extract leading number for "Test N" style keys
  const extractTestNum = (key) => {
    const m = key.match(/(?:test\s*)(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  };

  // Build union of all test keys from test_scores and test_mappings
  const allTestKeys = new Set([
    ...Object.keys(rawScores),
    ...Object.keys(mappings)
  ]);

  const mappingKeys = Object.keys(mappings || {});

  const testList = [...allTestKeys]
    .sort((a, b) => {
      const idxA = mappingKeys.indexOf(a);
      const idxB = mappingKeys.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      const numA = extractTestNum(a);
      const numB = extractTestNum(b);
      if (numA !== null && numB !== null) return numA - numB;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return a.localeCompare(b);
    })
    .map((key, idx) => {
      const scoreVal = rawScores[key];
      const isUnattempted = scoreVal === null || scoreVal === undefined || scoreVal === '';
      const rawDisplayName = mappings[key] || key;
      const displayName = shortenTestName(rawDisplayName);
      const isPost = isPostAssessment(key) || isPostAssessment(rawDisplayName);

      return {
        key,
        name: displayName,
        fullName: rawDisplayName,
        num: idx + 1,
        score: isUnattempted ? null : parseFloat(scoreVal),
        isUnattempted,
        isPost
      };
    });

  // Analytics Calculations
  const totalTests = testList.length;
  const attemptedTests = testList.filter(t => !t.isUnattempted);
  const attemptedCount = attemptedTests.length;
  const unattemptedCount = totalTests - attemptedCount;
  const attemptedPct = totalTests > 0 ? ((attemptedCount / totalTests) * 100).toFixed(2) : '0.00';

  const excellentCount = attemptedTests.filter(t => t.score >= 80).length;
  const goodCount = attemptedTests.filter(t => t.score >= 50 && t.score < 80).length;
  const needsImpCount = attemptedTests.filter(t => t.score < 50).length;
  const denominator = totalTests > 1 ? totalTests - 1 : 1;

  const postAssIndices = testList.reduce((acc, t, i) => {
    if (t.isPost) acc.push(i);
    return acc;
  }, []);

  const getMilestoneLabel = (postIndex) => {
    const pos = postAssIndices.indexOf(postIndex);
    if (pos === -1) return "Milestone";
    
    const romanYear = {1: "I", 2: "II", 3: "III", 4: "IV"}[selectedYear] || selectedYear;
    const sortedSemKeys = Object.keys(domain_tracks || {})
      .filter(key => key.startsWith(`${romanYear}-`))
      .sort((a, b) => {
        const semOrder = ["I-II", "II-I", "II-II", "III-I", "III-II", "IV-I", "IV-II"];
        const indexA = semOrder.indexOf(a);
        const indexB = semOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        return a.localeCompare(b);
      });
    
    if (pos < sortedSemKeys.length) {
      const semKey = sortedSemKeys[pos];
      const data = domain_tracks[semKey];
      return data?.domain ? shortenTestName(data.domain) : `Track ${pos + 1}`;
    }
    
    const postKeys = Object.keys(post_assessments || {});
    if (pos < postKeys.length) {
      return shortenTestName(postKeys[pos]);
    }
    
    return `Track ${pos + 1}`;
  };

  const getSemTestRange = (semKey) => {
    const postTests = testList.filter(t => t.isPost);
    if (postTests.length === 0) return "";
    if (semKey === 'I-II' || semKey === 'II-I') {
      const firstPost = postTests[0];
      return firstPost ? `1 - ${firstPost.num - 1}` : "";
    } else {
      const firstPost = postTests[0];
      const secondPost = postTests[1];
      if (firstPost && secondPost) {
        return `${firstPost.num} - ${secondPost.num}`;
      } else if (firstPost) {
        return `${firstPost.num} - ${testList.length}`;
      }
      return "";
    }
  };

  const getXAxisLabels = () => {
    if (totalTests === 0) return [];
    if (totalTests <= 6) {
      return testList.map(t => t.name);
    }
    const indices = [];
    const step = (totalTests - 1) / 5;
    for (let i = 0; i < 6; i++) {
      indices.push(Math.round(i * step));
    }
    const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
    return uniqueIndices.map(idx => ({
      label: testList[idx].name,
      left: `${(idx / denominator) * 100}%`
    }));
  };
  const xAxisLabels = getXAxisLabels();

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

  if (attemptedCount === 0) {
    strengths.push("No test performance data available for this academic year yet.");
    weaknesses.push("No test performance data available for this academic year yet.");
  } else {
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
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 bg-slate-50/50 min-h-screen">
      
      {/* 1. Top Welcome Header Row */}
      <div className="pt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, <span className="text-emerald-600">{student.name || user.name}</span> 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Here's your CDC performance overview</p>
        </div>
        
        {/* Year Dropdown Filter */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm shrink-0 self-start sm:self-center">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year:</span>
            <select
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-extrabold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{formatYear(yr)}</option>
              ))}
            </select>
          </div>
        )}
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
              {overall.cdc_band || 'N/A'}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Performance Band</span>
          </div>

          {/* CDC Grade Score */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CDC Grade Score</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-slate-900">
              {overall.cdc_grade_score != null ? `${overall.cdc_grade_score}%` : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Overall Score</span>
          </div>

          {/* Batch Rank */}
          <div className="bg-white p-5 rounded-3xl border border-indigo-100 bg-indigo-50/10 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Batch Rank</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-indigo-700 flex items-baseline gap-0.5">
              {(overall.batch_rank || overall.cdc_rank) ? (
                <><span className="text-indigo-400 text-lg font-bold">#</span>{overall.batch_rank || overall.cdc_rank}</>
              ) : 'N/A'}
            </div>
            <span className="text-[11px] text-indigo-400 font-medium">{overall.batch_students ? `Out of ${overall.batch_students} Students` : 'No data yet'}</span>
          </div>

          {/* Branch Rank */}
          <div className="bg-white p-5 rounded-3xl border border-purple-100 bg-purple-50/10 shadow-sm flex flex-col justify-between items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Branch Rank</span>
            <div className="my-1 text-2xl sm:text-3xl font-black text-purple-700 flex items-baseline gap-0.5">
              {overall.branch_rank ? (
                <><span className="text-purple-400 text-lg font-bold">#</span>{overall.branch_rank}</>
              ) : 'N/A'}
            </div>
            <span className="text-[11px] text-purple-400 font-medium">{overall.branch_students ? `Out of ${overall.branch_students} (${student.branch || 'N/A'})` : (student.branch || 'N/A')}</span>
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
            <span className="text-lg font-black text-slate-900">{overall.avg_performance != null ? `${overall.avg_performance}%` : 'N/A'}</span>
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
            <span className="text-lg font-black text-slate-900">{overall.consistency_score != null ? `${overall.consistency_score}%` : 'N/A'}</span>
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
              {overall.cie_score != null ? <>{Math.min(Number(overall.cie_score), 5)} <span className="text-xs font-normal text-slate-400">/ 5</span></> : 'N/A'}
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
              {overall.cie_score != null ? <>{Math.ceil(Number(overall.cie_score) * 2) / 2} <span className="text-xs font-normal text-slate-400">/ 5</span></> : 'N/A'}
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
                {postAssIndices.map(idx => {
                  const t = testList[idx];
                  const leftPct = (idx / denominator) * 100;
                  const label = getMilestoneLabel(idx);
                  return (
                    <span 
                      key={idx}
                      className="absolute -translate-x-1/2 text-[10px] font-extrabold text-purple-600 tracking-tight whitespace-nowrap" 
                      style={{ left: `${leftPct}%` }} 
                      title={t.fullName}
                    >
                      {label}
                    </span>
                  );
                })}
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
              {postAssIndices.map(idx => {
                const xVal = (idx / denominator) * 800;
                return (
                  <line 
                    key={idx}
                    x1={xVal} 
                    y1="0" 
                    x2={xVal} 
                    y2="140" 
                    stroke="#a855f7" 
                    strokeDasharray="3 3" 
                    opacity="0.5" 
                    strokeWidth="1.5" 
                    vectorEffect="non-scaling-stroke" 
                  />
                );
              })}

              {/* Polyline path connecting test scores */}
              {(() => {
                const pts = testList.map((t, i) => {
                  const x = (i / denominator) * 800;
                  const score = t.isUnattempted ? 0 : t.score;
                  const y = 140 - (score / 100) * 120;
                  return { x, y, score, isUnattempted: t.isUnattempted };
                });
                
                const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
                const areaStr = pts.length > 0 ? `0,140 ${pointsStr} 800,140` : "0,140 800,140";

                return (
                  <>
                    {pts.length > 0 && <polygon fill="url(#emeraldTrendGrad)" points={areaStr} />}
                    {pts.length > 0 && <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={pointsStr} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
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
              const active = hoveredTest || (topPeakTest ? { ...topPeakTest, x: (testList.findIndex(t=>t.num===topPeakTest.num)/denominator)*100 } : null);
              if (!active) return null;
              
              const leftPct = hoveredTest ? (hoveredTest.x / 800) * 100 : active.x;
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

          <div className="relative h-6 text-[10px] text-slate-400 font-semibold pt-2 border-t border-slate-100 w-full select-none">
            {xAxisLabels.map((item, idx) => {
              const labelText = typeof item === 'string' ? item : item.label;
              const leftStyle = typeof item === 'string' 
                ? `${(idx / (xAxisLabels.length - 1 || 1)) * 100}%` 
                : item.left;
              return (
                <span 
                  key={idx} 
                  className="absolute -translate-x-1/2 whitespace-nowrap" 
                  style={{ left: leftStyle }}
                >
                  {labelText}
                </span>
              );
            })}
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
              <span className="text-2xl font-black text-slate-900">{totalTests}</span>
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
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: totalTests > 0 ? `${(excellentCount/totalTests)*100}%` : '0%' }}></div>
              </div>
            </div>

            {/* Good */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Good (50-79%)</span>
                <span className="font-bold text-slate-900">{goodCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: totalTests > 0 ? `${(goodCount/totalTests)*100}%` : '0%' }}></div>
              </div>
            </div>

            {/* Needs Improvement */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Needs Improvement (&lt;50%)</span>
                <span className="font-bold text-slate-900">{needsImpCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: totalTests > 0 ? `${(needsImpCount/totalTests)*100}%` : '0%' }}></div>
              </div>
            </div>

            {/* Unattempted */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Unattempted</span>
                <span className="font-bold text-slate-900">{unattemptedCount}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-300 h-full rounded-full transition-all duration-500" style={{ width: totalTests > 0 ? `${(unattemptedCount/totalTests)*100}%` : '0%' }}></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100 text-center">
            Score breakdown across {totalTests} standard tests
          </div>
        </div>

      </div>

      {/* 5. Lower Section: Semester Domain Tracks & Post Assessment Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Semester CDC Domain Tracks (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-start gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="text-emerald-600" size={18} />
              <span>SEMESTER CDC DOMAIN TRACKS</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Track specializations trained during CDC weeks and semester evaluation</p>
          </div>

          {!domain_tracks || Object.keys(domain_tracks).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 my-auto">
              <AlertCircle size={32} className="text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-500 max-w-[340px] leading-relaxed">
                Domain data not available. Kindly contact the CDC department for further details.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(domain_tracks).map(([semKey, data]) => (
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
                      {getSemTestRange(semKey) && <p>Tests: <strong className="text-slate-700">{getSemTestRange(semKey)}</strong></p>}
                      <p className="text-indigo-600 font-semibold truncate">Track Score: {data.performance}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      {semesterLabel ? `${semesterLabel} Track` : "Track Evaluation"}
                    </span>
                    <h4 className="font-extrabold text-white text-xs leading-snug mb-1 truncate" title={trackName}>
                      {shortenTestName(trackName)}
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
              <span>COMPLETE TEST PERFORMANCE {totalTests > 0 ? `(Test 1 – Test ${totalTests})` : ''}</span>
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
              const isPostAss = t.isPost;
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
                  title={t.fullName}
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
          
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="text-emerald-600 font-extrabold">ABBREVIATIONS:</span>
            <span>QA: Quantitative Aptitude</span>
            <span>LR: Logical Reasoning</span>
            <span>PA: Post Assessment</span>
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
