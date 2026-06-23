import React, { useState } from 'react';
import { AnalyticsSummary } from '../types';
import { BarChart, Clock, TrendingUp, Users, Calendar, Award } from 'lucide-react';

interface ChartsProps {
  analytics: AnalyticsSummary;
}

export function AnalyticsCharts({ analytics }: ChartsProps) {
  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // --- Calculations for Hourly Load graph ---
  const hourlyData = analytics.patientsPerHour || [];
  const maxHourCount = Math.max(...hourlyData.map((d) => d.count), 4);
  const hourGraphHeight = 160;
  const hourGraphWidth = 500;

  // --- Calculations for Weekly traffic ---
  const dailyData = analytics.patientsPerDay || [];
  const maxDayCount = Math.max(...dailyData.map((d) => d.count), 4);
  const dayGraphHeight = 160;

  // --- Max Doctor efficiency metric ---
  const doctorsData = analytics.doctorEfficiencyList || [];
  const maxServed = Math.max(...doctorsData.map((d) => d.served), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* CARD 1: Hourly Queue Flow */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs hover:shadow-xs transition duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#2563EB]/10 text-[#2563EB] rounded-lg">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-[#111827]">Hourly Patient Flow</h3>
              <p className="text-xs text-[#6B7280]">Admissions over past 6 hours</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Live
          </span>
        </div>

        {hourlyData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#6B7280]">No hourly data compiled yet.</div>
        ) : (
          <div className="mt-6">
            {/* Custom SVG Line Chart */}
            <div className="relative">
              <svg viewBox={`0 0 ${hourGraphWidth} ${hourGraphHeight}`} className="w-full h-auto overflow-visible">
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="hour-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = hourGraphHeight - ratio * hourGraphHeight;
                  return (
                    <g key={idx}>
                      <line
                        x1="0"
                        y1={y}
                        x2={hourGraphWidth}
                        y2={y}
                        stroke="#F1F5F9"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />
                      <text
                        x="-10"
                        y={ratio === 0 ? y + 10 : ratio === 1 ? y + 3 : y + 4}
                        className="fill-[#94A3B8] font-mono text-[10px]"
                        textAnchor="end"
                      >
                        {Math.round(ratio * maxHourCount)}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Area / Line */}
                {(() => {
                  const points = hourlyData.map((d, idx) => {
                    const x = (idx / (hourlyData.length - 1)) * hourGraphWidth;
                    const y = hourGraphHeight - (d.count / maxHourCount) * hourGraphHeight;
                    return { x, y, ...d };
                  });

                  // Construct SVG Path attributes
                  const pathD = points.reduce(
                    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                    ''
                  );
                  const areaD = `${pathD} L ${points[points.length - 1].x} ${hourGraphHeight} L ${points[0].x} ${hourGraphHeight} Z`;

                  return (
                    <>
                      {/* Area Fill */}
                      <path d={areaD} fill="url(#hour-grad)" />

                      {/* Smooth Stroke Line */}
                      <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

                      {/* Interactive Data Nodes */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            className="fill-white stroke-[#2563EB] cursor-pointer"
                            strokeWidth="3"
                            onMouseEnter={() => setHoveredHourIndex(idx)}
                            onMouseLeave={() => setHoveredHourIndex(null)}
                          />
                          {hoveredHourIndex === idx && (
                            <g>
                              {/* Background bubble tooltip */}
                              <rect
                                x={p.x - 30}
                                y={p.y - 32}
                                width="60"
                                height="22"
                                rx="6"
                                className="fill-[#111827]"
                              />
                              <text
                                x={p.x}
                                y={p.y - 18}
                                className="fill-white text-[11px] font-mono font-medium"
                                textAnchor="middle"
                              >
                                {p.count} Patients
                              </text>
                            </g>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Labels beneath chart */}
            <div className="flex justify-between mt-4">
              {hourlyData.map((d, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-[10px] font-mono font-medium text-[#6B7280]">
                    {d.hour.split(' ')[0]} {/* Grab timestamp prefix */}
                    <span className="text-[8px] text-[#94A3B8]">{d.hour.split(' ')[1] || ''}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: Weekly Patient Trend */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs hover:shadow-xs transition duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#14B8A6]/10 text-[#14B8A6] rounded-lg">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-[#111827]">Weekly Traffic Distribution</h3>
              <p className="text-xs text-[#6B7280]">Comparative daily volume logs</p>
            </div>
          </div>
        </div>

        {dailyData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#6B7280]">No daily database logs logged yet.</div>
        ) : (
          <div className="mt-6">
            <div className="flex items-end justify-between h-[160px] gap-2 border-b border-[#F1F5F9] pb-2">
              {dailyData.map((d, idx) => {
                const heightPercent = maxDayCount > 0 ? (d.count / maxDayCount) * 100 : 5;
                const isHovered = hoveredDayIndex === idx;

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center flex-1 group relative cursor-pointer"
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 bg-[#111827] text-white text-[10px] px-2 py-1 rounded shadow-md z-10 whitespace-nowrap">
                        <span className="font-mono font-bold font-medium">{d.count} patients</span>
                      </div>
                    )}

                    {/* Colored vertical bar */}
                    <div className="w-full relative rounded-t-md overflow-hidden bg-[#F1F5F9]" style={{ height: '140px' }}>
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500 ease-out ${
                          isHovered 
                            ? 'bg-[#14B8A6]' 
                            : 'bg-[#14B8A6]/85'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {/* Shading effect */}
                        <div className="absolute inset-0 bg-linear-to-t from-[#111827]/10 to-transparent" />
                      </div>
                    </div>

                    <span className="mt-2 text-xs font-semibold text-[#111827]">{d.day}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between mt-3 text-[10px] text-[#6B7280]">
              <span>Lowest: 0 pts</span>
              <span>Capacity: {maxDayCount} pts</span>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: Doctor Efficiency Board */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs hover:shadow-xs transition duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-lg">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-sm text-[#111827]">Doctor Efficiency Tracker</h3>
              <p className="text-xs text-[#6B7280]">Avg consultation time / Patients served</p>
            </div>
          </div>
        </div>

        {doctorsData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#6B7280]">No active metrics detected.</div>
        ) : (
          <div className="mt-4 space-y-4 max-h-[190px] overflow-y-auto pr-1">
            {doctorsData.map((doc, idx) => {
              const workloadRatio = maxServed > 0 ? (doc.served / maxServed) * 100 : 10;
              
              // Speed thresholds: <8 Min is extremely fast (emerald), 8-12 normal (blue/purple), >12 is thorough (amber)
              const badgeColor = doc.avgTime <= 8 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : doc.avgTime <= 12 
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              return (
                <div key={idx} className="space-y-1.5 pb-2 border-b border-[#F8FAFC] last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#111827]">{doc.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor} font-mono`}>
                      {doc.avgTime} Mins/pt
                    </span>
                  </div>

                  {/* Relative fill indicator bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-[#8B5CF6] to-[#A78BFA] rounded-full transition-all duration-700"
                        style={{ width: `${workloadRatio}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-mono font-medium whitespace-nowrap min-w-[34px] text-right">
                      {doc.served} served
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
