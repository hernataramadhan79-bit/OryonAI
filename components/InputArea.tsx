import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, X, Image as ImageIcon, Trash2, Check, Scan, ScanLine } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string, attachment?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
  isSidebarOpen: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading, isSidebarOpen }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachment) && !isLoading) {
      onSend(input, attachment ? { data: attachment.data, mimeType: attachment.mimeType } : undefined);
      setInput('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract pure base64 data (remove "data:image/png;base64," prefix)
        const base64Data = base64String.split(',')[1];
        
        setAttachment({
          data: base64Data,
          mimeType: file.type,
          preview: base64String // Keep full string for preview display
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div 
      className={`fixed bottom-0 right-0 p-4 z-20 flex justify-center items-end pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`}
      style={{ 
        width: isSidebarOpen ? 'calc(100% - 20rem)' : '100%', 
        left: isSidebarOpen ? '20rem' : '0'
      }}
    >
      <div className="w-full max-w-2xl pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
        
        {/* Large HUD Attachment Preview */}
        {attachment && (
          <div className="mb-4 mx-2 animate-fade-in-up origin-bottom">
            <div className="relative w-full max-w-md mx-auto">
              
              {/* Tech Frame Container */}
              <div className="relative rounded-2xl overflow-hidden bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] group">
                
                {/* Decorative Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyber-accent/50 rounded-tl-lg z-20"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyber-accent/50 rounded-tr-lg z-20"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyber-accent/50 rounded-bl-lg z-20"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyber-accent/50 rounded-br-lg z-20"></div>

                {/* Animated Scanline Header */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyber-accent to-transparent opacity-70 shadow-[0_0_10px_#00f3ff]"></div>

                {/* Main Image Area */}
                <div className="relative p-1 bg-white/5">
                   <div className="relative rounded-lg overflow-hidden bg-cyber-black/50 min-h-[150px] max-h-[250px] flex items-center justify-center">
                     
                     {/* Cyber Grid Background */}
                     <div 
                       className="absolute inset-0 opacity-20" 
                       style={{ 
                         backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', 
                         backgroundSize: '20px 20px' 
                       }}
                     ></div>
                     
                     <img 
                        src={attachment.preview} 
                        alt="Preview" 
                        className="relative z-10 w-full h-full object-contain max-h-[250px]"
                     />
                     
                     {/* Subtle Scan Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-accent/5 to-transparent z-20 pointer-events-none animate-pulse-slow"></div>
                   </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between p-3 border-t border-white/10 bg-white/5">
                   <div className="flex items-center gap-2 text-cyber-accent/70 px-2">
                      <ScanLine size={14} className="animate-pulse" />
                      <span className="text-[9px] font-mono tracking-[0.2em] uppercase">Visual Data Ready</span>
                   </div>

                   <div className="flex gap-2">
                      {/* Cancel Button */}
                      <button 
                        onClick={() => setAttachment(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 group/cancel"
                      >
                        <Trash2 size={12} className="group-hover/cancel:text-red-300 transition-colors" />
                        <span className="text-[10px] font-bold tracking-wide">DISCARD</span>
                      </button>
                      
                      {/* Confirm & Send Button */}
                      <button 
                        onClick={() => handleSubmit()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/20 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] transition-all active:scale-95 group/confirm relative overflow-hidden"
                      >
                         <div className="absolute inset-0 bg-cyber-accent/10 translate-x-[-100%] group-hover/confirm:translate-x-[100%] transition-transform duration-700"></div>
                        <Check size={12} className="group-hover/confirm:scale-110 transition-transform relative z-10" />
                        <span className="text-[10px] font-bold tracking-wide relative z-10">SEND</span>
                      </button>
                   </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Liquid Glass Input Container - COMPACT VERSION */}
        <div className={`
          relative flex items-end gap-2 p-1.5 rounded-[1.5rem] backdrop-blur-2xl border transition-all duration-500
          ${isFocused 
            ? 'bg-white/10 border-white/20 shadow-[0_0_40px_rgba(0,243,255,0.15)]' 
            : 'bg-white/5 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}
        `}>
          
          {/* Glass Top Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"></div>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*" 
            className="hidden" 
          />

          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={`
              p-3 rounded-full flex-shrink-0 transition-all duration-300
              text-gray-400 hover:text-white hover:bg-white/10 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center
            `}
            title="Attach image"
          >
            <Paperclip size={20} />
          </button>

          {/* Text Input */}
          <div className="flex-grow relative py-2.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Message Oryon..."
              disabled={isLoading}
              className={`
                w-full bg-transparent focus:outline-none resize-none font-sans text-[15px] leading-relaxed transition-colors duration-300
                text-gray-100 placeholder-gray-500 caret-cyber-accent
                custom-scrollbar min-h-[24px]
              `}
              rows={1}
            />
          </div>

          {/* Liquid Send Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={(!input.trim() && !attachment) || isLoading}
            className={`
              group relative p-3 rounded-full flex-shrink-0 transition-all duration-500 ease-out overflow-hidden
              ${(!input.trim() && !attachment) || isLoading 
                ? 'bg-white/5 text-gray-600 opacity-50 cursor-not-allowed scale-95' 
                : 'bg-white/10 text-cyber-accent shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:bg-white/20 active:scale-90'}
            `}
          >
            {/* Liquid Fill Animation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-accent/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-white/10 blur-xl scale-50 opacity-0 group-hover:opacity-50 group-hover:scale-150 transition-all duration-700 ease-out"></div>
            
            <div className="relative z-10 flex items-center justify-center w-5 h-5">
              <SendHorizontal size={20} className={`transition-transform duration-500 ${(!input.trim() && !attachment) || isLoading ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
            </div>
          </button>
        </div>
        
        {/* Footer Text */}
        <div className="text-center mt-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
           <p className="text-[9px] font-mono tracking-[0.3em] text-gray-600 drop-shadow-sm">
             NEURAL ENGINE v2.5
           </p>
        </div>
      </div>
    </div>
  );
};

export default InputArea;