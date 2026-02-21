import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

interface GhibliLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showBack?: boolean;
}

const GhibliLayout = ({ children, showNav = true, showBack = false }: GhibliLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-ghibli-meadow/10 animate-float" />
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-ghibli-sky/10 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 rounded-full bg-ghibli-pink/10 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 right-1/3 w-16 h-16 rounded-full bg-ghibli-amber/10 animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Navigation */}
      {showNav && !isHome && (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBack && (
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 font-playfair text-lg font-semibold text-foreground hover:text-ghibli-forest transition-colors"
              >
                <span className="text-xl">🏡</span>
                <span className="ghibli-text-gradient">Ghibli Nest</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <Home className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className={`relative z-10 ${!isHome && showNav ? "pt-14" : ""}`}>
        {children}
      </main>
    </div>
  );
};

export default GhibliLayout;
