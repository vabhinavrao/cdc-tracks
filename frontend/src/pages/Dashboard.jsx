// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, ChevronRight, Bookmark, AlertCircle, Compass, ArrowRight, Sparkles, TrendingUp, BarChart3, Lock } from 'lucide-react';
import axios from 'axios';
import { getAllTracksSummary, getBranchDisplayName, isTrackPreferredForBranch } from '../utils/trackLoader';

const Dashboard = ({ user }) => {
  const [data, setData] = useState(null);
  const [cdcData, setCdcData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [dashRes, cdcRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/student/dashboard-data`, {
            headers: { 'Authorization': `Bearer ${user.email}` }
          }),
          axios.get(`${API_URL}/api/student/cdc-dashboard-data`, {
            headers: { 'Authorization': `Bearer ${user.email}` }
          })
        ]);

        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value.data);
        } else {
          throw dashRes.reason;
        }

        if (cdcRes.status === 'fulfilled') {
          setCdcData(cdcRes.value.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(
          err.response?.data?.detail || 
          'Failed to load dashboard details from the server.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && user.email) {
      fetchDashboardData();
    }
  }, [user, API_URL]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-semibold text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-start gap-4">
        <AlertCircle size={24} className="shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-lg mb-1">Error Loading Dashboard</h3>
          <p className="text-sm leading-relaxed mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const student = data?.student || user;
  const currentYear = data?.current_year || 1;
  const selectedTrack = data?.selected_track;
  const bookmarkedTracks = data?.bookmarked_tracks_data || [];

  const cdcOverall = cdcData?.overall || {};
  const rawScores = cdcData?.test_scores || {};
  const attemptedCount = Object.values(rawScores).filter(val => val !== null && val !== undefined && val !== '').length;

  const allTracks = getAllTracksSummary();
  const recommendedTracks = allTracks.filter(t => isTrackPreferredForBranch(t.slug, student.branch));
  const branchDisplayName = getBranchDisplayName(student.branch);

  // Convert current year integer to ordinal word (e.g. 1 -> 1st Year)
  const formatYear = (yr) => {
    const map = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
    return map[yr] || `${yr}th Year`;
  };

  const windowInfo = data?.track_selection_window;
  const projectWindowInfo = data?.project_selection_window;

  return (
    <div className="py-6 space-y-8 animate-fade-in">
      
      {/* Selection Windows Alert Area */}
      <div className="space-y-4">
        {/* Track Selection Window Banner */}
        {windowInfo && (
          windowInfo.is_open ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-xs md:text-sm font-extrabold text-emerald-900">
                  🟢 Track Selection for Semester is Open! You can freely select or change your committed learning track.
                </span>
              </div>
              {windowInfo.end_time && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                  Closes: {new Date(windowInfo.end_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM IST
                </span>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-extrabold text-amber-950">
                    🔒 Track selection for the semester has ended.
                  </h3>
                  <p className="text-xs md:text-sm font-semibold text-amber-900 mt-1">
                    For track changes or related issues, please contact: <a href={`mailto:${windowInfo.contact_email}`} className="underline font-black hover:text-amber-700">{windowInfo.contact_email}</a>
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Project Selection Window Banner */}
        {projectWindowInfo && (
          projectWindowInfo.is_open ? (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
                <span className="text-xs md:text-sm font-extrabold text-blue-900">
                  🚀 Project Selection Window is Active! Choose your domain project topic & assign your faculty guide.
                </span>
              </div>
              {projectWindowInfo.end_time && (
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-xl">
                  Closes: {new Date(projectWindowInfo.end_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM IST
                </span>
              )}
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs text-slate-700">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-slate-500 shrink-0"/>
                <span className="text-xs md:text-sm font-extrabold">
                  🔒 Project Selection Window for this semester is currently closed.
                </span>
              </div>
              <a href={`mailto:${projectWindowInfo.contact_email}`} className="text-xs font-bold text-blue-600 underline">
                {projectWindowInfo.contact_email}
              </a>
            </div>
          )
        )}
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">

        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-blue-100 text-xs font-bold uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full">
              Student Dashboard
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">
              Welcome back, {student.name ? student.name.split(' ')[0] : 'Student'}
            </h1>
            <p className="text-blue-100 text-sm md:text-base mt-2 max-w-xl">
              Track your career learning objectives, view your curriculum, and manage committed tracks below.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shrink-0 text-center sm:text-left">
            <span className="text-xs text-blue-200 block font-bold uppercase">Current Academic Year</span>
            <span className="text-2xl font-black block tracking-tight mt-0.5">
              {formatYear(currentYear)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: CDC Dashboard Summary Cards */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-6">
            
            {/* CDC Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                <Award size={20} className="text-emerald-600" />
                CDC Performance Overview
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                Overview
              </span>
            </div>

            {/* Top Stat Pills: Band & Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CDC Band</span>
                <div className="my-1.5 text-2xl font-black text-white bg-emerald-600 w-11 h-11 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                  {cdcOverall.cdc_band || 'B'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Performance Band</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">CDC Rank</span>
                <div className="my-1.5 h-11 flex items-center justify-center text-2xl font-black text-slate-900">
                  <span className="text-slate-400 text-base font-bold mr-0.5">#</span>
                  {cdcOverall.cdc_rank || '207'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Out of 815</span>
              </div>
            </div>

            {/* Details Grid: Grade Score & Tests Attempted */}
            <div className="space-y-3 pt-1">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">CDC Grade Score</span>
                  <span className="text-xl font-black text-emerald-700 block mt-0.5">{cdcOverall.cdc_grade_score ?? 78}%</span>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Tests Attempted</span>
                  <span className="text-xl font-black text-blue-700 block mt-0.5">
                    {attemptedCount} <span className="text-xs font-normal text-slate-400">/ 30</span>
                  </span>
                </div>
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                  <BarChart3 size={20} />
                </div>
              </div>
            </div>

            {/* Quick Stats: Avg Perf & Consistency */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Performance</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{cdcOverall.avg_performance ?? 75}%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Consistency</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{cdcOverall.consistency_score ?? 82}%</span>
              </div>
            </div>

            {/* Call to action button */}
            <Link
              to="/cdc-dashboard"
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm mt-2"
            >
              <span>View Full CDC Performance</span>
              <ChevronRight size={16} />
            </Link>

          </div>
        </div>

        {/* Right Columns: Active Track & Bookmarks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Track Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-6">
              <Award size={18} className="text-blue-600" />
              Committed Learning Track
            </h2>

            {selectedTrack ? (
              <div className="bg-blue-50/40 rounded-xl p-5 border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300">
                <div className="space-y-2">
                  <div className="bg-blue-600 text-white p-2.5 rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mt-2">
                      {selectedTrack.track_name}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      You are committed to this pathway. Review specific semester schedules or day-wise bootcamps.
                    </p>
                  </div>
                </div>

                <Link
                  to={`/track/${selectedTrack.slug}`}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shrink-0 shadow-sm shadow-blue-500/20"
                >
                  View Curriculum
                  <ChevronRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <div className="bg-slate-100 p-3.5 rounded-full text-slate-400 mb-4">
                  <Compass size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">No Active Track Selected</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  You haven't committed to a learning path yet. Browse through the available tracks to select one.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                  Explore Available Tracks
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {/* Selected Domain Project Card */}
            {data?.active_project && (
              <div className="mt-6 bg-emerald-50/70 rounded-xl p-5 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded uppercase">
                      {data.active_project.project_code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Track Project</span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">{data.active_project.title}</h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Faculty Guide: <span className="font-extrabold text-slate-900">{data.active_project.faculty_guide}</span>
                  </p>
                </div>
                <Link
                  to={`/track/${selectedTrack?.slug || ''}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-sm"
                >
                  Manage Project
                </Link>
              </div>
            )}
          </div>

          {/* Recommended Tracks Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-6">
              <Sparkles size={18} className="text-emerald-600 animate-pulse" />
              Recommended Tracks for Your Branch ({branchDisplayName})
            </h2>

            {recommendedTracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedTracks.map((bk) => (
                  <Link
                    key={bk.slug}
                    to={`/track/${bk.slug}`}
                    className="flex flex-col justify-between p-4 border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50/10 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                          <BookOpen size={18} />
                        </div>
                        <span className="font-bold text-slate-700 text-sm group-hover:text-emerald-800 transition-colors">
                          {bk.track_name}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 mt-1 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    
                    <div className="text-[11px] text-slate-500 mt-3 font-medium">
                      Focus: {bk.primary_focus}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic py-2">
                No custom recommendations available for branch {branchDisplayName}.
              </p>
            )}
          </div>

          {/* Bookmarks Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-6">
              <Bookmark size={18} className="text-blue-600" />
              Bookmarked Tracks ({bookmarkedTracks.length})
            </h2>

            {bookmarkedTracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarkedTracks.map((bk) => (
                  <Link
                    key={bk.id}
                    to={`/track/${bk.id}`}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md hover:bg-slate-50/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                        <Bookmark size={18} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm truncate max-w-[180px] md:max-w-[220px]">
                        {bk.track_name}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic py-4">
                No tracks bookmarked yet. When viewing details, toggle the bookmark icon to list them here.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
