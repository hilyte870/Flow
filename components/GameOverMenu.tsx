import React from 'react';
import { GameMode } from '../types';

interface GameOverMenuProps {
  score: number[];
  onRestart: () => void;
  onMenu: () => void;
  mode: GameMode;
}

const GameOverMenu: React.FC<GameOverMenuProps> = ({ score, onRestart, onMenu, mode }) => {
  const p1Score = score[0];
  const p2Score = score[1];
  
  let title = "GAME OVER";
  let subtitle = "";
  
  if (mode === GameMode.VERSUS) {
      if (p1Score > p2Score) {
          title = "PLAYER 1 WINS";
          subtitle = "CYBER SUPREMACY";
      } else if (p2Score > p1Score) {
          title = "PLAYER 2 WINS";
          subtitle = "NEON DOMINANCE";
      } else {
          title = "DRAW GAME";
          subtitle = "PERFECTLY BALANCED";
      }
  } else if (mode === GameMode.BOSS_RUSH) {
       title = "BOSS DEFEATED"; // Or Game Over
       subtitle = "MISSION COMPLETE";
  } else {
      title = "GAME OVER";
      subtitle = `TOTAL SCORE: ${p1Score + p2Score}`;
  }

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-purple-600 mb-4 neon-text text-center animate-pulse">
        {title}
      </h1>
      <p className="text-2xl text-cyan-300 mb-8 tracking-[0.5em] font-bold">{subtitle}</p>

      <div className="flex gap-12 text-4xl font-orbitron mb-12">
        <div className="text-center">
            <div className="text-sm text-slate-500 tracking-widest mb-2">P1 SCORE</div>
            <div className="text-cyan-400 font-black">{p1Score}</div>
        </div>
        <div className="text-center">
            <div className="text-sm text-slate-500 tracking-widest mb-2">P2 SCORE</div>
            <div className="text-fuchsia-400 font-black">{p2Score}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all uppercase tracking-widest hover:scale-105"
        >
          PLAY AGAIN
        </button>
        <button
          onClick={onMenu}
          className="px-8 py-4 border-2 border-slate-600 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 font-bold text-xl rounded transition-all uppercase tracking-widest hover:scale-105"
        >
          MAIN MENU
        </button>
      </div>
    </div>
  );
};

export default GameOverMenu;