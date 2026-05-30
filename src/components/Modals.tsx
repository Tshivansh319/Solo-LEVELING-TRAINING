import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, RotateCcw, Flame, AlertTriangle, Check, Edit, Save } from 'lucide-react';
import { useStore } from '../store';
import { DisciplineCheck } from '../types';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
      <div className="bg-zinc-950 border-2 border-cyan-500/30 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20 bg-cyan-500/5">
          <h2 className="text-xl font-orbitron font-black text-white tracking-widest uppercase">{title}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-cyan-400 border border-transparent hover:border-cyan-500/20 transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const ProgressChartModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const store = useStore();
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const days = view === 'daily' ? 7 : view === 'weekly' ? 28 : 90;
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const progress = store.history[key] || { 
        completedCount: 0, 
        xpGained: 0, 
        level: store.level, 
        streak: store.streak.current 
      };
      data.push({ 
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: d.toDateString(),
        ...progress 
      });
    }
    return data;
  }, [view, store.history, store.level, store.streak]);

  if (!isOpen) return null;

  // Chart Logic
  const padding = 40;
  const width = 800;
  const height = 400;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  
  const maxVal = 16; // Based on design UI

  const getPoints = (key: 'level' | 'completedCount' | 'streak') => {
    return chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * innerWidth;
      const y = height - padding - (Math.min(maxVal, d[key] as number) / maxVal) * innerHeight;
      return { x, y };
    });
  };

  const levelPoints = getPoints('level');
  const questPoints = getPoints('completedCount');
  const streakPoints = getPoints('streak');

  const createPath = (points: {x: number, y: number}[]) => 
    `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl">
      <div className="bg-zinc-950 border-2 border-cyan-500/60 w-full max-w-5xl shadow-[0_0_100px_rgba(6,182,212,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        <div className="absolute inset-0 z-[-1] opacity-20 pointer-events-none"><div className="grid-layer" /></div>
        
        <div className="flex items-center justify-between p-8 pb-2">
          <h2 className="text-4xl font-orbitron font-black text-white tracking-[0.3em] uppercase neon-text">PROGRESS CHART</h2>
          <button onClick={onClose} className="flex items-center gap-2 px-6 py-2 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-bold text-[14px] tracking-widest uppercase hover:bg-cyan-600/40 transition-all"><X size={20} /> CLOSE</button>
        </div>

        <div className="px-12 py-6">
          {/* TABS */}
          <div className="flex gap-4 mb-8">
            {(['daily', 'weekly', 'monthly'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-3 text-[12px] font-black tracking-[0.3em] uppercase border-2 transition-all ${
                  view === v 
                    ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)]' 
                    : 'bg-transparent text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10'
                }`}
              >
                {v === 'daily' ? 'DAILY (7 Days)' : v === 'weekly' ? 'WEEKLY (28 Days)' : 'MONTHLY (90 Days)'}
              </button>
            ))}
          </div>

          {/* THE CHART */}
          <div className="relative border-2 border-cyan-500/20 bg-zinc-950/40 p-1">
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y Axis Grid */}
                {[0, 4, 8, 12, 16].map((val) => {
                  const y = height - padding - (val / maxVal) * innerHeight;
                  return (
                    <g key={val}>
                      <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(6,182,212,0.1)" strokeWidth="1" />
                      <text x={padding - 10} y={y + 5} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold">{val}</text>
                    </g>
                  );
                })}

                {/* X Axis Labels (Only first and last for clarity) */}
                <text x={padding} y={height - 15} fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold">{chartData[0].date}</text>
                <text x={width - padding} y={height - 15} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold">{chartData[chartData.length-1].date}</text>

                {/* Lines */}
                <path d={createPath(levelPoints)} fill="none" stroke="rgba(6,182,212,0.8)" strokeWidth="3" className="drop-shadow-[0_0_8px_rgba(6,182,212,1)]" />
                <path d={createPath(questPoints)} fill="none" stroke="rgba(56,189,248,0.8)" strokeWidth="3" />
                <path d={createPath(streakPoints)} fill="none" stroke="rgba(251,191,36,0.8)" strokeWidth="3" />

                {/* Interaction Overlay */}
                {chartData.map((d, i) => {
                  const x = padding + (i / (chartData.length - 1)) * innerWidth;
                  return (
                    <rect 
                      key={i} 
                      x={x - 10} y={padding} width="20" height={innerHeight} 
                      fill="transparent" 
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseLeave={() => setHoverIndex(null)}
                      className="cursor-crosshair"
                    />
                  );
                })}

                {/* Hover Line & Points */}
                {hoverIndex !== null && (
                  <g>
                    <line x1={levelPoints[hoverIndex].x} y1={padding} x2={levelPoints[hoverIndex].x} y2={height - padding} stroke="rgba(255,255,255,0.2)" strokeDasharray="4" />
                    <circle cx={levelPoints[hoverIndex].x} cy={levelPoints[hoverIndex].y} r="6" fill="#06b6d4" stroke="white" strokeWidth="2" />
                    <circle cx={questPoints[hoverIndex].x} cy={questPoints[hoverIndex].y} r="6" fill="#38bdf8" stroke="white" strokeWidth="2" />
                    <circle cx={streakPoints[hoverIndex].x} cy={streakPoints[hoverIndex].y} r="6" fill="#fbbf24" stroke="white" strokeWidth="2" />
                  </g>
                )}
             </svg>

             {/* HUD TOOLTIP */}
             {hoverIndex !== null && (
               <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-zinc-950/90 border-2 border-cyan-500 p-6 shadow-[0_0_30px_rgba(6,182,212,0.4)] pointer-events-none animate-in fade-in zoom-in duration-150">
                  <h4 className="font-orbitron text-xl font-black text-white mb-4 border-b border-cyan-500/40 pb-2">{chartData[hoverIndex].date}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-8 text-[14px] font-black uppercase tracking-widest text-cyan-400">
                      <span>Level :</span> <span>{chartData[hoverIndex].level}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-[14px] font-black uppercase tracking-widest text-white">
                      <span>Quests Completed :</span> <span>{chartData[hoverIndex].completedCount}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-[14px] font-black uppercase tracking-widest text-amber-400">
                      <span>Streak :</span> <span>{chartData[hoverIndex].streak}</span>
                    </div>
                  </div>
               </div>
             )}
          </div>

          {/* LEGEND */}
          <div className="flex justify-center gap-12 mt-10">
            <div className="flex items-center gap-3">
              <div className="w-5 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-cyan-400">Level</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Quests Completed</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-amber-400">Streak</span>
            </div>
          </div>

          <p className="text-center text-zinc-600 text-[11px] font-bold uppercase tracking-[0.3em] mt-12 opacity-50">
            Progress is automatically saved daily at midnight
          </p>
        </div>
      </div>
    </div>
  );
};

