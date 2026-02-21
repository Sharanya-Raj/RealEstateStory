import { Link, useLocation } from "react-router-dom";
import { Leaf } from "lucide-react";

export const Navbar = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/how-it-works", label: "How It Works" },
    { to: "/spirits", label: "About the Spirits" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md" style={{ boxShadow: "0 2px 12px rgba(59,48,40,0.06)" }}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Leaf className="w-6 h-6 text-ghibli-forest transition-transform group-hover:rotate-12" />
          <span className="font-heading text-xl font-bold text-foreground">NestSpirits</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-body text-sm transition-colors duration-300 hover:text-primary ${
                location.pathname === link.to ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};
