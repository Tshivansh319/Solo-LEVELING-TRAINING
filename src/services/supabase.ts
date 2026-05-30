import { createClient } from '@supabase/supabase-js';

// User provided credentials from their project with support for environment overrides
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wylgaqvbseradorcsvfz.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_COCxiIADu0gfWQOa-BtPDQ_0JiI5lG2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  async pushState(userCode: string, state: any) {
    if (!userCode) return { success: false, error: null };
    try {
      const { error } = await supabase
        .from('user_states')
        .upsert({ 
          id: userCode, 
          state: state, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'id' });
      
      if (error) throw error;
      return { success: true, error: null };
    } catch (e: any) {
      const isTableMissing = e.code === 'PGRST205' || e.code === 'PGRST204' || e.code === '42P01' || String(e.message || '').toLowerCase().includes('relation');
      if (isTableMissing) {
        console.warn("[SYNC_WARNING] 'user_states' table not configured in your Supabase project. Linking is required.");
      } else {
        console.error("Supabase Push Error:", e);
      }
      return { success: false, error: e.code || e.message };
    }
  },

  async fetchState(userCode: string) {
    if (!userCode) return null;
    try {
      const { data, error } = await supabase
        .from('user_states')
        .select('state')
        .eq('id', userCode)
        .maybeSingle();
      
      if (error) throw error;
      return data ? data.state : null;
    } catch (e: any) {
      const isTableMissing = e.code === 'PGRST205' || e.code === 'PGRST204' || e.code === '42P01' || String(e.message || '').toLowerCase().includes('relation');
      if (isTableMissing) {
        console.warn("[SYNC_WARNING] 'user_states' table not configured in your Supabase project.");
      } else {
        console.error("Supabase Fetch Error:", e);
      }
      return null;
    }
  },

  subscribeToChanges(userCode: string, callback: (data: any) => void) {
    if (!userCode) return () => {};

    // Standard Realtime channel - Listen to ALL changes (INSERT/UPDATE/DELETE)
    // for this specific user code to ensure multi-device parity.
    const channel = supabase
      .channel(`sync-${userCode}`)
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'user_states',
          filter: `id=eq.${userCode}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).state) {
            callback((payload.new as any).state);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[SYSTEM] Neural link established for user: ${userCode}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
