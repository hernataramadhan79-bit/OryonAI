import React from 'react';
import { Cpu, Activity, Zap } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px] p-1">
      
      {/* HUD Header */}
      <div className="flex items-center justify-between text-cyber-accent/80 mb-1">
        <div className="flex items-center gap-2">
           <Activity size={12} className="animate-pulse" />
           <span className="text-[10px] font-mono tracking-widest uppercase font-bold">Processing</span>
        </div>
        <div className="flex gap-1">
           <div className="w-1 h-1 bg-cyber-accent rounded-full animate-ping"></div>
           <div className="w-1 h-1 bg-cyber-accent rounded-full animate-pulse delay-75"></div>
           <div className="w-1 h-1 bg-cyber-accent rounded-full animate-pulse delay-150"></div>
        </div>
      </div>

      {/* Main Visual Bar */}
      <div className="h-8 bg-black/40 rounded-lg border border-white/10 relative overflow-hidden flex items-center px-3 gap-3">
         
         {/* Background Grid Animation */}
         <div className="absolute inset-0 opacity-10" 
              style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0, 243, 255, 0.2) 50%)', backgroundSize: '20px 100%' }}>
         </div>

         {/* Icon */}
         <Cpu size={16} className="text-cyber-accent animate-spin-slow relative z-10" />
         
         {/* Text Stream Effect */}
         <div className="flex-grow h-1.5 bg-gray-800 rounded-full overflow-hidden relative z-10">
            <div className="absolute top-0 left-0 h-full w-1/3 bg-cyber-accent blur-[2px] animate-shimmer-slide rounded-full"></div>
         </div>
      </div>

      {/* Footer System Lines */}
      <div className="flex justify-between items-center opacity-50">
         <span className="text-[8px] font-mono text-gray-400">CORE_V2.5</span>
         <span className="text-[8px] font-mono text-cyber-accent animate-pulse">CONNECTING...</span>
      </div>
    </div>
  );
};

export default TypingIndicator;