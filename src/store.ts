import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, Quest, Streak, CompletedQuestHistory, DisciplineCheck } from './types.ts';
import { supabaseService } from './services/supabase.ts';

interface StoreActions {
  authenticate: (code: string) => Promise<void>;
  logout: () => void;
  addQuest: (title: string, type: 'permanent' | 'temporary') => void;
  removeQuest: (id: string, type: 'permanent' | 'temporary') => void;
  editQuest: (id: string, newTitle: string) => void;
  toggleQuest: (id: string, type: 'permanent' | 'temporary') => void;
  
  addDisciplineCheck: (title: string, penaltyType: 'xp_reset' | 'level_reduction', penaltyValue: number) => void;
  removeDisciplineCheck: (id: string) => void;
  updateDisciplineCheck: (id: string, title: string, penaltyType: 'xp_reset' | 'level_reduction', penaltyValue: number) => void;
  triggerDisciplineFailure: (id: string) => void;
  
  breakDiscipline: () => void;
  toggleVoice: () => void;
  checkDailyReset: () => void;
  resetDayTasksOnly: () => void;
  resetDayWithXP: () => void;
  resetDayManual: () => void; 
  updateStreakManual: (val: number) => void;
  resetProgressAll: () => void;
  addObtainedTitle: (title: string) => void;
  setActiveTitle: (title: string) => void;
  setObtainedTitles: (titles: string[]) => void;
  addCodingXp: (xp: number) => void;
  
  applyRemoteUpdate: (data: any) => void;
}

export const calculateRequiredXP = (level: number) => 100 + (level - 1) * 30;

export const calculateRank = (level: number) => {
  const ranks = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const index = Math.min(Math.floor((level - 1) / 15), ranks.length - 1);
  return ranks[index];
};

const DEFAULT_PERMANENT_QUESTS = [
  "Wake up at 5 AM", "40+ Min Editing", "Squats", "90+ Min Coding",
  "Pushups", "1 LeetCode Problem", "Situps", "Language Practice", "6–7 AM Walking"
];

const DEFAULT_DISCIPLINE_CHECKS: DisciplineCheck[] = [
  {
    id: 'junk-food',
    title: 'Did you spend money today on junk food?',
    penaltyType: 'xp_reset',
    penaltyValue: 0,
    currentStreak: 0,
    lastFailedDate: null
  },
  {
    id: 'broken-discipline',
    title: 'Did you break your discipline today?',
    penaltyType: 'level_reduction',
    penaltyValue: 3,
    currentStreak: 0,
    lastFailedDate: null
  }
];

const initialState: AppState = {
  isAuthenticated: false,
  userCode: null,
  permanentQuests: DEFAULT_PERMANENT_QUESTS.map(title => ({
    id: Math.random().toString(36).substr(2, 9),
    title,
    completed: false,
    type: 'permanent',
    createdAt: new Date().toISOString()
  })),
  temporaryQuests: [],
  completedTemporaryHistory: [],
  disciplineChecks: DEFAULT_DISCIPLINE_CHECKS,
  streak: { current: 0, longest: 0, lastCompletedDate: null },
  xp: 0,
  level: 1,
  codingXp: 0,
  codingLevel: 1,
  obtainedTitles: [],
  activeTitle: "E-Rank Recruit",
  disciplineBroken: false,
  voiceEnabled: true,
  lastResetDate: new Date().toDateString(),
  history: {},
  lastUpdateTimestamp: 0,
};

