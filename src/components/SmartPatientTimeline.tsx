import React from 'react';
import { Patient } from '../types';
import { Check, ClipboardList, Radio, Stethoscope, CheckCircle, Clock } from 'lucide-react';

interface TimelineProps {
  patient: Patient;
}

export function SmartPatientTimeline({ patient }: TimelineProps) {
  // Clinical stages indicators
  const stages = [
    {
      key: 'checkin',
      name: 'Check-in & Registration',
      description: 'Patient credentials verified and logged into clinical directory database',
      time: patient.createdAt ? new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      completed: !!patient.createdAt,
      active: patient.status === 'waiting' && !patient.calledAt
    },
    {
      key: 'queue',
      name: 'Queue Placement & Triaging',
      description: `Triage Priority assigned: ${patient.priority.toUpperCase()} compliance checklist`,
      time: patient.createdAt ? new Date(new Date(patient.createdAt).getTime() + 1000 * 60).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      completed: !!patient.createdAt,
      active: patient.status === 'waiting'
    },
    {
      key: 'called',
      name: 'Vocal Summon & Board Ring',
      description: patient.calledAt 
        ? `Summoned to medical cabin by ${patient.doctorName}`
        : 'Awaiting summon alert from medical practitioner',
      time: patient.calledAt ? new Date(patient.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      completed: !!patient.calledAt,
      active: patient.status === 'called'
    },
    {
      key: 'consultation',
      name: 'Active Examination & Care',
      description: patient.status === 'in-consultation' 
        ? 'Physical clinical care and treatment assessment under progression' 
        : patient.status === 'completed' 
          ? 'Diagnostics and medication directives complete'
          : 'Waiting for exam door unlock',
      time: patient.status === 'in-consultation' && patient.calledAt 
        ? new Date(new Date(patient.calledAt).getTime() + 1000 * 60 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : patient.completedAt 
          ? new Date(new Date(patient.completedAt).getTime() - 1000 * 60 * (patient.consultationMinutes || 5)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null,
      completed: patient.status === 'in-consultation' || patient.status === 'completed',
      active: patient.status === 'in-consultation'
    },
    {
      key: 'completed',
      name: 'Pharmacy Release & Completed',
      description: patient.status === 'completed'
        ? `Treated successfully. Consultation time: ${patient.consultationMinutes || 8} Mins`
        : 'Locked until practitioner clinical sign-off',
      time: patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      completed: patient.status === 'completed',
      active: patient.status === 'completed'
    }
  ];

  return (
    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 md:p-5 text-xs text-[#374151] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-150/40">
        <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1">
          <Clock size={12} className="text-teal-500 shrink-0" /> Smart Patient Care Timeline
        </h4>
        <span className="text-[10px] font-mono text-slate-400">
          TOKEN ID: {patient.tokenNumber}
        </span>
      </div>

      <div className="relative pl-6 space-y-5">
        
        {/* Draw vertical connecting timeline bar line */}
        <div className="absolute left-2.5 top-1.5 bottom-1.5 w-[2px] bg-slate-205" />

        {stages.map((stage) => {
          let nodeIcon = <div className="w-2.5 h-2.5 rounded-full bg-slate-350" />;
          let textWeightClass = 'text-slate-450';
          let borderHighlight = 'border-slate-200';

          if (stage.completed) {
            nodeIcon = (
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                <Check size={11} className="stroke-[3.5]" />
              </span>
            );
            textWeightClass = 'text-[#111827]';
            borderHighlight = 'border-emerald-250 bg-emerald-50/20';
          } else if (stage.active) {
            nodeIcon = (
              <span className="relative flex h-5.5 w-5.5 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm ring-4 ring-teal-100 animate-pulse">
                <Radio size={11} className="animate-pulse" />
              </span>
            );
            textWeightClass = 'font-bold text-teal-800';
            borderHighlight = 'border-teal-300 bg-teal-50/25 shadow-xs animate-pulse';
          } else {
            nodeIcon = (
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-slate-200 border border-slate-300 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
              </span>
            );
          }

          return (
            <div key={stage.key} className="relative flex gap-4 items-start">
              
              {/* Timeline marker node dot */}
              <div className="absolute left-[-23px] top-0.5 z-10 flex items-center justify-center bg-slate-50">
                {nodeIcon}
              </div>

              {/* Step info block */}
              <div className={`flex-1 p-3 border rounded-xl ${borderHighlight} transition-all duration-300`}>
                <div className="flex justify-between items-start gap-2">
                  <h5 className={`font-black tracking-tight text-xs ${textWeightClass}`}>
                    {stage.name}
                  </h5>
                  {stage.time && (
                    <span className="text-[10px] font-mono font-bold text-[#6B7280]">
                      {stage.time}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">
                  {stage.description}
                </p>
              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}
