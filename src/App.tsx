import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Menu, 
  Check, 
  RotateCcw, 
  Target, 
  Volume2, 
  VolumeX, 
  Trash2, 
  LayoutGrid,
  Clock,
  Edit,
  LogOut,
  TrendingUp,
  CloudLightning,
  RefreshCw,
  AlertCircle,
  Download,
  Smartphone
} from 'lucide-react';
import { useStore, calculateRequiredXP, calculateRank } from './store.ts';
import { 
  ManageQuestsModal, 
  ManageStreakModal, 
  ResetDayModal, 
  ManageProgressModal,
  TemporaryQuestHistoryModal,
  ProgressChartModal
} from './components/Modals.tsx';
import Login from './components/Login.tsx';
import OfflinePage from './components/OfflinePage.tsx';
import { supabaseService } from './services/supabase.ts';

const TITLE_LEVEL_REQUIREMENTS: Record<string, number> = {
  "web dev monarch": 2,
  "java monarch": 3,
  "c++ monarch": 4,
  "dsa monarch": 5,
  "java web warrior monarch": 6,
  "web dev devil monarch": 8,
  "c++ king monarch": 10,
  "java shadow monarch": 12,
};

const isTitleUnlocked = (titleName: string, currentLevel: number): boolean => {
  const norm = titleName.toLowerCase().trim();
  if (norm in TITLE_LEVEL_REQUIREMENTS) {
    return currentLevel >= TITLE_LEVEL_REQUIREMENTS[norm];
  }
  return true;
};

