import React from 'react';
import { GameMode } from '../types';
import { soundService } from '../services/SoundService';

interface MainMenuProps {
  onStart: (mode: GameMode) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  const modes = [
    { mode: GameMode.VERSUS, label: 'VERSUS', desc: '3 min timer. High score wins.' },
    { mode: GameMode.COOP, label: 'CO-OP', desc: 'Share the board. Defend together.' },
    { mode: GameMode.COOP_4P, label: '4-PLAYER CO-OP', desc: 'Chaos with 4 players.' },
    { mode: GameMode.BOSS_RUSH, label: 'BOSS RUSH', desc: 'Defeat the Mega-Brick.' },
    { mode: GameMode.SURVIVOR, label: 'SURVIVOR', desc: '1 Life. No mercy.' },
    { mode: GameMode.PRACTICE, label: 'PRACTICE', desc: 'Infinite lives.' },
  ];

  const handleStart = (mode: GameMode) => {
      soundService.playBGMStart();
      onStart(mode);
  };

  const handleRandom = () => {
      const randomMode = modes[Math.floor(Math.random() * modes.length)].mode;
      handleStart(randomMode);
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 overflow-y-auto">
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8 neon-text tracking-tighter italic">
        FLOW MY BRICKS
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl px-4">
        {modes.map((m) => (
          <button
            key={m.mode}
            onClick={() => handleStart(m.mode)}
            className="group relative p-6 border-2 border-slate-700 hover:border-cyan-400 bg-slate-900/50 transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 mb-2">{m.label}</h3>
            <p className="text-slate-400 text-sm group-hover:text-slate-200">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
          <button 
            onClick={handleRandom}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all"
          >
            RANDOM START
          </button>
           <button 
            onClick={() => alert("Install feature coming soon to a browser near you!")}
            className="px-8 py-3 border border-white/20 hover:bg-white/10 text-white font-bold rounded transition-all"
          >
            INSTALL APP
          </button>
      </div>
      
      <a 
         href="https://aistudio.google.com/" 
         target="_blank" 
         rel="noreferrer"
         className="mt-12 text-slate-500 hover:text-cyan-400 text-xs uppercase tracking-widest"
      >
          Built with Google AI Studio
      </a>
    </div>
  );
};

export default MainMenu;
