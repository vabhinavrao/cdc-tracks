import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserMinus, Plus, Trash2, Search, RefreshCw, 
  CheckCircle2, AlertTriangle, Calendar, Layers, Clock, Loader2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DetainedStudentsSetup = ({ user }) => {
  const [detainedStudents, setDetainedStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    roll_number: '',
    detained_to_batch: ''
  });

  useEffect(() => {
    fetchDetainedStudents();
    fetchBatches();
  }, []);

  const fetchDetainedStudents = async () => {
    setLoading(true);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.get(`${API_URL}/api/admin/detained-students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDetainedStudents(res.data || []);
    } catch (err) {
      console.error("Failed to fetch detained students:", err);
      setActionMessage({ type: 'error', text: 'Failed to load detained students list.' });
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
      if (res.data && res.data.length > 0) {
        setFormData(prev => ({ ...prev, detained_to_batch: res.data[0].batch_year }));
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    const roll = formData.roll_number.trim().toUpperCase();
    
    if (!roll) {
      setActionMessage({ type: 'error', text: 'Please enter a valid roll number.' });
      return;
    }
    if (roll.length !== 10) {
      setActionMessage({ type: 'error', text: 'Roll number must be exactly 10 characters.' });
      return;
    }
    if (!formData.detained_to_batch) {
      setActionMessage({ type: 'error', text: 'Please select a batch.' });
      return;
    }

    setSubmitting(true);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.post(`${API_URL}/api/admin/detained-students`, {
        roll_number: roll,
        detained_to_batch: formData.detained_to_batch
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setActionMessage({ type: 'success', text: res.data.message || 'Student registered successfully.' });
      setFormData(prev => ({ ...prev, roll_number: '' }));
      fetchDetainedStudents();
    } catch (err) {
      console.error("Failed to register detained student:", err);
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to register detained student.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rollNumber) => {
    if (!window.confirm(`Are you sure you want to remove detained status for student ${rollNumber}? This will restore their original batch.`)) {
      return;
    }
    setActionMessage(null);
    
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.delete(`${API_URL}/api/admin/detained-students/${rollNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: res.data.message || 'Detained status removed.' });
      fetchDetainedStudents();
    } catch (err) {
      console.error("Failed to remove detained status:", err);
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to remove detained student.' 
      });
    }
  };

  const filteredStudents = detainedStudents.filter(s => 
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.detained_to_batch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserMinus className="text-blue-600" size={24} />
            Detained Students Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register and manage student detainment overrides. Detained students are mapped to later batch academic cohorts.
          </p>
        </div>
        
        <button
          onClick={() => { fetchDetainedStudents(); fetchBatches(); }}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 self-start">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Register Detainment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Force a student's record to align with a later batch.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Student Roll Number</label>
              <input
                type="text"
                placeholder="e.g. 23E51A0522"
                value={formData.roll_number}
                onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value.toUpperCase() }))}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                maxLength={10}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">New Detained Batch</label>
              <select
                value={formData.detained_to_batch}
                onChange={(e) => setFormData(prev => ({ ...prev, detained_to_batch: e.target.value }))}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                required
              >
                {batches.length > 0 ? (
                  batches.map((b) => (
                    <option key={b.id} value={b.batch_year}>
                      {b.batch_year}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="2024-2028">2024-2028</option>
                    <option value="2025-2029">2025-2029</option>
                    <option value="2026-2030">2026-2030</option>
                  </>
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-75 transition-all mt-6"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Register Student
            </button>
          </form>
        </div>

        {/* Right Table Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            
            <div className="text-xs font-semibold text-slate-400">
              Total Overrides: {filteredStudents.length}
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-slate-500">Loading overrides...</span>
              </div>
            ) : filteredStudents.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Detained Batch</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Added On</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {student.roll_number.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-700 text-sm">{student.roll_number}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={12} />
                              <span>Original: 20{student.roll_number.substring(0, 2)}-20{parseInt(student.roll_number.substring(0, 2)) + 4}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          <Layers size={12} />
                          {student.detained_to_batch}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {new Date(student.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(student.roll_number)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Restore original batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <UserMinus className="text-slate-300 mb-3" size={40} />
                <h3 className="font-bold text-slate-600 text-sm">No Detained Students Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {searchQuery ? "No overrides match your search query." : "No student overrides have been registered yet. Use the form to register one."}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetainedStudentsSetup;
