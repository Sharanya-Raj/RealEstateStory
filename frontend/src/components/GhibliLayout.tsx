import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

interface GhibliLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showBack?: boolean;
}

const GhibliLayout = ({ children, showNav = true, showBack = false }: GhibliLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen relative overflow-hidden font-quicksand"
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 40%, #dbeafe 70%, #eff6ff 100%)",
      }}
    >
      {/* Floating orbs — same as Oracle landing */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            top: "-10%", left: "-5%",
            background: "radial-gradient(circle, rgba(147,197,253,0.4) 0%, rgba(186,230,255,0.15) 60%, transparent 100%)",
            filter: "blur(80px)",
            animation: "orbFloatA 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            top: "10%", right: "-5%",
            background: "radial-gradient(circle, rgba(125,211,252,0.35) 0%, rgba(186,230,255,0.12) 60%, transparent 100%)",
            filter: "blur(70px)",
            animation: "orbFloatB 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[700px] h-[400px] rounded-full"
          style={{
            bottom: "-5%", left: "15%",
            background: "radial-gradient(circle, rgba(167,210,255,0.3) 0%, rgba(219,234,254,0.15) 60%, transparent 100%)",
            filter: "blur(90px)",
            animation: "orbFloatC 30s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes orbFloatA {
          0%,100%{transform:translate(0,0) scale(1)}
          40%{transform:translate(25px,-35px) scale(1.04)}
          70%{transform:translate(-15px,20px) scale(0.97)}
        }
        @keyframes orbFloatB {
          0%,100%{transform:translate(0,0) scale(1)}
          35%{transform:translate(-30px,25px) scale(1.06)}
          65%{transform:translate(20px,-15px) scale(0.96)}
        }
        @keyframes orbFloatC {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(40px,-20px) scale(1.03)}
        }
        .oracle-glass-nav {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(200,225,255,0.4);
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
                  className="w-8 h-8 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors"
                >
                  <ArrowLeft size={15} />
                </button>
              )}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center shadow-[0_4px_10px_rgba(96,165,250,0.35)]">
                  <Home size={13} className="text-white" />
                </div>
                <span className="font-playfair text-base font-semibold text-blue-950 tracking-tight">
                  The Spirited Oracle
                </span>
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
