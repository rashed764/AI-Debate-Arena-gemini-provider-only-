import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { AudienceQuestion } from '../types';

interface AudienceQuestionsProps {
  debateId: string;
  questions: AudienceQuestion[];
  onAddQuestion: (authorName: string, questionText: string) => Promise<void>;
  isInteractiveMode: boolean;
}

export const AudienceQuestions: React.FC<AudienceQuestionsProps> = ({
  debateId,
  questions,
  onAddQuestion,
  isInteractiveMode,
}) => {
  const [author, setAuthor] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddQuestion(author.trim() || 'Audience Member', questionText.trim());
      setQuestionText('');
      setSubmittedFeedback(true);
      setTimeout(() => setSubmittedFeedback(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Audience Questions &amp; Inquiries
          </h3>
        </div>
        <span className="rounded bg-indigo-950/70 border border-indigo-800/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
          {isInteractiveMode ? 'Live Interactive Mode' : 'Audience Queue'}
        </span>
      </div>

      {/* Question Submission Form */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <input
            type="text"
            placeholder="Your Name (or alias)..."
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <textarea
            rows={2}
            placeholder="Pose a philosophical question for Atheist AI & Believer AI..."
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {isInteractiveMode
              ? 'Selected questions are addressed live during debate rounds.'
              : 'Switch to Interactive Mode when starting to inject audience questions.'}
          </span>
          <button
            type="submit"
            disabled={submitting || !questionText.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-950 hover:bg-indigo-500 transition disabled:opacity-50 active:scale-95"
          >
            <Send className="h-3 w-3" />
            <span>{submitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>

        {submittedFeedback && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Question submitted to the debate moderator queue!</span>
          </div>
        )}
      </form>

      {/* Submitted Questions Stream */}
      <div className="mt-5 border-t border-slate-800 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Recent Audience Submissions ({questions.length})
        </span>

        <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
          {questions.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No questions submitted yet. Be the first to ask!
            </p>
          ) : (
            questions.map(q => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{q.authorName}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-medium capitalize ${
                      q.status === 'answered'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
                <p className="mt-1 text-slate-400 italic">"{q.questionText}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
