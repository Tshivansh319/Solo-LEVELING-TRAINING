
import React from 'react';
import { Check, Trash2, Zap, Clock } from 'lucide-react';
import { Quest } from '../types';

interface QuestItemProps {
  quest: Quest;
  onToggle: () => void;
  onDelete: () => void;
}

const QuestItem: React.FC<QuestItemProps> = ({ quest, onToggle, onDelete }) => {
  return (
    <div className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
      quest.completed 
        ? 'bg-zinc-900/50 border-emerald-500/20 opacity-60' 
        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggle}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            quest.completed
              ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
              : 'border-zinc-700 hover:border-emerald-500/50'
          }`}
        >
          {quest.completed && <Check size={18} strokeWidth={3} />}
        </button>
        <div className="flex flex-col">
          <span className={`font-medium transition-all ${quest.completed ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
            {quest.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {quest.type === 'permanent' ? (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-amber-500">
                <Zap size={10} /> Permanent
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-sky-400">
                <Clock size={10} /> Daily Task
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default QuestItem;
