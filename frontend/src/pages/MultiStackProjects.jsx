// src/pages/MultiStackProjects.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Building2, Sparkles, Phone, Send, CheckCircle2, AlertCircle, 
  Clock, Code2, Target, CheckSquare, ShieldCheck, Search, HelpCircle, ArrowRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MultiStackProjects = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  // Application Form Modal State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  useEffect(() => {
    fetchMultiStackProjects();
  }, [user]);

  const fetchMultiStackProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = user?.email || '';
      const res = await axios.get(`${API_URL}/api/student/hitam-projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Failed to fetch Multi-Stack projects", err);
      setError("Failed to load Multi-Stack projects. Please try signing in again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (project) => {
    setSelectedProject(project);
    setPhoneNumber(project.student_request?.phone || '');
    setReason(project.student_request?.reason || '');
    setFormMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setPhoneNumber('');
    setReason('');
    setFormMessage(null);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setFormMessage({ type: 'error', text: 'Please enter a valid phone number (at least 10 digits).' });
      return;
    }
    if (!reason || !reason.trim()) {
      setFormMessage({ type: 'error', text: 'Please provide a statement of why you wish to join this project.' });
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    try {
      const token = user?.email || '';
      await axios.post(`${API_URL}/api/student/request-hitam-project`, {
        project_id: selectedProject.id,
        phone_number: phoneNumber.trim(),
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormMessage({ type: 'success', text: 'Your application has been submitted to CDC Admin!' });
      setTimeout(() => {
        handleCloseModal();
        fetchMultiStackProjects();
      }, 1200);
    } catch (err) {
      setFormMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit application.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.technologies && p.technologies.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full flex items-center gap-1.5"><CheckCircle2 size={14}/> Approved</span>;
      case 'contacted':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-full flex items-center gap-1.5"><Phone size={14}/> CDC Contacted</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full flex items-center gap-1.5"><AlertCircle size={14}/> Deferred</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full flex items-center gap-1.5"><Clock size={14}/> Pending Review</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Building2 size={320} />
        </div>
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-400" /> Multi-Stack Institutional Flagships
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Multi-Stack Real-World Projects</h1>
          <p className="text-slate-300 text-sm leading-relaxed font-normal">
            Work directly on institutional systems, gamified CDC platforms, and real placement readiness applications. Request to join flagship projects, submit your motivation, and get interviewed by CDC leaders.
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Multi-Stack projects by code, title or stack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Showing <span className="font-extrabold text-slate-900">{filteredProjects.length}</span> flagship opportunities
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-medium">Loading Multi-Stack projects catalog...</div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-center">{error}</div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 font-bold">
          No Multi-Stack projects matching your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => {
            const req = proj.student_request;

            return (
              <div key={proj.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-lg border border-indigo-100 inline-block mb-2">
                        {proj.project_code}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug">{proj.title}</h3>
                    </div>
                    {req ? getStatusBadge(req.status) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full">
                        {proj.difficulty || 'Advanced'}
                      </span>
                    )}
                  </div>

                  {proj.problem_statement && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Target size={14} className="text-indigo-600" /> Challenge / Problem Statement
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">{proj.problem_statement}</p>
                    </div>
                  )}

                  {proj.key_objectives && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-emerald-600" /> Key Deliverables & Scope
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">{proj.key_objectives}</p>
                    </div>
                  )}

                  {proj.technologies && (
                    <div className="pt-2">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Technologies & Tools</span>
                      <div className="flex flex-wrap gap-1.5">
                        {proj.technologies.split(',').map((t, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action / Application Status */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {req ? (
                    <div className="flex items-center gap-3 w-full justify-between">
                      <div className="text-xs text-slate-500 font-medium">
                        Applied on: <span className="font-bold text-slate-700">{new Date(req.requested_at).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => handleOpenModal(proj)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Update Application
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenModal(proj)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Request to Work on Project</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application Form Modal */}
      {selectedProject && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative text-left">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-md uppercase">
                  {selectedProject.project_code}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedProject.title}</h3>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 pt-4">
              {formMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  formMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {formMessage.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                  <span>{formMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Student Roll Number</label>
                <input
                  type="text"
                  value={user?.roll_number || ''}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Contact Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Why do you want to work on this project? *</label>
                <textarea
                  rows={4}
                  placeholder="Explain your relevant technical experience, motivation, and why you are interested in this specific Multi-Stack institutional project..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-normal outline-none focus:border-indigo-500"
                  required
                ></textarea>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] text-indigo-800 font-medium leading-relaxed">
                ℹ️ CDC Administrators will review your request, motivation statement, and contact you directly via phone/email.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
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

export default MultiStackProjects;
