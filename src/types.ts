export interface Quest {
  id: string;
  title: string;
  completed: boolean;
  type: 'permanent' | 'temporary';
  createdAt: string;
}

export interface CompletedQuestHistory {
  id: string;
  title: string;
  completedAt: string;
}

export interface DisciplineCheck {
  id: string;
  title: string;
  penaltyType: 'xp_reset' | 'level_reduction';
  penaltyValue: number;
  currentStreak: number;
  lastFailedDate: string | null;
}

export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

export interface DayProgress {
  completedCount: number;
  xpGained: number;
  level: number;
  streak: number;
}

export interface AppState {
  isAuthenticated: boolean;
  userCode: string | null;
  permanentQuests: Quest[];
  temporaryQuests: Quest[];
  completedTemporaryHistory: CompletedQuestHistory[];
  disciplineChecks: DisciplineCheck[];
  streak: Streak;
  xp: number;
  level: number;
  codingXp: number;
  codingLevel: number;
  obtainedTitles?: string[];
  activeTitle?: string;
  disciplineBroken: boolean;
  voiceEnabled: boolean;
  lastResetDate: string;
  history: Record<string, DayProgress>;
  lastUpdateTimestamp: number; // For sync conflict resolution
}