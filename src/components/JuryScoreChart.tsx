import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Debate } from '../types';
import { BarChart3 } from 'lucide-react';

interface JuryScoreChartProps {
  debate: Debate;
}

const COLOR_HEX: Record<string, string> = {
  cyan: '#06b6d4',
  amber: '#f59e0b',
  emerald: '#10b981',
  purple: '#a855f7',
  rose: '#f43f5e',
  blue: '#3b82f6',
  indigo: '#6366f1',
  orange: '#f97316',
};

export const JuryScoreChart: React.FC<JuryScoreChartProps> = ({ debate }) => {
  const [chartType, setChartType] = useState<'radar' | 'trend' | 'bar'>('radar');

  const d1Name = debate.debater1?.name || 'Debater 1';
  const d2Name = debate.debater2?.name || 'Debater 2';
  const d1Color = COLOR_HEX[debate.debater1?.accentColor || 'cyan'] || '#06b6d4';
  const d2Color = COLOR_HEX[debate.debater2?.accentColor || 'amber'] || '#f59e0b';

  const messages = Array.isArray(debate.messages) ? debate.messages : [];
  const d1Messages = messages.filter(m => m.speakerSide === 'debater1' || m.persona === 'atheist');
  const d2Messages = messages.filter(m => m.speakerSide === 'debater2' || m.persona === 'believer');

  // Compute category scores based on message metrics
  const computeScore = (msgs: typeof messages, categoryKey: string) => {
    if (msgs.length === 0) return 50;
    let total = 0;
    msgs.forEach((m, idx) => {
      let base = 70;
      if (categoryKey === 'logic') {
        base += (m.reasoning?.length || 0) * 8;
      } else if (categoryKey === 'evidence') {
        base += (m.sources?.length || 0) * 12;
      } else if (categoryKey === 'depth') {
        base += Math.min(25, Math.floor((m.rawText?.length || 0) / 30));
      } else if (categoryKey === 'eloquence') {
        base += (m.mainClaim?.length || 0) > 60 ? 15 : 5;
      } else if (categoryKey === 'responsiveness') {
        base += m.responseToOpponent ? 20 : 10;
      }
      base += idx * 2;
      total += Math.min(99, Math.max(55, base));
    });
    return Math.round(total / msgs.length);
  };

  const d1Scores = {
    logic: computeScore(d1Messages, 'logic'),
    evidence: computeScore(d1Messages, 'evidence'),
    depth: computeScore(d1Messages, 'depth'),
    eloquence: computeScore(d1Messages, 'eloquence'),
    responsiveness: computeScore(d1Messages, 'responsiveness'),
  };

  const d2Scores = {
    logic: computeScore(d2Messages, 'logic'),
    evidence: computeScore(d2Messages, 'evidence'),
    depth: computeScore(d2Messages, 'depth'),
    eloquence: computeScore(d2Messages, 'eloquence'),
    responsiveness: computeScore(d2Messages, 'responsiveness'),
  };

  const radarData = [
    { category: 'Logical Rigor', [d1Name]: d1Scores.logic, [d2Name]: d2Scores.logic, fullMark: 100 },
    { category: 'Empirical Evidence', [d1Name]: d1Scores.evidence, [d2Name]: d2Scores.evidence, fullMark: 100 },
    { category: 'Dialectical Depth', [d1Name]: d1Scores.depth, [d2Name]: d2Scores.depth, fullMark: 100 },
    { category: 'Oratorical Eloquence', [d1Name]: d1Scores.eloquence, [d2Name]: d2Scores.eloquence, fullMark: 100 },
    { category: 'Rebuttal Responsiveness', [d1Name]: d1Scores.responsiveness, [d2Name]: d2Scores.responsiveness, fullMark: 100 },
  ];

  // Round trend data for line chart
  const roundMap = new Map<number, { round: string; [key: string]: string | number }>();
  messages.forEach((m, idx) => {
    const roundKey = m.roundNumber || Math.floor(idx / 2) + 1;
    if (!roundMap.has(roundKey)) {
      roundMap.set(roundKey, { round: `Round ${roundKey}`, [d1Name]: 70, [d2Name]: 70 });
    }
    const entry = roundMap.get(roundKey)!;
    const scoreVal = Math.min(98, 70 + (m.reasoning?.length || 1) * 7 + (m.sources?.length || 0) * 10);
    if (m.speakerSide === 'debater1' || m.persona === 'atheist') {
      entry[d1Name] = scoreVal;
    } else {
      entry[d2Name] = scoreVal;
    }
  });

  const trendData = Array.from(roundMap.values());

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">AI Jury Score Analytics &amp; Trends</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Objective multi-dimensional adjudication across logical rigor, evidence, depth, and eloquence.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setChartType('radar')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              chartType === 'radar' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Radar Profile
          </button>
          <button
            onClick={() => setChartType('trend')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              chartType === 'trend' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Round Trends
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              chartType === 'bar' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Category Bars
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        {chartType === 'radar' && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius={90}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
              <Radar name={d1Name} dataKey={d1Name} stroke={d1Color} fill={d1Color} fillOpacity={0.4} />
              <Radar name={d2Name} dataKey={d2Name} stroke={d2Color} fill={d2Color} fillOpacity={0.4} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'trend' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="round" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis domain={[50, 100]} stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
              <Line type="monotone" dataKey={d1Name} stroke={d1Color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey={d2Name} stroke={d2Color} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={radarData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
              <Bar dataKey={d1Name} fill={d1Color} radius={[4, 4, 0, 0]} />
              <Bar dataKey={d2Name} fill={d2Color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
