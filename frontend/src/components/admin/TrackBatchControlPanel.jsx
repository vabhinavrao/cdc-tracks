// src/components/admin/TrackBatchControlPanel.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Clock, Mail, ShieldAlert, CheckCircle2, AlertTriangle, 
  Download, Trash2, UserCheck, RefreshCw, Plus, ArrowRight, FileSpreadsheet,
  Search, Filter, Layers, Info, Award
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TrackBatchControlPanel = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState('windows'); // 'windows' | 'schedules' | 'promotion' | 'audit'
  const [schedules, setSchedules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState('2024-2028');
  const [searchAudit, setSearchAudit] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // New Batch Form State
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchYear, setNewBatchYear] = useState('');

  // Active schedule form state
  const [formSchedule, setFormSchedule] = useState({
    batch_year: '2024-2028',
    track_selection_start: '',
    track_selection_end: '',
    contact_email: 'support.cdc@hitam.org',
    year_1_start: '', year_1_end: '',
    year_2_start: '', year_2_end: '',
    year_3_start: '', year_3_end: '',
    year_4_start: '', year_4_end: '',
    sem_1_start: '', sem_1_end: '',
    sem_2_start: '', sem_2_end: ''
  });

  useEffect(() => {
    fetchSchedules();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      const match = schedules.find(s => s.batch_year === selectedBatch);
      if (match) {
        setFormSchedule(match);
      } else {
        setFormSchedule(schedules[0]);
        setSelectedBatch(schedules[0].batch_year);
      }
    }
  }, [selectedBatch, schedules]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.get(`${API_URL}/api/admin/batch-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(res.data || []);
    } catch (err) {
      console.error("Failed to fetch batch schedules", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.get(`${API_URL}/api/admin/track-audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const token = user?.email || 'admin@hitam.org';
      await axios.post(`${API_URL}/api/admin/batch-schedule`, formSchedule, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: `Schedule for Batch ${formSchedule.batch_year} saved successfully!` });
      fetchSchedules();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || "Failed to save schedule" });
    }
  };

  const handleCreateNewBatch = async (e) => {
    e.preventDefault();
    if (!newBatchYear.trim()) return;
    const cleanYear = newBatchYear.trim();
    try {
      const token = user?.email || 'admin@hitam.org';
      const newSched = {
        batch_year: cleanYear,
        contact_email: 'support.cdc@hitam.org'
      };
      await axios.post(`${API_URL}/api/admin/batch-schedule`, newSched, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: `Created new batch ${cleanYear}!` });
      setShowNewBatchModal(false);
      setNewBatchYear('');
      await fetchSchedules();
      setSelectedBatch(cleanYear);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || "Failed to create new batch" });
    }
  };

  const handleRunPromotion = async () => {
    setActionMessage(null);
    try {
      const token = user?.email || 'admin@hitam.org';
      const res = await axios.post(`${API_URL}/api/admin/promote-batches`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ 
        type: 'success', 
        text: `Batch Promotion Completed! ${res.data.active_students} Active students updated, ${res.data.alumni_tagged} Alumni tagged.` 
      });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || "Failed to run promotion" });
    }
  };

  const handleExportXlsx = async (batchYear) => {
    setIsExporting(true);
    try {
      const token = user?.email || 'admin@hitam.org';
      const response = await axios.get(`${API_URL}/api/admin/export-batch-xlsx/${batchYear}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Batch_${batchYear}_Full_Data.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setActionMessage({ type: 'success', text: `Downloaded Excel sheet for Batch ${batchYear}` });
    } catch (err) {
      setActionMessage({ type: 'error', text: "Failed to download XLSX sheet" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteBatch = async (batchYear) => {
    if (!window.confirm(`⚠️ CRITICAL WARNING!\n\nAre you sure you want to permanently delete all data for Batch ${batchYear}?\nThis action CANNOT be undone! Ensure you have exported the data spreadsheet first.`)) {
      return;
    }
    setActionMessage(null);
    try {
      const token = user?.email || 'admin@hitam.org';
      await axios.delete(`${API_URL}/api/admin/batch/${batchYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionMessage({ type: 'success', text: `Permanently deleted data for Batch ${batchYear}` });
      fetchSchedules();
      fetchAuditLogs();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || "Failed to delete batch" });
    }
  };

  const filteredAuditLogs = auditLogs.filter(l => 
    (selectedBatch === 'ALL' || l.batch_year === selectedBatch) &&
    (l.roll_number.toLowerCase().includes(searchAudit.toLowerCase()) || 
     (l.student_name && l.student_name.toLowerCase().includes(searchAudit.toLowerCase())))
  );

  return (
    <div className="space-y-6 text-left">
      {/* Action Feedback Toast */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
          actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-3 font-semibold text-xs md:text-sm">
            {actionMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={20} className="text-rose-600 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer ml-4">Dismiss</button>
        </div>
      )}

      {/* Header & Batch Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="text-blue-600" size={24} />
            Track Selection & Batch Control Panel
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure track selection windows, academic schedules, batch promotions, and audit student track choices.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 px-2 uppercase">Batch Scope:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-white px-3 py-1.5 rounded-xl text-xs font-extrabold text-slate-800 border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {schedules.map(s => (
                <option key={s.batch_year} value={s.batch_year}>Batch {s.batch_year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNewBatchModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {/* Control Panel Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('windows')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'windows' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Clock size={16} />
          <span>Track Selection Windows</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'schedules' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Calendar size={16} />
          <span>Academic Schedules</span>
        </button>

        <button
          onClick={() => setActiveSubTab('promotion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'promotion' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <UserCheck size={16} />
          <span>Promotions & Alumni</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'audit' ? 'bg-slate-900 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Search size={16} />
          <span>Track Audit Logs</span>
        </button>
      </div>

      {/* SUB-TAB 1: TRACK SELECTION WINDOWS */}
      {activeSubTab === 'windows' && (
        <form onSubmit={handleSaveSchedule} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="text-amber-500" size={20} />
                Track Selection Period & Support Contact for Batch {formSchedule.batch_year}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Students can freely choose and switch tracks during this window. Outside this window, track selection is locked.</p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 font-extrabold text-xs rounded-xl border border-amber-200">
              Editing Batch {formSchedule.batch_year}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Selection Window Start</label>
              <input
                type="datetime-local"
                value={formSchedule.track_selection_start ? formSchedule.track_selection_start.slice(0, 16) : ''}
                onChange={(e) => setFormSchedule({ ...formSchedule, track_selection_start: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Selection Window End</label>
              <input
                type="datetime-local"
                value={formSchedule.track_selection_end ? formSchedule.track_selection_end.slice(0, 16) : ''}
                onChange={(e) => setFormSchedule({ ...formSchedule, track_selection_end: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Lockout Support Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="email"
                  value={formSchedule.contact_email || ''}
                  onChange={(e) => setFormSchedule({ ...formSchedule, contact_email: e.target.value })}
                  placeholder="support.cdc@hitam.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              When students attempt to change tracks outside of the active selection window, they will be presented with a lockout notice informing them that track selection for the semester has ended, along with the designated support contact email.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              Save Track Window Settings
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: ACADEMIC SCHEDULES */}
      {activeSubTab === 'schedules' && (
        <form onSubmit={handleSaveSchedule} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} />
                Academic Years & Semester Timelines for Batch {formSchedule.batch_year}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Define start and end dates for Academic Years (Years 1-4) and active semesters.</p>
            </div>
          </div>

          {/* Academic Years 1-4 Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Academic Year Timelines</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((yr) => (
                <div key={yr} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="font-extrabold text-xs text-slate-900 border-b border-slate-200 pb-2">Academic Year {yr}</div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formSchedule[`year_${yr}_start`] || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, [`year_${yr}_start`]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formSchedule[`year_${yr}_end`] || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, [`year_${yr}_end`]: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semesters 1 & 2 */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Semester Schedules</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="font-extrabold text-xs text-blue-900 border-b border-blue-200 pb-2">Semester 1 (Odd Sem)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 mb-1">Sem 1 Start</label>
                    <input
                      type="date"
                      value={formSchedule.sem_1_start || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, sem_1_start: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 mb-1">Sem 1 End</label>
                    <input
                      type="date"
                      value={formSchedule.sem_1_end || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, sem_1_end: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                <div className="font-extrabold text-xs text-emerald-900 border-b border-emerald-200 pb-2">Semester 2 (Even Sem)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 mb-1">Sem 2 Start</label>
                    <input
                      type="date"
                      value={formSchedule.sem_2_start || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, sem_2_start: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 mb-1">Sem 2 End</label>
                    <input
                      type="date"
                      value={formSchedule.sem_2_end || ''}
                      onChange={(e) => setFormSchedule({ ...formSchedule, sem_2_end: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl shadow-md cursor-pointer transition-all"
            >
              Save Academic Timeline
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: PROMOTIONS & ALUMNI */}
      {activeSubTab === 'promotion' && (
        <div className="space-y-6">
          {/* Automated Promotion Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1 max-w-2xl">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="text-emerald-600" size={22} />
                Batch Academic Promotion & Alumni Tagging Engine
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Evaluates student academic timelines based on joining year and graduation year. Students finishing Year 1, 2, or 3 are promoted to the next year. Students completing Year 4 are tagged as <strong>Alumni</strong>.
              </p>
            </div>

            <button
              onClick={handleRunPromotion}
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0 transition-all"
            >
              <RefreshCw size={16} />
              <span>Run Promotion Check Now</span>
            </button>
          </div>

          {/* Batch Lifecycle Data Operations Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Batch Lifecycle Management & Data Exports</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Export complete batch performance & track choices to Excel (.xlsx) before performing any database purges.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                    <th className="py-3.5 px-6">Batch Year</th>
                    <th className="py-3.5 px-6">Support Contact</th>
                    <th className="py-3.5 px-6">Track Window</th>
                    <th className="py-3.5 px-6 text-right">Data Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {schedules.map((s) => (
                    <tr key={s.batch_year} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        Batch {s.batch_year}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {s.contact_email}
                      </td>
                      <td className="py-4 px-6">
                        {s.track_selection_end ? (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                            Ends {new Date(s.track_selection_end).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
                        <button
                          onClick={() => handleExportXlsx(s.batch_year)}
                          disabled={isExporting}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl border border-emerald-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FileSpreadsheet size={14} />
                          <span>Download .xlsx</span>
                        </button>

                        {user?.role === 'super_admin' && (
                          <button
                            onClick={() => handleDeleteBatch(s.batch_year)}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl border border-rose-200 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Delete Batch Data</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: TRACK AUDIT LOGS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Search className="text-blue-600" size={20} />
                Student Track Selection Audit History
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time log of student track modifications used for analyzing selection patterns and preferences.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by Roll No or Name..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Previous Track</th>
                  <th className="py-3 px-4">New Selected Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">No track audit records found.</td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{log.student_name || 'Student'}</td>
                      <td className="py-3 px-4 text-slate-600">{log.batch_year}</td>
                      <td className="py-3 px-4 text-slate-500 italic">{log.previous_track_id || 'None'}</td>
                      <td className="py-3 px-4 font-extrabold text-blue-600 flex items-center gap-1">
                        <ArrowRight size={12} className="text-blue-400" />
                        {log.new_track_id || 'Uncommitted'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW BATCH MODAL */}
      {showNewBatchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Create New Admission Batch</h3>
              <button onClick={() => setShowNewBatchModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateNewBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Batch Academic Years</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-2030"
                  value={newBatchYear}
                  onChange={(e) => setNewBatchYear(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-blue-500 outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Enter the 4-year range for incoming admissions.</p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 cursor-pointer"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackBatchControlPanel;
