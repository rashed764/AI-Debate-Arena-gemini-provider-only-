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
import { BarChart3, TrendingUp, Compass } from 'lucide-react';

interface JuryScoreChartProps {
  debate: Debate;
}

export const JuryScoreChart: React.FC<JuryScoreChartProps> = ({ debate }) => {
  const [chartType, setChartType] = useState<'radar' | 'trend' | 'bar'>('radar');

  const messages = Array.isArray(debate.messages) ? debate.messages : [];
  const atheistMessages = messages.filter(m => m.persona === 'atheist');
  const believerMessages = messages.filter(m => m.persona === 'believer');

  // Compute category scores based on message metrics (reasoning count, sources, length, turn depth)
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
      // Add slight progressive evolution bonus
      base += idx * 2;
      total += Math.min(99, Math.max(55, base));
    });
    return Math.round(total / msgs.length);
  };

  const atheistScores = {
    logic: computeScore(atheistMessages, 'logic'),
    evidence: computeScore(atheistMessages, 'evidence'),
    depth: computeScore(atheistMessages, 'depth'),
    eloquence: computeScore(atheistMessages, 'eloquence'),
    responsiveness: computeScore(atheistMessages, 'responsiveness'),
  };

  const believerScores = {
    logic: computeScore(believerMessages, 'logic'),
    evidence: computeScore(believerMessages, 'evidence'),
    depth: computeScore(believerMessages, 'depth'),
    eloquence: computeScore(believerMessages, 'eloquence'),
    responsiveness: computeScore(believerMessages, 'responsiveness'),
  };

  const radarData = [
    { category: 'Logical Rigor', Atheist: atheistScores.logic, Believer: believerScores.logic, fullMark: 100 },
    { category: 'Empirical Evidence', Atheist: atheistScores.evidence, Believer: believerScores.evidence, fullMark: 100 },
    { category: 'Philosophical Depth', Atheist: atheistScores.depth, Believer: believerScores.depth, fullMark: 100 },
    { category: 'Oratorical Eloquence', Atheist: atheistScores.eloquence, Believer: believerScores.eloquence, fullMark: 100 },
    { category: 'Responsiveness', Atheist: atheistScores.responsiveness, Believer: believerScores.responsiveness, fullMark: 100 },
  ];

  // Round trend data for line chart
  const roundMap = new Map<number, { round: string; Atheist: number; Believer: number }>();
  messages.forEach((m, idx) => {
    const roundKey = m.roundNumber || Math.floor(idx / 2) + 1;
    if (!roundMap.has(roundKey)) {
      roundMap.set(roundKey, { round: `Round ${roundKey}`, Atheist: 70, Believer: 70 });
    }
    const entry = roundMap.get(roundKey)!;
    const scoreVal = Math.min(98, 70 + (m.reasoning?.length || 1) * 7 + (m.sources?.length || 0) * 10);
    if (m.persona === 'atheist') {
      entry.Atheist = scoreVal;
    } else {
      entry.Believer = scoreVal;
    }
  });

  const trendData = Array.from(roundMap.values());

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 v-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">AI Jury Score Analytics &amp; Trends</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated multi-dimensional evaluation across logical rigor, evidence, depth, and eloquence.
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
              <Radar name="Atheist AI" dataKey="Atheist" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
              <Radar name="Believer AI" dataKey="Believer" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
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
              <Line type="monotone" dataKey="Atheist" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Believer" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
              <Bar dataKey="Atheist" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Believer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-slate-800/80 pt-4 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-cyan-500" />
          <span>Atheist AI Aggregate Score: <strong className="text-white font-semibold">{Math.round((atheistScores.logic + atheistScores.evidence + atheistScores.depth + atheistScores.eloquence + atheistScores.responsiveness) / 5)} / 100</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span>Believer AI Aggregate Score: <strong className="text-white font-semibold">{Math.round((believerScores.logic + believerScores.evidence + believerScores.depth + believerScores.eloquence + believerScores.responsiveness) / 5)} / 100</strong></span>
        </div>
      </div>
    </div>
  );
};
