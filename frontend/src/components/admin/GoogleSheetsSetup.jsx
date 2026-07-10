import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileSpreadsheet, Plus, RefreshCw, Edit2, Trash2, Link2, 
  Layers, CheckCircle2, AlertTriangle, Calendar, BookOpen, Clock, 
  HelpCircle, X, Loader2, Brain, Sparkles, Database, ArrowRight, ChevronDown, Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const GoogleSheetsSetup = ({ user, isReadOnly }) => {
  const [connections, setConnections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    batch_year: '',
    academic_year: 1,
    sheet_type: 'overall_marks',
    sheet_url: ''
  });

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [testScores, setTestScores] = useState([]);
  const [postAssessments, setPostAssessments] = useState([]);
  const [domainMappings, setDomainMappings] = useState({});
  const [showMappingSection, setShowMappingSection] = useState(false);

  // Target database fields
  const DB_FIELDS_OVERALL = {
    roll_number: { label: "Roll Number / Reg ID", desc: "Unique student identifier", required: true },
    name: { label: "Student Name", desc: "Full name", required: false },
    branch: { label: "Branch", desc: "Academic branch (e.g. CSE)", required: false },
    email: { label: "Email Address", desc: "Student email ID", required: false },
    mobile: { label: "Phone Number", desc: "Contact mobile number", required: false },
    participation: { label: "Participation Score", desc: "Attendance/participation value", required: false },
    consistency_score: { label: "Consistency Score", desc: "Consistency metric", required: false },
    avg_performance: { label: "Avg Performance", desc: "Average test performance", required: false },
    cdc_grade_score: { label: "CDC Grade Score", desc: "Final placement eligibility grade", required: false },
    cdc_rank: { label: "CDC Rank", desc: "Cohort rank number", required: false },
    cdc_band: { label: "CDC Band", desc: "CDC Band rating (A, B, C, D)", required: false },
    cie_score: { label: "CIE Score (CIE/5)", desc: "CIE mark (e.g. out of 5)", required: false }
  };

  const DB_FIELDS_DOMAIN = {
    roll_number: { label: "Roll Number / Reg ID", desc: "Unique student identifier", required: true },
    name: { label: "Student Name", desc: "Full name", required: false },
    branch: { label: "Branch", desc: "Academic branch (e.g. CSE)", required: false },
    email: { label: "Email Address", desc: "Student email ID", required: false }
  };
  const DB_FIELDS_PROJECTS = {
    roll_number: { label: "Roll Number / Reg ID", desc: "Unique student identifier", required: true },
    name: { label: "Student Name", desc: "Full name", required: false },
    branch: { label: "Branch", desc: "Academic branch (e.g. CSE)", required: false },
    email: { label: "Email Address", desc: "Student email ID", required: false },
    mobile: { label: "Phone Number", desc: "Contact mobile number", required: false },
    project_title: { label: "Project Title", desc: "Project topic / title", required: true },
    faculty_guide: { label: "Faculty Guide / Mentor", desc: "Project guide's name", required: false },
    technologies: { label: "Technologies Used", desc: "Stack (e.g. React, Node)", required: false }
  };

  const DB_FIELDS_FINALISED = {
    roll_number: { label: "Roll Number / Reg ID", desc: "Unique student identifier", required: true },
    name: { label: "Student Name", desc: "Full name", required: false },
    branch: { label: "Branch", desc: "Academic branch (e.g. CSE)", required: false },
    email: { label: "Email Address", desc: "Student email ID", required: false },
    mobile: { label: "Phone Number", desc: "Contact mobile number", required: false },
    finalised_domain: { label: "Finalised Domain / Track", desc: "Final track selected for student", required: true }
  };
  const getSemesterOptions = (year) => {
    switch (year) {
      case 1:
        return [
          { value: "I-I", label: "Semester I-I" },
          { value: "I-II", label: "Semester I-II" }
        ];
      case 2:
        return [
          { value: "II-I", label: "Semester II-I" },
          { value: "II-II", label: "Semester II-II" }
        ];
      case 3:
        return [
          { value: "III-I", label: "Semester III-I" },
          { value: "III-II", label: "Semester III-II" }
        ];
      case 4:
        return [
          { value: "IV-I", label: "Semester IV-I" },
          { value: "IV-II", label: "Semester IV-II" }
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchBatches();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.get(`${API_URL}/api/admin/google-sheets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnections(res.data || []);
    } catch (err) {
      console.error("Failed to fetch Google Sheet connections:", err);
      setActionMessage({ type: 'error', text: 'Failed to fetch connections. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.get(`${API_URL}/api/admin/batch-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(res.data || []);
      if (res.data && res.data.length > 0 && !formData.batch_year) {
        setFormData(prev => ({ ...prev, batch_year: res.data[0].batch_year }));
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      batch_year: batches.length > 0 ? batches[0].batch_year : '2024-2028',
      academic_year: 1,
      sheet_type: 'overall_marks',
      sheet_url: '',
      semester: ''
    });
    setSheetHeaders([]);
    setColumnMappings({});
    setTestScores([]);
    setPostAssessments([]);
    setDomainMappings({});
    setShowMappingSection(false);
    setShowModal(true);
  };

  const handleOpenEditModal = async (conn) => {
    setIsEditing(true);
    setEditingId(conn.id);
    setFormData({
      batch_year: conn.batch_year,
      academic_year: conn.academic_year,
      sheet_type: conn.sheet_type,
      sheet_url: conn.sheet_url,
      semester: conn.semester || ''
    });
    
    // Extract existing mappings
    const savedMapping = conn.column_mappings || {};
    const cols = savedMapping.column_mappings || savedMapping;
    const tests = savedMapping.test_scores || [];
    const posts = savedMapping.post_assessments || [];
    const domains = savedMapping.domain_mappings || {};
    
    setColumnMappings(cols);
    setTestScores(tests);
    setPostAssessments(posts);
    setDomainMappings(domains);
    
    if (Object.keys(cols).length > 0) {
      setShowMappingSection(true);
      // Auto-trigger analysis to fetch actual headers list
      handleAnalyzeSheet(conn.sheet_url, false);
    } else {
      setSheetHeaders([]);
      setShowMappingSection(false);
    }
    
    setShowModal(true);
  };

  const handleAnalyzeSheet = async (urlToUse = null, triggerFeedback = true) => {
    const targetUrl = urlToUse || formData.sheet_url;
    if (!targetUrl.trim()) return;

    setAnalyzing(true);
    if (triggerFeedback) setActionMessage(null);

    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.post(`${API_URL}/api/admin/google-sheets/analyze`, {
        sheet_url: targetUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = res.data;
      setSheetHeaders(data.headers || []);
      
      // Update form sheet type if AI classified it
      if (data.sheet_type) {
        setFormData(prev => ({ ...prev, sheet_type: data.sheet_type }));
      }
      
      // Populate mappings
      if (!isEditing || !urlToUse) {
        setColumnMappings(data.column_mappings || {});
        setTestScores(data.test_scores || []);
        setPostAssessments(data.post_assessments || []);
        setDomainMappings(data.domain_mappings || {});
      }
      
      setShowMappingSection(true);
      if (triggerFeedback) {
        setActionMessage({ 
          type: 'success', 
          text: `AI Sheet Analysis Complete! Detected '${data.sheet_type === 'overall_marks' ? 'Overall Marks' : 'Domain Info'}' sheet structure. Confident: ${Math.round(data.confidence_score * 100)}%.` 
        });
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
      if (triggerFeedback) {
        setActionMessage({ 
          type: 'error', 
          text: err.response?.data?.detail || 'AI analysis failed. Please verify the URL and share permissions.' 
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMappingChange = (field, sheetHeader) => {
    setColumnMappings(prev => ({
      ...prev,
      [field]: sheetHeader === "" ? null : sheetHeader
    }));
  };

  const handleTestScoreToggle = (header) => {
    setTestScores(prev => 
      prev.includes(header) ? prev.filter(t => t !== header) : [...prev, header]
    );
  };

  const handlePostAssessmentToggle = (header) => {
    setPostAssessments(prev => 
      prev.includes(header) ? prev.filter(p => p !== header) : [...prev, header]
    );
    // Make sure it is also included in test scores if selected as post assessment
    if (!testScores.includes(header)) {
      setTestScores(prev => [...prev, header]);
    }
  };

  const handleDomainMappingChange = (semester, mappingField, sheetHeader) => {
    setDomainMappings(prev => ({
      ...prev,
      [semester]: {
        ...prev[semester],
        [mappingField]: sheetHeader === "" ? null : sheetHeader
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    if (!formData.sheet_url.trim()) return;

    const payload = {
      ...formData,
      column_mappings: {
        column_mappings: columnMappings,
        test_scores: testScores,
        post_assessments: postAssessments,
        domain_mappings: domainMappings
      }
    };

    try {
      const token = user?.email || 'admin@hitam.org';
      if (isEditing) {
        await axios.put(`${API_URL}/api/admin/google-sheets/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActionMessage({ type: 'success', text: 'Google Sheet connection updated successfully with custom mappings!' });
      } else {
        await axios.post(`${API_URL}/api/admin/google-sheets`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActionMessage({ type: 'success', text: 'Google Sheet connection and AI mapping saved successfully!' });
      }
      setShowModal(false);
      fetchConnections();
    } catch (err) {
      console.error("Failed to save connection:", err);
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save connection.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Google Sheet connection?")) return;
    setActionMessage(null);

    try {
      const token = user?.email || 'admin@hitam.org';
      await axios.delete(`${API_URL}/api/admin/google-sheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: 'Connection deleted successfully!' });
      fetchConnections();
    } catch (err) {
      console.error("Failed to delete connection:", err);
      setActionMessage({ type: 'error', text: 'Failed to delete connection.' });
    }
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    setActionMessage(null);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.post(`${API_URL}/api/admin/google-sheets/${id}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: res.data.message || 'Sync completed successfully!' });
      fetchConnections();
    } catch (err) {
      console.error("Failed to sync connection:", err);
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed. Check your Sheet formatting or share permissions.' });
      fetchConnections();
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
            <CheckCircle2 size={12} /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
            <AlertTriangle size={12} /> Failed
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Syncing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-bold">
            <Clock size={12} /> Not Synced
          </span>
        );
    }
  };

  const getSheetTypeBadge = (type) => {
    switch (type) {
      case 'overall_marks':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold font-black uppercase tracking-wider">
            <BookOpen size={12} /> Overall Marks
          </span>
        );
      case 'domain_info':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold font-black uppercase tracking-wider">
            <Calendar size={12} /> Domain Specific Performance
          </span>
        );
      case 'semester_projects':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold font-black uppercase tracking-wider">
            <Database size={12} /> Semester Projects
          </span>
        );
      case 'finalised_domains':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-black uppercase tracking-wider">
            <CheckCircle2 size={12} /> Finalised Domains
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">
            {type}
          </span>
        );
    }
  };

  let targetFields = DB_FIELDS_DOMAIN;
  if (formData.sheet_type === 'overall_marks') {
    targetFields = DB_FIELDS_OVERALL;
  } else if (formData.sheet_type === 'semester_projects') {
    targetFields = DB_FIELDS_PROJECTS;
  } else if (formData.sheet_type === 'finalised_domains') {
    targetFields = DB_FIELDS_FINALISED;
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Google Sheets Sync Panel</h2>
            <p className="text-sm text-slate-500 mt-1">
              Connect external Google Sheets and trigger synchronization. AI automatically maps dynamic columns to keep databases secure and aligned.
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <Plus size={16} />
            <span>Connect New Sheet</span>
          </button>
        )}
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-sm animate-fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="mt-0.5 shrink-0">
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
          </div>
          <div className="flex-1">
            <p className="font-bold">{actionMessage.type === 'success' ? 'Notification' : 'Error Occurred'}</p>
            <p className="mt-0.5 opacity-90">{actionMessage.text}</p>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Informative Tip */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-xs text-slate-600">
        <HelpCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">Dynamic Sync & AI Mapping Engine:</p>
          <p>
            1. Share the Google Sheet with your service account email (usually found in `service_account.json` credentials).
          </p>
          <p>
            2. The AI Mapper inspects the columns and automatically identifies student details, scores, and domains, matching them to the target database schema.
          </p>
          <p>
            3. Preview and adjust the AI-generated column mappings below before saving to guarantee error-free, custom synchronization.
          </p>
        </div>
      </div>

      {/* Main connections grid / table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-semibold">Fetching connected Google Sheets...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400">
          <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="font-bold text-slate-700 text-lg">No Google Sheets connected yet</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Click "Connect New Sheet" above to link a student tracker or domain selection spreadsheet.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                  <th className="py-4 px-6">Batch & Year</th>
                  <th className="py-4 px-6">Sheet Type</th>
                  <th className="py-4 px-6">Google Sheet Link</th>
                  <th className="py-4 px-6">Mappings</th>
                  <th className="py-4 px-6">Sync Status</th>
                  {!isReadOnly && <th className="py-4 px-6 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <Layers size={16} />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800">Batch {conn.batch_year}</p>
                          <p className="text-xs text-slate-400 font-medium">Academic Year {conn.academic_year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getSheetTypeBadge(conn.sheet_type)}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <Link2 size={14} className="text-slate-400 shrink-0" />
                        <a 
                          href={conn.sheet_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800 font-medium truncate block hover:underline"
                        >
                          {conn.sheet_url}
                        </a>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {conn.column_mappings && Object.keys(conn.column_mappings.column_mappings || conn.column_mappings || {}).length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-slate-700 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Check size={12} className="text-emerald-600" /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium italic">
                          Default (Rules)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        {getStatusBadge(conn.sync_status)}
                        {conn.last_synced && (
                          <p className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
                            <Clock size={10} />
                            Last Synced: {new Date(conn.last_synced).toLocaleString()}
                          </p>
                        )}
                        {conn.sync_status === 'failed' && conn.sync_message && (
                          <p className="text-[10px] text-rose-500 mt-1 font-semibold max-w-xs break-words">
                            Error: {conn.sync_message}
                          </p>
                        )}
                      </div>
                    </td>
                    {!isReadOnly && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSync(conn.id)}
                            disabled={syncingId !== null}
                            className="p-2 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-bold"
                            title="Trigger Live Sync"
                          >
                            <RefreshCw size={14} className={syncingId === conn.id ? 'animate-spin' : ''} />
                            <span>{syncingId === conn.id ? 'Syncing...' : 'Sync'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(conn)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                            title="Edit Connection"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(conn.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-colors cursor-pointer"
                            title="Delete Connection"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-400" />
                <span>{isEditing ? 'Edit Google Sheet Connection' : 'Connect New Google Sheet'}</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left overflow-y-auto flex-1">
              
              {/* Batch & Academic Year Selectors */}
              <div className={`grid ${formData.sheet_type === 'semester_projects' || formData.sheet_type === 'finalised_domains' ? 'grid-cols-3' : 'grid-cols-2'} gap-4 items-end`}>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">Target Student Batch</label>
                  <select
                    value={formData.batch_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, batch_year: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs"
                    required
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.batch_year}>Batch {b.batch_year}</option>
                    ))}
                    {batches.length === 0 && (
                      <>
                        <option value="2024-2028">Batch 2024-2028</option>
                        <option value="2025-2029">Batch 2025-2029</option>
                        <option value="2023-2027">Batch 2023-2027</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">Academic Year</label>
                  <select
                    value={formData.academic_year}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      academic_year: parseInt(e.target.value),
                      semester: '' // Reset semester to default dynamic auto-detect on year change
                    }))}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs"
                    required
                  >
                    <option value={1}>1st Year (Freshman)</option>
                    <option value={2}>2nd Year (Sophomore)</option>
                    <option value={3}>3rd Year (Junior)</option>
                    <option value={4}>4th Year (Senior)</option>
                  </select>
                </div>
                {(formData.sheet_type === 'semester_projects' || formData.sheet_type === 'finalised_domains') && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">Target Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                      className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs"
                      required
                    >
                      <option value="">Dynamic (Auto Detect)</option>
                      {getSemesterOptions(formData.academic_year).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sheet URL/ID & AI analysis trigger */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Google Sheet URL or Spreadsheet ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sheet_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, sheet_url: e.target.value }))}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 p-3 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium placeholder-slate-400"
                    required
                  />
                  <button
                    type="button"
                    disabled={analyzing || !formData.sheet_url}
                    onClick={() => handleAnalyzeSheet()}
                    className="px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5 shrink-0 border border-transparent disabled:border-slate-200"
                  >
                    {analyzing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Brain size={14} className="text-purple-400" />
                    )}
                    <span>{analyzing ? 'Analyzing...' : 'AI Map'}</span>
                  </button>
                </div>
              </div>

              {/* Sheet Type (Dynamically classified or overrideable) */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Data Classification</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'overall_marks' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'overall_marks'
                        ? 'border-purple-600 bg-purple-50/50 text-purple-700 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>Overall Marks & Tests</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'domain_info' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'domain_info'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-700 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Domain Specific Performance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'semester_projects' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'semester_projects'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Database size={16} />
                    <span>Semester Projects</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'finalised_domains' }))}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'finalised_domains'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-extrabold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>Finalised Domains</span>
                  </button>
                </div>
              </div>

              {/* Interactive Column Mapping Panel */}
              {showMappingSection && (
                <div className="border border-slate-200 rounded-2xl bg-slate-50/60 p-4 space-y-4 max-h-[350px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles size={14} className="text-purple-600" />
                      <span>Configure Mappings</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {sheetHeaders.length} Columns Found
                    </span>
                  </div>

                  {/* Schema field mappings list */}
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                      Verify that each database target maps to the correct header from your Google Sheet.
                    </p>
                    
                    {Object.entries(targetFields).map(([dbField, config]) => {
                      const selectedVal = columnMappings[dbField] || "";
                      return (
                        <div key={dbField} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {config.label}
                              {config.required && <span className="text-rose-500">*</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{config.desc}</p>
                          </div>
                          <select
                            value={selectedVal}
                            onChange={(e) => handleMappingChange(dbField, e.target.value)}
                            className="p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white max-w-[200px] sm:max-w-xs truncate"
                            required={config.required}
                          >
                            <option value="">-- Ignored / Empty --</option>
                            {sheetHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall marks test scores multi-selection chips */}
                  {formData.sheet_type === 'overall_marks' && sheetHeaders.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                          <Database size={12} className="text-purple-600" />
                          <span>Aptitude/Technical Tests Columns</span>
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">Toggle columns containing mock tests or code challenges to be parsed into performance charts.</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {sheetHeaders
                          .filter(h => !Object.values(columnMappings).includes(h))
                          .map(h => {
                            const isTest = testScores.includes(h);
                            const isPost = postAssessments.includes(h);
                            return (
                              <div key={h} className={`inline-flex items-center rounded-lg border p-1.5 transition-all text-[10px] font-bold gap-1.5 bg-white ${
                                isTest ? 'border-purple-300 text-purple-700 bg-purple-50/20' : 'border-slate-100 text-slate-500'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => handleTestScoreToggle(h)}
                                  className="hover:underline cursor-pointer"
                                >
                                  {h}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePostAssessmentToggle(h)}
                                  title="Mark as Post Assessment"
                                  className={`px-1 py-0.5 rounded text-[8px] uppercase tracking-tighter ${
                                    isPost 
                                      ? 'bg-purple-600 text-white' 
                                      : 'bg-slate-100 text-slate-400 hover:bg-purple-100 hover:text-purple-700'
                                  }`}
                                >
                                  Post
                                </button>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Domain mappings semester list */}
                  {formData.sheet_type === 'domain_info' && sheetHeaders.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                          <Layers size={12} className="text-amber-600" />
                          <span>Semester Domain & Performance Pairs</span>
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">Map each semester's domain choice and final score.</p>
                      </div>

                      <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        {["I-II", "II-I", "II-II"].map((sem) => {
                          const semMap = domainMappings[sem] || {};
                          return (
                            <div key={sem} className="flex flex-col gap-2 pb-2 border-b border-slate-50 last:border-b-0 last:pb-0">
                              <p className="text-xs font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded self-start">{sem} Semester</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Domain Choice Column</label>
                                  <select
                                    value={semMap.domain || ""}
                                    onChange={(e) => handleDomainMappingChange(sem, "domain", e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                                  >
                                    <option value="">-- Ignored --</option>
                                    {sheetHeaders.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Performance Score Column</label>
                                  <select
                                    value={semMap.performance || ""}
                                    onChange={(e) => handleDomainMappingChange(sem, "performance", e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                                  >
                                    <option value="">-- Ignored --</option>
                                    {sheetHeaders.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  {isEditing ? 'Save Changes' : 'Connect Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsSetup;
