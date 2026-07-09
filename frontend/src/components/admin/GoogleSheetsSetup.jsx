import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileSpreadsheet, Plus, RefreshCw, Edit2, Trash2, Link2, 
  Layers, CheckCircle2, AlertTriangle, Calendar, BookOpen, Clock, 
  HelpCircle, X, Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const GoogleSheetsSetup = ({ user }) => {
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
      sheet_url: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (conn) => {
    setIsEditing(true);
    setEditingId(conn.id);
    setFormData({
      batch_year: conn.batch_year,
      academic_year: conn.academic_year,
      sheet_type: conn.sheet_type,
      sheet_url: conn.sheet_url
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    if (!formData.sheet_url.trim()) return;

    try {
      const token = user?.email || 'admin@hitam.org';
      if (isEditing) {
        await axios.put(`${API_URL}/api/admin/google-sheets/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActionMessage({ type: 'success', text: 'Google Sheet connection updated successfully!' });
      } else {
        await axios.post(`${API_URL}/api/admin/google-sheets`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActionMessage({ type: 'success', text: 'Google Sheet connection added successfully!' });
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
              Connect external Google Sheets and trigger synchronization. Maps dynamic schemas for first, second, and third-year student tracking cohorts.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer self-start sm:self-center"
        >
          <Plus size={16} />
          <span>Connect New Sheet</span>
        </button>
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
            <p className="font-bold">{actionMessage.type === 'success' ? 'Success' : 'Error Occurred'}</p>
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
          <p className="font-bold text-slate-800">Dynamic Sync engine instructions:</p>
          <p>
            1. Share the Google Sheet with your service account email (usually found in `service_account.json` credentials).
          </p>
          <p>
            2. The sync engine dynamically detects headers: <strong>Roll Number</strong>, <strong>Name</strong>, <strong>Email</strong>, and <strong>Test columns</strong>. It automatically merges records to avoid overwriting scores from other semesters.
          </p>
          <p>
            3. <strong>Domain Info</strong> sheets require columns formatted like `I-II Domain` and `I-II Performance` to map semester tracks properly.
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
                  <th className="py-4 px-6">Sync Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
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
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        conn.sheet_type === 'overall_marks'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {conn.sheet_type === 'overall_marks' ? <BookOpen size={12} /> : <Calendar size={12} />}
                        {conn.sheet_type === 'overall_marks' ? 'Overall Marks' : 'Domain Info'}
                      </span>
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
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-400" />
                <span>{isEditing ? 'Edit Connection' : 'Connect Google Sheet'}</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
              {/* Batch selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Student Batch</label>
                <select
                  value={formData.batch_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, batch_year: e.target.value }))}
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
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

              {/* Academic Year select */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cohort Academic Year</label>
                <select
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: parseInt(e.target.value) }))}
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  required
                >
                  <option value={1}>1st Year (Freshman)</option>
                  <option value={2}>2nd Year (Sophomore)</option>
                  <option value={3}>3rd Year (Junior)</option>
                  <option value={4}>4th Year (Senior)</option>
                </select>
              </div>

              {/* Sheet Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sheet Data Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'overall_marks' }))}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'overall_marks'
                        ? 'border-purple-600 bg-purple-50/50 text-purple-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>Overall Marks / Tests</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sheet_type: 'domain_info' }))}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                      formData.sheet_type === 'domain_info'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Domain Info Selections</span>
                  </button>
                </div>
              </div>

              {/* Sheet URL/ID */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Sheet URL or Spreadsheet ID</label>
                <input
                  type="text"
                  value={formData.sheet_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, sheet_url: e.target.value }))}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium placeholder-slate-400"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