export const useStore = create<AppState & StoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      authenticate: async (code) => {
        set({ isAuthenticated: true, userCode: code });
        const remoteData = await supabaseService.fetchState(code);
        if (remoteData) {
          set((state) => ({ ...state, ...remoteData, isAuthenticated: true, userCode: code }));
        }
      },

      logout: () => {
        set({ ...initialState, isAuthenticated: false, userCode: null });
      },

      applyRemoteUpdate: (data) => {
        if (!data || !data.lastUpdateTimestamp) return;
        const state = get();
        
        if (data.lastUpdateTimestamp > state.lastUpdateTimestamp) {
          set((state) => ({
            ...state,
            ...data
          }));
        }
      },

      addQuest: (title, type) => {
        const newQuest: Quest = {
          id: crypto.randomUUID(),
          title,
          completed: false,
          type,
          createdAt: new Date().toISOString(),
        };
        if (type === 'permanent') {
          set((state) => ({ 
            permanentQuests: [...state.permanentQuests, newQuest],
            lastUpdateTimestamp: Date.now()
          }));
        } else {
          set((state) => ({ 
            temporaryQuests: [...state.temporaryQuests, newQuest],
            lastUpdateTimestamp: Date.now()
          }));
        }
      },

      removeQuest: (id, type) => {
        set((state) => ({
          permanentQuests: state.permanentQuests.filter((q) => q.id !== id),
          temporaryQuests: state.temporaryQuests.filter((q) => q.id !== id),
          lastUpdateTimestamp: Date.now()
        }));
      },

      editQuest: (id, newTitle) => {
        set((state) => ({
          permanentQuests: state.permanentQuests.map((q) => q.id === id ? { ...q, title: newTitle } : q),
          lastUpdateTimestamp: Date.now()
        }));
      },

      addDisciplineCheck: (title, penaltyType, penaltyValue) => {
        const newCheck: DisciplineCheck = {
          id: crypto.randomUUID(),
          title,
          penaltyType,
          penaltyValue,
          currentStreak: 0,
          lastFailedDate: null
        };
        set(state => ({ 
          disciplineChecks: [...state.disciplineChecks, newCheck],
          lastUpdateTimestamp: Date.now()
        }));
      },

      removeDisciplineCheck: (id) => {
        set(state => ({ 
          disciplineChecks: state.disciplineChecks.filter(c => c.id !== id),
          lastUpdateTimestamp: Date.now()
        }));
      },

      updateDisciplineCheck: (id, title, penaltyType, penaltyValue) => {
        set(state => ({
          disciplineChecks: state.disciplineChecks.map(c => 
            c.id === id ? { ...c, title, penaltyType, penaltyValue } : c
          ),
          lastUpdateTimestamp: Date.now()
        }));
      },

      triggerDisciplineFailure: (id) => {
        const state = get();
        const today = new Date().toDateString();
        const check = state.disciplineChecks.find(c => c.id === id);
        if (!check || check.lastFailedDate === today) return;

        let newXP = state.xp;
        let newLevel = state.level;
        if (check.penaltyType === 'xp_reset') {
          newXP = 0;
        } else if (check.penaltyType === 'level_reduction') {
          newLevel = Math.max(1, newLevel - check.penaltyValue);
          newXP = 0;
        }

        const currentHistory = get().history[today] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        
        set({
          xp: newXP,
          level: newLevel,
          disciplineBroken: true,
          disciplineChecks: state.disciplineChecks.map(c => 
            c.id === id ? { ...c, currentStreak: 0, lastFailedDate: today } : c
          ),
          history: {
            ...get().history,
            [today]: {
              ...currentHistory,
              level: newLevel,
              streak: 0
            }
          },
          lastUpdateTimestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('xp-penalty'));
      },

      toggleVoice: () => set(state => ({ voiceEnabled: !state.voiceEnabled })),

      toggleQuest: (id, type) => {
        const state = get();
        let xpGained = 0;
        let codingXpGained = 0;
        const today = new Date().toDateString();
        const now = new Date();
        let toggledQuest: Quest | undefined;

        // Detect if the quest has the word "CODING" in its title
        const targetQuest = [...state.permanentQuests, ...state.temporaryQuests].find(q => q.id === id);
        const isCodingQuest = targetQuest ? targetQuest.title.toUpperCase().includes('CODING') : false;

        const updateList = (list: Quest[]) => list.map((q) => {
          if (q.id === id) {
            const newStatus = !q.completed;
            toggledQuest = { ...q, completed: newStatus };
            if (isCodingQuest) {
              codingXpGained = newStatus ? 20 : -20;
            } else {
              xpGained = newStatus ? (type === 'permanent' ? 10 : 5) : (type === 'permanent' ? -10 : -5);
            }
            return toggledQuest;
          }
          return q;
        });

        const newPermanent = type === 'permanent' ? updateList(state.permanentQuests) : state.permanentQuests;
        const newTemporary = type === 'temporary' ? updateList(state.temporaryQuests) : state.temporaryQuests;
        
        let newCompletedHistory = state.completedTemporaryHistory;
        if (type === 'temporary' && toggledQuest && toggledQuest.completed) {
          const historyEntry: CompletedQuestHistory = {
            id: crypto.randomUUID(),
            title: toggledQuest.title,
            completedAt: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          };
          newCompletedHistory = [historyEntry, ...state.completedTemporaryHistory];
        }

        let newXP = state.xp + xpGained;
        let newLevel = state.level;
        const reqXP = calculateRequiredXP(newLevel);
        
        if (newXP >= reqXP) {
          newXP -= reqXP;
          newLevel += 1;
          window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel } }));
        } else if (newXP < 0) {
          if (newLevel > 1) {
            newLevel -= 1;
            newXP = calculateRequiredXP(newLevel) + newXP;
            window.dispatchEvent(new CustomEvent('level-down', { detail: { level: newLevel } }));
          } else {
            newXP = 0;
          }
        }

        let newCodingXp = (state.codingXp || 0) + codingXpGained;
        let newCodingLevel = state.codingLevel || 1;
        const codingReqXP = calculateRequiredXP(newCodingLevel);

        if (newCodingXp >= codingReqXP) {
          newCodingXp -= codingReqXP;
          newCodingLevel += 1;
          window.dispatchEvent(new CustomEvent('coding-level-up', { detail: { level: newCodingLevel } }));
        } else if (newCodingXp < 0) {
          if (newCodingLevel > 1) {
            newCodingLevel -= 1;
            newCodingXp = calculateRequiredXP(newCodingLevel) + newCodingXp;
            window.dispatchEvent(new CustomEvent('coding-level-down', { detail: { level: newCodingLevel } }));
          } else {
            newCodingXp = 0;
          }
        }

        const currentHistory = state.history[today] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        
        set({
          permanentQuests: newPermanent,
          temporaryQuests: newTemporary,
          completedTemporaryHistory: newCompletedHistory,
          xp: newXP,
          level: newLevel,
          codingXp: newCodingXp,
          codingLevel: newCodingLevel,
          history: {
            ...state.history,
            [today]: {
              completedCount: Math.max(0, currentHistory.completedCount + (xpGained > 0 || codingXpGained > 0 ? 1 : -1)),
              xpGained: Math.max(0, currentHistory.xpGained + xpGained),
              level: newLevel,
              streak: state.streak.current
            }
          },
          lastUpdateTimestamp: Date.now()
        });
      },

      breakDiscipline: () => {
         const state = get();
         if (state.disciplineChecks.length > 0) {
           get().triggerDisciplineFailure(state.disciplineChecks[0].id);
         }
      },

      checkDailyReset: () => {
        const today = new Date().toDateString();
        const state = get();
        if (state.lastResetDate !== today) {
          get().resetDayTasksOnly();
        }
      },

      resetDayTasksOnly: () => {
        const state = get();
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let updatedStreak = { ...state.streak };
        const allPermanentDone = state.permanentQuests.length > 0 && state.permanentQuests.every(q => q.completed);
        const yesterdayCompleted = state.streak.lastCompletedDate === yesterdayStr;

        if (allPermanentDone && !state.disciplineBroken && state.streak.lastCompletedDate !== today) {
           const newCurrent = yesterdayCompleted ? state.streak.current + 1 : 1;
           updatedStreak = {
             current: newCurrent,
             longest: Math.max(state.streak.longest, newCurrent),
             lastCompletedDate: today
           };
        } else if (state.disciplineBroken || !yesterdayCompleted) {
           updatedStreak.current = 0;
        }

        const updatedDisciplineChecks = state.disciplineChecks.map(check => {
          if (check.lastFailedDate !== state.lastResetDate) {
            return { ...check, currentStreak: check.currentStreak + 1 };
          }
          return check;
        });

        const yesterdayHistory = state.history[yesterdayStr] || { completedCount: 0, xpGained: 0, level: 1, streak: 0 };
        
        set({
          lastResetDate: today,
          disciplineBroken: false,
          streak: updatedStreak,
          disciplineChecks: updatedDisciplineChecks,
          permanentQuests: state.permanentQuests.map(q => ({ ...q, completed: false })),
          temporaryQuests: state.temporaryQuests.filter(q => !q.completed),
          history: {
            ...state.history,
            [yesterdayStr]: {
              ...yesterdayHistory,
              level: state.level,
              streak: state.streak.current
            },
            [today]: {
              completedCount: 0,
              xpGained: 0,
              level: state.level,
              streak: updatedStreak.current
            }
          },
          lastUpdateTimestamp: Date.now()
        });
      },

      resetDayWithXP: () => {
        const state = get();
        const today = new Date().toDateString();
        const todayXP = state.history[today]?.xpGained || 0;

        get().resetDayTasksOnly();

        let newXP = get().xp - todayXP;
        let newLevel = get().level;

        if (newXP < 0) {
           while (newXP < 0 && newLevel > 1) {
              newLevel -= 1;
              newXP = calculateRequiredXP(newLevel) + newXP;
           }
           if (newXP < 0) newXP = 0;
        }

        set({
          xp: newXP,
          level: newLevel,
          history: {
            ...get().history,
            [today]: { ...get().history[today], xpGained: 0, level: newLevel }
          },
          lastUpdateTimestamp: Date.now()
        });
      },

      resetDayManual: () => get().resetDayTasksOnly(),

      updateStreakManual: (val) => {
        set((state) => ({
          streak: {
            ...state.streak,
            current: val,
            longest: Math.max(state.streak.longest, val)
          },
          lastUpdateTimestamp: Date.now()
        }));
      },

      resetProgressAll: () => {
        set({
          xp: 0,
          level: 1,
          codingXp: 0,
          codingLevel: 1,
          obtainedTitles: [],
          activeTitle: "E-Rank Recruit",
          streak: { current: 0, longest: 0, lastCompletedDate: null },
          history: {},
          completedTemporaryHistory: [],
          disciplineChecks: DEFAULT_DISCIPLINE_CHECKS,
          disciplineBroken: false,
          permanentQuests: get().permanentQuests.map(q => ({ ...q, completed: false })),
          temporaryQuests: [],
          lastUpdateTimestamp: Date.now()
        });
      },

      addObtainedTitle: (title: string) => {
        const state = get();
        let formattedTitle = title.trim();
        if (!/monarch/i.test(formattedTitle)) {
          formattedTitle = `${formattedTitle} Monarch`;
        }
        const current = state.obtainedTitles || [];
        const lowerCurrent = current.map(t => t.toLowerCase());
        if (!lowerCurrent.includes(formattedTitle.toLowerCase())) {
          set({
            obtainedTitles: [...current, formattedTitle],
            lastUpdateTimestamp: Date.now()
          });
        }
      },

      setActiveTitle: (title: string) => {
        let formattedTitle = title.trim();
        if (!/monarch/i.test(formattedTitle)) {
          formattedTitle = `${formattedTitle} Monarch`;
        }
        set({
          activeTitle: formattedTitle,
          lastUpdateTimestamp: Date.now()
        });
      },

      setObtainedTitles: (titles: string[]) => {
        set({
          obtainedTitles: titles,
          lastUpdateTimestamp: Date.now()
        });
      },

      addCodingXp: (xpVal: number) => {
        const state = get();
        let newXp = (state.codingXp || 0) + xpVal;
        let newLevel = state.codingLevel || 1;
        let leveledUp = false;

        while (newXp >= calculateRequiredXP(newLevel)) {
          newXp -= calculateRequiredXP(newLevel);
          newLevel += 1;
          leveledUp = true;
        }

        if (leveledUp) {
          window.dispatchEvent(new CustomEvent('coding-level-up', { detail: { level: newLevel } }));
        }

        set({
          codingXp: newXp,
          codingLevel: newLevel,
          lastUpdateTimestamp: Date.now()
        });
      },
    }),
    {
      name: 'solo-system-local-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);