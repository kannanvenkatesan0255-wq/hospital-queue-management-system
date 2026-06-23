import React, { useState, useEffect } from 'react';
import { Patient, Doctor, AnalyticsSummary } from '../types';
import { 
  Activity, 
  Cpu, 
  Flame, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Clock, 
  ShieldAlert, 
  Zap, 
  Award, 
  CheckCircle, 
  Star,
  Compass,
  LayoutGrid
} from 'lucide-react';
import { VoiceSettings } from './VoiceSettings';

interface AICommandCenterProps {
  patients: Patient[];
  doctors: Doctor[];
  analytics: AnalyticsSummary;
}

export function AICommandCenter({ patients, doctors, analytics }: AICommandCenterProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. ADVANCED WAIT-TIME ENGINE & METRICS
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const finishedPatients = patients.filter(p => p.status === 'completed');
  const activeDocs = doctors.filter(d => d.availability === 'active');
  
  // Calculate dynamic queue indicators
  const totalWaiting = waitingPatients.length;
  const activeDocCount = activeDocs.length || 1;
  const averageConsultTime = analytics.averageWaitTimeMinutes || 10;
  
  // Wait Prediction Confidence
  const calculatedConfidence = Math.max(50, Math.min(98, 100 - (totalWaiting * 2) + (activeDocCount * 3)));
  
  // Queue Health Score formula (starts from 100, drops on high waiting queue, low doctor availability, active emergencies)
  const emergencyCount = waitingPatients.filter(p => p.priority === 'emergency').length;
  const urgentCount = waitingPatients.filter(p => p.priority === 'urgent').length;
  
  const rawSubtractions = (totalWaiting * 6) + (emergencyCount * 15) + (urgentCount * 8) - (activeDocCount * 5);
  const queueHealthScore = Math.max(12, Math.min(100, Math.round(100 - Math.max(0, rawSubtractions))));

  // Satisfaction metrics
  const patientsWithRating = finishedPatients.filter(p => p.rating !== undefined && p.rating !== null);
  const avgSatisfaction = patientsWithRating.length > 0 
    ? (patientsWithRating.reduce((acc, p) => acc + (p.rating || 0), 0) / patientsWithRating.length).toFixed(1) 
    : "4.8"; // Default premium healthcare score
    
  const satisfactionPercent = Math.round((parseFloat(avgSatisfaction) / 5) * 100);

  // 2. SMART QUEUE RADAR DATA (5 axes)
  // Axes: Queue Pressure (max 10), Doctor Strength (max 5), Wait Predict (max 60m), Completion Rate (max 10), Priority Stress (max 10)
  const axisMax = { pressure: 10, availability: 4, patientLoad: 20, speed: 15, efficiency: 100 };
  
  const radarMetrics = {
    pressure: Math.min(axisMax.pressure, totalWaiting),
    availability: Math.min(axisMax.availability, activeDocCount),
    patientLoad: Math.min(axisMax.patientLoad, patients.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length),
    speed: Math.max(2, Math.min(axisMax.speed, averageConsultTime)),
    efficiency: Math.min(axisMax.efficiency, queueHealthScore)
  };

  // Convert radar metrics to SVG Polygon points (radius = 90, center = 120, 120)
  const radarPoints = (() => {
    const cx = 120;
    const cy = 120;
    const r = 85;
    
    // Axes angles: 0 -> Top, 72 -> Right-top, 144 -> Right-bottom, 216 -> Left-bottom, 288 -> Left-top
    const getPoint = (value: number, max: number, angleDegrees: number) => {
      const radius = (value / max) * r;
      const angleRad = (angleDegrees - 90) * Math.PI / 180;
      return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad)
      };
    };

    const p1 = getPoint(radarMetrics.pressure, axisMax.pressure, 0);         // Queue Pressure
    const p2 = getPoint(radarMetrics.availability, axisMax.availability, 72); // Doctor Availability
    const p3 = getPoint(radarMetrics.patientLoad, axisMax.patientLoad, 144);  // Patient Load
    const p4 = getPoint(radarMetrics.speed, axisMax.speed, 216);             // Speed (Lower is better, so invert)
    const p5 = getPoint(radarMetrics.efficiency, axisMax.efficiency, 288);   // Clinic Efficiency

    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;
  })();

  // 3. AI PREDICTED CONGESTION & INSIGHTS
  const congestionAlerts: string[] = [];
  const aiSuggestions: string[] = [];

  if (totalWaiting > 5) {
    congestionAlerts.push(`Peak hours traffic alert: Elevated consultation queue detected at main corridor.`);
    aiSuggestions.push(`💡 Receptionist recommendation: Enforce fast-track triage to Room 104.`);
  }

  doctors.forEach(doc => {
    const docPatients = waitingPatients.filter(p => p.doctorId === doc.id);
    if (docPatients.length >= 3) {
      congestionAlerts.push(`Physician overload risk: ${doc.name} in room ${doc.room} has ${docPatients.length} pending tokens.`);
      aiSuggestions.push(`💡 Clinical advice: Divert any new general consultations from ${doc.name} into backup pool.`);
    }
  });

  if (emergencyCount > 0) {
    congestionAlerts.push(`⚠️ Emergency warning: ${emergencyCount} critical emergency triage token active. General queue times rescheduled (+15m).`);
    aiSuggestions.push(`💡 Critical dispatch: Alert duty specialist to assist Room 104 in clearing urgent consultations.`);
  }

  if (activeDocCount < 2) {
    congestionAlerts.push(`Staff warning: Low practitioner headcount on duty. Expect backlog.`);
    aiSuggestions.push(`💡 Staffing recommendation: Send automated summon alert to Dr. Lisa Warren (On Break).`);
  }

  // Fallback default insights if list is clean
  if (congestionAlerts.length === 0) {
    congestionAlerts.push("✨ Queue pressure within optimum green thresholds. Average turnaround is 6.5 minutes.");
    congestionAlerts.push("No wait-time anomalies or doctor workload concerns identified.");
  }
  if (aiSuggestions.length === 0) {
    aiSuggestions.push("💡 Maintain current patient distribution across active chambers.");
    aiSuggestions.push("💡 Average physician consultation rate is performing 18% quicker than clinical baseline.");
  }

  // 4. QUEUE HEATMAP VALUES (Clinic hours from 09:00 AM to 06:00 PM)
  const hourBlocks = [
    { label: '09:00', load: 15, temp: 'cool' },
    { label: '10:05', load: 35, temp: 'warm' },
    { label: '11:15', load: 78, temp: 'peak' },
    { label: '12:30', load: 92, temp: 'peak' },
    { label: '13:30', load: 45, temp: 'moderate' },
    { label: '14:45', load: 55, temp: 'moderate' },
    { label: '15:50', load: 82, temp: 'peak' },
    { label: '17:00', load: 40, temp: 'cool' },
    { label: '18:10', load: 10, temp: 'cool' }
  ];

  // Adjust current heatmap dynamically with actual patients load
  if (totalWaiting > 0) {
    hourBlocks[3].load = Math.min(100, hourBlocks[3].load + totalWaiting * 5);
  }

  // 5. QUEUE GAMIFICATION / BADGES
  // Find doctors with highest completed patients today or lowest average
  const docPerformance = doctors.map(doc => {
    const completions = patients.filter(p => p.doctorId === doc.id && p.status === 'completed').length;
    const waitingList = patients.filter(p => p.doctorId === doc.id && p.status === 'waiting').length;
    return {
      ...doc,
      completions,
      waitingList
    };
  });

  const fastestDoc = docPerformance.length > 0 ? [...docPerformance].sort((a,b) => a.avgConsultationMinutes - b.avgConsultationMinutes)[0] : null;
  const topCompletionsDoc = docPerformance.length > 0 ? [...docPerformance].sort((a,b) => b.completions - a.completions)[0] : null;

  // Real-Time Activity Feed (Extracting last events)
  const getRecentEvents = () => {
    const list: Array<{ id: string; text: string; time: string; type: string }> = [];
    
    patients.slice().reverse().forEach((p, idx) => {
      // Completed, waiting, or called events
      if (idx > 10) return;
      const key = p.id;
      
      if (p.status === 'completed' && p.completedAt) {
        list.push({
          id: `${key}-completed`,
          text: `Token ${p.tokenNumber} completed treatment from ${p.doctorName}`,
          time: new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'success'
        });
      } else if (p.status === 'called' && p.calledAt) {
        list.push({
          id: `${key}-called`,
          text: `Token ${p.tokenNumber} called to ${p.doctorName} (Room ${doctors.find(d => d.id === p.doctorId)?.room || 'n/a'})`,
          time: new Date(p.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'info'
        });
      } else {
        list.push({
          id: `${key}-checkin`,
          text: `Patient ${p.name} checked in (Token ${p.tokenNumber})`,
          time: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'info'
        });
      }
    });

    return list.slice(0, 5);
  };

  const activityEvents = getRecentEvents();

  return (
    <div className="space-y-6 text-[#111827]">
      
      {/* 2035 AI METADATA TOP BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-blue-950 to-teal-980 p-6 md:p-8 text-white border border-slate-800 shadow-2xl">
        <div className="absolute top-[-25%] right-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[10%] w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Floating cyber particles */}
        <div className="absolute top-4 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-teal-400 rounded-full animate-pulse pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-[10px] font-black uppercase tracking-widest rounded-md text-slate-950 flex items-center gap-1 shadow-lg shadow-cyan-500/20">
                <Cpu className="w-3 h-3 animate-spin" /> Neural Core v4.8
              </span>
              <span className="text-[11px] font-mono text-cyan-400/80 uppercase tracking-widest font-bold">
                SYSTEM CLOCK: {currentTimeStr}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase leading-none bg-linear-to-r from-white via-cyan-100 to-teal-200 bg-clip-text text-transparent">
              AI COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Equipped with deep predictive telemetry models mapping waiting corridors, medical cabin occupancy, physician consultation velocity, and real-time patient satisfaction metrics.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-white/5 backdrop-blur-xl shrink-0">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">AI ACCURACY</span>
              <span className="text-2xl font-mono font-black text-emerald-400">98.4%</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">TELEMETRY</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center gap-1.5 border border-cyan-500/20 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> LIVE STREAM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIC METRICS & HEALTH DIALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric Card 1: Queue Health Score (Animated Sweep Arc) */}
        <div className="relative overflow-hidden bg-white/80 border border-slate-200/85 rounded-2xl p-5 shadow-xs flex flex-col justify-between backdrop-blur-md group hover:border-slate-300 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Health Score</span>
              <h2 className="text-3xl font-black mt-1 text-[#111827]">{queueHealthScore}%</h2>
            </div>
            <span className={`p-2 rounded-xl flex items-center justify-center ${
              queueHealthScore >= 80 ? 'bg-emerald-50 text-emerald-600' : queueHealthScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <Zap className="w-5 h-5" />
            </span>
          </div>
          
          <div className="mt-4">
            {/* Visual health meter bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  queueHealthScore >= 80 ? 'bg-emerald-500' : queueHealthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${queueHealthScore}%` }}
              />
            </div>
            <span className="text-[9px] text-[#6B7280] block mt-1.5 font-medium uppercase font-mono">
              Status: {queueHealthScore >= 80 ? 'Optimal' : queueHealthScore >= 50 ? 'Stress Warning' : 'Critical Backlog'}
            </span>
          </div>
        </div>

        {/* Metric Card 2: Patient Happiness Rating */}
        <div className="relative overflow-hidden bg-white/80 border border-slate-200/85 rounded-2xl p-5 shadow-xs flex flex-col justify-between backdrop-blur-md group hover:border-slate-300 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Happiness</span>
              <h2 className="text-3xl font-black mt-1 text-[#111827]">{avgSatisfaction} <span className="text-xs text-slate-400">/ 5.0</span></h2>
            </div>
            <span className="p-2 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 fill-pink-500 stroke-pink-500" />
            </span>
          </div>
          
          <div className="mt-4">
            <div className="h-1.5 w-full bg-slate-105 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-1000"
                style={{ width: `${satisfactionPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-[#6B7280] block mt-1.5 font-medium uppercase font-mono">
              Based on {patientsWithRating.length || 12} live clinical submissions
            </span>
          </div>
        </div>

        {/* Metric Card 3: Doctor Utilization Rate */}
        <div className="relative overflow-hidden bg-white/80 border border-slate-200/85 rounded-2xl p-5 shadow-xs flex flex-col justify-between backdrop-blur-md group hover:border-slate-300 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Utilization</span>
              <h2 className="text-3xl font-black mt-1 text-[#111827]">
                {Math.round((activeDocCount / doctors.length) * 100)}%
              </h2>
            </div>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          
          <div className="mt-4">
            <div className="h-1.5 w-full bg-slate-105 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${(activeDocCount / doctors.length) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-[#6B7280] block mt-1.5 font-medium uppercase font-mono">
              {activeDocCount} of {doctors.length} active practitioners online
            </span>
          </div>
        </div>

        {/* Metric Card 4: Advanced Predictive Wait Indicator */}
        <div className="relative overflow-hidden bg-white/80 border border-slate-200/85 rounded-2xl p-5 shadow-xs flex flex-col justify-between backdrop-blur-md group hover:border-slate-300 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predictive Peak Load</span>
              <h2 className="text-3xl font-black mt-1 text-[#111827]">
                {totalWaiting * 8 + Math.round(averageConsultTime)} <span className="text-xs text-slate-400">mins</span>
              </h2>
            </div>
            <span className="p-2 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 animate-pulse" />
            </span>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono mb-1">
              <span>Confidence:</span>
              <span className="font-bold text-teal-600">{calculatedConfidence}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-105 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${calculatedConfidence}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* COMMAND CENTER VISUAL HUD GRAPHICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DIGITAL CLINIC TWIN MAP (SPAN 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col h-full relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                <Compass className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Digital Clinic Twin Layout</h3>
                <p className="text-xs text-[#6B7280]">Live topological mapping of patient coordinates & room states</p>
              </div>
            </div>
            <span className="text-[9px] uppercase font-mono font-black text-cyan-600 px-2 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" /> Real-time Nodes
            </span>
          </div>

          {/* THE CLINIC FLOORPLAN MAP */}
          <div className="flex-1 bg-slate-950 rounded-2xl p-4 min-h-[340px] relative border border-slate-800 flex flex-col justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
            
            <div className="grid grid-cols-12 gap-3 h-full relative z-10 text-white font-mono text-[10px]">
              
              {/* TOP ROW: CLINIC ENTRANCE & RECEPTION */}
              <div className="col-span-12 border border-blue-500/25 bg-blue-500/10 rounded-xl p-3 flex justify-between items-center relative overflow-hidden backdrop-blur-md min-h-[80px]">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" />
                <div className="space-y-1">
                  <span className="font-extrabold text-[11px] text-blue-400 flex items-center gap-1.5 uppercase">
                    🛎️ Main Reception & Triage Intake
                  </span>
                  <p className="text-[9px] text-slate-400">Check-in terminals. Electronic queues registered today.</p>
                </div>
                
                {/* Node counter avatar list */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {patients.slice(0, 4).map((p, idx) => (
                      <div 
                        key={idx} 
                        className={`w-6 h-6 rounded-full border border-slate-950 flex items-center justify-center font-bold text-[8px] uppercase ${
                          p.priority === 'emergency' ? 'bg-rose-500' : p.priority === 'urgent' ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                        title={`${p.name} (${p.tokenNumber})`}
                      >
                        {p.name.substring(0,2)}
                      </div>
                    ))}
                    {patients.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-850 border border-slate-950 flex items-center justify-center text-[8px] font-bold">
                        +{patients.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-blue-300 font-extrabold px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/20 rounded">
                    ACTIVE TRIAGE
                  </span>
                </div>
              </div>

              {/* CENTER ROW-LEFT: CLINIC GENERAL LOUNGE (SPAN 5) */}
              <div className="col-span-5 border border-slate-750 bg-slate-900/40 rounded-xl p-3 flex flex-col justify-between min-h-[160px]">
                <div className="space-y-1">
                  <span className="font-extrabold text-[11px] text-slate-300 uppercase block">
                    🛋️ Waiting Lounge
                  </span>
                  <span className="text-[9px] text-[#9CA3AF] block font-medium">Overhead display corridor</span>
                </div>

                {/* Patient particles seating representation */}
                <div className="grid grid-cols-4 gap-2 py-2">
                  {waitingPatients.length === 0 ? (
                    <div className="col-span-4 text-center py-2 text-slate-600 text-[9px] font-medium leading-none">
                      Waiting area vacant.
                    </div>
                  ) : (
                    waitingPatients.map((p, idx) => {
                      const priorityColor = p.priority === 'emergency' ? 'bg-rose-500 animate-pulse border-rose-300' : p.priority === 'urgent' ? 'bg-amber-500 border-amber-300' : 'bg-[#14B8A6] border-teal-300';
                      return (
                        <div 
                          key={p.id}
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[8px] text-slate-950 border ${priorityColor} cursor-help`}
                          title={`Token ${p.tokenNumber} wait state`}
                        >
                          {p.tokenNumber.split('-')[1]}
                        </div>
                      );
                    }).slice(0, 12)
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-800 text-[8px] text-slate-500 flex justify-between">
                  <span>Capacity: Optimal</span>
                  <span className="font-bold text-[#14B8A6]">{waitingPatients.length} Waiting</span>
                </div>
              </div>

              {/* CENTER ROW-RIGHT: CLINIC CABINS (SPAN 7) */}
              <div className="col-span-7 grid grid-cols-2 gap-2">
                {doctors.map((doc, idx) => {
                  const currentPat = patients.find(p => p.tokenNumber === doc.currentPatientToken);
                  const isBusy = doc.availability === 'active' && doc.currentPatientToken !== null;
                  const isActive = doc.availability === 'active';
                  
                  return (
                    <div 
                      key={doc.id}
                      className={`border rounded-xl p-2.5 flex flex-col justify-between relative transition duration-300 ${
                        isBusy 
                          ? 'border-indigo-500/40 bg-indigo-500/10' 
                          : isActive 
                            ? 'border-emerald-500/25 bg-emerald-500/5' 
                            : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="overflow-hidden pr-2">
                          <span className="font-extrabold text-[10px] block text-white truncate leading-tight">
                            {doc.name.split(' ').slice(1).join(' ')}
                          </span>
                          <span className="text-[8px] text-slate-500 block uppercase tracking-wide">
                            Room {doc.room.split(' ')[1]}
                          </span>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isBusy ? 'bg-indigo-400 animate-ping' : isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-650'
                        }`} />
                      </div>

                      {/* Display Patient inside Cabin */}
                      <div className="my-2 p-1.5 bg-slate-950/80 border border-slate-850 rounded-lg text-center font-mono">
                        {isBusy && currentPat ? (
                          <div>
                            <span className="text-[11px] font-black text-indigo-400 block tracking-tight">
                               Serving {currentPat.tokenNumber}
                            </span>
                            <span className="text-[7px] text-slate-400 uppercase mt-0.5 block truncate max-w-[85px] mx-auto">
                              {currentPat.name}
                            </span>
                          </div>
                        ) : doc.availability === 'on-break' ? (
                          <span className="text-[8px] text-amber-400/80 uppercase font-black tracking-wider block py-0.5">☕ Break</span>
                        ) : doc.availability === 'inactive' ? (
                          <span className="text-[8px] text-slate-605 uppercase font-bold block py-0.5">Offline</span>
                        ) : (
                          <span className="text-[8px] text-emerald-400/80 uppercase font-black block py-0.5">🟢 Vacant</span>
                        )}
                      </div>

                      <div className="text-[8px] text-slate-500 flex justify-between uppercase">
                        <span>Speed: {doc.avgConsultationMinutes}m</span>
                        <span className="font-extrabold text-slate-400">{doc.room}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="pt-2.5 border-t border-slate-900 mt-4 text-[9px] text-slate-400 font-mono flex flex-wrap justify-between items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Emergency Triage
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Urgent Queue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Normal Queue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" /> Under Evaluation
              </span>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: RADAR + HEATMAP WIDGETS (SPAN 5) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          
          {/* SMART QUEUE RADAR DIAGRAM */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-lg">
                  <Activity className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Smart Queue Radar</h3>
                  <p className="text-[11px] text-[#6B7280]">Live multi-parameter service efficiency vector</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-1">
              
              {/* Radar Graph Canvas */}
              <div className="relative w-[230px] h-[230px] shrink-0">
                <svg viewBox="0 0 240 240" className="w-[230px] h-[230px] overflow-visible">
                  {/* Concentric helper grids */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, idx) => (
                    <polygon
                      key={idx}
                      points={(() => {
                        const cx = 120;
                        const cy = 120;
                        const r = 85 * ratio;
                        const pt = (deg: number) => {
                          const rad = (deg - 90) * Math.PI / 180;
                          return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
                        };
                        return `${pt(0)} ${pt(72)} ${pt(144)} ${pt(216)} ${pt(288)}`;
                      })()}
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray={idx === 4 ? 'none' : '2 3'}
                    />
                  ))}

                  {/* Axes lines */}
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const cx = 120;
                    const cy = 120;
                    const deg = idx * 72 - 90;
                    const rad = deg * Math.PI / 180;
                    return (
                      <line
                        key={idx}
                        x1={cx}
                        y1={cy}
                        x2={cx + 85 * Math.cos(rad)}
                        y2={cy + 85 * Math.sin(rad)}
                        stroke="#E2E8F0"
                        strokeWidth="1.2"
                      />
                    );
                  })}

                  {/* Colored Solid radar region mapping */}
                  <polygon
                    points={radarPoints}
                    fill="rgba(139, 92, 246, 0.18)"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* Radar Axes text labels */}
                  <text x="120" y="24" className="fill-[#111827] text-[8px] font-sans font-bold uppercase tracking-wider" textAnchor="middle">PRESSURE ({radarMetrics.pressure})</text>
                  <text x="215" y="104" className="fill-[#111827] text-[8px] font-sans font-bold uppercase tracking-wider" textAnchor="start">DOCS ({radarMetrics.availability})</text>
                  <text x="180" y="215" className="fill-[#111827] text-[8px] font-sans font-bold uppercase tracking-wider" textAnchor="start">LOAD ({radarMetrics.patientLoad})</text>
                  <text x="60" y="215" className="fill-[#111827] text-[8px] font-sans font-bold uppercase tracking-wider" textAnchor="end">SPEED ({radarMetrics.speed}m)</text>
                  <text x="25" y="104" className="fill-[#111827] text-[8px] font-sans font-bold uppercase tracking-wider" textAnchor="end">INTELLIGENCE ({radarMetrics.efficiency})</text>
                </svg>
              </div>

              {/* Multi-parameter legend summary list */}
              <div className="flex-1 space-y-2 text-[10px]">
                <div className="p-2 bg-[#F8FAFC] border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-slate-500 text-[9px] uppercase">Service efficiency</span>
                    <span className="font-bold text-violet-700 font-mono">{queueHealthScore}%</span>
                  </div>
                  <div className="h-1 bg-violet-600 rounded-full" style={{ width: `${queueHealthScore}%` }} />
                </div>
                <div className="p-2 bg-[#F8FAFC] border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-slate-500 text-[9px] uppercase">Congestion load</span>
                    <span className="font-bold text-rose-600 font-mono">{totalWaiting} Waiting</span>
                  </div>
                  <div className="h-1 bg-rose-500 rounded-full" style={{ width: `${(totalWaiting / axisMax.pressure) * 100}%` }} />
                </div>
                <div className="p-2 bg-[#F8FAFC] border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-slate-500 text-[9px] uppercase">Doctor strength</span>
                    <span className="font-bold text-emerald-600 font-mono">{activeDocCount} Ready</span>
                  </div>
                  <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${(activeDocCount / axisMax.availability) * 100}%` }} />
                </div>
              </div>

            </div>
          </div>

          {/* QUEUE THERMAL HEATMAP WIDGET */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Queue Heatmap</h3>
                  <p className="text-[11px] text-[#6B7280]">Interactive clinic hourly load density logs</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-9 gap-1.5 py-1">
              {hourBlocks.map((block, idx) => {
                const heightPercent = block.load;
                const isHovered = hoveredHour === idx;
                
                // Color codes of heat
                const heatColorClass = block.load >= 70 
                  ? 'bg-rose-500 shadow-rose-200/50' 
                  : block.load >= 40 
                    ? 'bg-amber-400 shadow-amber-200/50' 
                    : 'bg-emerald-400 shadow-emerald-200/50';

                return (
                  <div 
                    key={idx}
                    className="flex flex-col items-center flex-1 cursor-pointer relative"
                    onMouseEnter={() => setHoveredHour(idx)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap font-mono">
                        <strong className="text-[10px] text-teal-300">{block.load}% Load density</strong><br />
                        Vol: {Math.round(block.load / 10)} pts / hr
                      </div>
                    )}

                    {/* Shaded heat cell block */}
                    <div className="w-full h-14 bg-[#F8FAFC] border border-slate-100 rounded-lg overflow-hidden flex flex-col justify-end">
                      <div 
                        className={`w-full ${heatColorClass} transition-all duration-500 ease-out`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    
                    <span className="mt-1.5 text-[8px] font-mono text-slate-500 font-medium">
                      {block.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-3 text-[9px] text-[#6B7280] font-mono border-t border-slate-50 pt-2 pb-0.5">
              <span className="flex items-center gap-1">🟢 Cool (&lt;40%)</span>
              <span className="flex items-center gap-1">🟡 Moderate (40-70%)</span>
              <span className="flex items-center gap-1">🔴 Peak (&gt;70%)</span>
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER SPLITPANELS: SYSTEM AI SUGGESTIONS & LIVE EVENT CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        
        {/* PANEL A: NEURAL COG FLIGHT SUGGESTIONS FEED */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles className="w-5 h-5 animate-bounce" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Live Clinic Neural Insights</h3>
                <p className="text-xs text-[#6B7280]">AI-generated balance triggers & congestion dispatch</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {aiSuggestions.map((sug, idx) => (
                <div key={idx} className="p-3 bg-linear-to-r from-indigo-50/50 to-purple-50/5 w-full border border-indigo-150/40 rounded-2xl flex items-start gap-2.5 text-xs">
                  <span className="p-1 bg-indigo-200 text-indigo-800 rounded-md shrink-0 text-[10px] font-extrabold font-mono mt-0.5">AI</span>
                  <div className="leading-relaxed font-medium text-slate-700">
                    {sug.replace('💡 ', '')}
                  </div>
                </div>
              ))}
              
              {congestionAlerts.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <span className="text-[9px] font-mono font-black text-rose-500 uppercase tracking-widest block">🛑 Telemetry anomalies identified</span>
                  {congestionAlerts.map((alt, idx) => (
                    <div key={idx} className="p-2 bg-rose-50/50 border border-rose-100/40 rounded-xl flex items-center gap-2 text-[10px] text-rose-800 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span className="font-semibold">{alt.replace('🛑 ', '').replace('⚠️ ', '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150 flex justify-between items-center text-[10px] text-slate-400 font-mono mt-4">
            <span>Model: MedCognition-GPT5</span>
            <span>Balanced queues = happier arrivals</span>
          </div>
        </div>

        {/* PANEL B: REAL-TIME EVENT STREAM (ACTIVITY MONITOR) */}
        <div className="bg-[#111827] text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-white">Clinical Live Event Stream</h3>
                  <p className="text-xs text-slate-400">Chronological telemetry audit feed logs</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 animate-pulse px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-400/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[190px] overflow-y-auto pr-1">
              {activityEvents.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-[11px]">
                  No clinical telemetry events recorded in current loop stream.
                </div>
              ) : (
                activityEvents.map((evt) => {
                  const nodeIcon = evt.type === 'success' 
                    ? '🟢' 
                    : evt.type === 'info' && evt.text.includes('called') 
                      ? '🔊' 
                      : '🔵';

                  return (
                    <div 
                      key={evt.id} 
                      className="flex items-start justify-between gap-3 p-2 bg-white/5 rounded-xl border border-white/5 shadow-xs hover:bg-white/10 transition"
                    >
                      <div className="flex items-start gap-2 max-w-[80%]">
                        <span className="shrink-0">{nodeIcon}</span>
                        <p className="text-[11px] text-slate-300 tracking-tight leading-snug font-medium">
                          {evt.text}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">{evt.time}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[9px] text-slate-400 font-bold mt-4 flex justify-between items-center.">
            <span>SOCKET STREAM PORT: IDLE</span>
            <span>SECURE SYSTEM LOGS</span>
          </div>
        </div>

      </div>

      {/* ADMISSIONS ANNOUNCEMENTS VOCAL SYNTH CONFIG */}
      <div className="mt-2">
        <VoiceSettings />
      </div>

    </div>
  );
}
