// src/components/admin/DetailedDashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, ClipboardCheck, CheckCircle2, Star, Award, Signal, Download, 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info, ChevronDown 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DetailedDashboard = ({ user, selectedBranch, onSelectStudent }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendMetric, setTrendMetric] = useState('Average Score');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    fetchDetailedAnalytics();
  }, [selectedBranch]);

  const fetchDetailedAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = user?.email || '';
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/admin/detailed-analytics?branch=${selectedBranch}`, { headers });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch detailed analytics:', err);
      setError('Failed to load detailed dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!data) return;
    const reportContent = `CDC Detailed Dashboard Report - Branch: ${selectedBranch}
Total Students: ${data.total_students}
Tests Attempted: ${data.tests_attempted} (Avg: ${data.avg_tests_per_student} per student)
Participation Rate: ${data.participation_rate}%
Average Performance: ${data.avg_performance}%
Avg CDC Grade Score: ${data.avg_cdc_grade_score}%
Top CDC Band: ${data.top_cdc_band?.band} (${data.top_cdc_band?.percentage}%)
Generated on: ${new Date().toLocaleString()}
`;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CDC_Dashboard_Report_${selectedBranch}_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-medium animate-pulse flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Detailed Dashboard Analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-center my-6">
        <AlertCircle size={32} className="mx-auto mb-2 text-rose-500" />
        <p className="font-bold">{error || 'No data available.'}</p>
        <button onClick={fetchDetailedAnalytics} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors">
          Retry Loading
        </button>
      </div>
    );
  }

  const getBandBadgeClass = (band) => {
    switch (band?.toUpperCase()) {
      case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'D': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  const bandColors = {
    A: '#10B981', // Emerald
    B: '#3B82F6', // Blue
    C: '#F59E0B', // Amber
    D: '#EF4444'  // Red
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Detailed Performance Analytics</h2>
          <p className="text-xs text-slate-500">Comprehensive overview of test completion, score distributions, and student groups.</p>
        </div>
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download size={15} />
          <span>Export Report</span>
        </button>
      </div>

      {/* Row 1: 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Card 1: Total Students */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Total Students</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.total_students}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">100% of batch</span>
          </div>
        </div>

        {/* Card 2: Tests Attempted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Tests Attempted</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.tests_attempted.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Avg. {data.avg_tests_per_student} / student</span>
          </div>
        </div>

        {/* Card 3: Participation Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Participation Rate</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.participation_rate}%</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Overall Rate</span>
          </div>
        </div>

        {/* Card 4: Average Performance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Star size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Avg Performance</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.avg_performance}%</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Across all tests</span>
          </div>
        </div>

        {/* Card 5: Avg CDC Grade Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">CDC Grade Score</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.avg_cdc_grade_score}%</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Overall Average</span>
          </div>
        </div>

        {/* Card 6: Top CDC Band */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0">
              <Signal size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Top CDC Band</span>
              <span className="text-2xl font-black text-slate-900 block leading-none mt-1">{data.top_cdc_band?.band}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Most common band</span>
            <span className="text-slate-700 font-bold">{data.top_cdc_band?.percentage}% students</span>
          </div>
        </div>

      </div>

      {/* Row 2: 3 Visual Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Performance Trend (Across All Tests) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Performance Trend (Across All Tests)</h3>
            <div className="relative inline-block text-left">
              <select 
                value={trendMetric}
                onChange={(e) => setTrendMetric(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 pr-8 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs"
              >
                <option value="Average Score">Average Score</option>
                <option value="Top Score">Top Score</option>
                <option value="Lowest Score">Lowest Score</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Chart Wrapper with Left Y-Axis */}
          <div className="flex gap-3 items-stretch my-2 relative">
            
            {/* Left Y-Axis Labels */}
            <div className="flex flex-col justify-between text-[10px] font-bold text-slate-400 py-1 text-right select-none shrink-0 w-8">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* SVG Chart Surface */}
            <div className="h-52 flex-1 relative overflow-visible">
              {/* Floating Hover Tooltip Badge */}
              {hoveredPoint && (
                <div 
                  className={`absolute pointer-events-none z-30 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xl border border-slate-700 transform -translate-x-1/2 transition-all duration-150 ${
                    hoveredPoint.y < 45 ? 'translate-y-2 mt-1' : '-translate-y-full -mt-2'
                  }`}
                  style={{ left: `${(hoveredPoint.x / 500) * 100}%`, top: `${(hoveredPoint.y / 160) * 100}%` }}
                >
                  <div>{hoveredPoint.label}</div>
                  <div className="text-purple-300 text-xs font-black">{hoveredPoint.score}%</div>
                </div>
              )}

              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="purpleTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1.5" />
                <line x1="0" y1="52.5" x2="500" y2="52.5" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1.5" />
                <line x1="0" y1="85" x2="500" y2="85" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1.5" />
                <line x1="0" y1="117.5" x2="500" y2="117.5" stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1.5" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#E2E8F0" strokeWidth="1.5" />

                {/* Vertical Dotted Lines for Post Assessment I & II */}
                {(() => {
                  const xP1 = (8 / 29) * 500;
                  const xP2 = (22 / 29) * 500;
                  return (
                    <>
                      <line x1={xP1} y1="20" x2={xP1} y2="150" stroke="#C084FC" strokeDasharray="4 4" strokeWidth="2" />
                      <line x1={xP2} y1="20" x2={xP2} y2="150" stroke="#C084FC" strokeDasharray="4 4" strokeWidth="2" />
                      
                      {/* Non-overlapping Header Labels */}
                      <text x={xP1} y="12" fill="#9333EA" fontSize="11" fontWeight="800" textAnchor="middle">Post Assessment I</text>
                      <text x={xP2} y="12" fill="#9333EA" fontSize="11" fontWeight="800" textAnchor="middle">Post Assessment II</text>
                    </>
                  );
                })()}

                {/* Dynamic Smooth Trend Line & Gradient */}
                {(() => {
                  const rawList = data.performance_trend || [];
                  const pts = rawList.map((t, idx) => {
                    const x = (idx / 29) * 500;
                    let targetVal = t.avg_score;
                    if (trendMetric === 'Top Score') targetVal = t.top_score;
                    if (trendMetric === 'Lowest Score') targetVal = t.lowest_score;
                    
                    const score = Math.min(100, Math.max(0, targetVal || 50));
                    const y = 150 - (score / 100) * 130;
                    return { x, y, score, label: t.label };
                  });

                  if (pts.length < 2) return null;

                  // Smooth Bezier curve generator
                  let dPath = `M ${pts[0].x},${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const curr = pts[i];
                    const next = pts[i + 1];
                    const mx = (curr.x + next.x) / 2;
                    dPath += ` C ${mx},${curr.y} ${mx},${next.y} ${next.x},${next.y}`;
                  }

                  const dArea = `${dPath} L 500,150 L 0,150 Z`;

                  return (
                    <>
                      <path d={dArea} fill="url(#purpleTrendGrad)" />
                      <path d={dPath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {pts.map((pt, idx) => (
                        <g 
                          key={idx} 
                          className="group cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={hoveredPoint?.label === pt.label ? "5.5" : "3.5"} 
                            fill={hoveredPoint?.label === pt.label ? "#8B5CF6" : "#FFFFFF"} 
                            stroke="#8B5CF6" 
                            strokeWidth="2" 
                            className="transition-all duration-200 cursor-pointer" 
                          />
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3 pl-11">
            <span>Test 1</span>
            <span>Test 5</span>
            <span>Test 10</span>
            <span>Test 15</span>
            <span>Test 20</span>
            <span>Test 25</span>
            <span>Test 30</span>
          </div>
        </div>

        {/* Domain Skill Proficiency */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Domain Skill Proficiency</h3>

          <div className="space-y-3.5 my-auto max-h-[210px] overflow-y-auto pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {data.domain_mastery?.filter(dm => dm.domain && dm.domain.trim() !== "" && dm.domain.trim() !== "0").map((dm, idx) => {
              const barColors = ['bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-amber-500'];
              return (
                <div key={dm.domain}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 truncate max-w-[170px]" title={dm.domain}>{dm.domain}</span>
                    <span className="text-slate-900 font-black">{dm.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`} 
                      style={{ width: `${Math.min(100, Math.max(0, dm.score))}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Distribution (All Tests) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Performance Distribution (All Tests)</h3>

          <div className="space-y-4 my-auto">
            {/* Excellent */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Excellent (≥80%)</span>
                <span className="text-slate-900">{data.performance_distribution?.excellent?.count?.toLocaleString()} <span className="text-slate-400 text-[11px] font-semibold">{data.performance_distribution?.excellent?.pct}%</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${data.performance_distribution?.excellent?.pct}%` }}></div>
              </div>
            </div>

            {/* Good */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Good (50-79%)</span>
                <span className="text-slate-900">{data.performance_distribution?.good?.count?.toLocaleString()} <span className="text-slate-400 text-[11px] font-semibold">{data.performance_distribution?.good?.pct}%</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${data.performance_distribution?.good?.pct}%` }}></div>
              </div>
            </div>

            {/* Needs Improvement */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Needs Improvement (&lt;50%)</span>
                <span className="text-slate-900">{data.performance_distribution?.needs_improvement?.count?.toLocaleString()} <span className="text-slate-400 text-[11px] font-semibold">{data.performance_distribution?.needs_improvement?.pct}%</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${data.performance_distribution?.needs_improvement?.pct}%` }}></div>
              </div>
            </div>

            {/* Unattempted */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">Unattempted</span>
                <span className="text-slate-900">{data.performance_distribution?.unattempted?.count?.toLocaleString()} <span className="text-slate-400 text-[11px] font-semibold">{data.performance_distribution?.unattempted?.pct}%</span></span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full" style={{ width: `${data.performance_distribution?.unattempted?.pct}%` }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: 3 Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Semester Wise Average Performance */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Semester Wise Average Performance</h3>
          
          <div className="h-44 flex items-end justify-around gap-4 pt-6 pb-2 border-b border-slate-100 px-4">
            {data.semester_performance?.map((sem, idx) => {
              const colors = ['bg-purple-600', 'bg-blue-500', 'bg-emerald-500'];
              return (
                <div key={sem.semester} className="flex flex-col items-center gap-2 h-full justify-end flex-1">
                  <span className="text-xs font-extrabold text-slate-800">{sem.score}%</span>
                  <div 
                    className={`w-full rounded-t-xl transition-all duration-500 ${colors[idx % colors.length]}`}
                    style={{ height: `${sem.score}%` }}
                  ></div>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 truncate max-w-full">{sem.semester}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Post Assessment Performance */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Post Assessment Performance</h3>

          <div className="grid grid-cols-2 gap-4 my-auto">
            {/* Gauge 1 */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
              <span className="text-[11px] font-bold text-slate-600 mb-2">Post Assessment I</span>
              <div className="relative flex items-center justify-center my-1">
                <svg width="90" height="90" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#E9D5FF" strokeWidth="12" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="none" 
                    stroke="#8B5CF6" 
                    strokeWidth="12" 
                    strokeDasharray={`${(data.post_assessments?.post_1?.avg / 100) * 238.7} 238.7`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-900">{data.post_assessments?.post_1?.avg}%</span>
                  <span className="text-[9px] text-slate-400 font-medium">Avg. Score</span>
                </div>
              </div>
            </div>

            {/* Gauge 2 */}
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[11px] font-bold text-slate-600 mb-2">Post Assessment II</span>
              <div className="relative flex items-center justify-center my-1">
                <svg width="90" height="90" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#BFDBFE" strokeWidth="12" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="12" 
                    strokeDasharray={`${(data.post_assessments?.post_2?.avg / 100) * 238.7} 238.7`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-900">{data.post_assessments?.post_2?.avg}%</span>
                  <span className="text-[9px] text-slate-400 font-medium">Avg. Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CDC Band Distribution */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">CDC Band Distribution</h3>

          <div className="flex items-center gap-4">
            {/* Donut Graphic */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="36" fill="none" stroke="#F1F5F9" strokeWidth="16" />
                {(() => {
                  let offset = 0;
                  const total = data.total_students || 1;
                  const circumference = 226.2;
                  return Object.entries(data.cdc_band_distribution || {}).map(([bandKey, val]) => {
                    const pct = (val.count / total);
                    const strokeDash = `${pct * circumference} ${circumference}`;
                    const currentOffset = offset;
                    offset += pct * circumference;
                    return (
                      <circle 
                        key={bandKey}
                        cx="50" 
                        cy="50" 
                        r="36" 
                        fill="none" 
                        stroke={bandColors[bandKey] || '#94A3B8'} 
                        strokeWidth="16" 
                        strokeDasharray={strokeDash}
                        strokeDashoffset={-currentOffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-slate-900">{data.total_students}</span>
                <span className="text-[9px] text-slate-400 font-medium">Students</span>
              </div>
            </div>

            {/* Table Breakdown */}
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="grid grid-cols-3 font-bold text-slate-400 text-[10px] pb-1 border-b border-slate-100">
                <span>Band</span>
                <span className="text-right">Students</span>
                <span className="text-right">%</span>
              </div>
              {Object.entries(data.cdc_band_distribution || {}).map(([bandKey, val]) => (
                <div key={bandKey} className="grid grid-cols-3 font-semibold text-slate-700 items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: bandColors[bandKey] || '#94A3B8' }}></span>
                    <span className="font-bold">Band {bandKey}</span>
                  </div>
                  <span className="text-right text-slate-900 font-bold">{val.count}</span>
                  <span className="text-right text-slate-500 text-[11px]">{val.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Row 4: 3 Bottom Tables / Alert Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Performing Students */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Top Performing Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Student Name</th>
                  <th className="pb-2 text-right">Avg Perf</th>
                  <th className="pb-2 text-right">Grade Score</th>
                  <th className="pb-2 text-center">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-medium">
                {data.top_performing?.map((st, idx) => (
                  <tr 
                    key={st.roll_number} 
                    onClick={() => onSelectStudent && onSelectStudent(st.roll_number)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900 truncate max-w-[130px]">{st.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{st.roll_number}</div>
                    </td>
                    <td className="py-2.5 text-right font-black text-emerald-600">{st.avg_performance}%</td>
                    <td className="py-2.5 text-right font-bold text-slate-700">{st.cdc_grade_score}%</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getBandBadgeClass(st.cdc_band)}`}>
                        {st.cdc_band}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lowest Performing Students */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Lowest Performing Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Student Name</th>
                  <th className="pb-2 text-right">Avg Perf</th>
                  <th className="pb-2 text-center">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-medium">
                {data.lowest_performing?.map((st, idx) => (
                  <tr 
                    key={st.roll_number} 
                    onClick={() => onSelectStudent && onSelectStudent(st.roll_number)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900 truncate max-w-[120px]">{st.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{st.roll_number}</div>
                    </td>
                    <td className="py-2.5 text-right font-black text-rose-600">{st.avg_performance}%</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getBandBadgeClass(st.cdc_band)}`}>
                        {st.cdc_band}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm mb-4">Alerts & Notifications</h3>
          <div className="space-y-4 my-auto">
            {data.alerts?.map((alt) => (
              <div key={alt.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  alt.type === 'danger' ? 'bg-rose-100 text-rose-600' : alt.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {alt.type === 'danger' ? <AlertCircle size={16} /> : alt.type === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{alt.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{alt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DetailedDashboard;
