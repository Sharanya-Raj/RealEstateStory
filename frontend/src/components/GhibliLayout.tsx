import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Database, Sparkles } from "lucide-react";
import { usePreferences } from "../contexts/PreferencesContext";

interface GhibliLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showBack?: boolean;
}

const GhibliLayout = ({ children, showNav = true, showBack = false }: GhibliLayoutProps) => {
  const navigate = useNavigate();
  const { mockMode, setMockMode } = usePreferences();

  return (
    <div
      className="min-h-screen relative overflow-hidden font-quicksand bg-slate-900"
      style={{
        background: `url('/images/spiritedaway_background.jpg') center/cover no-repeat fixed`,
      }}
    >
      {/* Background overlay instead of orbs */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none z-0" />

      <style>{`
        .oracle-glass-nav {
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255,255,255,0.2);
        }
      `}</style>

      {/* Nav */}
      {showNav && (
        <nav className="oracle-glass-nav fixed top-0 left-0 right-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center text-blue-200 hover:bg-black/60 transition-colors shadow-sm"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center shadow-[0_4px_10px_rgba(96,165,250,0.35)] border border-white/20">
                  <Home size={13} className="text-white" />
                </div>
                <span className="font-playfair text-base font-semibold text-white tracking-tight drop-shadow-md">
                  The Spirited Oracle
                </span>
              </button>
            </div>

            {/* Mock Mode Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMockMode(!mockMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  mockMode 
                    ? "bg-blue-500/20 border-blue-400/50 text-blue-200 shadow-[0_0_15px_rgba(96,165,250,0.2)]" 
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
                title={mockMode ? "Running in Demo Mode (Mock Data)" : "Running in Real Mode (Live Data/Supabase)"}
              >
                {mockMode ? (
                  <>
                    <Sparkles size={14} className="text-blue-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Demo Mode</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span className="text-xs font-medium uppercase tracking-wider">Real Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main className={`relative z-10 ${showNav ? "pt-14" : ""}`}>
        {children}
      </main>
    </div>
  );
};

export default GhibliLayout;
