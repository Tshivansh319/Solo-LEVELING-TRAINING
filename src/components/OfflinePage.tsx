import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const OfflinePage: React.FC = () => {
  const handleReboot = () => {
    window.location.reload();
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden bg-[#010409]">
      {/* Outer Border Glow effect */}
      <div className="absolute inset-4 border-2 border-cyan-500/20 pointer-events-none shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"></div>
      <div className="absolute inset-0 border-[12px] border-[#010409] pointer-events-none"></div>

      {/* Main Connection Lost Box */}
      <div className="relative z-10 w-full max-w-[540px] p-12 bg-zinc-950/20 border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.25),inset_0_0_30px_rgba(6,182,212,0.1)] flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {/* Warning Icon */}
        <div className="mb-6 relative">
           <AlertTriangle size={80} className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" fill="currentColor" fillOpacity={0.1} />
        </div>

        {/* Title */}
        <h1 className="font-orbitron text-[32px] font-medium text-cyan-400 tracking-[0.3em] uppercase mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
          CONNECTION LOST
        </h1>

        {/* Subtitle */}
        <h2 className="font-bold text-[16px] text-cyan-500/90 tracking-[0.15em] uppercase mb-8">
          SYSTEM REQUIRES INTERNET
        </h2>

        {/* Description Text */}
        <div className="text-zinc-400 text-[14px] font-medium tracking-wide text-center space-y-2 mb-10 leading-relaxed max-w-[400px]">
          <p>Your mission demands a stable connection to the network.</p>
          <p>Without it, your progress cannot be synchronized across devices.</p>
        </div>

        {/* Small checklist */}
        <div className="text-zinc-500 text-[12px] font-medium tracking-wide text-center space-y-1 mb-10 opacity-60">
           <p>• Check your WiFi or mobile data connection</p>
           <p>• Ensure you have a stable internet signal</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleReboot}
          className="w-full py-4 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-black tracking-[0.2em] uppercase hover:bg-cyan-500 hover:text-black transition-all duration-300 shadow-[0_0_25px_rgba(6,182,212,0.2)] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <RefreshCw size={18} />
          REBOOT SYSTEM
        </button>

        {/* Help text */}
        <p className="text-[10px] font-medium text-zinc-700 tracking-widest uppercase mt-4 mb-10">
          This will check your internet connection and reload the system if online
        </p>

        {/* Divider */}
        <div className="w-full h-[1px] bg-cyan-500/20 mb-8"></div>

        {/* Quote */}
        <div className="text-center italic text-zinc-500 text-[13px] leading-relaxed max-w-[360px] font-medium">
          "A warrior's strength is tested not just in battle, <br />
          but in their ability to adapt and overcome obstacles."
        </div>
      </div>

      {/* Background Grid Subtle Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#010409_70%)]"></div>
      </div>
    </div>
  );
};

export default OfflinePage;
