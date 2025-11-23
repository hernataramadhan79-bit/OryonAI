import React, { useState } from 'react';
import { ArrowRight, Lock, User as UserIcon, Cpu, Ghost, Sparkles } from 'lucide-react';
import { loginUser, registerUser, loginAsGuest } from '../services/authService';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

// Reusable Glass Input Component
const GlassInput = ({ icon: Icon, label, ...props }: any) => (
  <div className="space-y-2 group/field">
    <label className="text-[10px] font-mono text-gray-400 font-bold tracking-widest ml-1 group-focus-within/field:text-cyber-accent transition-colors duration-300">
      {label}
    </label>
    <div className="relative transition-all duration-300 transform group-focus-within/field:scale-[1.02]">
      <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm transform group-focus-within/field:bg-cyber-accent/10 transition-colors duration-500"></div>
      <div className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] group-focus-within/field:border-cyber-accent/50 group-focus-within/field:shadow-[0_0_20px_rgba(0,243,255,0.1)] transition-all duration-300">
         <Icon size={18} className="absolute left-4 top-3.5 text-gray-500 group-focus-within/field:text-cyber-accent transition-colors duration-300" />
         <input 
           {...props}
           className="w-full bg-transparent py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none placeholder-gray-600 font-medium tracking-wide"
         />
      </div>
    </div>
  </div>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Artificial delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      let user;
      if (isLogin) {
        user = loginUser(username, password);
      } else {
        if (!displayName) throw new Error("Display name is required");
        user = registerUser(username, password, displayName);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600)); // Slightly faster than auth
    const user = loginAsGuest();
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-black relative overflow-hidden p-4 selection:bg-cyber-accent selection:text-black">
      
      {/* Animated Background Liquid */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyber-accent/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      
      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block relative mb-6">
             <div className="absolute inset-0 bg-cyber-accent blur-2xl opacity-20 animate-pulse"></div>
             <div className="relative bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                <Cpu size={40} className="text-cyber-accent drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
             </div>
          </div>
          <h1 className="text-4xl font-mono font-bold tracking-[0.2em] text-white drop-shadow-lg">
            ORYON
          </h1>
          <p className="text-gray-500 text-[10px] font-mono mt-3 tracking-[0.4em] uppercase opacity-70">Neural Link Interface</p>
        </div>

        {/* Glass Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          
          {/* Glass Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

          <h2 className="text-2xl font-medium text-white mb-8 text-center tracking-tight">
            {isLogin ? 'Welcome Back' : 'Initialize'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {!isLogin && (
               <GlassInput 
                 icon={UserIcon}
                 label="DISPLAY NAME"
                 type="text"
                 value={displayName}
                 onChange={(e: any) => setDisplayName(e.target.value)}
                 placeholder="Call sign..."
                 required
               />
            )}

            <GlassInput 
              icon={UserIcon}
              label="USERNAME"
              type="text"
              value={username}
              onChange={(e: any) => setUsername(e.target.value)}
              placeholder="Identity ID..."
              required
            />

            <GlassInput 
              icon={Lock}
              label="PASSWORD"
              type="password"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              placeholder="Access key..."
              required
            />

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center animate-pulse backdrop-blur-md">
                {error}
              </div>
            )}

            <div className="space-y-4 pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className={`
                  w-full py-4 rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-500 relative overflow-hidden group
                  ${loading 
                    ? 'bg-gray-800 cursor-wait text-gray-500' 
                    : 'bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]'}
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? 'PROCESSING...' : <>{isLogin ? 'ACCESS SYSTEM' : 'CREATE IDENTITY'} <ArrowRight size={18} /></>}
                </span>
              </button>

              <div className="flex items-center gap-4 py-1">
                  <div className="h-px bg-white/5 flex-grow"></div>
                  <span className="text-[10px] font-mono text-gray-600 uppercase">Or</span>
                  <div className="h-px bg-white/5 flex-grow"></div>
              </div>

               <button 
                type="button" 
                onClick={handleGuestLogin}
                disabled={loading}
                className={`
                  w-full py-4 rounded-2xl font-mono text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-all duration-300 relative group overflow-hidden
                  ${loading 
                    ? 'opacity-50 cursor-wait' 
                    : 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 hover:bg-cyber-accent hover:text-black hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] active:scale-[0.98]'}
                `}
              >
                 <div className="absolute inset-0 bg-cyber-accent/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
                 <Sparkles size={16} className={`${loading ? '' : 'animate-pulse'}`} />
                 <span className="relative z-10">ACTIVATE DEMO MODE</span>
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-xs text-gray-500 hover:text-white transition-colors tracking-wide hover:tracking-wider duration-300 border-b border-transparent hover:border-gray-500 pb-0.5"
            >
              {isLogin ? "Initialize new identity" : "Access existing account"}
            </button>
          </div>
        </div>
        
        <p className="text-center mt-6 text-[10px] text-gray-700 font-mono">
          SECURE CONNECTION • V2.5.0
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;