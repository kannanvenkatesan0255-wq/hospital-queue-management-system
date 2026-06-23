import React, { useState } from 'react';
import { Patient, Doctor, QueueSettings, AnalyticsSummary, Priority } from '../types';
import { api } from '../services/api';
import {
  Users,
  Activity,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserMinus,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Settings,
  X,
  TrendingUp,
  TrendingDown,
  Monitor,
  HeartPulse
} from 'lucide-react';

interface ReceptionControlProps {
  patients: Patient[];
  doctors: Doctor[];
  settings: QueueSettings;
  analytics: AnalyticsSummary;
  onRefresh: () => void;
}

export function ReceptionControl({ patients, doctors, settings, analytics, onRefresh }: ReceptionControlProps) {
  // New Patient Form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');

  // New Doctor Form State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('General Medicine');
  const [newDocRoom, setNewDocRoom] = useState('');
  const [newDocAvgTime, setNewDocAvgTime] = useState('10');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Form Submission errors
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill first doctor if exists
  React.useEffect(() => {
    if (doctors.length > 0 && !doctorId) {
      setDoctorId(doctors[0].id);
    }
  }, [doctors, doctorId]);

  // Handle patient admission form submission
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!name.trim() || !age || !phone.trim() || !doctorId) {
      setSubmitError('Please fill out all required fields: Name, Age, Phone, and Assigned Doctor.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPatient({
        name,
        age: Number(age),
        gender,
        phone,
        doctorId,
        reason: reason || 'General check-up',
        priority,
      });

      // Reset Form fields
      setName('');
      setAge('');
      setGender('Male');
      setPhone('');
      setReason('');
      setPriority('normal');
      onRefresh();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to admit patient and issue token');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a doctor to roster
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocRoom) return;

    try {
      await api.createDoctor({
        name: newDocName,
        specialty: newDocSpecialty,
        room: newDocRoom,
        avgConsultationMinutes: Number(newDocAvgTime),
      });
      setNewDocName('');
      setNewDocRoom('');
      setNewDocAvgTime('10');
      setShowDoctorModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Skip, complete, cancel, reset actions
  const handleActionCallNext = async (docId: string) => {
    try {
      await api.callNext(docId);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'No patients waiting for this physician.');
    }
  };

  const handleActionSkip = async (patId: string) => {
    try {
      await api.skipPatient(patId);
      onRefresh();
    } catch (error) {
      console.error(error);
    }
  };

  const handleActionComplete = async (patId: string) => {
    try {
      await api.completeConsultation(patId);
      onRefresh();
    } catch (error) {
      console.error(error);
    }
  };

  const handleActionCancel = async (patId: string) => {
    if (confirm('Are you sure you want to cancel and delete this diagnostic token code?')) {
      try {
        await api.cancelToken(patId);
        onRefresh();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleResetQueue = async () => {
    if (confirm('⚠️ WARNING: This will immediately archive, cancel, and clear the active clinic queue. Are you sure you want to reset?')) {
      try {
        await api.resetQueue();
        onRefresh();
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Apply search & filter filters
  const filteredPatients = patients.filter((pat) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      pat.name.toLowerCase().includes(q) ||
      pat.tokenNumber.toLowerCase().includes(q) ||
      pat.phone.includes(q) ||
      pat.doctorName.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || pat.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || pat.priority === priorityFilter;

    // Filter to show today's clinic tickets
    const matchesToday = new Date(pat.createdAt).toDateString() === new Date().toDateString();

    return matchesToday && matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-8 pb-12 text-[#111827]">
      
      {/* 1. TOP TELEMETRY METRIC WIDGETS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-[#2563EB]/10 text-[#2563EB] rounded-lg">
              <Users size={16} />
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingDown size={10} /> -8%
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">{analytics.patientsWaiting}</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Patients Waiting</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-[#14B8A6]/10 text-[#14B8A6] rounded-lg">
              <Activity size={16} />
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">Active</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black truncate">{analytics.currentServingToken || '--'}</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Current Serving</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <CheckCircle size={16} />
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">{analytics.patientsServedToday}</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Patients Served</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <TrendingUp size={16} />
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold uppercase font-mono">Prediction</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black font-mono">{analytics.averageWaitTimeMinutes}m</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Avg Wait Time</p>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-lg">
              <TrendingUp size={16} />
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Optimal</span>
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">{analytics.efficiencyPercent}%</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Queue Efficiency</p>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-start">
            <span className="p-1.5 bg-[#2563EB]/10 text-[#2563EB] rounded-lg animate-pulse">
              <HeartPulse size={16} />
            </span>
            <span className="text-[10px] text-[#6B7280] font-semibold uppercase font-mono">Roster</span>
          </div>
          <div className="mt-2.5 text-slate-800">
            <p className="text-2xl font-black">{analytics.activeDoctorsCount}/{doctors.length}</p>
            <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Active Doctors</p>
          </div>
        </div>

      </div>

      {/* 2. ADMIT PASSENGER FORM / DOCTOR ROOM QUICK ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Forms: Add to Queue */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs space-y-6 h-fit">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h2 className="font-bold text-sm text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2563EB]" /> Patient Admission Register
            </h2>
            <span className="text-[10px] bg-blue-50 text-[#2563EB] font-bold px-2 py-0.5 rounded-full font-mono uppercase">
              Token Auto
            </span>
          </div>

          <form onSubmit={handleAddPatient} className="space-y-4">
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Patient Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clara Oswald"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white text-semibold transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Age*</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  placeholder="Aet"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all font-semibold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Phone Number*</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 555-0192"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all font-mono font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Assign Physician Doctor*</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all font-semibold"
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialty} - {doc.room})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Medical Complaint / Reason</label>
              <input
                type="text"
                placeholder="e.g. Cough evaluation, hypertension check..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            {/* Priority Flags */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Priority Classification</label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'urgent', 'emergency'] as const).map((lvl) => {
                  const isActive = priority === lvl;
                  const borderCol = lvl === 'emergency' 
                    ? 'border-rose-400 bg-rose-50 text-rose-700 font-bold' 
                    : lvl === 'urgent' 
                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-bold' 
                      : 'border-emerald-400 bg-emerald-50 text-emerald-700 font-bold';

                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`py-2 rounded-xl text-[10px] uppercase tracking-wide font-bold border transition p-1 cursor-pointer text-center ${
                        isActive 
                          ? borderCol 
                          : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-rose-500 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow hover:scale-[1.01]"
            >
              <Plus size={14} /> Issue Token Ticket
            </button>
          </form>
        </div>

        {/* Right Section: Doctors Room map inside receptionist tab */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#14B8A6]" /> Physician Quick Control Hub
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDoctorModal(true)}
                className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                + Add Doctor
              </button>

              <button
                onClick={handleResetQueue}
                className="text-xs font-semibold px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={13} /> Clear Board
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-1">
            {doctors.map((doc) => {
              const docPatients = patients.filter((p) => p.doctorId === doc.id && p.status === 'waiting');
              const sortedPatients = [...docPatients].sort((a,b) => {
                const map = { emergency:3, urgent:2, normal:1 };
                return map[b.priority] - map[a.priority];
              });
              const nextPatient = sortedPatients[0];

              return (
                <div key={doc.id} className="border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{doc.room}</span>
                      <h4 className="font-bold text-xs text-[#111827]">{doc.name}</h4>
                      <p className="text-[10px] text-[#14B8A6] font-semibold">{doc.specialty}</p>
                    </div>

                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      doc.availability === 'active'
                        ? 'bg-emerald-100/70 text-emerald-800'
                        : doc.availability === 'on-break'
                          ? 'bg-amber-100/70 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                    }`}>
                      {doc.availability}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-[10px] space-y-1">
                    <div className="flex justify-between text-[#6B7280]">
                      <span>Queued waiting:</span>
                      <strong className="text-[#111827]">{docPatients.length}</strong>
                    </div>
                    <div className="flex justify-between text-[#6B7280]">
                      <span>Now consulting:</span>
                      <strong className="font-mono text-[#2563EB]">{doc.currentPatientToken || 'VACANT'}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleActionCallNext(doc.id)}
                    disabled={docPatients.length === 0}
                    className="w-full bg-[#14B8A6] hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-bold text-[10px] uppercase tracking-wide text-white py-2 rounded-xl transition cursor-pointer"
                  >
                    Call Next Token {nextPatient ? `(${nextPatient.tokenNumber})` : ''}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>System: Auto Token issuer (emergency prefix E, urgent U, normal A)</span>
            <span className="font-semibold text-[#14B8A6]">Global Clock Active</span>
          </div>

        </div>

      </div>

      {/* 3. PATIENT QUEUE MONITOR WITH ADAPTED FILTERS & SEARCH */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Search header & filter bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="font-bold text-sm text-[#111827] uppercase tracking-wider">Admitted Tokens Register</h3>
            <p className="text-xs text-[#6B7280]">Real-time auditing files for today's active admissions</p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search phone, token, nurse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-[#E5E7EB] text-[#111827] pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[#2563EB] focus:bg-white w-full sm:w-[220px] transition font-medium"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-[#E5E7EB] text-[#111827] px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition"
              >
                <option value="all">All statuses</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="in-consultation">Consulting</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-[#E5E7EB] text-[#111827] px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition"
              >
                <option value="all">All levels</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table Grid */}
        <div className="overflow-x-auto">
          {filteredPatients.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-[#E5E7EB] text-xs text-[#6B7280]">
              No patients admitted matching your lookups.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#6B7280] font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket Token</th>
                  <th className="py-3 px-4">Patient details</th>
                  <th className="py-3 px-4">Doctor assigned</th>
                  <th className="py-3 px-4">Priority level</th>
                  <th className="py-3 px-4">Time admitted</th>
                  <th className="py-3 px-4">Workflow status</th>
                  <th className="py-3 px-4 text-right">Emergency Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredPatients.map((pat) => {
                  const isWaiting = pat.status === 'waiting';
                  const isCalled = pat.status === 'called';
                  const priorityBg = pat.priority === 'emergency'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : pat.priority === 'urgent'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const badgeStatusColor = pat.status === 'waiting'
                    ? 'bg-amber-100 text-amber-800'
                    : pat.status === 'called' || pat.status === 'in-consultation'
                      ? 'bg-pink-100 text-pink-800 font-bold'
                      : pat.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 font-semibold'
                        : 'bg-slate-100 text-slate-800';

                  return (
                    <tr key={pat.id} className="hover:bg-slate-50/75 transition duration-150">
                      
                      {/* Ticket */}
                      <td className="py-3.5 px-4 font-mono font-black text-white bg-[#111827] w-14 text-center rounded-lg select-all my-2 inline-block">
                        {pat.tokenNumber}
                      </td>

                      {/* Name / Phone */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#111827]">{pat.name}</p>
                        <p className="text-[10px] text-[#6B7280]">
                          {pat.age}y {pat.gender} • <strong className="font-mono">{pat.phone}</strong>
                        </p>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#111827]">{pat.doctorName}</p>
                        <p className="text-[10px] text-teal-600 font-semibold">{pat.reason}</p>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded border font-bold ${priorityBg}`}>
                          {pat.priority}
                        </span>
                      </td>

                      {/* Admission */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-[#6B7280]">
                        {new Date(pat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wide px-2.5 py-1 rounded-full ${badgeStatusColor}`}>
                          {pat.status === 'in-consultation' ? 'Consulting' : pat.status}
                        </span>
                      </td>

                      {/* Emergency Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isWaiting && (
                            <button
                              onClick={() => handleActionCallNext(pat.doctorId)}
                              className="text-[10px] uppercase tracking-wide font-bold font-mono px-2.5 py-1.5 bg-[#14B8A6]/10 text-[#14B8A6] rounded-lg border border-[#14B8A6]/20 hover:bg-[#14B8A6] hover:text-white transition cursor-pointer"
                            >
                              Call Now
                            </button>
                          )}

                          {isCalled && (
                            <>
                              <button
                                onClick={() => handleActionComplete(pat.id)}
                                className="text-[10px] uppercase font-bold px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => handleActionSkip(pat.id)}
                                className="text-[10px] uppercase font-bold px-2.5 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 hover:bg-[#F59E0B] hover:text-white transition cursor-pointer"
                              >
                                Skip
                              </button>
                            </>
                          )}

                          {pat.status !== 'completed' && pat.status !== 'cancelled' && (
                            <button
                              onClick={() => handleActionCancel(pat.id)}
                              className="text-[10px] p-2 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition border border-transparent hover:border-rose-100"
                              title="Cancel Ticket"
                            >
                              <UserMinus size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* 4. DOCTOR MODAL BLOCK */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-[#111827]/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E5E7EB] shadow-2xl relative">
            <button
              onClick={() => setShowDoctorModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 bg-slate-50 border rounded-lg cursor-pointer"
            >
              <X size={15} />
            </button>

            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-4 flex items-center gap-1">
              Add New Physician Doctor
            </h3>

            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Pendragon"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl font-semibold text-[#111827] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Specialty specialty</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Neurology, Cardiology..."
                  value={newDocSpecialty}
                  onChange={(e) => setNewDocSpecialty(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl font-semibold text-[#111827] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Consultation Room</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 105"
                    value={newDocRoom}
                    onChange={(e) => setNewDocRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl font-semibold text-[#111827] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Avg Duration (Mins)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    required
                    value={newDocAvgTime}
                    onChange={(e) => setNewDocAvgTime(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl font-mono font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#2563EB] text-white py-3 rounded-xl text-xs font-bold cursor-pointer transition shadow"
              >
                Register & Save Doctor
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
