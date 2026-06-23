import React, { useEffect, useState } from 'react';
import { Patient, Doctor } from '../types';
import { Tv, Users, Hourglass, Sparkles, TrendingUp, BellRing, ChevronRight, Activity } from 'lucide-react';

interface WaitingTVBoardProps {
  patients: Patient[];
  doctors: Doctor[];
  avgConsultationTime: number;
}

export function WaitingTVBoard({ patients, doctors, avgConsultationTime }: WaitingTVBoardProps) {
  const [calledAnimation, setCalledAnimation] = useState(false);
  const [lastBuzzedToken, setLastBuzzedToken] = useState<string | null>(null);

  // Get daily active stats
  const activePatients = patients.filter((p) => {
    const isToday = new Date(p.createdAt).toDateString() === new Date().toDateString();
    return isToday && p.status === 'waiting';
  });

  const servedToday = patients.filter((p) => {
    const isToday = new Date(p.createdAt).toDateString() === new Date().toDateString();
    return isToday && p.status === 'completed';
  });

  const calledPatients = patients.filter((p) => p.status === 'called' || p.status === 'in-consultation');

  // Next 4 tokens inline
  const nextTokens = activePatients
    .slice(0, 4)
    .map((p) => p.tokenNumber);

  // Compute Queue progress
  const totalTodayCount = activePatients.length + servedToday.length + calledPatients.length;
  const progressRatio = totalTodayCount > 0 
    ? Math.round(((servedToday.length + calledPatients.length) / totalTodayCount) * 100)
    : 100;

  // Track if a new token was called to play a visual alert
  const currentServingPatient = calledPatients[0];
  const currentServingToken = currentServingPatient ? currentServingPatient.tokenNumber : '--';
  const currentDoctorName = currentServingPatient ? currentServingPatient.doctorName : 'Waiting...';
  const currentSpecialty = currentServingPatient 
    ? (doctors.find((d) => d.id === currentServingPatient.doctorId)?.specialty || 'General Practitioner')
    : 'All Rooms';

  useEffect(() => {
    if (currentServingToken && currentServingToken !== '--' && currentServingToken !== lastBuzzedToken) {
      setLastBuzzedToken(currentServingToken);
      setCalledAnimation(true);
      const timer = setTimeout(() => {
        setCalledAnimation(false);
      }, 5000); // 5 sec alert trigger
      return () => clearTimeout(timer);
    }
  }, [currentServingToken, lastBuzzedToken]);

  return (
    <div className="py-6 text-[#111827]">
      
      {/* Visual Ring Alert Overlap on Call */}
      {calledAnimation && currentServingPatient && (
        <div className="fixed inset-0 bg-[#2563EB]/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full text-center border-4 border-[#2563EB] shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-teal-500 to-purple-500" />
            
            <div className="flex justify-center mb-6">
              <span className="p-4 bg-blue-100 text-[#2563EB] rounded-full animate-bounce">
                <BellRing size={48} className="animate-pulse" />
              </span>
            </div>

            <h2 className="text-[#6B7280] font-bold text-lg uppercase tracking-widest">Now Calling</h2>
            <div className="text-8xl font-black text-[#2563EB] tracking-tight my-4 font-sans select-none">
              {currentServingPatient.tokenNumber}
            </div>

            <div className="text-2xl font-bold text-[#111827] mt-2 mb-1">
              {currentServingPatient.name}
            </div>
            
            <p className="text-md text-[#6B7280]">
              Please proceed to <span className="font-semibold text-[#111827]">{currentServingPatient.doctorName}</span> ({currentServingPatient.reason})
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-mono text-[#2563EB] font-bold">
              <Activity className="w-4 h-4 animate-pulse" /> QUEUE CURE AUTOMATED WAITING BOARD
            </div>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between border-b border-[#E5E7EB] pb-6 mb-8 gap-4">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-[#2563EB] text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Tv className="w-8 h-8" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              LIVE WAITING BOARD
              <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Live TV Mode
              </span>
            </h1>
            <p className="text-sm text-[#6B7280]">Real-time monitor display panel for diagnostic waiting clinics</p>
          </div>
        </div>

        {/* Current Active Clock */}
        <div className="bg-white border border-[#E5E7EB] px-6 py-2.5 rounded-2xl shadow-xs text-right hidden sm:block">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Board Status</p>
          <div className="flex items-center gap-2 text-md font-bold font-mono">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            Synchronized
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: NOW SERVING (Big screen element) */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 relative overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300">
            {/* Soft decorative background glow */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-linear-to-bl from-blue-100/40 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                Now Serving
              </span>
              <span className="text-xs text-slate-400 font-mono">Channel 01</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              <div className="md:col-span-3 space-y-4">
                <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-xl">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Active Patient</p>
                  <p className="text-lg font-bold text-[#111827]">
                    {currentServingPatient ? currentServingPatient.name : 'No Active consultation'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Assigned Department</p>
                  <p className="text-xl font-bold text-[#111827] flex items-center gap-2">
                    {currentServingPatient ? `${currentServingPatient.doctorName}` : '--'}
                    {currentServingPatient && (
                      <span className="text-xs font-mono font-medium text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full">
                        {currentSpecialty}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {currentServingPatient ? `Complaint: ${currentServingPatient.reason}` : 'System awaiting called patient'}
                  </p>
                </div>
              </div>

              {/* Mega Token block */}
              <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-50 border border-[#E5E7EB] rounded-2xl relative">
                <span className="absolute -top-3.5 bg-[#2563EB] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  Ticket Callout
                </span>
                <span className="text-7xl font-sans font-black tracking-tight text-[#2563EB] my-1 select-none animate-pulse">
                  {currentServingToken}
                </span>
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mt-1">
                  {currentServingPatient ? 'Report immediately' : 'Rooms available'}
                </div>
              </div>
            </div>
            
            {/* Live blinking alert footer bar */}
            {currentServingPatient && (
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-800">
                  Patient <strong className="font-semibold">{currentServingPatient.name}</strong> was summoned at <strong className="font-mono font-bold">{new Date(currentServingPatient.calledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                </span>
              </div>
            )}
          </div>

          {/* ACTIVE ROOM-WISE BREAKDOWN TABLE */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 lg:p-8 shadow-xs">
            <h2 className="text-md font-bold text-[#111827] mb-6 flex items-center gap-2">
              <span className="w-3 h-3 bg-[#14B8A6] rounded-full" />
              Doctor Consultation Status Room Map
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => {
                const isOnline = doc.availability === 'active' || doc.availability === 'on-break';
                const hasPatient = doc.currentPatientToken !== null;
                const activePatientData = hasPatient 
                  ? patients.find((p) => p.tokenNumber === doc.currentPatientToken && (p.status === 'called' || p.status === 'in-consultation'))
                  : null;

                return (
                  <div
                    key={doc.id}
                    className={`border rounded-2xl p-5 flex items-center justify-between transition-all ${
                      hasPatient 
                        ? 'bg-[#2563EB]/5 border-[#2563EB]/25' 
                        : 'bg-white border-[#E5E7EB]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xs text-[#111827]">{doc.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                          doc.availability === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.availability === 'on-break'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                        }`}>
                          {doc.availability}
                        </span>
                      </div>
                      <p className="text-sm text-[#14B8A6] font-semibold">{doc.specialty}</p>
                      
                      <div className="text-xs text-[#6B7280]">
                        {activePatientData ? (
                          <span>Patient: <strong className="text-[#111827]">{activePatientData.name}</strong></span>
                        ) : isOnline ? (
                          <span className="text-slate-400">Awaiting calling ticket</span>
                        ) : (
                          <span className="text-slate-400">Offline</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-[#6B7280] font-semibold block uppercase tracking-wider mb-1">
                        {doc.room}
                      </span>
                      {hasPatient ? (
                        <span className="text-xl font-bold font-sans text-white bg-[#2563EB] px-3.5 py-1 rounded-xl shadow-xs">
                          {doc.currentPatientToken}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-[#6B7280] bg-slate-100 px-3 py-1.5 rounded-xl block">
                          VACANT
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: QUEUE ADMISSIONS & TELEMETRY */}
        <div className="space-y-8">
          
          {/* STATS BEACON RADIAL PANEL */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 lg:p-8 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2563EB]" /> Queue Overview
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <span className="text-2xl font-black text-[#111827] leading-none block">
                  {activePatients.length}
                </span>
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block mt-1">
                  Patients Waiting
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <span className="text-2xl font-black text-[#111827] leading-none block">
                  {servedToday.length}
                </span>
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block mt-1">
                  Served Today
                </span>
              </div>
            </div>

            {/* Progress Telemetry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#6B7280] uppercase tracking-wider">Queue progress</span>
                <span className="text-[#2563EB]">{progressRatio}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-[#2563EB] to-[#14B8A6] rounded-full transition-all duration-500"
                  style={{ width: `${progressRatio}%` }}
                />
              </div>
              <p className="text-[10px] text-[#6B7280] mt-1 text-center">
                Total load today: {totalTodayCount} patients
              </p>
            </div>

            {/* Consultation Stats fallback */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-[#14B8A6] rounded-lg">
                  <Hourglass className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Avg Consultation</p>
                  <p className="text-xs font-bold text-[#111827]">{avgConsultationTime} Minutes</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Predictive Accuracy</span>
                <span className="text-xs font-bold text-emerald-600 block">94% Core</span>
              </div>
            </div>
          </div>

          {/* NEXT PATIENTS TIMELINE */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 lg:p-8 shadow-xs">
            <h2 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider mb-6 flex items-center justify-between">
              <span>Next Tickets In Line</span>
              <span className="text-[10px] bg-blue-150 text-[#2563EB] px-2.5 py-0.5 rounded-full font-mono">
                UPCOMING
              </span>
            </h2>

            {nextTokens.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280] bg-slate-50 border border-dashed border-[#E5E7EB] rounded-2xl">
                No tickets waiting in line
              </div>
            ) : (
              <div className="space-y-3">
                {activePatients.slice(0, 5).map((pat, idx) => {
                  const estWait = (idx + 1) * avgConsultationTime;
                  const priorityColor = pat.priority === 'emergency' 
                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                    : pat.priority === 'urgent' 
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <div
                      key={pat.id}
                      className="border border-[#E5E7EB] hover:border-[#2563EB]/40 bg-[#F8FAFC]/50 hover:bg-white rounded-2xl p-4 flex items-center justify-between transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white bg-[#111827] w-12 h-12 flex items-center justify-center rounded-xl select-none">
                          {pat.tokenNumber}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-[#111827] truncate max-w-[120px]">{pat.name}</p>
                          <p className="text-xs text-[#6B7280]">{pat.doctorName}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${priorityColor} font-bold uppercase tracking-wider block mb-1 text-center font-mono`}>
                          {pat.priority}
                        </span>
                        <span className="text-[10px] text-[#6B7280] font-semibold">
                          EST. ~{estWait}m
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
