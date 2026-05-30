import React, { useState } from 'react';
import { useStore } from '../store';

const Login: React.FC = () => {
  const [code, setCode] = useState('');
  const authenticate = useStore((state) => state.authenticate);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      authenticate(code.trim());
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden bg-[#010409]">
      {/* Outer Border Glow effect - matches the screenshot's outer frame */}
      <div className="absolute inset-4 border-2 border-cyan-500/20 pointer-events-none shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"></div>
      <div className="absolute inset-0 border-[12px] border-[#010409] pointer-events-none"></div>

      {/* Main Login Box */}
      <div className="relative z-10 w-full max-w-[500px] p-12 bg-zinc-950/20 border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.25),inset_0_0_30px_rgba(6,182,212,0.1)] flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {/* Title */}
        <h1 className="font-orbitron text-[28px] font-medium text-cyan-400 tracking-[0.4em] uppercase mb-6 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
          SOLO SYSTEM
        </h1>

        {/* Description */}
        <p className="text-zinc-400 text-[13px] font-medium tracking-wide text-center mb-10 max-w-[320px] leading-relaxed">
          Enter your personal code to access your data from any device
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="relative group">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code..."
              className="w-full bg-transparent border border-cyan-500/30 px-6 py-3.5 text-zinc-300 font-medium tracking-wider text-center focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all placeholder:text-zinc-700 placeholder:italic"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-cyan-900/40 border border-cyan-500/60 text-cyan-400 font-bold tracking-[0.2em] uppercase hover:bg-cyan-500 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] active:scale-[0.98]"
          >
            ENTER
          </button>
        </form>

        {/* Footer info */}
        <p className="text-[11px] font-medium text-zinc-600 tracking-wide text-center mt-12 max-w-[340px]">
          Use any unique code (e.g., your name, username, or random text)
        </p>
      </div>

      {/* Grid subtle overlay to ensure the background matches exactly */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#010409_70%)]"></div>
      </div>
    </div>
  );
};

export default Login;
