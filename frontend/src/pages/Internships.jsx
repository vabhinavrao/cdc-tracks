// src/pages/Internships.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Briefcase, FileText, CheckCircle2, AlertTriangle, ShieldAlert,
  Calendar, Building, MapPin, DollarSign, Mail, Phone, User, 
  Info, ChevronRight, Clock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Internships = ({ user }) => {
  const [activeSubSection, setActiveSubSection] = useState('policies'); // 'policies' | 'form'
  const [policyTab, setPolicyTab] = useState('eligibility'); // 'eligibility' | 'attendance' | 'roles'
  
  const [studentInfo, setStudentInfo] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    phone_number: '',
    section: '',
    company_name: '',
    company_website: '',
    internship_obtained_through: 'On-Campus',
    internship_domain: '',
    internship_mode: 'Offline',
    start_date: '',
    end_date: '',
    total_duration: '',
    internship_location: '',
    stipend: '',
    ppo_offered: 'No',
    expected_ctc: '',
    spoc_name: '',
    spoc_designation: '',
    spoc_email: '',
    spoc_phone: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [agreedToUndertaking, setAgreedToUndertaking] = useState(false);

  useEffect(() => {
    fetchInternshipData();
  }, [user]);

  const fetchInternshipData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = user?.email || '';
      const res = await axios.get(`${API_URL}/api/student/internship-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStudentInfo(res.data.student);
      
      if (res.data.existing_request) {
        const req = res.data.existing_request;
        setExistingRequest(req);
        setFormData({
          phone_number: req.phone_number || '',
          section: req.section || '',
          company_name: req.company_name || '',
          company_website: req.company_website || '',
          internship_obtained_through: req.internship_obtained_through || 'On-Campus',
          internship_domain: req.internship_domain || '',
          internship_mode: req.internship_mode || 'Offline',
          start_date: req.start_date || '',
          end_date: req.end_date || '',
          total_duration: req.total_duration || '',
          internship_location: req.internship_location || '',
          stipend: req.stipend || '',
          ppo_offered: req.ppo_offered || 'No',
          expected_ctc: req.expected_ctc || '',
          spoc_name: req.spoc_name || '',
          spoc_designation: req.spoc_designation || '',
          spoc_email: req.spoc_email || '',
          spoc_phone: req.spoc_phone || ''
        });
        setAgreedToUndertaking(true);
      } else {
        // Pre-fill student phone from performance database
        setFormData(prev => ({
          ...prev,
          phone_number: res.data.student.auto_phone || ''
        }));
      }
    } catch (err) {
      console.error('Failed to load internship details:', err);
      setError('Could not retrieve your internship profile details from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!agreedToUndertaking) {
      setSubmitError('You must read and agree to the Student Undertaking clauses before submitting.');
      return;
    }
    
    setSubmitting(true);
    setSubmitSuccess('');
    setSubmitError('');
    
    try {
      const token = user?.email || '';
      const res = await axios.post(`${API_URL}/api/student/apply-internship`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitSuccess(res.data.message || 'Application submitted successfully!');
      fetchInternshipData();
      setActiveSubSection('policies');
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Submit application error:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to submit internship application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-semibold text-sm">Loading internship workstation...</p>
      </div>
    );
  }

  const cdcBand = studentInfo?.cdc_band || 'Unassigned';
  const hasBandEligibility = cdcBand.toUpperCase() === 'A' || cdcBand.toUpperCase() === 'B';
  const isCDBand = cdcBand.toUpperCase() === 'C' || cdcBand.toUpperCase() === 'D';

  return (
    <div className="py-6 space-y-8 animate-fade-in text-left">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full">
              Student Internship Workstation
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">
              Internship Application & Policies
            </h1>
            <p className="text-indigo-100 text-sm md:text-base mt-2 max-w-xl">
              Browse standard operating procedures, check your eligibility status, and submit internship requests.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 text-center sm:text-left">
            <span className="text-xs text-indigo-200 block font-bold uppercase">CDC Performance Band</span>
            <span className={`text-2xl font-black block tracking-tight mt-0.5 px-3 py-0.5 rounded-lg text-center ${
              cdcBand === 'A' ? 'bg-emerald-600' : cdcBand === 'B' ? 'bg-blue-600' : cdcBand === 'C' ? 'bg-amber-600' : 'bg-rose-600'
            }`}>
              Band {cdcBand}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid with Sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 py-2">Navigation</div>
            
            <button
              onClick={() => setActiveSubSection('policies')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSubSection === 'policies' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText size={18} />
                <span>Internship Policies</span>
              </div>
              <ChevronRight size={16} className={activeSubSection === 'policies' ? 'text-indigo-600' : 'text-slate-400'} />
            </button>

            <button
              onClick={() => setActiveSubSection('form')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSubSection === 'form' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase size={18} />
                <span>Application Form</span>
              </div>
              <ChevronRight size={16} className={activeSubSection === 'form' ? 'text-indigo-600' : 'text-slate-400'} />
            </button>
          </div>

          {/* Quick Eligibility Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Eligibility Status
            </h4>
            {isCDBand ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Department Review Required</span>
                </div>
                <p className="leading-relaxed">
                  As you are in CDC <strong>Band {cdcBand}</strong>, your application will require endorsement and custom comments from your department HOD before CDC final approval.
                </p>
              </div>
            ) : hasBandEligibility ? (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Direct Application Eligible</span>
                </div>
                <p className="leading-relaxed">
                  As you are in CDC <strong>Band {cdcBand}</strong>, you can apply directly to the CDC for immediate processing.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                  <span>Not Eligible (Band {cdcBand})</span>
                </div>
                <p className="leading-relaxed">
                  According to the SOP guidelines, students with CDC Band {cdcBand} are generally not eligible for off-campus internships. Contact CDC for advice.
                </p>
              </div>
            )}
            
            {existingRequest && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Current Request:</span>
                  <span className={`px-2 py-0.5 rounded-full font-extrabold capitalize ${
                    existingRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    existingRequest.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                    existingRequest.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {existingRequest.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3">
          
          {/* Action result banners */}
          {submitSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* SECTION 1: POLICIES VIEW */}
          {activeSubSection === 'policies' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
              
              {/* Policies Tabs */}
              <div className="flex border-b border-slate-100 pb-3 gap-4 overflow-x-auto">
                <button
                  onClick={() => setPolicyTab('eligibility')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    policyTab === 'eligibility' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Eligibility Guidelines
                </button>
                <button
                  onClick={() => setPolicyTab('attendance')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    policyTab === 'attendance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Academic Regulations
                </button>
                <button
                  onClick={() => setPolicyTab('roles')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    policyTab === 'roles' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Responsibilities & Documents
                </button>
              </div>

              {/* Policy Content Blocks */}
              {policyTab === 'eligibility' && (
                <div className="space-y-6 animate-fade-in text-slate-700">
                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900">1. Student General Eligibility</h3>
                    <p className="text-sm leading-relaxed">
                      Internships are categorized by academic semesters to guarantee curriculum compliance and learning quality:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <span className="font-extrabold text-indigo-600 block mb-1">2nd Year (1st & 2nd Sem)</span>
                        <span className="font-bold text-slate-800">In-house Internships Only</span>
                        <p className="text-slate-500 mt-2 leading-relaxed">Eligible only for Live/Inhouse Projects. Must report daily to Class Teacher.</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <span className="font-extrabold text-indigo-600 block mb-1">3rd Year (1st Sem)</span>
                        <span className="font-bold text-slate-800">Inhouse & MOU Partner Companies</span>
                        <p className="text-slate-500 mt-2 leading-relaxed">Permitted to work on-site with organizations having active MOUs with HITAM.</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <span className="font-extrabold text-indigo-600 block mb-1">3rd Year 2nd Sem & Final Year</span>
                        <span className="font-bold text-slate-800">Full Off-Campus / On-Campus</span>
                        <p className="text-slate-500 mt-2 leading-relaxed">Eligible for external internships subject to CDC and department HOD approvals.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900">2. Duration & Band Eligibility Matrix</h3>
                    <p className="text-sm leading-relaxed">
                      Your permissible internship duration and approval flow depends strictly on your academic standing (SPF Band) and Career Design Center performance (CDC Band):
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-500 uppercase">
                            <th className="p-3">SPF Band</th>
                            <th className="p-3">CDC Band</th>
                            <th className="p-3">Permissible Duration</th>
                            <th className="p-3">Policy & Approvals</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          <tr>
                            <td className="p-3 font-extrabold text-blue-600">A</td>
                            <td className="p-3 font-extrabold text-blue-600">A</td>
                            <td className="p-3 font-bold text-slate-700">3-6 Months</td>
                            <td className="p-3 text-slate-500 text-[11px]">Eligible. Direct application to CDC.</td>
                          </tr>
                          <tr className="bg-indigo-50/10">
                            <td className="p-3 font-extrabold text-blue-600">A/B</td>
                            <td className="p-3 font-extrabold text-blue-600">B/A</td>
                            <td className="p-3 font-bold text-slate-700">3-6 Months</td>
                            <td className="p-3 text-slate-500 text-[11px]">Eligible. Direct application to CDC.</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-extrabold text-blue-600">A</td>
                            <td className="p-3 font-extrabold text-amber-600">C/D</td>
                            <td className="p-3 font-bold text-slate-700">3 Months Max</td>
                            <td className="p-3 text-amber-700 text-[11px] font-semibold bg-amber-50/20">Subject to Departmental endorsement.</td>
                          </tr>
                          <tr className="bg-indigo-50/10">
                            <td className="p-3 font-extrabold text-blue-600">B</td>
                            <td className="p-3 font-extrabold text-blue-600">B</td>
                            <td className="p-3 font-bold text-slate-700">3 Months (Extendable)</td>
                            <td className="p-3 text-slate-500 text-[11px]">Standard Policy. Extendable based on Mentor & HOD feedback.</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-extrabold text-blue-600">B</td>
                            <td className="p-3 font-extrabold text-amber-600">C/D</td>
                            <td className="p-3 font-bold text-slate-700">3 Months Max</td>
                            <td className="p-3 text-amber-700 text-[11px] font-semibold bg-amber-50/20">Subject to review & Department endorsement.</td>
                          </tr>
                          <tr className="bg-indigo-50/10">
                            <td className="p-3 font-extrabold text-amber-600">C/D</td>
                            <td className="p-3 font-extrabold text-blue-600">A/B</td>
                            <td className="p-3 font-bold text-slate-700">3 Months Max</td>
                            <td className="p-3 text-amber-700 text-[11px] font-semibold bg-amber-50/20">To be endorsed and closely monitored by Department.</td>
                          </tr>
                          <tr className="bg-rose-50/25">
                            <td className="p-3 font-extrabold text-rose-600">C/D</td>
                            <td className="p-3 font-extrabold text-rose-600">C/D</td>
                            <td className="p-3 font-black text-rose-600">0 Months</td>
                            <td className="p-3 text-rose-700 text-[11px] font-bold bg-rose-50/50">Not Eligible. Must improve CDC scores first.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
                    <span className="font-extrabold text-slate-800 block">Band Application Rules:</span>
                    <p>• <strong>Band A / B</strong> students can apply directly using the form, with the request moving straight to CDC verification.</p>
                    <p>• <strong>Band C / D</strong> student applications require special remarks and clearance from their academic departments prior to CDC final approval.</p>
                  </div>
                </div>
              )}

              {policyTab === 'attendance' && (
                <div className="space-y-6 animate-fade-in text-slate-700">
                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Academic & Attendance Regulations</h3>
                    <p className="text-sm leading-relaxed">
                      Maintaining good academic standing is mandatory. Students who bypass academic and attendance guidelines face disciplinary action and cancellation of internship permission.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-9 w-9 flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-slate-900 text-sm">CIE & SEE Exams</h4>
                        <p className="text-slate-500 mt-1 leading-relaxed">
                          Students are required to attend all Continuous Internal Evaluation (CIE) assessments and Semester End Examinations (SEE) according to the schedules issued by the exam section.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-9 w-9 flex items-center justify-center shrink-0">
                        <Clock size={18} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-slate-900 text-sm">Saturday Mandatory Attendance</h4>
                        <p className="text-slate-500 mt-1 leading-relaxed">
                          For students doing 5-day working internships, it is mandatory to attend academic classes in person on Saturdays to keep up with curriculum standards.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-9 w-9 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-slate-900 text-sm">Monthly Progress Reporting</h4>
                        <p className="text-slate-500 mt-1 leading-relaxed">
                          Students must submit Monthly Progress Reports in the form of presentations to the PRC (Project Review Committee) and HOD on the last Saturday of every month.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {policyTab === 'roles' && (
                <div className="space-y-6 animate-fade-in text-slate-700">
                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Student Roles & Code of Conduct</h3>
                    <ul className="list-disc pl-5 text-sm space-y-2 leading-relaxed">
                      <li>Submit complete internship applications with official Offer Letters at least 15 days before commencement.</li>
                      <li>Maintain high standards of discipline, professional ethics, and conduct at the hosting company.</li>
                      <li>Strictly adhere to the company's working hours, rules, policies, and NDA guidelines.</li>
                      <li>Keep regular communication active with your Department Mentor, Program Head, and CDC Team.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Mandatory Submission Checklist (Upon Completion)</h3>
                    <p className="text-sm">
                      For academic credits and validation, the following documents must be submitted on completion:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {[
                        "1. Internship Completion Certificate",
                        "2. Copy of Offer Letter / Confirmation",
                        "3. Approved Monthly Progress Reports",
                        "4. Detailed Final Project Report",
                        "5. PPO details & Expected CTC (if applicable)",
                        "6. Performance Feedback Form from Company Mentor"
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-800">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveSubSection('form')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <span>Proceed to Application Form</span>
                  <ChevronRight size={16} />
                </button>
              </div>

            </div>
          )}

          {/* SECTION 2: FORM VIEW */}
          {activeSubSection === 'form' && (
            <div className="space-y-6">
              
              {/* Request Status Banners */}
              {existingRequest && (
                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold ${
                  existingRequest.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  existingRequest.status === 'contacted' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                  existingRequest.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold uppercase">Application Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-black capitalize text-[10px] ${
                        existingRequest.status === 'approved' ? 'bg-emerald-600 text-white' :
                        existingRequest.status === 'contacted' ? 'bg-blue-600 text-white' :
                        existingRequest.status === 'rejected' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {existingRequest.status}
                      </span>
                    </div>
                    {existingRequest.admin_notes ? (
                      <p className="text-slate-700 font-medium pt-1">
                        <strong className="text-slate-900 block font-bold">Feedback / Remarks:</strong>
                        "{existingRequest.admin_notes}"
                      </p>
                    ) : (
                      <p className="text-slate-500 font-normal">Your request is currently awaiting review by the CDC and your Department.</p>
                    )}
                  </div>
                  {existingRequest.status === 'contacted' && (
                    <span className="shrink-0 px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-800 font-bold rounded-lg text-center animate-pulse">
                      Update details below
                    </span>
                  )}
                </div>
              )}

              {/* Form Block */}
              <form onSubmit={handleSubmitForm} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
                
                {/* SECTION A: Student Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User size={18} className="text-indigo-600" />
                    Section A: Student Details (Auto-filled)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                      <input 
                        type="text" 
                        value={studentInfo?.name || ''} 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Roll Number</label>
                      <input 
                        type="text" 
                        value={studentInfo?.roll_number || ''} 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Branch / Department</label>
                      <input 
                        type="text" 
                        value={studentInfo?.branch || ''} 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email ID</label>
                      <input 
                        type="text" 
                        value={studentInfo?.email || ''} 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Academic Year</label>
                      <input 
                        type="text" 
                        value={`${studentInfo?.current_year || 3}rd Year`} 
                        readOnly 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Section <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="section"
                        required
                        placeholder="e.g. A, B, C or CSM-A"
                        value={formData.section}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Mobile / Phone Number <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="phone_number"
                        required
                        placeholder="10-digit mobile number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION B: Internship Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Briefcase size={18} className="text-indigo-600" />
                    Section B: Internship Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Company Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="company_name"
                        required
                        placeholder="e.g. Google India"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Company Website</label>
                      <input 
                        type="url" 
                        name="company_website"
                        placeholder="https://company.com"
                        value={formData.company_website}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Internship Obtained Through</label>
                      <select 
                        name="internship_obtained_through"
                        value={formData.internship_obtained_through}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500 bg-white bg-[image:none]"
                      >
                        <option value="On-Campus">On-Campus Placement Drive</option>
                        <option value="Off-Campus">Off-Campus Application</option>
                        <option value="CDC-Facilitated">CDC-Facilitated Opportunity</option>
                        <option value="MOU-Partner">MOU-Partner Collaboration</option>
                        <option value="Self-Referral">Self Referral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Internship Domain / Role <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        name="internship_domain"
                        required
                        placeholder="e.g. Full Stack Developer Intern"
                        value={formData.internship_domain}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Internship Mode</label>
                      <select 
                        name="internship_mode"
                        value={formData.internship_mode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500 bg-white bg-[image:none]"
                      >
                        <option value="Offline">Offline (On-Site)</option>
                        <option value="Online">Online (Remote)</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Duration Description</label>
                      <input 
                        type="text" 
                        name="total_duration"
                        placeholder="e.g. 3 Months / 6 Months"
                        value={formData.total_duration}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                      <input 
                        type="date" 
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                      <input 
                        type="date" 
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Internship Location / Address</label>
                      <input 
                        type="text" 
                        name="internship_location"
                        placeholder="e.g. Gachibowli, Hyderabad"
                        value={formData.internship_location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Stipend per Month (INR)</label>
                      <input 
                        type="text" 
                        name="stipend"
                        placeholder="e.g. 15,000 or Unpaid"
                        value={formData.stipend}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">PPO Offered?</label>
                      <select 
                        name="ppo_offered"
                        value={formData.ppo_offered}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500 bg-white bg-[image:none]"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                        <option value="Conditional">Conditional / Performance-based</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Expected CTC after PPO (LPA)</label>
                      <input 
                        type="text" 
                        name="expected_ctc"
                        placeholder="e.g. 4.5 LPA"
                        value={formData.expected_ctc}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION C: Company SPOC Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building size={18} className="text-indigo-600" />
                    Section C: Company SPOC (Single Point of Contact) Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">SPOC Name</label>
                      <input 
                        type="text" 
                        name="spoc_name"
                        placeholder="e.g. John Doe"
                        value={formData.spoc_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Designation</label>
                      <input 
                        type="text" 
                        name="spoc_designation"
                        placeholder="e.g. HR Manager"
                        value={formData.spoc_designation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">SPOC Email</label>
                      <input 
                        type="email" 
                        name="spoc_email"
                        placeholder="hr@company.com"
                        value={formData.spoc_email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Contact Number</label>
                      <input 
                        type="text" 
                        name="spoc_phone"
                        placeholder="SPOC Phone Number"
                        value={formData.spoc_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-880 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section D: Student Undertaking Clauses */}
                <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Info size={16} className="text-indigo-600 animate-pulse" />
                    Student Undertaking & Agreement
                  </h4>
                  
                  <div className="text-xs text-slate-600 space-y-2 leading-relaxed text-left font-medium">
                    <p>1. I understand that the approval of this internship request is subject to institutional norms, academic compliance, and active Career Design Center guidelines.</p>
                    <p>2. I undertake to maintain regular attendance, professional behavior, and high work ethics throughout the duration of this internship.</p>
                    <p>3. I shall report and coordinate with my Faculty Mentor weekly and submit Monthly Progress Presentations to the PRC on the last Saturday of every month.</p>
                    <p>4. I agree that any violation of company rules, NDA policies, or college regulations may result in immediate cancellation of my internship approvals and academic penalties.</p>
                  </div>

                  <div className="pt-4 flex items-start gap-2.5">
                    <input 
                      type="checkbox" 
                      id="undertaking-check"
                      checked={agreedToUndertaking}
                      onChange={(e) => setAgreedToUndertaking(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="undertaking-check" className="text-xs font-extrabold text-slate-880 cursor-pointer select-none">
                      I have read, understood, and agree to follow all the clauses of the HITAM student internship undertaking.
                    </label>
                  </div>
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-3">
                    <ShieldAlert className="text-rose-600" size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveSubSection('policies')}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    View Policies
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Internships;
