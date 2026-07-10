// src/pages/TrackDetails.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, Clock, CheckCircle2, GraduationCap, ArrowRight, ChevronDown, Calendar, Wrench, Briefcase, Zap, GitMerge, Bookmark, Award, Users, X, RefreshCw, AlertCircle, Lock, Search, SlidersHorizontal, Filter } from 'lucide-react';

import { getTrackBySlug, getPreferredBranchForTrack, isTrackPreferredForBranch } from '../utils/trackLoader';
import axios from 'axios';


// --- SUB-COMPONENT 1: The Deep-Dive Accordion (Type A) ---

const ModuleAccordion = ({ modules }) => {
  const [openModuleIndex, setOpenModuleIndex] = useState(null);

  if (!modules || modules.length === 0) return null;

  // Recursive helper to render nested details cleanly (handles strings, bullets, and sub-headings)
  const renderSubDetail = (sub, sIdx, parentKey) => {
    const subKey = `${parentKey}-sub-${sIdx}`;
    if (typeof sub === 'string') {
      return (
        <div key={subKey} className="text-sm text-slate-600 pl-4 mt-1.5 leading-relaxed">
          {sub}
        </div>
      );
    }

    if (sub && typeof sub === 'object') {
      if (sub.type === 'bullet') {
        return (
          <div key={subKey} className="flex items-start gap-2.5 text-slate-600 text-sm pl-4 mt-1.5">
            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span className="leading-relaxed">{sub.text}</span>
          </div>
        );
      }

      // Otherwise it's a sub-topic (e.g. roman numeral level or sub-letter level)
      return (
        <div key={subKey} className="ml-5 mt-3 pl-4 border-l-2 border-slate-100">
          {(sub.roman_numeral || sub.letter) && (
            <h5 className="text-sm font-semibold text-slate-700 flex items-start gap-2">
              <span className="text-slate-400">{(sub.roman_numeral || sub.letter)}.</span>
              {sub.title}
            </h5>
          )}
          {!sub.roman_numeral && !sub.letter && sub.title && (
            <h5 className="text-sm font-semibold text-slate-700">
              {sub.title}
            </h5>
          )}
          {/* Render nested details recursively */}
          {sub.details && sub.details.map((child, cIdx) => renderSubDetail(child, cIdx, subKey))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {modules.map((mod, idx) => {
        const isOpen = openModuleIndex === idx;
        // Create a rock-solid unique key using the module number or index
        const modKey = `mod-${mod.module_number || idx}`;

        return (
          <div key={modKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ease-in-out">
            {/* Accordion Header */}
            <button
              onClick={() => setOpenModuleIndex(isOpen ? null : idx)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-blue-50/50 transition-colors duration-300 ease-in-out"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="bg-blue-100 text-blue-700 font-bold w-8 h-8 rounded-md flex items-center justify-center shrink-0">
                  {mod.module_number}
                </div>
                <div className="space-y-1 overflow-hidden">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">{mod.module_title}</h3>
                    {mod.hours && (
                      <span className="text-[10px] md:text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        {mod.hours}
                      </span>
                    )}
                  </div>
                  {mod.keywords && mod.keywords.length > 0 && (
                    <p 
                      className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-1 max-w-xl md:max-w-2xl mt-0.5"
                      title={mod.brief}
                    >
                      {mod.keywords.join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className={`shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
            </button>

            {/* Accordion Body with transition */}
            <div 
              className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="px-6 py-5 border-t border-slate-200 space-y-4">
                  {!mod.topics || mod.topics.length === 0 ? (
                    <p className="text-slate-400 italic text-sm text-center py-2">
                      Specific topics and objectives are defined within the detailed sub-modules or bootcamp schedules below.
                    </p>
                  ) : (
                    mod.topics.map((topic, tIdx) => {
                      const topicKey = `topic-${modKey}-${topic.letter || topic.title || tIdx}`;
                      if (typeof topic === 'string') {
                        return (
                          <h4 key={topicKey} className="text-base font-bold text-slate-800 mt-4 first:mt-0">
                            {topic}
                          </h4>
                        );
                      }

                      if (topic && typeof topic === 'object') {
                        if (topic.type === 'bullet') {
                          return (
                            <div key={topicKey} className="flex items-start gap-2.5 text-slate-600 text-sm pl-2">
                              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                              <span className="leading-relaxed">{topic.text}</span>
                            </div>
                          );
                        }

                        // Structured topic with letter/title
                        return (
                          <div key={topicKey} className="pl-2">
                            {(topic.letter || topic.title) && (
                              <h4 className="text-base font-bold text-slate-800 flex items-start gap-2">
                                {topic.letter && <span className="text-blue-600">{topic.letter}.</span>}
                                {topic.title}
                              </h4>
                            )}
                            {topic.details && topic.details.map((sub, sIdx) => renderSubDetail(sub, sIdx, topicKey))}
                          </div>
                        );
                      }

                      return null;
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- SUB-COMPONENT 2: Day-Wise Intensive Grid (Type B) ---
// (No dynamic state, but needs clean keys)
const DayBootcamp = ({ semester }) => {
  return (
    <div className="space-y-8">
      {/* Grid of Days */}
      {semester.days && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {semester.days.map((day, idx) => (
            <div key={`day-${day.day_number || idx}`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="bg-orange-50 text-orange-600 p-2 rounded-lg shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Day {day.day_number}</span>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{day.day_title}</h4>
                </div>
              </div>
              <ul className="space-y-2">
                {day.topics?.map((topic, tIdx) => (
                  <li key={`daytopic-${idx}-${tIdx}`} className="text-sm text-slate-600 flex items-start gap-2">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-300 shrink-0" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Extra Implementation Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {semester.cad_tools && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Wrench size={14}/> CAD Tools</h4>
            <p className="text-sm text-slate-700 font-medium">{semester.cad_tools}</p>
          </div>
        )}
        {semester.implementations?.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Zap size={14}/> Implementations</h4>
            <ul className="text-sm text-slate-700 font-medium space-y-1">
              {semester.implementations.map((imp, i) => (
                <li key={`imp-${semester.semester_code || ''}-${i}`}>• {imp}</li>
              ))}
            </ul>
          </div>
        )}
        {semester.placement_support?.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2"><Briefcase size={14}/> Placement Support</h4>
            <ul className="text-sm text-slate-700 font-medium space-y-1">
              {semester.placement_support.map((ps, i) => (
                <li key={`ps-${semester.semester_code || ''}-${i}`}>• {ps}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};


// --- SUB-COMPONENT 3: Split-Track Tabbed Container (Type C) ---
const SubTrackTabs = ({ subTracks }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (!subTracks || subTracks.length === 0) return null;
  const activeSubTrack = subTracks[activeTabIndex];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ease-in-out">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row border-b border-slate-200 bg-slate-50">
        {subTracks.map((track, idx) => (
          <button
            key={`tab-${idx}`}
            onClick={() => setActiveTabIndex(idx)}
            className={`flex-1 py-4 px-6 text-sm font-bold transition-all duration-300 ease-in-out flex items-center justify-center gap-2 
              ${activeTabIndex === idx 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
          >
            <GitMerge size={16} className={`transition-colors duration-300 ease-in-out ${activeTabIndex === idx ? 'text-blue-600' : 'text-slate-400'}`} />
            {track.sub_track_name}
          </button>
        ))}
      </div>

      {/* Wrapping the content in a key triggers a clean mount/unmount fade! */}
      <div key={`tab-content-${activeTabIndex}`} className="p-6 animate-fade-in">
        <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-6">
          {activeSubTrack.pre_requisites?.length > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tier Prerequisites</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                {activeSubTrack.pre_requisites.map((pr, i) => (
                  <li key={`prereq-${activeTabIndex}-${i}`}>• {pr}</li>
                ))}
              </ul>
            </div>
          )}
          {activeSubTrack.expected_outcomes?.length > 0 && (
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tier Outcomes</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                {activeSubTrack.expected_outcomes.map((eo, i) => (
                  <li key={`outcome-${activeTabIndex}-${i}`}>• {eo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Re-using our ModuleAccordion here! */}
        <h4 className="text-lg font-bold text-slate-800 mb-4 mt-6">Tier Modules</h4>
        <ModuleAccordion modules={activeSubTrack.modules} />
      </div>
    </div>
  );
};

const TrackDetails = ({ user }) => {
  // 1. Grab the slug from the URL and fetch the correct JSON data
  const { slug } = useParams();
  const track = getTrackBySlug(slug);
  
  // 2. State to track which semester node is currently active
  const [activeSemesterIndex, setActiveSemesterIndex] = useState(0);

  // States for commit and bookmark persistence
  const [isCommitted, setIsCommitted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectionWindow, setSelectionWindow] = useState(null);
  const [projectWindow, setProjectWindow] = useState(null);
  const [studentYear, setStudentYear] = useState(1);
  const [studentStatus, setStudentStatus] = useState('active');

  // Track Projects state
  const [projectsList, setProjectsList] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDifficultyFilter, setProjectDifficultyFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedFacultyGuide, setSelectedFacultyGuide] = useState('');
  const [projectModalTarget, setProjectModalTarget] = useState(null);
  const [facultyInput, setFacultyInput] = useState('');
  const [facultyConfirmed, setFacultyConfirmed] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  // Filtered projects based on search query and difficulty dropdown
  const filteredProjects = projectsList.filter((proj) => {
    const query = projectSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      proj.title?.toLowerCase().includes(query) ||
      proj.problem_statement?.toLowerCase().includes(query) ||
      proj.technologies?.toLowerCase().includes(query) ||
      proj.project_code?.toLowerCase().includes(query);

    const matchesDifficulty = projectDifficultyFilter === 'all' || 
      proj.difficulty?.toLowerCase() === projectDifficultyFilter.toLowerCase();

    return matchesSearch && matchesDifficulty;
  });

  // Modal state for commit confirmation
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  // Admin state for viewing enrolled students
  const isAdmin = user?.role === 'super_admin' || user?.role === 'branch_admin' || user?.role === 'principal' || user?.role === 'director' || user?.role === 'registrar' || user?.role === 'dean.academics';
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [enrolledError, setEnrolledError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleOpenEnrolledModal = async () => {
    setShowEnrolledModal(true);
    setEnrolledLoading(true);
    setEnrolledError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/track-students/${slug}`, {
        headers: { Authorization: `Bearer ${user.email}` }
      });
      setEnrolledStudents(res.data.students || []);
    } catch (err) {
      console.error("Failed to fetch enrolled students:", err);
      setEnrolledError("Could not load enrolled students list.");
    } finally {
      setEnrolledLoading(false);
    }
  };

  const fetchTrackProjectsData = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/student/projects?track_slug=${slug}`, {
        headers: { Authorization: `Bearer ${user.email}` }
      });
      setProjectsList(res.data.projects || []);
      setSelectedProjectId(res.data.selected_project_id);
      setSelectedFacultyGuide(res.data.selected_faculty_guide || '');
    } catch (err) {
      console.error("Failed to fetch track projects:", err);
    }
  };

  // Fetch current commit/bookmark status from backend on load
  useEffect(() => {
    const fetchStudentStatus = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`${API_URL}/api/student/dashboard-data`, {
          headers: { Authorization: `Bearer ${user.email}` }
        });
        const profile = response.data.student;
        setIsCommitted(profile.selected_track_id === slug);
        setIsBookmarked(profile.bookmarked_tracks?.includes(slug) || false);
        setStudentYear(response.data.current_year || 1);
        setStudentStatus(profile.status || 'active');
        if (response.data.track_selection_window) {
          setSelectionWindow(response.data.track_selection_window);
        }
        if (response.data.project_selection_window) {
          setProjectWindow(response.data.project_selection_window);
        }
      } catch (err) {
        console.error("Failed to load student status for track:", err);
      }
    };
    fetchStudentStatus();
    fetchTrackProjectsData();
  }, [user, slug, API_URL]);


  const handleCommit = () => {
    if (!user) return;
    if (selectionWindow && selectionWindow.is_open === false) {
      alert(`🔒 Track selection for the semester has ended.\n\nFor track changes or related issues, please contact: ${selectionWindow.contact_email}`);
      return;
    }
    if (!isCommitted) {
      setConfirmInput('');
      setShowCommitModal(true);
    } else {
      executeCommit(null);
    }
  };

  const executeCommit = async (targetTrackIdOverride) => {
    setLoadingAction(true);
    setShowCommitModal(false);
    try {
      const targetTrackId = targetTrackIdOverride !== undefined ? targetTrackIdOverride : (isCommitted ? null : slug);
      await axios.post(`${API_URL}/api/student/select-track`, 
        { track_id: targetTrackId },
        { headers: { Authorization: `Bearer ${user.email}` } }
      );
      setIsCommitted(!isCommitted);
    } catch (err) {
      console.error("Failed to commit to track:", err);
      alert(err.response?.data?.detail || ("Error updating track selection: " + err.message));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenProjectModal = (project) => {
    if (!user) return;
    if (projectWindow && projectWindow.is_open === false) {
      alert(`🔒 Project selection for this track is locked or closed.\n\nContact: ${projectWindow.contact_email || 'support.cdc@hitam.org'}`);
      return;
    }
    setProjectModalTarget(project);
    setFacultyInput(selectedProjectId === project.id ? selectedFacultyGuide : '');
    setFacultyConfirmed(false);
  };

  const handleSubmitProjectSelection = async (e) => {
    e.preventDefault();
    if (!facultyConfirmed) {
      alert("Please confirm that you have obtained permission from your faculty guide.");
      return;
    }
    if (!facultyInput || !facultyInput.trim()) {
      alert("Please enter your faculty guide / incharge name.");
      return;
    }

    setProjectSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/student/select-project`, {
        project_id: projectModalTarget.id,
        faculty_guide: facultyInput.trim(),
        confirmed: facultyConfirmed
      }, {
        headers: { Authorization: `Bearer ${user.email}` }
      });
      setSelectedProjectId(projectModalTarget.id);
      setSelectedFacultyGuide(facultyInput.trim());
      setProjectModalTarget(null);
      fetchTrackProjectsData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save project selection.");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleUnselectProject = async () => {
    if (!window.confirm("Are you sure you want to clear your current project selection?")) return;
    try {
      await axios.delete(`${API_URL}/api/student/select-project`, {
        headers: { Authorization: `Bearer ${user.email}` }
      });
      setSelectedProjectId(null);
      setSelectedFacultyGuide('');
      fetchTrackProjectsData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to clear project selection.");
    }
  };



  const handleBookmark = async () => {
    if (!user) return;
    setLoadingAction(true);
    try {
      await axios.post(`${API_URL}/api/student/bookmark-track`, 
        { track_id: slug },
        { headers: { Authorization: `Bearer ${user.email}` } }
      );
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error("Failed to bookmark track:", err);
      alert("Error updating bookmark: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Graceful fallback if a student types a bad URL
  if (!track) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Track Not Found</h2>
        <p className="text-slate-600 mb-6">The curriculum track you are looking for does not exist.</p>
        <Link to="/" className="text-blue-600 hover:underline inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Explore
        </Link>
      </div>
    );
  }

  // Helper variable for the currently selected semester data
  const activeSemester = track.semesters[activeSemesterIndex];

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Back to Explore
      </Link>

      {/* Track Header & Actions */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {track.track_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-sm">
              Preferably for {getPreferredBranchForTrack(track.slug)} students
            </span>
            {user && isTrackPreferredForBranch(track.slug, user.branch) ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 shadow-sm">
                <Award size={12} className="shrink-0" />
                Matches your branch
              </span>
            ) : (
              user && !isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 shadow-sm">
                  <AlertCircle size={12} className="shrink-0 text-amber-600" />
                  Different from enrolled branch ({user.branch})
                </span>
              )
            )}
          </div>
          <p className="text-lg text-slate-600">Select a semester below to view its curriculum and objectives.</p>

          {/* Branch Mismatch Disclaimer Banner */}
          {user && !isAdmin && !isTrackPreferredForBranch(track.slug, user.branch) && (
            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs md:text-sm font-semibold flex items-start gap-3 shadow-xs">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold text-amber-950 block mb-0.5">⚠️ Branch Alignment Disclaimer:</strong>
                <span>This track ({track.track_name}) is designated primarily for <strong>{getPreferredBranchForTrack(track.slug)}</strong> students. Your registered branch is <strong>{user.branch}</strong>. You are allowed to commit to this track, but please note it may differ from your core department curriculum.</span>
              </div>
            </div>
          )}
        </div>

        
        {/* Commit & Bookmark Actions / Admin View Enrolled Students */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            isAdmin ? (
              <button
                onClick={handleOpenEnrolledModal}
                className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 shadow-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-500/20"
              >
                <Users size={18} />
                <span>View Enrolled Students</span>
              </button>
            ) : (
              <>
                {/* Commit Button */}
                {selectionWindow && selectionWindow.is_open === false ? (
                  <button
                    disabled
                    className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  >
                    <Lock size={18} className="text-slate-400 shrink-0" />
                    <span>Track change not permitted at this time</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCommit}
                    disabled={loadingAction}
                    className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 shadow-sm cursor-pointer border ${
                      isCommitted
                        ? 'border-blue-600 text-blue-600 bg-white hover:bg-blue-50/50'
                        : 'border-transparent bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10'
                    }`}
                  >
                    {isCommitted ? <CheckCircle2 size={18} /> : <Target size={18} />}
                    {isCommitted ? 'Committed to Track' : 'Commit to Track'}
                  </button>
                )}

                {/* Bookmark Button */}
                <button
                  onClick={handleBookmark}
                  disabled={loadingAction}
                  className={`p-3 rounded-xl border font-bold transition-all duration-300 cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-500'
                  }`}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Track'}
                >
                  <Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} />
                </button>
              </>
            )
          ) : (
            /* Call to action for anonymous users */
            <Link
              to="/login"
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors border border-slate-200"
            >
              Sign in to Commit & Bookmark
            </Link>
          )}
        </div>
      </div>

      {/* Track Selection Ended Contact Note */}
      {selectionWindow && selectionWindow.is_open === false && (
        <div className="mb-8 bg-amber-50/90 border-2 border-amber-300 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 shadow-xs text-amber-900 text-xs sm:text-sm font-bold">
          <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-amber-950 text-sm sm:text-base block mb-1">🔒 Track changing/selection has ended</span>
            <span className="leading-relaxed">
              Track changing/selection for this semester has ended. Please contact <a href={`mailto:${selectionWindow.contact_email || 'support.cdc@hitam.org'}`} className="underline font-black text-amber-950 hover:text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md inline-block">{selectionWindow.contact_email || 'support.cdc@hitam.org'}</a> for track changes or related issues.
            </span>
          </div>
        </div>
      )}


      {/* Interactive Horizontal Timeline */}
      <div className="relative mb-12">
        {/* The grey background line connecting the nodes */}
        <div className="absolute top-[44px] left-0 right-0 h-1 bg-slate-200 -z-10 rounded-full"></div>
        
        {/* Scrollable container for nodes with top & bottom padding so rings/scaling are never clipped */}
        <div className="flex items-start justify-between gap-4 overflow-x-auto pt-5 pb-5 px-3 snap-x hide-scrollbar min-h-[120px]">
          {track.semesters.map((semester, index) => {
            const isActive = index === activeSemesterIndex;
            // Track curriculum semesters start from Year 2 (II-I at index 0, II-II at index 1).
            // Year 3 students have completed Year 2 semesters (indices 0 & 1).
            // Year 4 students have completed Year 2 & 3 semesters (indices 0, 1, 2, 3).
            let completedCount = 0;
            if (studentStatus === 'alumni') {
              completedCount = 99;
            } else if (studentYear === 3) {
              completedCount = 2;
            } else if (studentYear === 4) {
              completedCount = 4;
            } else {
              completedCount = 0;
            }
            const isCompleted = index < completedCount;

            
            return (
              <button
                key={`timeline-node-${index}`}
                onClick={() => setActiveSemesterIndex(index)}
                className="relative flex flex-col items-center min-w-[100px] snap-center group focus:outline-none cursor-pointer"
              >
                {/* Node Circle with green styling for completed semesters and non-clipping padding */}
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ease-in-out z-10 shrink-0 
                    ${isCompleted
                      ? isActive
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 shadow-lg shadow-emerald-600/40 scale-110'
                        : 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 group-hover:scale-105'
                      : isActive 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg shadow-blue-500/40 scale-110' 
                        : 'bg-white text-slate-500 border-2 border-slate-200 group-hover:border-blue-400 group-hover:text-blue-500 group-hover:scale-105'
                    }`}
                >
                  {index + 1}
                </div>
                
                {/* Node Label */}
                <div className="mt-4 text-center">
                  <span className={`block text-sm font-bold transition-colors ${
                    isCompleted ? 'text-emerald-700 font-extrabold' : isActive ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                    {semester.semester_code}
                  </span>
                  <span className="block text-xs text-slate-500 max-w-[100px] truncate" title={semester.semester_title}>
                    {semester.semester_title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* --- TWO-COLUMN SPLIT LAYOUT CONTAINER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: FOUNDATIONS, PREREQUISITES & SYLLABUS */}
        {/* ========================================== */}
        <div className="space-y-8 animate-fade-in" key={`semester-content-${activeSemesterIndex}`}>
          
          {/* --- SECTION 1: COMMON FOUNDATIONS & PREREQUISITES --- */}
          {(() => {
            const hasFoundationsContent = !!(
              activeSemester.focus || 
              activeSemester.objective || 
              (activeSemester.pre_requisites && activeSemester.pre_requisites.length > 0) || 
              (activeSemester.expected_outcomes && activeSemester.expected_outcomes.length > 0)
            );

            // Shrunk state if no content is present
            if (!hasFoundationsContent) {
              return (
                <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500 shadow-xs">
                  <div className="flex items-center gap-2.5 font-bold text-slate-700">
                    <GraduationCap size={18} className="text-blue-600 shrink-0"/>
                    <span>{activeSemester.semester_title || "Semester Foundations"}</span>
                  </div>
                  {activeSemester.hours && (
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200 font-semibold text-slate-600 shrink-0">
                      {activeSemester.hours}h
                    </span>
                  )}
                </div>
              );
            }

            // Expanded state with Foundations & Prerequisites combined
            return (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-left">
                {/* Section Header */}
                <div className="flex items-start justify-between pb-5 border-b border-slate-100 gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs mb-2 border border-blue-100">
                      <GraduationCap size={14} /> Course Foundations
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
                      {activeSemester.semester_title || "Semester Overview"}
                    </h2>
                  </div>
                  
                  {activeSemester.hours && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 shadow-xs">
                      <Clock size={14} className="text-slate-400"/>
                      {activeSemester.hours}h
                    </div>
                  )}
                </div>

                {/* Primary Focus & Objectives */}
                {(activeSemester.focus || activeSemester.objective) && (
                  <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                    {activeSemester.focus && (
                      <div>
                        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Target size={14} className="text-blue-600" /> Primary Focus
                        </h3>
                        <p className="text-slate-800 font-bold text-sm leading-relaxed">
                          {activeSemester.focus}
                        </p>
                      </div>
                    )}

                    {activeSemester.objective && (
                      <div className={activeSemester.focus ? "pt-3 border-t border-slate-200/60" : ""}>
                        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Objective
                        </h3>
                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                          {activeSemester.objective}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Prerequisites & Expected Outcomes */}
                {(activeSemester.pre_requisites?.length > 0 || activeSemester.expected_outcomes?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Prerequisites */}
                    {activeSemester.pre_requisites?.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowRight size={14} className="text-amber-500" /> Prerequisites
                        </h3>
                        <ul className="space-y-2">
                          {activeSemester.pre_requisites.map((prereq, idx) => (
                            <li key={`sem-prereq-${activeSemesterIndex}-${idx}`} className="flex items-start gap-2 text-slate-600 text-xs sm:text-sm">
                              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="leading-relaxed">{prereq}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Outcomes */}
                    {activeSemester.expected_outcomes?.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" /> Expected Outcomes
                        </h3>
                        <ul className="space-y-2">
                          {activeSemester.expected_outcomes.map((outcome, idx) => (
                            <li key={`sem-outcome-${activeSemesterIndex}-${idx}`} className="flex items-start gap-2 text-slate-700 text-xs sm:text-sm font-medium">
                              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* --- SECTION 2: THE SYLLABUS --- */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Detailed Syllabus & Curriculum
              </h3>
            </div>

            {/* TYPE A: Standard Modules */}
            {activeSemester.modules && activeSemester.modules.length > 0 && (
              <ModuleAccordion modules={activeSemester.modules} />
            )}

            {/* TYPE B: Day-Wise Bootcamp */}
            {activeSemester.days && activeSemester.days.length > 0 && (
              <DayBootcamp semester={activeSemester} />
            )}

            {/* TYPE C: Split Performance Tracks */}
            {activeSemester.sub_tracks && activeSemester.sub_tracks.length > 0 && (
              <SubTrackTabs subTracks={activeSemester.sub_tracks} />
            )}

            {/* Fallback if data is missing */}
            {!activeSemester.modules && !activeSemester.days && !activeSemester.sub_tracks && (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-500 bg-slate-50/50">
                <p className="font-semibold text-sm">No specific curriculum modules listed for this semester.</p>
              </div>
            )}
          </div>

        </div>


        {/* ========================================== */}
        {/* RIGHT COLUMN: AVAILABLE TRACK PROJECTS */}
        {/* ========================================== */}
        <div className="space-y-6 text-left sticky top-6">
          
          {/* Section Header & Search/Filter Controls Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-100">
                <Briefcase size={14} /> Domain Projects
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Track Projects</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Explore topics corresponding to this track. You can select or change your selected project anytime during the active project window.
              </p>
            </div>

            {/* Active Choice Banner */}
            {selectedProjectId && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-4 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">Active Choice</span>
                  <div className="text-sm font-black text-emerald-950">Faculty Guide: {selectedFacultyGuide}</div>
                  <span className="text-xs text-emerald-600 font-bold block mt-0.5">Changeable during active window</span>
                </div>
                {(!projectWindow || projectWindow.is_open !== false) && (
                  <button
                    onClick={handleUnselectProject}
                    className="text-xs font-extrabold text-rose-600 hover:text-rose-800 underline cursor-pointer shrink-0"
                  >
                    Clear Choice
                  </button>
                )}
              </div>
            )}

            {/* Project Selection Window Status Banners */}
            {projectWindow && (
              projectWindow.is_open ? (
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-blue-950 text-xs font-extrabold flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
                    <span>🟢 Project Selection Window is OPEN!</span>
                  </div>
                  {projectWindow.end_time && (
                    <span className="text-[11px] font-black text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-lg shrink-0">
                      Closes: {new Date(projectWindow.end_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM IST
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2.5">
                  <Lock size={16} className="text-amber-600 shrink-0 mt-0.5"/>
                  <span>Project selection window is currently closed. Contact support at <a href={`mailto:${projectWindow.contact_email}`} className="underline font-black">{projectWindow.contact_email}</a>.</span>
                </div>
              )
            )}

            {/* Search & Difficulty Filter Controls */}
            {projectsList.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                {/* Techstack/Title Search input */}
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by tech or title..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-slate-50/50 focus:bg-white"
                  />
                  {projectSearch && (
                    <button
                      onClick={() => setProjectSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Difficulty Dropdown */}
                <div className="relative">
                  <select
                    value={projectDifficultyFilter}
                    onChange={(e) => setProjectDifficultyFilter(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50 focus:bg-white shrink-0 cursor-pointer appearance-none pr-8"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <Filter size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Internal Scrollable Container for Standalone Project Cards */}
          {projectsList.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-sm font-semibold bg-slate-50/50">
              No track projects currently listed for this track.
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center text-slate-500 text-sm font-medium bg-slate-50/50 space-y-3">
              <p>No projects match your current search or difficulty filter.</p>
              <button
                onClick={() => { setProjectSearch(''); setProjectDifficultyFilter('all'); }}
                className="px-4 py-2 bg-blue-50 text-blue-600 font-extrabold text-xs rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1.5 hide-scrollbar">
              {filteredProjects.map((proj) => {
                const isSelected = selectedProjectId === proj.id;

                return (
                  <div key={proj.id} className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 bg-white ${
                    isSelected ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}>
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-lg border border-slate-200">
                          {proj.project_code}
                        </span>
                        <span className={`px-3 py-1 text-xs font-black rounded-full ${
                          proj.difficulty?.toLowerCase() === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                          proj.difficulty?.toLowerCase() === 'hard' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {proj.difficulty || 'Medium'}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug">{proj.title}</h3>
                      
                      {proj.problem_statement && (
                        <div className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <strong className="text-slate-900 font-extrabold block mb-1 text-xs uppercase tracking-wider">Problem Statement</strong>
                          {proj.problem_statement}
                        </div>
                      )}

                      {proj.key_objectives && (
                        <div className="text-xs sm:text-sm text-slate-600 font-normal space-y-1">
                          <strong className="text-slate-900 font-extrabold block text-xs uppercase tracking-wider">Key Objectives</strong>
                          <p className="leading-relaxed">{proj.key_objectives}</p>
                        </div>
                      )}

                      {proj.technologies && (
                        <div className="pt-1">
                          <strong className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider mb-2">Technologies & Tools</strong>
                          <div className="flex flex-wrap gap-1.5">
                            {proj.technologies.split(',').map((t, i) => (
                              <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200/60">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      {isSelected ? (
                        <div className="flex items-center gap-2 text-emerald-700 text-sm font-black bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                          <CheckCircle2 size={18} /> Selected Project Topic
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenProjectModal(proj)}
                          disabled={projectWindow && projectWindow.is_open === false}
                          className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          Select Project Topic
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Project Selection Modal */}
      {projectModalTarget && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded uppercase">{projectModalTarget.project_code}</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">{projectModalTarget.title}</h3>
              </div>
              <button onClick={() => setProjectModalTarget(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitProjectSelection} className="space-y-4 pt-4">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900 font-medium">
                <RefreshCw size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Note:</strong> You are free to change or update your selected project topic anytime during the active project selection window.</span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Faculty Guide / Incharge Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name of faculty member..."
                  value={facultyInput}
                  onChange={(e) => setFacultyInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="faculty-confirm-check"
                  checked={facultyConfirmed}
                  onChange={(e) => setFacultyConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
                  required
                />
                <label htmlFor="faculty-confirm-check" className="text-xs text-amber-950 font-bold leading-relaxed cursor-pointer">
                  I confirm that I have contacted and informed the faculty member and taken permission to choose them as my faculty incharge.
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting || !facultyConfirmed}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {projectSubmitting ? 'Confirming...' : 'Confirm Selection'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Enrolled Students Modal */}
      {showEnrolledModal && createPortal(
        <div 
          onClick={() => setShowEnrolledModal(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Enrolled Students</h3>
                  <p className="text-xs text-blue-200">{track.track_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrolledModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-left">
              {enrolledLoading ? (
                <div className="py-16 text-center text-slate-500 font-medium">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  Loading enrolled students...
                </div>
              ) : enrolledError ? (
                <div className="py-12 text-center text-rose-600 font-bold space-y-2">
                  <AlertCircle size={32} className="mx-auto text-rose-500" />
                  <p>{enrolledError}</p>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  No students have committed to this track yet.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-100">
                    <span>Total Enrolled: <strong className="text-slate-900">{enrolledStudents.length}</strong></span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50">
                          <th className="py-3 px-4">Student Details</th>
                          <th className="py-3 px-4">Branch</th>
                          <th className="py-3 px-4 text-center">CDC Band</th>
                          <th className="py-3 px-4 text-center">Avg Perf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium">
                        {enrolledStudents.map((st) => (
                          <tr key={st.roll_number || st.email} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{st.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{st.roll_number} • {st.email}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{st.branch}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black border bg-blue-50 text-blue-700 border-blue-200">
                                Band {st.cdc_band}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{st.avg_performance != null ? `${st.avg_performance}%` : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* COMMITMENT CONFIRMATION MODAL */}
      {showCommitModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative text-left">
            <button 
              onClick={() => setShowCommitModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full border border-blue-200">
                <Target size={14} />
                <span>Track Commitment Confirmation</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-snug">
                You are committing to <span className="text-blue-600 font-black">{track.track_name}</span> track. Are you sure?
              </h3>
            </div>

            {/* Branch Mismatch Disclaimer inside Modal */}
            {user && !isTrackPreferredForBranch(track.slug, user.branch) && (
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-rose-900 text-xs sm:text-sm font-bold flex items-start gap-3">
                <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-950 font-black block mb-0.5">⚠️ Branch Mismatch Warning:</strong>
                  <span>This track is not designated for your enrolled branch (<strong>{user.branch}</strong>). It is primarily designed for <strong>{getPreferredBranchForTrack(track.slug)}</strong>. Please ensure you intend to take an out-of-branch track.</span>
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>Track changes won't be allowed after </span>
                <u className="text-amber-950 font-black">
                  {selectionWindow?.end_time ? (
                    `${new Date(selectionWindow.end_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM IST`
                  ) : 'the window closes'}
                </u>.
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Enter <span className="text-blue-600 font-black">confirm</span> in the field below to confirm your decision:
              </label>
              <input
                type="text"
                placeholder="Type 'confirm' here"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-bold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                autoFocus
              />
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 text-xs font-semibold leading-relaxed">
              <strong>Note:</strong> You are allowed to change your track in the window:{' '}
              <span className="font-bold text-slate-900">
                {selectionWindow?.start_time ? (
                  new Date(selectionWindow.start_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
                ) : 'Start'}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-900">
                {selectionWindow?.end_time ? (
                  `${new Date(selectionWindow.end_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM IST`
                ) : 'End'}
              </span>.
            </div>




            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCommitModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toLowerCase() !== 'confirm' || loadingAction}
                onClick={() => executeCommit(slug)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {loadingAction ? 'Updating...' : 'Confirm Commitment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

};

export default TrackDetails;