export const ManageQuestsModal: React.FC<{ isOpen: boolean; onClose: () => void; type: 'permanent' | 'temporary' }> = ({ isOpen, onClose, type }) => {
  const [newTitle, setNewTitle] = useState('');
  const quests = useStore((state) => type === 'permanent' ? state.permanentQuests : state.temporaryQuests);
  const addQuest = useStore((state) => state.addQuest);
  const removeQuest = useStore((state) => state.removeQuest);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      addQuest(newTitle.trim(), type);
      setNewTitle('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${type === 'permanent' ? 'Permanent' : 'Daily'}`}>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New entry..."
          className="flex-1 bg-zinc-900 border-2 border-zinc-800 px-4 py-2 focus:outline-none focus:border-cyan-400 text-[13px] font-bold text-white tracking-wider uppercase placeholder:opacity-20 transition-all"
        />
        <button type="submit" className="bg-cyan-900/40 hover:bg-cyan-600/60 text-cyan-400 px-4 py-2 border-2 border-cyan-500/40 transition-all">
          <Plus size={20} />
        </button>
      </form>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
        {quests.map((q) => (
          <div key={q.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/20 transition-all group">
            <span className="text-[12px] font-bold text-zinc-300 uppercase tracking-widest truncate">{q.title}</span>
            <button onClick={() => removeQuest(q.id, type)} className="text-zinc-600 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {quests.length === 0 && <p className="text-center text-zinc-500 py-4 italic text-sm">Empty Database</p>}
      </div>
    </Modal>
  );
};

export const TemporaryQuestHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const history = useStore((state) => state.completedTemporaryHistory);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
      <div className="bg-zinc-950 border-2 border-cyan-500/50 w-full max-w-xl shadow-[0_0_60px_rgba(6,182,212,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        <div className="absolute inset-0 z-[-1] opacity-10 pointer-events-none"><div className="grid-layer" /></div>
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-2xl font-orbitron font-black text-cyan-400 tracking-[0.2em] uppercase neon-text">TEMPORARY QUESTS HISTORY</h2>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-bold text-[11px] tracking-widest uppercase hover:bg-cyan-600/40 transition-all"><X size={14} /> CLOSE</button>
        </div>
        <div className="px-8 py-4">
          <p className="text-zinc-400 text-[12px] font-bold tracking-widest uppercase mb-6 opacity-70">These are custom quests that disappeared after midnight. They vanish automatically each day.</p>
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scroll mb-8">
            {history.map((entry) => (
              <div key={entry.id} className="p-4 border border-cyan-500/40 bg-zinc-950/40 flex items-center gap-5 group hover:border-cyan-500/80 transition-all">
                <Check className="text-cyan-400 shrink-0" size={20} strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-[14px] font-black text-zinc-100 uppercase tracking-widest">{entry.title}</span>
                  <span className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest mt-0.5">Completed: {entry.completedAt}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="py-20 text-center"><p className="text-zinc-600 font-bold tracking-[0.3em] uppercase italic">NO MISSION DATA DETECTED</p></div>}
          </div>
          <div className="border-t border-cyan-500/20 pt-4 flex justify-center"><span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Total completed temporary quests: {history.length}</span></div>
        </div>
      </div>
    </div>
  );
};

export const ManageStreakModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPenaltyType, setEditPenaltyType] = useState<'xp_reset' | 'level_reduction'>('xp_reset');
  const [editPenaltyVal, setEditPenaltyVal] = useState(0);

  const startEdit = (c: DisciplineCheck) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditPenaltyType(c.penaltyType);
    setEditPenaltyVal(c.penaltyValue);
  };

  const handleSave = () => {
    if (editingId) {
      if (editingId === 'new') {
        store.addDisciplineCheck(editTitle, editPenaltyType, editPenaltyVal);
      } else {
        store.updateDisciplineCheck(editingId, editTitle, editPenaltyType, editPenaltyVal);
      }
      setEditingId(null);
    }
  };

  if (!isOpen) return null;

  // Format streak string based on individual discipline checks
  const pipedStreak = store.disciplineChecks.length > 0 
    ? store.disciplineChecks.map(c => c.currentStreak).join(' | ') 
    : store.streak.current.toString();

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
      <div className="bg-zinc-950 border-2 border-cyan-500/50 w-full max-w-2xl shadow-[0_0_60px_rgba(6,182,212,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        <div className="absolute inset-0 z-[-1] opacity-10 pointer-events-none"><div className="grid-layer" /></div>
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-2xl font-orbitron font-black text-cyan-400 tracking-[0.2em] uppercase neon-text">MANAGE STREAKS</h2>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-bold text-[11px] tracking-widest uppercase hover:bg-cyan-600/40 transition-all"><X size={14} /> CLOSE</button>
        </div>
        <div className="px-8 py-4">
          <p className="text-zinc-400 text-[12px] font-bold tracking-widest uppercase mb-6 opacity-70">Customize discipline checks and penalties. Each check tracks its own streak.</p>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scroll mb-6">
            {store.disciplineChecks.map((check) => (
              <div key={check.id} className="p-5 border border-cyan-500/40 bg-zinc-950/40 relative group">
                {editingId === check.id ? (
                  <div className="space-y-3">
                    <input className="w-full bg-zinc-900 border border-cyan-500/40 p-2 text-sm text-white font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-400" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <div className="flex gap-4">
                      <select className="flex-1 bg-zinc-900 border border-cyan-500/40 p-2 text-[10px] text-zinc-300 uppercase font-bold" value={editPenaltyType} onChange={(e) => setEditPenaltyType(e.target.value as any)}>
                        <option value="xp_reset">XP Penalty: Reset to 0</option>
                        <option value="level_reduction">Level Penalty: Reduce Rank</option>
                      </select>
                      {editPenaltyType === 'level_reduction' && (
                        <input type="number" className="w-16 bg-zinc-900 border border-cyan-500/40 p-2 text-center text-white font-bold" value={editPenaltyVal} onChange={(e) => setEditPenaltyVal(parseInt(e.target.value))} />
                      )}
                    </div>
                    <button onClick={handleSave} className="w-full py-2 bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500/40 transition-all flex items-center justify-center gap-2"><Save size={14} /> Commit Changes</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 pr-12">
                      <h4 className="text-[14px] font-black text-zinc-100 uppercase tracking-widest leading-snug">{check.title}</h4>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest opacity-80">Penalty: {check.penaltyType === 'xp_reset' ? 'Reset XP to 0' : `Reduce ${check.penaltyValue} Levels`}</p>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Current Streak: <span className="text-cyan-400">{check.currentStreak} days</span> 🔥</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => startEdit(check)} className="p-2 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 transition-all"><Edit size={16} /></button>
                      <button onClick={() => store.removeDisciplineCheck(check.id)} className="p-2 border border-red-500/40 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {editingId === 'new' ? (
               <div className="p-5 border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 space-y-3">
                  <input placeholder="ENTER PROTOCOL TITLE..." className="w-full bg-zinc-900 border border-cyan-500/40 p-2 text-sm text-white font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-400" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <div className="flex gap-4">
                    <select className="flex-1 bg-zinc-900 border border-cyan-500/40 p-2 text-[10px] text-zinc-300 uppercase font-bold" value={editPenaltyType} onChange={(e) => setEditPenaltyType(e.target.value as any)}>
                      <option value="xp_reset">XP Penalty: Reset to 0</option>
                      <option value="level_reduction">Level Penalty: Reduce Rank</option>
                    </select>
                    {editPenaltyType === 'level_reduction' && <input type="number" placeholder="LVL" className="w-16 bg-zinc-900 border border-cyan-500/40 p-2 text-center text-white font-bold" value={editPenaltyVal} onChange={(e) => setEditPenaltyVal(parseInt(e.target.value))} />}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 py-2 bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500/40 transition-all">INITIALIZE</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-zinc-800 text-zinc-500 font-black text-[10px] uppercase">CANCEL</button>
                  </div>
               </div>
            ) : (
              <button onClick={() => { setEditingId('new'); setEditTitle(''); setEditPenaltyType('xp_reset'); setEditPenaltyVal(0); }} className="w-full py-4 border-2 border-dashed border-cyan-500/20 text-cyan-500/60 hover:border-cyan-500/60 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all font-black text-[11px] tracking-[0.3em] uppercase flex items-center justify-center gap-3"><Plus size={18} /> Add New Discipline Check</button>
            )}
          </div>
          <div className="p-5 border border-cyan-500/40 bg-zinc-950/60 mb-8">
            <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Combined Streaks Display:</h5>
            <p className="text-[18px] font-black text-white uppercase tracking-widest">Streak: <span className="text-cyan-400">{pipedStreak}</span> 🔥</p>
          </div>
          <button onClick={onClose} className="w-full py-4 bg-cyan-500 text-black font-black tracking-[0.4em] text-[13px] uppercase hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)]">SAVE ALL CHANGES</button>
        </div>
      </div>
    </div>
  );
};

export const ManageProgressModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const resetProgressAll = useStore((state) => state.resetProgressAll);
  const [confirmText, setConfirmText] = useState('');
  const handleReset = () => { if (confirmText === 'RESET') { resetProgressAll(); onClose(); setConfirmText(''); } };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MANAGE PROGRESS">
      <div className="flex flex-col gap-6">
        <div className="border-2 border-red-500 p-4 bg-red-950/10 flex gap-3"><AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} /><p className="text-[11px] font-bold tracking-wider leading-relaxed text-zinc-200"><span className="text-white font-black">WARNING:</span> This will reset all your progress data including level, XP, streak, and task completion history. This action cannot be undone!</p></div>
        <div>
          <p className="text-zinc-300 text-[13px] font-bold tracking-widest mb-3">Type <span className="text-red-400">RESET</span> to confirm:</p>
          <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type RESET..." className="w-full bg-zinc-950 border-2 border-cyan-500/40 px-4 py-3 focus:outline-none focus:border-cyan-400 text-white font-black tracking-[0.2em] text-center" />
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 border-2 border-cyan-500/60 text-cyan-400 py-3 text-[12px] font-black tracking-widest uppercase hover:bg-cyan-500/10 transition-all">CANCEL</button>
          <button disabled={confirmText !== 'RESET'} onClick={handleReset} className={`flex-1 border-2 py-3 text-[12px] font-black tracking-widest uppercase transition-all ${confirmText === 'RESET' ? 'border-red-500 text-red-500 hover:bg-red-500/20' : 'border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'}`}>RESET ALL</button>
        </div>
      </div>
    </Modal>
  );
};

export const ResetDayModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const store = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
      <div className="bg-zinc-950 border-2 border-cyan-500/50 w-full max-w-2xl shadow-[0_0_60px_rgba(6,182,212,0.3)] overflow-hidden animate-in fade-in zoom-in duration-300 relative">
        <div className="absolute inset-0 z-[-1] opacity-10 pointer-events-none"><div className="grid-layer" /></div>
        
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-2xl font-orbitron font-black text-cyan-400 tracking-[0.2em] uppercase neon-text">RESET DAY</h2>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-1.5 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-bold text-[11px] tracking-widest uppercase hover:bg-cyan-600/40 transition-all"><X size={14} /> CLOSE</button>
        </div>

        <div className="px-8 py-4">
          <p className="text-zinc-400 text-[12px] font-bold tracking-widest uppercase mb-6 opacity-70">Choose how you want to reset the day:</p>

          <div className="space-y-6">
            {/* OPTION 1: RESET TASKS ONLY */}
            <div className="p-6 border border-cyan-500/40 bg-zinc-950/40 group hover:border-cyan-500 transition-all">
              <h3 className="text-cyan-400 font-orbitron font-black text-lg tracking-wider mb-4 uppercase">Reset Tasks Only</h3>
              <ul className="space-y-1 mb-6">
                {["Resets all daily quests to unchecked", "Moves completed custom quests to history", "Keeps uncompleted custom quests", "Preserves all XP and Level", "Updates streak based on completion"].map((txt, i) => (
                   <li key={i} className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1 h-1 bg-cyan-400 rounded-full" /> {txt}
                   </li>
                ))}
              </ul>
              <button 
                onClick={() => { store.resetDayTasksOnly(); onClose(); }}
                className="w-full py-4 bg-cyan-950/40 border border-cyan-500/60 text-cyan-400 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-cyan-500/20 transition-all"
              >
                RESET TASKS
              </button>
            </div>

            {/* OPTION 2: RESET TASKS + XP */}
            <div className="p-6 border border-cyan-500/40 bg-zinc-950/40 group hover:border-red-500 transition-all">
              <h3 className="text-cyan-400 font-orbitron font-black text-lg tracking-wider mb-4 uppercase">Reset Tasks + Today's XP</h3>
              <ul className="space-y-1 mb-6">
                {["Resets all daily quests to unchecked", "Moves completed custom quests to history", "Keeps uncompleted custom quests", "Removes XP gained today (resets to start of day)", "May reduce level if XP drops below threshold", "Updates streak based on completion"].map((txt, i) => (
                   <li key={i} className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-1 h-1 bg-cyan-400 rounded-full" /> {txt}
                   </li>
                ))}
              </ul>
              <button 
                onClick={() => { store.resetDayWithXP(); onClose(); }}
                className="w-full py-4 bg-red-950/40 border border-red-500/60 text-red-500 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-red-500/40 transition-all"
              >
                RESET TASKS + XP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};