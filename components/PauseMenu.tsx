import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
      <h2 className="text-6xl font-bold text-white mb-8 neon-text tracking-widest">PAUSED</h2>
      <div className="flex flex-col gap-4 w-64">
        <button
          onClick={onResume}
          className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-all uppercase tracking-widest"
        >
          Resume
        </button>
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-all uppercase tracking-widest"
        >
          Restart
        </button>
        <button
          onClick={onQuit}
          className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all uppercase tracking-widest"
        >
          Quit
        </button>
      </div>
    </div>
  );
};

export default PauseMenu;