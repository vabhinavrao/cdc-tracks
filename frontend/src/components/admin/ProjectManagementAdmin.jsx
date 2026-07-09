// src/components/admin/ProjectManagementAdmin.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Building2, BookOpen, Search, Filter, Phone, CheckCircle2, AlertCircle, 
  Clock, User, Check, X, FileText, Sparkles, UserCheck, ChevronRight, Briefcase, ExternalLink
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ProjectManagementAdmin = ({ user }) => {
  const [subTab, setSubTab] = useState('selections'); // 'selections' | 'hitam_requests' | 'internship_requests'
  
  // Track selections state
  const [selections, setSelections] = useState([]);
  const [loadingSelections, setLoadingSelections] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // HITAM requests state
  const [hitamRequests, setHitamRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [hitamStatusFilter, setHitamStatusFilter] = useState('ALL');

  // Internship requests state
  const [internshipRequests, setInternshipRequests] = useState([]);
  const [loadingInternships, setLoadingInternships] = useState(true);
  const [internshipStatusFilter, setInternshipStatusFilter] = useState('ALL');

  const [editingRequest, setEditingRequest] = useState(null);
  const [editingRequestType, setEditingRequestType] = useState('hitam'); // 'hitam' | 'internship'
  const [newStatus, setNewStatus] = useState('contacted');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (user?.role === 'branch_admin' && user.assigned_branch) {
      setSelectedBranch(user.assigned_branch);
    }
  }, [user]);

  useEffect(() => {
    fetchSelections();
    fetchHitamRequests();
    fetchInternshipRequests();
  }, [selectedBranch, hitamStatusFilter, internshipStatusFilter, searchQuery]);

  const fetchSelections = async () => {
    setLoadingSelections(true);
    try {
      const token = user?.email || '';
      const res = await axios.get(`${API_URL}/api/admin/projects/selections?branch=${selectedBranch}&search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelections(res.data.selections || []);
    } catch (err) {
      console.error("Failed to fetch project selections", err);
    } finally {
      setLoadingSelections(false);
    }
  };

  const fetchHitamRequests = async () => {
    setLoadingRequests(true);
    try {
      const token = user?.email || '';
      const res = await axios.get(`${API_URL}/api/admin/hitam-requests?branch=${selectedBranch}&status_filter=${hitamStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHitamRequests(res.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch HITAM requests", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchInternshipRequests = async () => {
    setLoadingInternships(true);
    try {
      const token = user?.email || '';
      const res = await axios.get(`${API_URL}/api/admin/internship-requests?branch=${selectedBranch}&status_filter=${internshipStatusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInternshipRequests(res.data.requests || []);
    } catch (err) {
      console.error("Failed to fetch internship requests", err);
    } finally {
      setLoadingInternships(false);
    }
  };

  const handleOpenEditModal = (req, type) => {
    setEditingRequest(req);
    setEditingRequestType(type || 'hitam');
    setNewStatus(req.status || 'contacted');
    setAdminNotes(req.admin_notes || '');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    setUpdating(true);
    try {
      const token = user?.email || '';
      const endpoint = editingRequestType === 'internship'
        ? `${API_URL}/api/admin/internship-requests/${editingRequest.id}`
        : `${API_URL}/api/admin/hitam-requests/${editingRequest.id}`;

      await axios.patch(endpoint, {
        status: newStatus,
        admin_notes: adminNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditingRequest(null);
      if (editingRequestType === 'internship') {
        fetchInternshipRequests();
      } else {
        fetchHitamRequests();
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Controls Header & Branch Scope */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen size={24} className="text-indigo-600" />
            Project Management & Department Insights
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            View student project choices, faculty guides assigned by department, and manage Multi-Stack project applications.
          </p>
        </div>

        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Scope:</span>
          {isSuperAdmin ? (
            ['ALL', 'CSE', 'CSM', 'CSD', 'ECE', 'EEE', 'MECH'].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedBranch === b
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {b}
              </button>
            ))
          ) : (
            <div className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-200">
              {user?.assigned_branch} Department
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSubTab('selections')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'selections' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <UserCheck size={16} />
          <span>Track Project Assignments</span>
        </button>

        <button
          onClick={() => setSubTab('hitam_requests')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'hitam_requests' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Sparkles size={16} className="text-amber-400" />
          <span>Multi-Stack Project Requests</span>
        </button>

        {/* <button
          onClick={() => setSubTab('internship_requests')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'internship_requests' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Briefcase size={16} className="text-indigo-400" />
          <span>Internship Requests</span>
        </button> */}
      </div>

      {/* TAB 1: TRACK PROJECT SELECTIONS */}
      {subTab === 'selections' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by student, roll or faculty guide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Student Choices: <span className="font-extrabold text-slate-900">{selections.length}</span>
            </div>
          </div>

          {loadingSelections ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading project selections...</div>
          ) : selections.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">
              No project selections found for this department scope.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Project Code & Title</th>
                    <th className="py-3.5 px-4">Faculty Incharge / Guide</th>
                    <th className="py-3.5 px-4">Selection Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {selections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.student_name || 'Student'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.roll_number}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{item.branch || 'N/A'}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md inline-block mb-1">
                          {item.project_code}
                        </span>
                        <div className="font-bold text-slate-800 truncate">{item.project_title}</div>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 bg-amber-50/40">{item.faculty_guide}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {item.selected_at ? new Date(item.selected_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HITAM REQUESTS MANAGEMENT */}
      {subTab === 'hitam_requests' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
              {['ALL', 'pending', 'contacted', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setHitamStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${
                    hitamStatusFilter === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Applications: <span className="font-extrabold text-slate-900">{hitamRequests.length}</span>
            </div>
          </div>

          {loadingRequests ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading Multi-Stack project requests...</div>
          ) : hitamRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">
              No Multi-Stack project requests found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hitamRequests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{req.student_name || req.roll_number}</h4>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                          <span>{req.roll_number}</span> • <span className="font-bold text-indigo-600">{req.branch}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black capitalize ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded">{req.project_code}</span>
                        <span>{req.project_title}</span>
                      </div>
                      <div className="text-slate-600 font-normal italic mt-2">"{req.reason}"</div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Phone size={14} className="text-emerald-600" />
                        <a href={`tel:${req.phone_number}`} className="hover:underline">{req.phone_number}</a>
                      </div>
                      <span className="text-slate-400 font-medium">{req.requested_at ? new Date(req.requested_at).toLocaleDateString() : ''}</span>
                    </div>

                    {req.admin_notes && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                        <span className="font-bold">Admin Note:</span> {req.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleOpenEditModal(req, 'hitam')}
                      className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                    >
                      Review & Update Application Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INTERNSHIP REQUESTS MANAGEMENT */}
      {subTab === 'internship_requests' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
              {['ALL', 'pending', 'contacted', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setInternshipStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${
                    internshipStatusFilter === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Internship Applications: <span className="font-extrabold text-slate-900">{internshipRequests.length}</span>
            </div>
          </div>

          {loadingInternships ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading internship requests...</div>
          ) : internshipRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">
              No internship requests found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {internshipRequests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{req.student_name || req.roll_number}</h4>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                          <span>{req.roll_number}</span> • <span className="font-bold text-indigo-600">{req.branch}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black capitalize ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Company:</span>
                        <span className="font-extrabold text-slate-800">{req.company_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Role & Mode:</span>
                        <span className="font-bold text-slate-850">{req.internship_domain} ({req.internship_mode})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Duration:</span>
                        <span className="font-semibold text-slate-700">{req.total_duration || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Stipend:</span>
                        <span className="font-semibold text-slate-750">{req.stipend || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Phone size={14} className="text-emerald-600" />
                        <a href={`tel:${req.phone_number}`} className="hover:underline">{req.phone_number}</a>
                      </div>
                      <span className="text-slate-400 font-medium">{req.requested_at ? new Date(req.requested_at).toLocaleDateString() : ''}</span>
                    </div>

                    {req.admin_notes && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 text-left">
                        <span className="font-bold">Admin Note:</span> {req.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => handleOpenEditModal(req, 'internship')}
                      className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                    >
                      Review & Update Application Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {editingRequest && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingRequestType === 'internship' ? 'Review Internship Request' : 'Review Multi-Stack Request'}
              </h3>
              <button onClick={() => setEditingRequest(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 pt-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Applicant</span>
                <div className="font-extrabold text-slate-900 text-sm">{editingRequest.student_name} ({editingRequest.roll_number})</div>
                <div className="text-xs text-indigo-600 font-bold">{editingRequest.branch} Branch</div>
              </div>

              {editingRequestType === 'internship' ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs max-h-60 overflow-y-auto">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px] text-left">Internship Information</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 text-left">
                    <div>
                      <span className="text-slate-400 block font-semibold">Company:</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        {editingRequest.company_name}
                        {editingRequest.company_website && (
                          <a href={editingRequest.company_website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 inline-flex items-center"><ExternalLink size={12} /></a>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Domain / Role:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.internship_domain}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Obtained Through:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.internship_obtained_through || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Mode:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.internship_mode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Duration:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.total_duration || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Dates:</span>
                      <span className="font-extrabold text-slate-800 text-[10px]">
                        {editingRequest.start_date || 'N/A'} to {editingRequest.end_date || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Location:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.internship_location || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Stipend:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.stipend || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">PPO Offered:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.ppo_offered || 'No'}</span>
                    </div>
                    {editingRequest.expected_ctc && (
                      <div>
                        <span className="text-slate-400 block font-semibold">Expected CTC:</span>
                        <span className="font-extrabold text-slate-800">{editingRequest.expected_ctc}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block font-semibold">Student Section:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.section || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Student Contact:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.phone_number}</span>
                    </div>
                  </div>

                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 pt-1 uppercase tracking-wider text-[10px] text-left">SPOC Details</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 text-left">
                    <div>
                      <span className="text-slate-400 block font-semibold">Name:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.spoc_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Designation:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.spoc_designation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Email:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.spoc_email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Phone:</span>
                      <span className="font-extrabold text-slate-800">{editingRequest.spoc_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 text-left">
                  <div>
                    <span className="text-slate-400 block font-semibold">Requested Project:</span>
                    <span className="font-extrabold text-slate-900">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded mr-1.5">{editingRequest.project_code}</span>
                      {editingRequest.project_title}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-1">Reason:</span>
                    <p className="italic text-slate-600 leading-relaxed font-medium">"{editingRequest.reason}"</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Application Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['pending', 'contacted', 'approved', 'rejected'].map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold capitalize border transition-all cursor-pointer ${
                        newStatus === st ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">Internal Admin Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add interview notes or feedback for this candidate..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-normal outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
                >
                  {updating ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProjectManagementAdmin;
