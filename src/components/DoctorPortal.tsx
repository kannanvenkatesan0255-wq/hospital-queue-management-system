import React, { useState, useEffect } from 'react';
import { Doctor, Patient } from '../types';
import { api } from '../services/api';
import { Stethoscope, User, HelpCircle, Users, Activity, Play, CheckCircle2, ChevronRight, RefreshCw, LogIn, Clock, AlertTriangle } from 'lucide-react';

interface DoctorPortalProps {
  doctors: Doctor[];
  patients: Patient[];
  onRefresh: () => void;
}

export function DoctorPortal({ doctors, patients, onRefresh }: DoctorPortalProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [consultingTime, setConsultingTime] = useState(10);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Auto-track the time since patient was called to help doctor input exact consultation minutes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      interval = setInterval(() => {
        setSessionTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionTimer(0);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const activeDoc = doctors.find((d) => d.id === selectedDocId);

  // Find current called patient for selected doctor
  const currentPatient = activeDoc?.currentPatientToken 
    ? patients.find((p) => p.tokenNumber === activeDoc.currentPatientToken && (p.status === 'called' || p.status === 'in-consultation'))
    : null;

  // Manage call timer activation
  useEffect(() => {
    if (currentPatient) {
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
    }
  }, [currentPatient]);

  // Find waiting patients assigned to this doctor
  const waitingPatientsForDoc = activeDoc
    ? patients.filter((p) => p.doctorId === activeDoc.id && p.status === 'waiting')
    : [];

  // Sort queue by priority first, then date
  const sortedDocQueue = [...waitingPatientsForDoc].sort((a, b) => {
    const priorityWeight = { emergency: 3, urgent: 2, normal: 1 };
    const weightA = priorityWeight[a.priority];
    const weightB = priorityWeight[b.priority];
    if (weightA !== weightB) return weightB - weightA;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const handleSelectDoctor = (id: string) => {
    setSelectedDocId(id);
    setErrorMessage('');
  };

  const handleStatusChange = async (status: 'active' | 'on-break' | 'inactive') => {
    if (!selectedDocId) return;
    try {
      await api.updateDoctorAvailability(selectedDocId, status);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to modify doctor availability');
    }
  };

  const handleCallNext = async () => {
    if (!selectedDocId) return;
    setErrorMessage('');
    try {
      await api.callNext(selectedDocId);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'No patients waiting in queue for this room.');
    }
  };

  const handleComplete = async () => {
    if (!currentPatient) return;
    try {
      // Complete with either current session timer (in minutes) or fallback selected slider
      const computedMinutes = Math.max(1, Math.round(sessionTimer / 60));
      const actualMinutes = computedMinutes > 1 ? computedMinutes : consultingTime;

      await api.completeConsultation(currentPatient.id, actualMinutes);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit consultation details.');
    }
  };

  const handleSkip = async () => {
    if (!currentPatient) return;
    try {
      await api.skipPatient(currentPatient.id);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to skip patient.');
    }
  };

  const formatTimer = (seconds: number) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="py-6 text-[#111827]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Main Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E5E7EB] pb-6 gap-4">
          <div className="flex items-center gap-2">
            <span className="p-3 bg-indigo-50 text-[#8B5CF6] rounded-2xl">
              <Stethoscope className="w-8 h-8" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Virtual Doctor Portal</h1>
              <p className="text-xs text-[#6B7280]">Simulate physical consultations, call ticket tokens, and evaluate workflow status</p>
            </div>
          </div>

          {selectedDocId && (
            <button
              onClick={() => setSelectedDocId(null)}
              className="text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              ← Back to Doctor Roster
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* STEP 1: Select Doctor to simulate */}
        {!selectedDocId ? (
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Select a Doctor to login and manage</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctors.map((doc) => {
                const docPatients = patients.filter((p) => p.doctorId === doc.id && p.status === 'waiting');
                const isBreak = doc.availability === 'on-break';
                const isOffline = doc.availability === 'inactive';

                return (
                  <div
                    key={doc.id}
                    className="bg-white border border-[#E5E7EB] hover:border-[#8B5CF6]/50 rounded-2xl p-6 transition duration-200 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {doc.room}
                        </span>
                        <h3 className="font-bold text-md text-[#111827]">{doc.name}</h3>
                        <p className="text-xs font-semibold text-[#8B5CF6]">{doc.specialty}</p>
                      </div>

                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold border ${
                        doc.availability === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isBreak
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {doc.availability}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-[#F1F5F9] rounded-xl p-3 flex justify-between items-center text-xs text-[#6B7280]">
                      <div>
                        Patients waiting: <strong className="text-[#111827]">{docPatients.length}</strong>
                      </div>
                      <div>
                        Speed: <strong className="text-[#111827]">{doc.avgConsultationMinutes}m/pt</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectDoctor(doc.id)}
                      className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <LogIn size={14} /> Enter Room Console
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* STEP 2: Doctor Simulation Dashboard */
          activeDoc && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LEFT COLUMN: ACTIVE WORKSPACE / CALL STATION */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Doctor profile card */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Assigned to {activeDoc.room}
                    </span>
                    <h2 className="text-xl font-bold text-[#111827] mt-0.5">{activeDoc.name}</h2>
                    <p className="text-xs font-semibold text-indigo-600">{activeDoc.specialty}</p>
                  </div>

                  {/* Presence switcher toggles */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#6B7280] font-bold uppercase tracking-wider block">Set Presence Status</span>
                    <div className="flex gap-1.5">
                      {(['active', 'on-break', 'inactive'] as const).map((status) => {
                        const isActive = activeDoc.availability === status;
                        const label = status === 'active' ? 'Active' : status === 'on-break' ? 'Break' : 'Offline';
                        const color = status === 'active' 
                          ? 'bg-emerald-500 text-white' 
                          : status === 'on-break' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-slate-400 text-white';

                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                              isActive 
                                ? `${color} border-transparent shadow` 
                                : 'bg-white border-slate-200 text-[#6B7280] hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CURRENT SPREAD SECTION */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
                  <h3 className="font-bold text-sm text-[#111827] uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    Now In consultation
                  </h3>

                  {currentPatient ? (
                    <div className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                        <div className="md:col-span-3 space-y-4">
                          <div>
                            <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">Active Patient</span>
                            <h4 className="text-lg font-black text-[#111827]">{currentPatient.name}</h4>
                            <p className="text-xs text-[#6B7280]">
                              Age: <strong className="text-[#111827]">{currentPatient.age}</strong> | Gender: <strong className="text-[#111827]">{currentPatient.gender}</strong> | Tel: <strong className="text-[#111827] font-mono">{currentPatient.phone}</strong>
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-[#2563EB] font-bold uppercase tracking-wider">Diagnosis / Note:</span>
                            <div className="text-xs bg-slate-50 border border-slate-100 rounded-xl p-3 text-[#6B7280]">
                              {currentPatient.reason}
                            </div>
                          </div>
                        </div>

                        {/* Calling Timer */}
                        <div className="md:col-span-2 bg-[#111827] text-white p-5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 shadow">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">SESSION DURATIONS</span>
                          <span className="text-3xl font-black font-mono tracking-wider">{formatTimer(sessionTimer)}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#14B8A6] animate-spin" style={{ animationDuration: '4s' }} /> Active session
                          </span>
                        </div>
                      </div>

                      {/* Manual Slider input for consultation time */}
                      <div className="space-y-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[#6B7280]">Consultation Duration Log:</span>
                          <span className="font-mono font-bold text-[#8B5CF6]">{consultingTime} Minutes</span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="25"
                          value={consultingTime}
                          onChange={(e) => setConsultingTime(Number(e.target.value))}
                          className="w-full accent-[#8B5CF6] h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Diagnostic Action controls */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={handleComplete}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all hover:scale-[1.01]"
                        >
                          <CheckCircle2 size={16} /> Mark Consultation Completed
                        </button>
                        
                        <button
                          onClick={handleSkip}
                          className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                        >
                          Mark as Skipped
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 border border-[#E5E7EB] rounded-2xl space-y-4">
                      <p className="text-xs text-[#6B7280] font-medium">No patient currently inside consultation room</p>
                      
                      <button
                        onClick={handleCallNext}
                        disabled={sortedDocQueue.length === 0}
                        className="mx-auto bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow cursor-pointer transition duration-150"
                      >
                        <Play size={14} /> Summon Next Token (Queue: {sortedDocQueue.length})
                      </button>
                    </div>
                  )}

                </div>

              </div>

              {/* RIGHT COLUMN: ACTIVE WAITING QUEUE */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs h-fit">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-sm text-[#111827] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#8B5CF6]" /> Pending Patients
                  </h3>
                  <span className="text-xs bg-slate-100 font-mono px-2 py-0.5 rounded-full font-bold">
                    {sortedDocQueue.length} Waiting
                  </span>
                </div>

                {sortedDocQueue.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#6B7280] bg-[#F8FAFC] border border-dashed border-[#E5E7EB] rounded-2xl">
                    Queue fully clear!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {sortedDocQueue.map((pat, idx) => {
                      const priorityColor = pat.priority === 'emergency'
                        ? 'bg-rose-100 text-rose-800'
                        : pat.priority === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800';

                      return (
                        <div
                          key={pat.id}
                          className="p-3 bg-slate-50 border border-[#E5E7EB] rounded-xl flex items-center justify-between transition hover:bg-slate-100"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#2563EB] bg-[#2563EB]/15 px-1.5 py-0.5 rounded">
                                {pat.tokenNumber}
                              </span>
                              <p className="font-bold text-xs text-[#111827] truncate max-w-[100px]">
                                {pat.name}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{pat.reason}</p>
                          </div>

                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${priorityColor}`}>
                            {pat.priority}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )
        )}

      </div>
    </div>
  );
}