const App: React.FC = () => {
  const store = useStore();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const userCode = useStore((state) => state.userCode);

  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'table_missing'>('idle');
  const [bootSyncDone, setBootSyncDone] = useState(false);
  
  // Track the last timestamp we pushed to avoid infinite loops or stale updates
  const lastPushedTimestamp = useRef<number>(0);

  // Modal States
  const [showProgressChart, setShowProgressChart] = useState(false);
  const [showManageProgress, setShowManageProgress] = useState(false);
  const [showManagePermanent, setShowManagePermanent] = useState(false);
  const [showManageTemporary, setShowManageTemporary] = useState(false);
  const [showManageStreak, setShowManageStreak] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTemporaryHistory, setShowTemporaryHistory] = useState(false);

  // Level-up flash states
  const [dailyFlash, setDailyFlash] = useState(false);
  const [codingFlash, setCodingFlash] = useState(false);

  // Neural Link Floating state and Input for milestones
  const [showNeuralLink, setShowNeuralLink] = useState(false);
  const [milestoneInput, setMilestoneInput] = useState('');
  const [showSqlFix, setShowSqlFix] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  // Card 1: Quest Generator
  const [loading1, setLoading1] = useState(false);
  const [response1, setResponse1] = useState('');
  const [error1, setError1] = useState('');

  // Card 2: Progress Analysis
  const [loading2, setLoading2] = useState(false);
  const [response2, setResponse2] = useState('');
  const [error2, setError2] = useState('');

  // Card 3: Smart Suggestions
  const [loading3, setLoading3] = useState(false);
  const [response3, setResponse3] = useState('');
  const [error3, setError3] = useState('');

  // Card 4: Goal Optimizer
  const [loading4, setLoading4] = useState(false);
  const [response4, setResponse4] = useState('');
  const [error4, setError4] = useState('');

  const codingLevel = store.codingLevel || 1;
  const codingXp = store.codingXp || 0;
  const codingReqXP = calculateRequiredXP(codingLevel);
  const codingProgress = (codingXp / codingReqXP) * 100;

  const callGroq = async (
    systemPrompt: string, 
    userMessage: string,
    setLoading: (l: boolean) => void,
    setResponse: (r: string) => void,
    setError: (e: string) => void
  ) => {
    setLoading(true);
    setResponse('');
    setError('');
    
    try {
      const apiKey = (import.meta as any).env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("GROQ_API_KEY NOT FOUND.");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`STATUS ${response.status}: ${errBody || 'API REQUEST FAILED'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "No response received.";
      setResponse(content);

      // Parse Rewards if found in the generated response
      const titleMatch = content.match(/REWARD_TITLE:\s*([^\n\r]+)/i);
      const xpMatch = content.match(/REWARD_XP:\s*(\d+)/i);

      if (titleMatch) {
        const titleVal = titleMatch[1].trim().replace(/['"◈*]/g, '');
        if (titleVal && titleVal.toLowerCase() !== 'none' && titleVal.toLowerCase() !== 'null') {
          store.addObtainedTitle(titleVal);
          store.setActiveTitle(titleVal);
        }
      }

      if (xpMatch) {
        const xpVal = parseInt(xpMatch[1], 10);
        if (!isNaN(xpVal)) {
          store.addCodingXp(xpVal);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "COMMUNICATION FAILURE.");
    } finally {
      setLoading(false);
    }
  };

  const handleCallCard1 = () => {
    const system = "You are a Solo Leveling style quest generator AI. Generate 3 short, high-impact daily quests for a developer hunter. Format: each quest on its own line starting with ◈. Keep each quest under 10 words. Be motivating and intense.";
    const userMsg = "Generate 3 new quests for today.";
    callGroq(system, userMsg, setLoading1, setResponse1, setError1);
  };

  const handleCallCard2 = () => {
    const system = "You are a hunter progress analysis AI. Analyze the player's stats and physical progress/milestone accomplishments. Give a short, brutal, honest military-style assessment of 3-4 sentences.\n\n" +
      "Always end your response with a reward line in this format exactly:\n" +
      "REWARD_TITLE: <New title based on their milestone progress, or 'None'>\n" +
      "REWARD_XP: <Amount of coding XP earned, from 20 to 120, e.g. 50>\n\n" +
      "CRITICAL RULE: The returned REWARD_TITLE must ALWAYS contain the word 'Monarch' (e.g. 'Java Monarch', 'Fullstack Monarch', 'DSA Monarch', etc.). Never use terms like 'king' or 'devil' without the word 'Monarch'. Always end or format the title with 'Monarch'!\n\n" +
      "Examples:\n" +
      "- If user learned basics of Java, award Title: 'Java Monarch'\n" +
      "- If user built a working Java project, award Title: 'Java Shadow Monarch'\n" +
      "- If user learned Web Dev, award Title: 'Web Dev Monarch'\n" +
      "- If user learned DSA, award Title: 'DSA Monarch'\n" +
      "- If user learned C++, award Title: 'C++ Monarch'\n" +
      "Be extremely responsive to whatever progressive achievement they typed. If they type something epic, award a legendary name tailored to that!";
    const totalCount = allQuests.length;
    const completedCount = allQuests.filter(q => q.completed).length;
    const statsStr = `Daily Level: ${store.level}, Daily XP: ${store.xp}/${requiredXP}, Coding Level: ${codingLevel}, Coding XP: ${codingXp}/${codingReqXP}, Tasks completed today: ${completedCount}/${totalCount}, Streak: ${store.streak.current} days`;
    const userMsg = `Player stats:\n${statsStr}\n\nMilestone/Progress attained:\n"${milestoneInput || 'No special progress described today.'}"`;
    callGroq(system, userMsg, setLoading2, setResponse2, setError2);
  };

  const handleCallCard3 = () => {
    const system = "You are a hyper-focused productivity AI for a developer. Give exactly 3 sharp, actionable suggestions to level up today. Format as a numbered list. Each item must be under 15 words. No fluff.";
    const userMsg = "Give me 3 suggestions to optimize my day.";
    callGroq(system, userMsg, setLoading3, setResponse3, setError3);
  };

  const handleCallCard4 = () => {
    const system = "You are a goal optimizer AI. Analyze the user's current tasks and recommend priority order and time allocation. Be brief, tactical, and intense.";
    const questsStr = allQuests.map(q => q.title + (q.completed ? ' [DONE]' : '')).join(', ');
    const userMsg = `My current quests: ${questsStr}`;
    callGroq(system, userMsg, setLoading4, setResponse4, setError4);
  };

  // Connection monitoring and PWA install prompt listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture standard install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Track when successful install happens
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // iOS and installation detection on boot
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsPwaInstalled(isStandalone);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger standard install prompt
    deferredPrompt.prompt();
    
    // Check results
    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User installation prompt choice: ${outcome}`);
    } catch (err) {
      console.error("Installation error: ", err);
    }
    
    // Reset parameters
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // 1. BOOT-UP RECONCILIATION: Fetch latest remote data on startup BEFORE allowing any write-backs
  useEffect(() => {
    if (!isAuthenticated || !userCode || !isOnline) return;

    let isActive = true;
    const loadAndReconcile = async () => {
      setSyncStatus('syncing');
      try {
        const remoteData = await supabaseService.fetchState(userCode);
        if (remoteData && isActive) {
          const localTimestamp = store.lastUpdateTimestamp || 0;
          const remoteTimestamp = remoteData.lastUpdateTimestamp || 0;

          if (remoteTimestamp > localTimestamp) {
            console.log(`[BOOT_SYNC] Remote state is newer (${remoteTimestamp} > ${localTimestamp}). Syncing DB to local...`);
            store.applyRemoteUpdate(remoteData);
            lastPushedTimestamp.current = remoteTimestamp;
          } else if (remoteTimestamp < localTimestamp) {
            console.log(`[BOOT_SYNC] Local state is newer (${localTimestamp} > ${remoteTimestamp}). Preparing push...`);
            // We set lastPushedTimestamp to remote so that the push effect knows there's pending push
            lastPushedTimestamp.current = remoteTimestamp;
          } else {
            console.log(`[BOOT_SYNC] Logged in & perfectly in-sync with DB.`);
            lastPushedTimestamp.current = localTimestamp;
          }
        } else if (isActive) {
          console.log(`[BOOT_SYNC] No remote state found or first-time sync. Initializing remote with current state.`);
          // Create dummy past timestamp to force initial push
          lastPushedTimestamp.current = 0;
        }
        if (isActive) {
          setBootSyncDone(true);
          setSyncStatus('idle');
        }
      } catch (err) {
        console.error("Boot-up reconciliation error:", err);
        if (isActive) {
          // Fallback to allow continuing using local state
          setBootSyncDone(true);
          setSyncStatus('error');
        }
      }
    };

    loadAndReconcile();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, userCode, isOnline]);

  // 2. PUSH local changes to Supabase (Snappy Debounced Sync - BLOCKED until boot-up reconciliation completes)
  useEffect(() => {
    if (!isAuthenticated || !userCode || !isOnline || !bootSyncDone) return;
    
    // Only push if the local timestamp is actually NEWER than what we last pushed
    if (store.lastUpdateTimestamp <= lastPushedTimestamp.current) return;

    const syncPayload = {
      permanentQuests: store.permanentQuests,
      temporaryQuests: store.temporaryQuests,
      xp: store.xp,
      level: store.level,
      streak: store.streak,
      history: store.history,
      disciplineChecks: store.disciplineChecks,
      completedTemporaryHistory: store.completedTemporaryHistory,
      lastResetDate: store.lastResetDate,
      obtainedTitles: store.obtainedTitles,
      activeTitle: store.activeTitle,
      codingXp: store.codingXp,
      codingLevel: store.codingLevel,
      lastUpdateTimestamp: store.lastUpdateTimestamp, // Conflict Resolution Key
    };

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      const result = await supabaseService.pushState(userCode, syncPayload);
      
      if (!result.success) {
        const errStr = String(result.error || '').toLowerCase();
        const isTableMissing = result.error === 'PGRST205' || 
                               result.error === 'PGRST204' || 
                               result.error === '42P01' || 
                               errStr.includes('relation') || 
                               errStr.includes('does not exist');
                               
        if (isTableMissing) {
          setSyncStatus('table_missing');
        } else {
          setSyncStatus('error');
        }
      } else {
        lastPushedTimestamp.current = store.lastUpdateTimestamp;
        setTimeout(() => setSyncStatus('idle'), 1000);
      }
    }, 450); // Generous debounce of 450ms for reliable, non-flickering syncs!

    return () => clearTimeout(timer);
  }, [
    isAuthenticated, 
    userCode, 
    isOnline,
    bootSyncDone,
    store.permanentQuests, 
    store.temporaryQuests, 
    store.xp, 
    store.level, 
    store.streak,
    store.history,
    store.disciplineChecks,
    store.completedTemporaryHistory,
    store.lastResetDate,
    store.obtainedTitles,
    store.activeTitle,
    store.codingXp,
    store.codingLevel,
    store.lastUpdateTimestamp
  ]);

  // SUBSCRIBE to remote changes from Supabase Realtime
  useEffect(() => {
    if (!isAuthenticated || !userCode || !isOnline) return;
    
    const unsubscribe = supabaseService.subscribeToChanges(userCode, (remoteData) => {
      // When applying remote update, our store logic will check the timestamp
      store.applyRemoteUpdate(remoteData);
      
      // If the remote update was accepted, update our 'lastPushed' to match
      // so we don't immediately push it back to the server
      if (remoteData.lastUpdateTimestamp > lastPushedTimestamp.current) {
        lastPushedTimestamp.current = remoteData.lastUpdateTimestamp;
      }
    });
    
    return () => unsubscribe();
  }, [isAuthenticated, userCode, isOnline, store.applyRemoteUpdate]);

  const announceLevelUp = useCallback(() => {
    if (!store.voiceEnabled) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance("New level acquired.");
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Samantha') || 
      v.name.toLowerCase().includes('female')
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.1;
    utterance.rate = 1.0;
    synth.speak(utterance);
  }, [store.voiceEnabled]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    if (isAuthenticated) {
      store.checkDailyReset();
    }

    const onLevelUp = () => {
      announceLevelUp();
      setDailyFlash(true);
      setTimeout(() => setDailyFlash(false), 800);
    };
    const onCodingLevelUp = () => {
      setCodingFlash(true);
      setTimeout(() => setCodingFlash(false), 800);
    };

    window.addEventListener('level-up', onLevelUp);
    window.addEventListener('coding-level-up', onCodingLevelUp);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('level-up', onLevelUp);
      window.removeEventListener('coding-level-up', onCodingLevelUp);
    };
  }, [announceLevelUp, store.checkDailyReset, isAuthenticated]);

  // Fueling active titles and obtained inventory with level requirements validations
  useEffect(() => {
    if (isAuthenticated) {
      const currentTitles = store.obtainedTitles || [];
      
      // Filter out any default preloaded titles if progress requirement is not met
      const cleaned = currentTitles.filter(t => isTitleUnlocked(t, store.codingLevel));
      
      // Add "Monarch" to any title that does not have it, but only if they are unlocked
      let changed = cleaned.length !== currentTitles.length;
      const normalized = cleaned.map(t => {
        const trimmed = t.trim();
        if (!/monarch/i.test(trimmed)) {
          changed = true;
          return `${trimmed} Monarch`;
        }
        return trimmed;
      });

      // Deduplicate case-insensitively, keeping the first occurrence
      const finalUniqueTitles: string[] = [];
      const seen = new Set<string>();
      for (const item of normalized) {
        const lowerItem = item.toLowerCase();
        if (!seen.has(lowerItem)) {
          seen.add(lowerItem);
          finalUniqueTitles.push(item);
        } else {
          changed = true;
        }
      }

      if (changed) {
        store.setObtainedTitles(finalUniqueTitles);
      }

      // Check active title fallback
      const active = store.activeTitle || "E-Rank Recruit";
      const activeClean = /monarch/i.test(active) ? active : `${active} Monarch`;
      if (!isTitleUnlocked(activeClean, store.codingLevel) && activeClean.toLowerCase() !== "e-rank recruit" && activeClean.toLowerCase() !== "e-rank recruit monarch") {
        store.setActiveTitle("E-Rank Recruit");
      } else if (!/monarch/i.test(active) && active.toLowerCase() !== "e-rank recruit") {
        store.setActiveTitle(`${active} Monarch`);
      }
    }
  }, [isAuthenticated, store.activeTitle, store.obtainedTitles, store.codingLevel]);

  if (!isOnline) {
    return <OfflinePage />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const requiredXP = calculateRequiredXP(store.level);
  const xpProgress = (store.xp / requiredXP) * 100;
  const rank = calculateRank(store.level);

  const handleAddCustomQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestTitle.trim()) {
      store.addQuest(newQuestTitle.trim(), 'temporary');
      setNewQuestTitle('');
    }
  };

  const allQuests = [...store.permanentQuests, ...store.temporaryQuests];
  const textSize = 'text-[9px] sm:text-[11px] lg:text-[12px]';

  const rawActiveTitle = store.activeTitle || "E-Rank Recruit";
  const activeTitleFormatted = (() => {
    const t = rawActiveTitle.trim();
    if (t.toLowerCase() === "e-rank recruit") {
      return "E-Rank Recruit";
    }
    if (!/monarch/i.test(t)) {
      return `${t} Monarch`;
    }
    return t;
  })();

  // Format streak string based on individual discipline checks
  const pipedStreak = store.disciplineChecks.length > 0 
    ? store.disciplineChecks.map(c => c.currentStreak).join(' | ') 
    : store.streak.current.toString();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden p-2">
      
      {/* HUD CONTROLS */}
      <div className="absolute top-4 left-6 z-50 flex items-center gap-4">
        <button 
          onClick={() => setShowMenu(true)}
          className="p-3 system-panel border-cyan-500/60 hover:border-cyan-400 transition-all bg-zinc-950/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          <Menu className="text-cyan-400" size={22} />
        </button>

        <div className={`system-panel border-2 px-3 py-1 flex items-center gap-3 bg-zinc-950/20 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-colors ${syncStatus === 'table_missing' ? 'border-red-500' : 'border-cyan-500/20'}`}>
          <div className="flex flex-col">
            <span className="text-[6px] font-black text-zinc-500 uppercase tracking-widest leading-none">NEURAL_LINK</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {syncStatus === 'syncing' ? (
                <RefreshCw size={8} className="text-amber-400 animate-spin" />
              ) : syncStatus === 'table_missing' || syncStatus === 'error' ? (
                <AlertCircle size={8} className="text-red-500" />
              ) : (
                <CloudLightning size={8} className="text-cyan-400" />
              )}
              <span className={`text-[8px] font-bold tracking-tighter uppercase leading-none transition-colors ${
                syncStatus === 'syncing' ? 'text-amber-400' : 
                syncStatus === 'table_missing' ? 'text-red-500' :
                syncStatus === 'error' ? 'text-red-400' : 'text-cyan-400/80'
              }`}>
                {syncStatus === 'syncing' ? 'SYNCING...' : 
                 syncStatus === 'table_missing' ? 'DB_TABLE_MISSING' :
                 syncStatus === 'error' ? 'SYNC_ERROR' : 'ONLINE_SYNC'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-6 z-50">
        <div className="system-panel border-cyan-500/60 px-6 py-2 text-center bg-zinc-950/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">SYST_HUD_v5.0</div>
          <div className="font-orbitron text-2xl font-black text-cyan-400 tracking-widest leading-none">
            {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>
        </div>
      </div>

      {/* SYSTEM MAIN MODULE */}
      <main className="w-full flex items-center justify-center h-full">
        {syncStatus === 'table_missing' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950/95 border-2 border-red-500 p-4 text-center max-w-sm sm:max-w-md shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in fade-in zoom-in duration-300 rounded">
            <h4 className="text-red-500 font-orbitron font-black text-xs uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
              <span>⚠️ DATABASE TABLE MISSING</span>
            </h4>
            <p className="text-zinc-300 text-[10px] font-medium uppercase tracking-wider mb-3 leading-relaxed">
              The 'user_states' table does not exist in your Supabase project yet.
            </p>
            
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setShowSqlFix(!showSqlFix)}
                className="px-3 py-1 bg-red-950/50 hover:bg-red-500 hover:text-black border border-red-500 text-red-400 font-black text-[9px] uppercase tracking-widest transition-all rounded animate-pulse"
              >
                {showSqlFix ? "HIDE SETUP INST" : "HOW TO LINK"}
              </button>
              <button 
                onClick={() => setSyncStatus('idle')}
                className="px-3 py-1 bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-zinc-300 font-black text-[9px] uppercase tracking-widest transition-all rounded"
              >
                DISMISS
              </button>
            </div>

            {showSqlFix && (
              <div className="mt-3 text-left border-t border-zinc-800 pt-3 max-h-[220px] overflow-y-auto custom-scrollbar">
                <ol className="text-[9px] text-zinc-400 space-y-1.5 uppercase font-semibold tracking-wider list-decimal pl-4 mb-3">
                  <li>Open your Supabase dashboard.</li>
                  <li>Click on "SQL Editor" in the left menu.</li>
                  <li>Click "New Query" button.</li>
                  <li>Paste the script below and click "Run".</li>
                </ol>
                <div className="relative">
                  <pre className="p-2 bg-black/80 rounded border border-zinc-800 text-[8px] font-mono text-cyan-400 overflow-x-auto select-all leading-normal">
{`CREATE TABLE public.user_states (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" 
  ON public.user_states FOR SELECT USING (true);

CREATE POLICY "Allow public insert" 
  ON public.user_states FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" 
  ON public.user_states FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime for perfect live sync between devices!
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_states;`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE public.user_states (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" 
  ON public.user_states FOR SELECT USING (true);

CREATE POLICY "Allow public insert" 
  ON public.user_states FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" 
  ON public.user_states FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime for perfect live sync between devices!
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_states;`);
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 2000);
                    }}
                    className={`absolute top-2 right-2 px-2.5 py-0.5 border font-sans text-[8px] rounded uppercase transition-colors ${
                      sqlCopied 
                        ? 'bg-green-950 text-green-400 border-green-500' 
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-700'
                    }`}
                  >
                    {sqlCopied ? "COPIED!" : "COPY"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="main-frame p-3 md:p-5 relative animate-in fade-in zoom-in duration-500 bg-transparent max-h-[85vh] overflow-hidden flex flex-col">
          
          {/* PLAYER STATUS HEADER */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <h1 className="font-orbitron text-xl sm:text-2xl font-black text-white tracking-[0.4em] sm:tracking-[0.5em] uppercase neon-text leading-none mb-1">
              PLAYER STATUS
            </h1>
            
            <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-1 text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-200">
              <div className="flex items-center gap-1.5">DAILY LVL: <span className="text-cyan-400 font-orbitron">{store.level}</span></div>
              <div className="flex items-center gap-1.5">CODING LVL: <span className="text-red-500 font-orbitron">{codingLevel}</span></div>
              <div className="flex items-center gap-1.5">RANK: <span className="text-cyan-400 font-orbitron">{rank}</span></div>
              <div className="flex items-center gap-1.5">STREAK: <span className="text-cyan-400 font-orbitron">{pipedStreak}</span> 🔥</div>
            </div>

            <div className="w-full max-w-2xl px-2 mt-1 space-y-2">
              {/* TWO COGNITIVE CHANNELS: DAILY SYSTEM (LEFT) & CODING SYSTEM (RIGHT) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {/* DAILY ACTIVE SYSTEM (LEFT) */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-400 leading-none">
                    <span>DAILY ACTIVE SYSTEM</span>
                    <span>{Math.floor(store.xp)} / {requiredXP} XP</span>
                  </div>
                  <div 
                    className={`h-2 sm:h-2.5 w-full bg-zinc-950/40 border relative overflow-hidden transition-all duration-300 ${
                      dailyFlash 
                        ? 'border-cyan-400 shadow-[0_0_15px_#00f0ff] scale-[1.01]' 
                        : 'border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-700 via-cyan-400 to-white shadow-[0_0_15px_rgba(6,182,212,1)] transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${xpProgress}%` }}
                    >
                      <div className="bar-shimmer" />
                    </div>
                  </div>
                </div>

                {/* CODING COGNITIVE UNIT (RIGHT) */}
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-red-500 leading-none">
                    <span>CODING COGNITIVE UNIT</span>
                    <span>{Math.floor(codingXp)} / {codingReqXP} XP</span>
                  </div>
                  <div 
                    className={`h-2 sm:h-2.5 w-full bg-zinc-950/40 border relative overflow-hidden transition-all duration-300 ${
                      codingFlash 
                        ? 'border-red-500 shadow-[0_0_15px_#ef4444] scale-[1.01]' 
                        : 'border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`}
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-red-700 via-red-500 to-white shadow-[0_0_15px_rgba(239,68,68,1)] transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${codingProgress}%` }}
                    >
                      <div className="bar-shimmer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* OBTAINED & ACTIVE TITLES SECTION */}
              <div className="flex flex-col items-center pt-1 border-t border-cyan-500/10">
                <div className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] leading-none mb-1">
                  ACTIVE HUNTER AUTHORITY
                </div>
                <div className="font-orbitron text-md sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-red-500 tracking-[0.12em] sm:tracking-[0.2em] uppercase hover:scale-105 transition-transform duration-300 cursor-default select-none pb-0.5 text-center drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  ◈ {activeTitleFormatted} ◈
                </div>
                
                {/* Obtained inventory of titles */}
                <div className="flex flex-wrap justify-center gap-1 max-w-xl text-center mt-0.5 pb-0.5">
                  {(() => {
                    const rendered = new Set<string>();
                    const filtered = (store.obtainedTitles || []).filter(t => isTitleUnlocked(t, store.codingLevel));
                    return filtered.map((titleItem) => {
                      const formattedItem = titleItem.trim();
                      const cleanItem = /monarch/i.test(formattedItem) ? formattedItem : `${formattedItem} Monarch`;
                      const lowerClean = cleanItem.toLowerCase();
                      
                      if (rendered.has(lowerClean)) {
                        return null; // Skip duplicates case-insensitively
                      }
                      rendered.add(lowerClean);
                      
                      const isSelected = activeTitleFormatted.toLowerCase() === lowerClean;
                      return (
                        <button
                          key={cleanItem}
                          onClick={() => store.setActiveTitle(cleanItem)}
                          className={`text-[8px] sm:text-[9px] font-orbitron font-extrabold tracking-[0.06em] px-2 py-0.5 uppercase border rounded transition-all ${
                            isSelected
                              ? 'border-amber-400 text-amber-300 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : 'border-zinc-800 text-zinc-500 bg-zinc-950/20 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {cleanItem}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="neon-strip mb-2" />

          {/* CENTERED LAYOUT FOR ACTIVE QUESTS & CHECKS */}
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto w-full max-w-5xl mx-auto min-h-0 pr-1.5 custom-scroll">
            
            {/* TODAY'S QUEST GRID */}
            <div className="flex flex-col gap-1 w-full">
              <h3 className="text-[11px] sm:text-[13px] font-bold text-cyan-400 tracking-[0.3em] uppercase pb-0.5 flex items-center justify-center gap-3">
                <Target size={14} className="animate-pulse text-white shadow-[0_0_8px_#fff]" /> TODAY’S QUEST
              </h3>
              
              <div className="flex justify-center w-full pr-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-1 w-full">
                  {allQuests.map((quest) => (
                    <label key={quest.id} className="quest-row flex items-center gap-2 sm:gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={quest.completed}
                        onChange={() => store.toggleQuest(quest.id, quest.type)}
                        className="hidden"
                      />
                      <div className={`checkbox-hud flex-shrink-0 ${quest.completed ? 'checked' : ''}`}>
                        {quest.completed && <Check className="text-white drop-shadow-[0_0_5px_#fff]" size={12} strokeWidth={4} />}
                      </div>
                      <span className={`${textSize} font-bold tracking-[0.04em] sm:tracking-[0.08em] uppercase transition-all truncate-hud flex-1 ${
                        quest.completed ? 'text-zinc-600 line-through' : 'text-zinc-200 group-hover:text-cyan-400'
                      }`}>
                        {quest.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="neon-strip mt-0.5" />

            {/* CUSTOM QUEST INPUT */}
            <div className="flex flex-col gap-1 mt-0.5">
              <h3 className="text-[9px] sm:text-[10px] font-bold text-cyan-400 tracking-[0.25em] uppercase flex items-center gap-2 justify-center">
                <LayoutGrid size={11} /> ADD CUSTOM QUEST
              </h3>
              <div className="flex justify-center w-full">
                <form onSubmit={handleAddCustomQuest} className="flex gap-2 w-full max-w-3xl">
                  <input 
                    type="text" 
                    value={newQuestTitle}
                    onChange={(e) => setNewQuestTitle(e.target.value)}
                    placeholder="INPUT DIRECTIVE..."
                    className="flex-1 bg-zinc-950/30 border-2 border-cyan-500/40 px-3 py-1 focus:outline-none focus:border-cyan-400 text-[10px] font-bold tracking-widest text-white uppercase placeholder:opacity-30 transition-all shadow-inner"
                  />
                  <button type="submit" className="bg-cyan-900/40 hover:bg-cyan-600/60 text-cyan-400 px-4 py-1 border-2 border-cyan-500/60 font-bold text-[9px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    INITIALIZE
                  </button>
                </form>
              </div>
            </div>

            {/* DISCIPLINE VALIDATION */}
            <div className="flex flex-col gap-1 mt-0.5">
              <h3 className="text-[9px] sm:text-[10px] font-bold text-cyan-400 tracking-[0.25em] uppercase flex items-center gap-2 justify-center">
                <RotateCcw size={11} /> DISCIPLINE CHECK
              </h3>
              <div className="flex justify-center w-full pb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-4xl pr-1">
                  {store.disciplineChecks.map(check => {
                    const today = new Date().toDateString();
                    const isFailedToday = check.lastFailedDate === today;
                    return (
                      <div key={check.id} className="flex items-center justify-between group bg-zinc-950/20 p-2 px-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all rounded">
                        <span className="text-[9px] sm:text-[10px] font-bold text-zinc-300 tracking-widest uppercase group-hover:text-white transition-colors truncate pr-2">
                          {check.title}
                        </span>
                        <button 
                          onClick={() => store.triggerDisciplineFailure(check.id)}
                          className={`px-4 sm:px-6 py-1 border-2 border-cyan-500/40 text-cyan-400 font-black text-[8px] sm:text-[9px] tracking-widest transition-all ${isFailedToday ? 'yes-button-active' : 'hover:bg-cyan-500/20'}`}
                        >
                          YES
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* DYNAMIC NEURAL LINK SLIDEOUT DRAWER */}
      {showNeuralLink && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex justify-end animate-in fade-in duration-300">
          {/* Backdrop click closer */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setShowNeuralLink(false)} />

          <div 
            className="w-full max-w-md bg-[#050912]/95 border-l-2 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.25)] h-full overflow-y-auto p-5 sm:p-7 flex flex-col gap-4 relative animate-in slide-in-from-right duration-300"
            style={{
              boxShadow: 'inset 0 0 30px rgba(255,0,0,0.05), 0 0 50px rgba(255,0,0,0.1)'
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <CloudLightning className="text-red-500 animate-pulse drop-shadow-[0_0_8px_#ef4444]" size={18} />
                <h3 className="text-[14px] sm:text-[16px] font-orbitron font-black text-red-500 tracking-[0.25em] uppercase">NEURAL LINK HUD</h3>
              </div>
              <button
                onClick={() => setShowNeuralLink(false)}
                className="text-zinc-400 hover:text-white font-orbitron font-bold text-[9px] tracking-widest border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 uppercase bg-zinc-950/50 rounded transition-all"
              >
                CLOSE
              </button>
            </div>

            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-normal bg-red-950/20 border border-red-500/10 p-2.5 rounded">
              SECURE QUANTUM CHANNEL CONNECTED. DISCIPLINE PARAMETERS SYNCHRONIZED AND SENT TO ACTIVE INTEL UNIT.
            </div>

            <div className="flex flex-col gap-3.5 pr-1 overflow-y-auto custom-scroll flex-1 pb-4">
              
              {/* CARD 1: QUEST GENERATOR */}
              <div className="system-panel border-red-500/30 p-3 bg-zinc-950/30 relative rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-red-400">⚡ QUEST GENERATOR</span>
                  {loading1 && (
                    <div className="animate-spin rounded-full border-2 border-red-500 border-t-transparent h-4 w-4" />
                  )}
                </div>
                <button 
                  onClick={handleCallCard1}
                  disabled={loading1}
                  className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-500 px-3 py-1.5 border border-red-500/40 font-bold text-[9px] tracking-widest uppercase transition-all disabled:opacity-50"
                >
                  GENERATE
                </button>
                {error1 && <div className="mt-2 text-[10px] text-red-400/80 font-bold tracking-widest">{error1}</div>}
                {response1 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255,0,60,0.04)',
                    border: '1px solid rgba(255,0,60,0.15)',
                    color: 'rgba(226,232,240,0.8)',
                    fontFamily: 'Rajdhani',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {response1}
                  </div>
                )}
              </div>

              {/* CARD 2: PROGRESS ANALYSIS */}
              <div className="system-panel border-red-500/30 p-3 bg-zinc-950/30 relative rounded-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-red-400">📊 PROGRESS ANALYSIS</span>
                  {loading2 && (
                    <div className="animate-spin rounded-full border-2 border-red-500 border-t-transparent h-4 w-4" />
                  )}
                </div>

                <div className="mb-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                    REPORT CURRENT ACHIEVEMENT & LANGUAGE PROGRESS
                  </label>
                  <input 
                    type="text" 
                    value={milestoneInput}
                    onChange={(e) => setMilestoneInput(e.target.value)}
                    placeholder="E.G., 'LEARNED BASICS OF JAVA' OR 'BUILT REACT SYSTEM'..."
                    className="w-full bg-zinc-950/40 border border-red-500/25 px-2 py-1 focus:outline-none focus:border-red-400 text-[10px] font-semibold text-white uppercase placeholder:opacity-25 transition-all rounded"
                  />
                </div>

                <button 
                  onClick={handleCallCard2}
                  disabled={loading2}
                  className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-500 px-3 py-1.5 border border-red-500/40 font-bold text-[9px] tracking-widest uppercase transition-all disabled:opacity-50"
                >
                  ANALYZE PROGRESS
                </button>
                {error2 && <div className="mt-2 text-[10px] text-red-400/80 font-bold tracking-widest">{error2}</div>}
                {response2 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255,0,60,0.04)',
                    border: '1px solid rgba(255,0,60,0.15)',
                    color: 'rgba(226,232,240,0.8)',
                    fontFamily: 'Rajdhani',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {response2}
                  </div>
                )}
              </div>

              {/* CARD 3: SMART SUGGESTIONS */}
              <div className="system-panel border-red-500/30 p-3 bg-zinc-950/30 relative rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-red-400">💡 SMART SUGGESTIONS</span>
                  {loading3 && (
                    <div className="animate-spin rounded-full border-2 border-red-500 border-t-transparent h-4 w-4" />
                  )}
                </div>
                <button 
                  onClick={handleCallCard3}
                  disabled={loading3}
                  className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-500 px-3 py-1.5 border border-red-500/40 font-bold text-[9px] tracking-widest uppercase transition-all disabled:opacity-50"
                >
                  SUGGEST
                </button>
                {error3 && <div className="mt-2 text-[10px] text-red-400/80 font-bold tracking-widest">{error3}</div>}
                {response3 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255,0,60,0.04)',
                    border: '1px solid rgba(255,0,60,0.15)',
                    color: 'rgba(226,232,240,0.8)',
                    fontFamily: 'Rajdhani',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {response3}
                  </div>
                )}
              </div>

              {/* CARD 4: GOAL OPTIMIZER */}
              <div className="system-panel border-red-500/30 p-3 bg-zinc-950/30 relative rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-red-400">🎯 GOAL OPTIMIZER</span>
                  {loading4 && (
                    <div className="animate-spin rounded-full border-2 border-red-500 border-t-transparent h-4 w-4" />
                  )}
                </div>
                <button 
                  onClick={handleCallCard4}
                  disabled={loading4}
                  className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-500 px-3 py-1.5 border border-red-500/40 font-bold text-[9px] tracking-widest uppercase transition-all disabled:opacity-50"
                >
                  OPTIMIZE
                </button>
                {error4 && <div className="mt-2 text-[10px] text-red-400/80 font-bold tracking-widest">{error4}</div>}
                {response4 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255,0,60,0.04)',
                    border: '1px solid rgba(255,0,60,0.15)',
                    color: 'rgba(226,232,240,0.8)',
                    fontFamily: 'Rajdhani',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {response4}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CORNER CONTROL PORTBAR (PINNED SIDE-BY-SIDE ON LEFT & RIGHT, NO COLLISION) */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 z-40 flex items-center justify-between pointer-events-none">
        {/* NEURAL LINK TRIGGER BUTTON (LEFT Side) */}
        <button 
          onClick={() => setShowNeuralLink(true)}
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 system-panel border border-red-500/60 hover:border-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] group bg-zinc-950/40 cursor-pointer"
        >
          <CloudLightning className="text-red-500 group-hover:scale-125 transition-transform animate-pulse" size={18} />
          <span className="font-orbitron text-[9px] sm:text-[10px] font-black text-red-500 tracking-[0.3em] sm:tracking-[0.4em] uppercase">NEURAL LINK</span>
        </button>

        {/* PROGRESS BUTTON (RIGHT Side) */}
        <button 
          onClick={() => setShowProgressChart(true)}
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 system-panel border-2 border-cyan-500/60 hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] group bg-zinc-950/40 cursor-pointer"
        >
          <TrendingUp className="text-cyan-400 group-hover:scale-125 transition-transform" size={18} />
          <span className="font-orbitron text-[9px] sm:text-[10px] font-black text-cyan-400 tracking-[0.3em] sm:tracking-[0.4em] uppercase">PROGRESS</span>
        </button>
      </div>

      {/* SYSTEM MENU OVERLAY */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowMenu(false)} />
        <div className={`absolute top-0 left-0 h-full w-full sm:w-[320px] bg-black border-r border-cyan-500/30 transition-transform duration-500 ease-out flex flex-col ${showMenu ? 'translate-x-0' : '-translate-x-full'}`}>
           <div className="absolute inset-0 z-[-1] opacity-20 overflow-hidden pointer-events-none"><div className="grid-layer" /></div>
           <div className="p-8 pb-4">
              <h2 className="font-orbitron text-xl font-black text-cyan-400 tracking-[0.2em] uppercase neon-text mb-4">MENU</h2>
              <div className="h-[1px] w-full bg-gradient-to-r from-cyan-500 to-transparent mb-8" />
           </div>
           <div className="flex-1 overflow-y-auto px-6 space-y-2">
              <MenuButton icon={<Trash2 size={20} />} label="Manage Progress" onClick={() => { setShowManageProgress(true); setShowMenu(false); }} />
              <MenuButton icon={<Edit size={20} />} label="Manage Quests" onClick={() => { setShowManagePermanent(true); setShowMenu(false); }} />
              <MenuButton icon={<Clock size={20} />} label="Temporary Quests" onClick={() => { setShowTemporaryHistory(true); setShowMenu(false); }} />
              <MenuButton icon={<Target size={20} />} label="Manage Streak" onClick={() => { setShowManageStreak(true); setShowMenu(false); }} />
              <MenuButton icon={<RotateCcw size={20} />} label="Reset Day" onClick={() => { setShowResetConfirm(true); setShowMenu(false); }} />
              
              {/* SYSTEM PWA INSTALLATION HUBS */}
              <div className="h-[1px] w-full bg-zinc-800 my-4" />
              
              {isPwaInstalled ? (
                <div className="mx-2 px-4 py-3 rounded border border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-center antialiased">
                  <div className="text-[7px] font-black text-cyan-400 tracking-[0.2em] uppercase mb-1">SYSTEM_STATUS_HUD</div>
                  <div className="text-[11px] font-bold text-white tracking-widest uppercase flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                    <span>AWAKENED HUD LIVE</span>
                  </div>
                </div>
              ) : isInstallable ? (
                <button 
                  onClick={handleInstallClick} 
                  className="w-full flex items-center gap-6 p-4 rounded-lg bg-cyan-950/25 hover:bg-cyan-500/20 group transition-all duration-300 border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse cursor-pointer"
                >
                  <div className="text-cyan-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all">
                    <Download size={20} />
                  </div>
                  <span className="text-cyan-400 group-hover:text-white font-black tracking-[0.05em] text-[15px] transition-all">INSTALL SYSTEM HUD</span>
                </button>
              ) : isIOS ? (
                <div>
                  <button 
                    onClick={() => setShowIosTip(!showIosTip)} 
                    className="w-full flex items-center gap-6 p-4 rounded-lg hover:bg-cyan-500/10 group transition-all duration-200 border border-transparent hover:border-cyan-500/20 cursor-pointer"
                  >
                    <div className="text-cyan-400 group-hover:scale-110 transition-all">
                      <Smartphone size={20} />
                    </div>
                    <span className="text-zinc-300 group-hover:text-white font-bold tracking-[0.05em] text-[15px] transition-all">Install on iOS</span>
                  </button>
                  {showIosTip && (
                    <div className="mx-2 mt-1 p-3 rounded bg-zinc-950/80 border border-cyan-950/60 text-[9px] text-zinc-400 uppercase tracking-wider leading-relaxed text-center font-bold">
                      Tap <span className="text-cyan-400 font-bold">Share ⎋</span> down in browser, then select <span className="text-cyan-400 font-bold">"Add to Home Screen"</span> to awaken!
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => {
                    alert("System Installation:\nClick the install icon (🖥️ / 📱) in your browser's address bar or settings menu to install the Solo Leveling Tactical HUD!");
                  }} 
                  className="w-full flex items-center gap-6 p-4 rounded-lg hover:bg-cyan-500/10 group transition-all duration-200 border border-transparent hover:border-cyan-500/20 cursor-pointer"
                >
                  <div className="text-cyan-400/60 group-hover:scale-110 transition-all">
                     <Download size={20} />
                  </div>
                  <span className="text-zinc-400 group-hover:text-white font-bold tracking-[0.05em] text-[15px] transition-all">Install System App</span>
                </button>
              )}
              
              <div className="h-[1px] w-full bg-zinc-800 my-4" />
              <MenuButton icon={<LogOut size={20} />} label="Logout" onClick={() => { store.logout(); setBootSyncDone(false); setShowMenu(false); }} />
           </div>
           <div className="p-8 border-t border-zinc-900 bg-zinc-950/50">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-zinc-400 font-bold text-[11px] tracking-widest uppercase">
                  {store.voiceEnabled ? <Volume2 size={18} className="text-cyan-400" /> : <VolumeX size={18} />} Neural Link
                </div>
                <button onClick={store.toggleVoice} className="w-12 h-6 border border-cyan-500/50 bg-cyan-950/20 transition-all relative">
                  <div className={`absolute top-0.5 w-4.5 h-4.5 transition-all ${store.voiceEnabled ? 'right-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)]' : 'left-0.5 bg-zinc-700'}`} />
                </button>
             </div>
           </div>
        </div>
      </div>

      <ManageProgressModal isOpen={showManageProgress} onClose={() => setShowManageProgress(false)} />
      <ManageQuestsModal isOpen={showManagePermanent} onClose={() => setShowManagePermanent(false)} type="permanent" />
      <ManageQuestsModal isOpen={showManageTemporary} onClose={() => setShowManageTemporary(false)} type="temporary" />
      <TemporaryQuestHistoryModal isOpen={showTemporaryHistory} onClose={() => setShowTemporaryHistory(false)} />
      <ManageStreakModal isOpen={showManageStreak} onClose={() => setShowManageStreak(false)} />
      <ResetDayModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} />
      <ProgressChartModal isOpen={showProgressChart} onClose={() => setShowProgressChart(false)} />
    </div>
  );
};

const MenuButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-6 p-4 rounded-lg hover:bg-cyan-500/10 group transition-all duration-200 border border-transparent hover:border-cyan-500/20">
    <div className="text-cyan-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all">{icon}</div>
    <span className="text-zinc-300 group-hover:text-white font-bold tracking-[0.05em] text-[15px] transition-all group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{label}</span>
  </button>
);

export default App;