import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, Download, Image as ImageIcon, Copy, Check } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

interface ChatMessageProps {
  message: Message;
  agentTheme?: string;
}

// Helper to extract hex color from tailwind class for dynamic animations
const getThemeHex = (themeClass: string = '') => {
  if (themeClass.includes('green')) return '#4ade80';
  if (themeClass.includes('pink')) return '#f472b6';
  if (themeClass.includes('yellow')) return '#facc15';
  if (themeClass.includes('purple')) return '#a855f7';
  return '#00f3ff'; // Default cyber-accent
};

// Optimization: Memoize CodeBlock to prevent re-renders on parent updates
const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isCopied, setIsCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="my-8 rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-xl w-full max-w-full group transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
        {/* Header Language Label */}
        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
            {match[1]}
          </span>
        </div>
        
        {/* Code Area */}
        <div className="p-5 overflow-x-auto custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </div>

        {/* Footer with Copy Button */}
        <div className="bg-white/5 px-4 py-2 border-t border-white/5 flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-95"
          >
            {isCopied ? (
              <>
                <Check size={14} className="text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Inline Code
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-sm font-mono text-gray-200 border border-white/10" {...props}>
      {children}
    </code>
  );
});

const ChatMessage: React.FC<ChatMessageProps> = ({ message, agentTheme }) => {
  const isUser = message.role === 'user';
  const isImage = message.type === 'image';
  
  // Derive styling based on role
  const themeColor = agentTheme || 'text-cyber-accent';
  const borderColor = themeColor.replace('text-', 'border-');
  const hexColor = getThemeHex(themeColor);

  // Determine animation class based on sender
  const animationClass = isUser ? 'animate-slide-in-right' : 'animate-slide-in-left';

  // Check if message is in "Thinking/Loading" state (AI role + empty text + no image)
  const isThinking = !isUser && !message.text && !message.imageUrl && !message.attachment;
  
  // Check if message is actively streaming
  const isStreaming = !!message.isStreaming;
  const pulseAnimationName = `pulse-border-${message.id}`;

  return (
    <div className={`flex w-full mb-8 opacity-0 ${animationClass} ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* Dynamic Keyframes for pulsing border matched to agent theme */}
      {isStreaming && !isUser && (
        <style>{`
          @keyframes ${pulseAnimationName} {
            0% { box-shadow: 0 0 0px ${hexColor}00; border-color: rgba(255,255,255,0.1); }
            50% { box-shadow: 0 0 20px ${hexColor}20; border-color: ${hexColor}60; }
            100% { box-shadow: 0 0 0px ${hexColor}00; border-color: rgba(255,255,255,0.1); }
          }
        `}</style>
      )}

      <div className={`flex max-w-[95%] md:max-w-[85%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar - Glassy */}
        <div className={`
          flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center border backdrop-blur-xl mt-1 transition-all duration-500 shadow-lg group
          ${isUser 
            ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' 
            : `bg-white/5 border-white/10 ${themeColor} hover:bg-white/10`}
        `}>
          {isUser ? <User size={16} className="md:w-[18px] md:h-[18px] transition-transform duration-500 group-hover:scale-110" /> : <Bot size={16} className="md:w-[18px] md:h-[18px] transition-transform duration-500 group-hover:scale-110" />}
        </div>

        {/* Content Bubble */}
        <div className={`
          flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
          min-w-0 w-full
        `}>
          <div 
            style={isStreaming && !isUser ? { animation: `${pulseAnimationName} 2s infinite ease-in-out` } : {}}
            className={`
            group relative px-5 py-4 md:px-6 md:py-5 text-[14px] md:text-[15px] leading-relaxed transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full backdrop-blur-xl shadow-sm
            ${isUser 
              ? 'bg-white/10 text-gray-100 rounded-[2rem] rounded-tr-sm border border-white/10 w-fit hover:bg-white/15 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 active:scale-[0.98]' 
              : `bg-black/20 text-gray-200 rounded-[2rem] rounded-tl-sm border border-white/5 border-l-2 ${borderColor} w-full hover:bg-black/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] active:scale-[0.99]`} 
            ${isImage ? 'p-0 bg-transparent border-none shadow-none w-fit !backdrop-blur-0 hover:bg-transparent hover:shadow-none hover:translate-y-0 active:scale-100' : ''}
          `}>
            
            {/* Glass Top Highlight (Liquid Effect) */}
            {!isImage && (
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            )}

            {/* User Uploaded Attachment */}
            {message.attachment && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/30 shadow-lg inline-block">
                <img 
                  src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                  alt="Attachment" 
                  className="max-h-64 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {/* Generated Image Message */}
            {isImage && message.imageUrl ? (
              <div className="group/image relative rounded-[2rem] overflow-hidden border border-white/10 bg-black/50 shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <img 
                  src={`data:image/jpeg;base64,${message.imageUrl}`} 
                  alt="Generated Art" 
                  className="w-full h-auto max-w-md object-cover transition-transform duration-700 group-hover/image:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                  <a 
                    href={`data:image/jpeg;base64,${message.imageUrl}`} 
                    download={`oryon-art-${message.id}.jpg`}
                    className="bg-black/60 hover:bg-white/20 hover:text-white text-gray-200 p-2.5 rounded-xl backdrop-blur-xl border border-white/10 transition-all flex items-center justify-center active:scale-90"
                    title="Download"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
            ) : null}

            {/* Text Content OR Loading Indicator */}
            {(!isImage) && (
              <div className={`${(isImage || message.attachment) ? 'mt-4' : ''} ${!isUser ? 'w-full' : ''}`}>
                 {isUser ? (
                  <p className="whitespace-pre-wrap font-sans font-medium tracking-wide">{message.text}</p>
                ) : (
                   <>
                     {isThinking ? (
                        <TypingIndicator />
                     ) : (
                       <div className="prose prose-invert prose-sm max-w-none
                         /* Typography Updates for Structured Response */
                         
                         /* Paragraphs */
                         prose-p:text-gray-300 prose-p:leading-7 md:prose-p:leading-8 prose-p:mb-4 last:prose-p:mb-0 prose-p:font-sans
                         
                         /* Headings */
                         prose-headings:text-white prose-headings:font-bold prose-headings:font-sans prose-headings:mt-8 prose-headings:mb-4
                         prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                         
                         /* Lists */
                         prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:text-gray-300 prose-ul:space-y-2
                         prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-gray-300 prose-ol:space-y-2
                         
                         /* Links */
                         prose-a:text-cyber-accent prose-a:underline prose-a:decoration-cyber-accent/30 hover:prose-a:text-white hover:prose-a:decoration-white
                         
                         /* Table Styling (New) */
                         prose-table:w-full prose-table:my-6 prose-table:border-collapse prose-table:text-sm
                         prose-thead:bg-white/5 prose-thead:border-b prose-thead:border-white/10
                         prose-th:text-left prose-th:p-3 prose-th:text-white prose-th:font-bold
                         prose-td:p-3 prose-td:border-b prose-td:border-white/5 prose-td:text-gray-300
                         
                         /* Blockquote */
                         prose-blockquote:border-l-4 prose-blockquote:border-cyber-accent/50 prose-blockquote:bg-white/5 prose-blockquote:pl-5 prose-blockquote:py-3 prose-blockquote:my-6 prose-blockquote:pr-4 prose-blockquote:rounded-r-xl prose-blockquote:text-gray-300 prose-blockquote:italic prose-blockquote:font-medium
                         
                         /* Strong/Bold */
                         prose-strong:text-white prose-strong:font-extrabold
                         
                         /* HR */
                         prose-hr:border-white/10 prose-hr:border-t-2 prose-hr:my-8 prose-hr:w-full prose-hr:rounded-full
                       ">
                         <ReactMarkdown 
                           remarkPlugins={[remarkGfm]}
                           components={{
                             code: CodeBlock
                           }}
                         >
                           {message.text}
                         </ReactMarkdown>
                       </div>
                     )}
                   </>
                )}
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          {!isUser && (
            <span className="text-[10px] text-gray-500 mt-2 ml-2 font-mono opacity-60 tracking-wider">
               ORYON • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Optimization: Memoize ChatMessage
export default memo(ChatMessage);