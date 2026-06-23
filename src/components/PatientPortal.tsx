import React, { useState, useEffect } from 'react';
import { Patient, Doctor } from '../types';
import { Search, Compass, Activity, ShieldCheck, Heart, User, Hourglass, Smartphone, RefreshCw, Sparkles } from 'lucide-react';

interface PatientPortalProps {
  patients: Patient[];
  doctors: Doctor[];
  avgConsultationTime: number;
}

export function PatientPortal({ patients, doctors, avgConsultationTime }: PatientPortalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTicket, setActiveTicket] = useState<Patient | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-refresh selected ticket details if general patient array updates
  useEffect(() => {
    if (activeTicket) {
      const refreshed = patients.find((p) => p.id === activeTicket.id);
      if (refreshed) {
        setActiveTicket(refreshed);
      }
    }
  }, [patients, activeTicket]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!searchQuery.trim()) {
      setErrorMessage('Please enter a valid phone number or token ID to search.');
      return;
    }

    const cleanQuery = searchQuery.trim().toLowerCase();

    // Find the most recent active token today matching the phone or code
    const found = patients
      .filter((p) => {
        const isToday = new Date(p.createdAt).toDateString() === new Date().toDateString();
        const matchesPhone = p.phone.replace(/[^0-9]/g, '').includes(cleanQuery.replace(/[^0-9]/g, ''));
        const matchesToken = p.tokenNumber.toLowerCase() === cleanQuery;
        
        return isToday && (matchesPhone || matchesToken);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]; // newest first

    if (found) {
      setActiveTicket(found);
      setPhoneNumber(found.phone);
    } else {
      setErrorMessage('No active clinical token found today matching that credential.');
      setActiveTicket(null);
    }
  };

  const handleReset = () => {
    setActiveTicket(null);
    setSearchQuery('');
    setErrorMessage('');
  };

  // Calculate detailed patient ahead counts
  const getQueuePositionDetails = (patient: Patient) => {
    if (patient.status !== 'waiting') return { ahead: 0, waitMinutes: 0 };
    
    // Find all patients created today waiting for the same doctor, before this patient
    const todayStr = new Date().toDateString();
    const fellowPatients = patients.filter(
      (p) => 
        new Date(p.createdAt).toDateString() === todayStr &&
        p.doctorId === patient.doctorId &&
        p.status === 'waiting'
    );

    // Sort by priority weights, then creation date
    const priorityWeight = { emergency: 3, urgent: 2, normal: 1 };
    fellowPatients.sort((a, b) => {
      const weightA = priorityWeight[a.priority];
      const weightB = priorityWeight[b.priority];
      if (weightA !== weightB) return weightB - weightA;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Find our patient index in the sorted queue list
    const patientIndex = fellowPatients.findIndex((p) => p.id === patient.id);
    const ahead = patientIndex === -1 ? fellowPatients.length : patientIndex;

    const assignedDoc = doctors.find((d) => d.id === patient.doctorId);
    const doctorSpeedFactor = assignedDoc ? assignedDoc.avgConsultationMinutes : avgConsultationTime;
    const waitMinutes = ahead * doctorSpeedFactor;

    return { ahead, waitMinutes };
  };

  const { ahead, waitMinutes } = activeTicket ? getQueuePositionDetails(activeTicket) : { ahead: 0, waitMinutes: 0 };

  // Calculate expected check in timestamp
  const getExpectedCallTime = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="py-6 text-[#111827]">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <span className="p-3 bg-[#14B8A6]/10 text-[#14B8A6] rounded-2xl">
              <Heart className="w-8 h-8 animate-pulse" />
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#111827]">PATIENT WAITING STATUS</h1>
          <p className="text-sm text-[#6B7280]">Check live token diagnostic progress and predictive remaining wait times</p>
        </div>

        {/* Portal lookup state */}
        {!activeTicket ? (
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Retrieve Your Live Token</h2>
              <p className="text-xs text-[#6B7280]">
                Enter the telephone number or automatic token code assigned by the clinical receptionist during admission login to track your status.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#6B7280]">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. 555-0158 or A-016..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E7EB] text-[#111827] pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-[#14B8A6] focus:bg-white transition-all text-sm font-medium"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Search size={18} /> Search Active Ticket
              </button>
            </form>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> HIPAA Compliant
              </span>
              <span>St. Jude Health Center</span>
            </div>
          </div>
        ) : (
          /* DIGITAL TICKET SHOWCASE */
          <div className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-md animate-scale-up relative">
            
            {/* Ticket colored border strip */}
            <div className="h-2 bg-gradient-to-r from-[#14B8A6] to-[#2563EB]" />

            {/* Ticket Body */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Top Row: Ticket Head & Reset */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#14B8A6] block">
                    Admitted Patient Ticket
                  </span>
                  <h3 className="font-bold text-lg text-[#111827] mt-0.5">
                    {activeTicket.name}
                  </h3>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#6B7280] hover:text-[#111827] flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  <RefreshCw size={13} /> Change Ticket
                </button>
              </div>

              {/* Center Ticket core token */}
              <div className="border-y border-slate-100 py-6 text-center space-y-2 relative">
                {/* Simulated Ticket cutouts/punches on side margins */}
                <div className="absolute left-[-33px] top-[calc(50%-12px)] w-6 h-6 bg-[#F8FAFC] border-r border-[#E5E7EB] rounded-full" />
                <div className="absolute right-[-33px] top-[calc(50%-12px)] w-6 h-6 bg-[#F8FAFC] border-l border-[#E5E7EB] rounded-full" />

                <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Your Assigned Token</p>
                <div className="text-7xl font-sans font-black text-[#2563EB] select-none tracking-tight leading-none">
                  {activeTicket.tokenNumber}
                </div>
                
                {/* Patient status bubble */}
                <div className="flex justify-center pt-2">
                  <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${
                    activeTicket.status === 'waiting'
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : activeTicket.status === 'called' || activeTicket.status === 'in-consultation'
                        ? 'bg-rose-100 text-rose-800 font-black animate-bounce'
                        : activeTicket.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                  }`}>
                    Status: {activeTicket.status === 'in-consultation' ? 'W/ Doctor' : activeTicket.status}
                  </span>
                </div>
              </div>

              {/* Waiting metrics section */}
              {activeTicket.status === 'waiting' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                    <span className="text-3xl font-black text-[#111827]">
                      {ahead}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block mt-1">
                      Patients Ahead
                    </span>
                  </div>

                  <div className="bg-slate-100/70 border border-slate-250 rounded-2xl p-4 text-center flex flex-col justify-center items-center">
                    <div className="flex items-center gap-1.5 text-[#14B8A6]">
                      <Hourglass className="w-5 h-5 text-[#14B8A6] animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="text-3xl font-black text-[#111827]">
                        ~{waitMinutes}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block mt-1">
                      EST. Wait Minutes
                    </span>
                  </div>
                </div>
              ) : activeTicket.status === 'called' || activeTicket.status === 'in-consultation' ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center space-y-1">
                  <p className="text-lg font-bold text-rose-800">🏥 Please Proceed Immediately</p>
                  <p className="text-sm text-rose-700">
                    Your token is called! Please check room map towards <strong className="font-semibold">{activeTicket.doctorName}</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center space-y-1">
                  <p className="text-md font-bold text-[#6B7280]">📋 Consultation Completed</p>
                  <p className="text-xs text-[#6B7280]">
                    Thank you. If prescription files are pending, please wait at main pharmacy output counter.
                  </p>
                </div>
              )}

              {/* Expected checklist details */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-semibold">Doctor Assigned:</span>
                  <span className="font-bold text-[#111827]">{activeTicket.doctorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-semibold">Scheduled Complaint:</span>
                  <span className="font-bold text-[#111827] truncate max-w-[150px]">{activeTicket.reason}</span>
                </div>
                {activeTicket.status === 'waiting' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[#14B8A6] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Expected Call Time:
                    </span>
                    <span className="font-bold text-[#14B8A6] font-mono">{getExpectedCallTime(waitMinutes)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] font-semibold">Admission Timestamp:</span>
                  <span className="font-bold text-slate-500 font-mono">
                    {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Dynamic Realistic Barcode */}
              <div className="flex flex-col items-center justify-center pt-4 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-center h-10 w-full max-w-[280px] gap-[1px] md:gap-[2px] bg-slate-50 px-4 py-2 border border-slate-100 rounded">
                  {Array.from({ length: 42 }).map((_, idx) => {
                    // Make some bars thick, some thin to simulate authentic barcode asset
                    const isThick = idx % 3 === 0 || idx % 7 === 0;
                    return (
                      <div
                        key={idx}
                        className={`bg-[#111827] h-full rounded-xs`}
                        style={{ width: isThick ? '3.5px' : '1px' }}
                      />
                    );
                  })}
                </div>
                <p className="text-[9px] text-[#6B7280] font-mono select-all tracking-wider uppercase">
                  QC-{activeTicket.id.split('-')[1]}
                </p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
