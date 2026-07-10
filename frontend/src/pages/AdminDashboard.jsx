// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Users, Award, BookOpen, Search, Filter, RefreshCw, 
  ChevronRight, ChevronLeft, X, User, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck, Building2,
  Target, Layers, BarChart3, Mail, CheckCircle, AlertTriangle, LayoutDashboard, LineChart, FileSpreadsheet, Calendar, UserMinus
} from 'lucide-react';
import DetailedDashboard from '../components/admin/DetailedDashboard';
import TrackBatchControlPanel from '../components/admin/TrackBatchControlPanel';
import ProjectManagementAdmin from '../components/admin/ProjectManagementAdmin';
import GoogleSheetsSetup from '../components/admin/GoogleSheetsSetup';
import DetainedStudentsSetup from '../components/admin/DetainedStudentsSetup';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

const AdminDashboard = ({ user }) => {
  const isSuperAdmin = user?.role === 'super_admin';
  const isBranchAdmin = user?.role === 'branch_admin';
  // Read-only admin roles (no write access at all)
  const isPrincipal = user?.role === 'principal' || user?.role === 'director' || user?.role === 'registrar';
  // Dean Academics: read-only except for batch/academic schedule CRUD
  const isDeanAcademics = user?.role === 'dean.academics';
  // Combined: used to hide Sync Sheets button & lock Google Sheets / Detained Students panels
  const isLimitedAdmin = isPrincipal || isDeanAcademics;
  // Roles that can see all branches
  const canViewAllBranches = isSuperAdmin || isPrincipal || isDeanAcademics;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'detailed' | 'control'

  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBand, setSelectedBand] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  
  // Pagination state (20 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Modal state for viewing individual student details
  const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [hoveredTest, setHoveredTest] = useState(null);
  const [modalSelectedYear, setModalSelectedYear] = useState(null);

  useEffect(() => {
    if (isBranchAdmin && user.assigned_branch) {
      setSelectedBranch(user.assigned_branch);
    }
    // canViewAllBranches roles stay on 'ALL' by default (no lock)
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

  // Debounced search & filter change effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedBranch, selectedBand, sortBy, searchQuery, selectedBatch, selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch analytics
      const analyticsRes = await axios.get(`${API_URL}/api/admin/analytics?branch=${selectedBranch}&batch_year=${selectedBatch}&academic_year=${selectedYear}`, { headers });
      setAnalytics(analyticsRes.data);
      if (analyticsRes.data.available_batches) {
        setAvailableBatches(analyticsRes.data.available_batches);
      }

      // 2. Fetch student list
      fetchStudentsList(selectedBranch, selectedBatch, selectedYear, searchQuery, selectedBand, sortBy);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsList = async (branchFilter, batchFilter, yearFilter, search, bandFilter, sortOrder) => {
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(
        `${API_URL}/api/admin/students?branch=${branchFilter}&batch_year=${batchFilter}&academic_year=${yearFilter}&search=${encodeURIComponent(search || '')}&band=${bandFilter || 'ALL'}&sort_by=${sortOrder || 'rank'}`, 
        { headers }
      );
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students list:', err);
    }
  };


  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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

  const openStudentModal = async (rollIdentifier, year = null) => {
    if (!rollIdentifier) return;
    setSelectedStudentRoll(rollIdentifier);
    setModalSelectedYear(year);
    setDetailLoading(true);
    setDetailError(null);
    if (studentDetail?.student?.roll_number !== rollIdentifier) {
      setStudentDetail(null);
    }
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/admin/student/${encodeURIComponent(rollIdentifier)}`, { 
        params: year ? { academic_year: year } : {},
        headers 
      });
      setStudentDetail(res.data);
      if (!year && res.data?.student?.academic_year) {
        setModalSelectedYear(res.data.student.academic_year);
      }
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
    setModalSelectedYear(null);
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

    const { student, overall, post_assessments, domain_tracks, test_scores, test_mappings, user_profile } = studentDetail;
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
      
      const romanYear = {1: "I", 2: "II", 3: "III", 4: "IV"}[student.academic_year] || student.academic_year;
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

    const topPeakTest = attemptedTests.reduce((max, t) => (t.score > (max?.score || 0) ? t : max), null);

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
        strengths.push('Good foundational performance across core modules');
      }
      if (topPeakTest) strengths.push(`Peak score of ${topPeakTest.score}% in ${topPeakTest.name}`);
      if (overall.cie_score >= 3.5) strengths.push(`Strong internal assessment score (${overall.cie_score}/5)`);

      const weakDomains = Object.entries(domain_tracks || {}).filter(([_, d]) => d.performance < 60);
      if (weakDomains.length > 0) weaknesses.push(`${weakDomains[0][1].domain} domain needs practice`);
      if (needsImpCount > 0) weaknesses.push(`Inconsistent performance in ${needsImpCount} attempted tests`);
      if (unattemptedCount > 0) weaknesses.push(`Complete remaining ${unattemptedCount} unattempted tests`);
    }

    return (
      <div className="space-y-6 text-left">
        
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
                {overall.cdc_band || 'N/A'}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Performance Band</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Grade Score</span>
              <div className="my-1 text-2xl font-black text-slate-900">{overall.cdc_grade_score != null ? `${overall.cdc_grade_score}%` : 'N/A'}</div>
              <span className="text-[10px] text-slate-400 font-medium">Overall Score</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-indigo-200 bg-indigo-50/10 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-indigo-500">Batch Rank</span>
              <div className="my-1 text-2xl font-black text-indigo-700">{(overall.batch_rank || overall.cdc_rank) ? `#${overall.batch_rank || overall.cdc_rank}` : 'N/A'}</div>
              <span className="text-[10px] text-indigo-400 font-medium">{overall.batch_students ? `Out of ${overall.batch_students}` : 'No data yet'}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl border border-purple-200 bg-purple-50/10 text-center flex flex-col justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-purple-500">Branch Rank</span>
              <div className="my-1 text-2xl font-black text-purple-700">{overall.branch_rank ? `#${overall.branch_rank}` : 'N/A'}</div>
              <span className="text-[10px] text-purple-400 font-medium">{overall.branch_students ? `Out of ${overall.branch_students}` : 'No data yet'}</span>
            </div>
          </div>
        </div>

        {/* Secondary Mini Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><TrendingUp size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Avg Performance</span>
              <span className="text-base font-black text-slate-900">{overall.avg_performance != null ? `${overall.avg_performance}%` : 'N/A'}</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl"><BarChart3 size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Consistency</span>
              <span className="text-base font-black text-slate-900">{overall.consistency_score != null ? `${overall.consistency_score}%` : 'N/A'}</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><BookOpen size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">CIE I (/ 5)</span>
              <span className="text-base font-black text-slate-900">{overall.cie_score != null ? <>{Math.min(Number(overall.cie_score), 5)} <span className="text-xs font-normal text-slate-400">/ 5</span></> : 'N/A'}</span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl"><BookOpen size={18} /></div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">CIE II (/ 5)</span>
              <span className="text-base font-black text-slate-900">{overall.cie_score != null ? <>{Math.ceil(Number(overall.cie_score) * 2) / 2} <span className="text-xs font-normal text-slate-400">/ 5</span></> : 'N/A'}</span>
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
                    <linearGradient id="emeraldTrendGradAdmin" x1="0" y1="0" x2="0" y2="1">
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
                        {pts.length > 0 && <polygon fill="url(#emeraldTrendGradAdmin)" points={areaStr} />}
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
              <Target size={14} className="text-emerald-600" /> Track Name Performance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(post_assessments || {}).map(([title, score]) => {
                const isSem2_2 = title.includes("II-II") || title.includes("2-2");
                const isSem2_1 = !isSem2_2 && (title.includes("II-I") || title.includes("2-1"));
                
                let semKey = "";
                if (isSem2_2) semKey = "II-II";
                else if (isSem2_1) semKey = "II-I";
                
                const trackName = semKey && domain_tracks?.[semKey]?.domain ? domain_tracks[semKey].domain : title.replace(/Post Assessment/i, "Track Name");
                const semesterLabel = semKey ? `Sem ${semKey}` : "";

                return (
                  <div key={title} className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between" title={trackName}>
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      {semesterLabel ? `${semesterLabel} Track` : "Track Name"}
                    </span>
                    <span className="text-xs font-bold truncate mt-1">{shortenTestName(trackName)}</span>
                    <span className="text-2xl font-black mt-2">{score}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Test Grid */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-600" /> All {totalTests > 0 ? `${totalTests} ` : ''}Test Scores
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {testList.map((t) => (
              <div 
                key={t.name} 
                className={`p-2 rounded-xl border text-center text-xs flex flex-col justify-between ${
                  t.isPost 
                    ? 'ring-2 ring-emerald-500/50 bg-emerald-50/30 border-emerald-300' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`} 
                title={t.fullName}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-slate-500 truncate">{t.name}</span>
                  {t.isPost && (
                    <span className="text-[8px] bg-emerald-600 text-white px-1 py-0.2 rounded font-extrabold scale-90 shrink-0">
                      POST
                    </span>
                  )}
                </div>
                <div className={`font-black mt-0.5 ${t.isUnattempted ? 'text-slate-300' : t.score >= 80 ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {t.isUnattempted ? '-' : `${t.score}%`}
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="text-emerald-600 font-extrabold">ABBREVIATIONS:</span>
            <span>QA: Quantitative Aptitude</span>
            <span>LR: Logical Reasoning</span>
            <span>PA: Post Assessment</span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch min-h-[calc(100vh-4rem)] w-full">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-6 shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex flex-col justify-between">
        <div className="space-y-6">
          <div className="px-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              CDC Admin Panel
            </h2>
          </div>
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'detailed'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <LineChart size={16} />
              <span>Detailed Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'projects'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <BookOpen size={16} />
              <span>Projects & Multi-Stack</span>
            </button>

            <button
              onClick={() => setActiveTab('control')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'control'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Layers size={16} />
              <span>Track & Batch Control</span>
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'sheets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <FileSpreadsheet size={16} />
              <span>Google Sheets Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('detained')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer w-full text-left ${
                activeTab === 'detained'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <UserMinus size={16} />
              <span>Detained Students</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-6 w-full pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Subtle Top Header Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm w-full">
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                CDC Overview Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck size={11} />
                {isSuperAdmin ? 'Admin'
                  : user?.role === 'director' ? 'Director'
                  : user?.role === 'registrar' ? 'Registrar'
                  : user?.role === 'dean.academics' ? 'Dean (Academics)'
                  : isPrincipal ? 'Principal'
                  : `Branch Admin (${user?.assigned_branch})`}
              </span>
            </div>
            <p className="text-slate-500 text-xs max-w-2xl leading-relaxed">
              Real-time academic & Career Development Center performance monitoring, branch aggregations, and student level insights.
            </p>
          </div>

          {/* User profile badge */}
          <div className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/70 p-2.5 rounded-2xl border border-slate-200/50 shrink-0 transition-colors">
            {user?.picture ? (
              <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Filters Bar - Visible in Overview and Detailed Dashboard */}
        {(activeTab === 'overview' || activeTab === 'detailed') && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              
              {/* Branch Dropdown */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 size={13} className="text-slate-400" />
                  Branch
                </label>
                {canViewAllBranches ? (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-[150px]"
                  >
                    {['ALL', 'CSE', 'CSM', 'CSD', 'ECE', 'EEE', 'MECH'].map((b) => (
                      <option key={b} value={b}>
                        {b === 'ALL' ? 'All Branches' : b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3.5 py-2 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200">
                    {user?.assigned_branch} Branch Only
                  </div>
                )}
              </div>

              {/* Batch Dropdown */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={13} className="text-slate-400" />
                  Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[150px]"
                >
                  <option value="ALL">All Batches</option>
                  {availableBatches.map((b) => (
                    <option key={b} value={b}>
                      Batch {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  Academic Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all min-w-[150px]"
                >
                  <option value="ALL">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
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
              {!isLimitedAdmin && (
                <button
                  onClick={handleSyncSheets}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing Sheets...' : 'Sync Live Sheets'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === 'projects' ? (
          <ProjectManagementAdmin user={user} />
        ) : activeTab === 'control' ? (
          <TrackBatchControlPanel user={user} isReadOnly={isPrincipal} />
        ) : activeTab === 'detailed' ? (
          <DetailedDashboard 
            user={user} 
            selectedBranch={selectedBranch} 
            selectedBatch={selectedBatch} 
            selectedYear={selectedYear} 
            onSelectStudent={openStudentModal} 
          />
        ) : activeTab === 'sheets' ? (
          <GoogleSheetsSetup user={user} isReadOnly={isLimitedAdmin} />
        ) : activeTab === 'detained' ? (
          <DetainedStudentsSetup user={user} isReadOnly={isLimitedAdmin} />
        ) : (
          <div className="space-y-8">

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Student Directory & Performance Roster</h3>
            <p className="text-xs text-slate-500">Click any student row to view their full detailed CDC performance dashboard.</p>
          </div>

          {/* Roster Controls: Branch Filter, Band Filter, Sort Order, Search Input */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            
            {/* Branch Filter Dropdown */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-400 hidden sm:inline">Branch:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  <option value="CSE">CSE</option>
                  <option value="CSM">CSM</option>
                  <option value="CSD">CSD</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                </select>
              </div>
            )}

            {/* Band Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-400 hidden sm:inline">Band:</span>
              <select
                value={selectedBand}
                onChange={(e) => setSelectedBand(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
              >
                <option value="ALL">All Bands</option>
                <option value="A">Band A</option>
                <option value="B">Band B</option>
                <option value="C">Band C</option>
                <option value="D">Band D</option>
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <span className="text-slate-400 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
              >
                <option value="rank">CDC Rank (1 to N)</option>
                <option value="perf_desc">Avg Performance (High → Low)</option>
                <option value="perf_asc">Avg Performance (Low → High)</option>
                <option value="cie_desc">CIE Score (High → Low)</option>
                <option value="consistency_desc">Consistency (High → Low)</option>
                <option value="name">Student Name (A → Z)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, roll, email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

          </div>
        </div>



        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">Batch Rank</th>
                <th className="py-3 px-4">Branch Rank</th>
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
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                    No students found matching the criteria.
                  </td>
                </tr>
              ) : (
                students.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((st) => (
                  <tr 
                    key={st.roll_number || st.email} 
                    onClick={() => openStudentModal(st.roll_number || st.email)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-extrabold text-slate-700">
                      #{st.cdc_rank || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-500">
                      #{st.branch_rank || 'N/A'}
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
                      {st.avg_performance != null ? `${st.avg_performance}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-indigo-600">
                      {st.cie_score != null ? st.cie_score : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {st.consistency_score != null ? `${st.consistency_score}%` : 'N/A'}
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

        {/* Roster Pagination Controls */}
        {students.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, students.length)}</strong> of <strong className="text-slate-800">{students.length}</strong> students
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg border border-blue-200">
                Page {currentPage} of {Math.ceil(students.length / ITEMS_PER_PAGE) || 1}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(students.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage >= Math.ceil(students.length / ITEMS_PER_PAGE)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Full Student Detailed CDC Dashboard Modal View */}
      {selectedStudentRoll && createPortal(
        <div 
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative my-auto"
          >
            {/* Fixed Modal Header Bar */}
            <div className="px-6 py-4 sm:px-8 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  Student CDC Inspection
                </span>
                <span className="text-xs text-slate-300 font-mono hidden sm:inline">
                  {studentDetail?.student?.roll_number || selectedStudentRoll}
                </span>

                {/* Academic Year Selector */}
                {studentDetail?.student?.available_years && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 border border-white/5 rounded-xl text-xs font-semibold text-white ml-2">
                    <span className="text-slate-400">Academic Year:</span>
                    <select
                      value={modalSelectedYear || ''}
                      onChange={(e) => openStudentModal(selectedStudentRoll, parseInt(e.target.value))}
                      className="bg-transparent focus:outline-none font-bold text-white cursor-pointer"
                    >
                      {studentDetail.student.available_years.map((yr) => (
                        <option key={yr} value={yr} className="bg-slate-900 text-white">
                          {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : yr === 4 ? '4th Year' : `${yr}th Year`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={closeStudentModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Close Modal (Esc)"
              >
                <X size={16} />
                <span>Close View (Esc)</span>
              </button>
            </div>

            {/* Scrollable Modal Body Content */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-left">
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
        </div>,
        document.body
      )}



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

export default AdminDashboard;

