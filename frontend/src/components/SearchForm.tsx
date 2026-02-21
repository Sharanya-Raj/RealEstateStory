import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { type SearchParams } from "@/api/agents";

export const SearchForm = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    // Pass the minimal required structure expected by Results
    navigate("/results", { 
      state: {
        university: address,
        budget: 1500,
        roommates: 0,
        hasCar: true,
        amenities: [],
        nearbyPreferences: [],
        notes: "",
      } as SearchParams 
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-ghibli-forest/20 to-ghibli-gold/20 rounded-full blur-lg group-hover:blur-xl transition-all duration-500 opacity-50"></div>
        <div className="relative flex items-center bg-card rounded-full p-2 pr-3 shadow-xl border border-border/50">
          <div className="pl-4 pr-3 text-muted-foreground">
            <Search className="w-5 h-5 text-ghibli-forest" />
          </div>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter a New Jersey address to begin your journey..."
            className="flex-1 bg-transparent border-none py-3 font-body text-lg focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60"
          />
          <button 
            type="submit" 
            className="ghibli-btn-primary py-2.5 px-6 font-semibold shadow-md whitespace-nowrap"
          >
            Begin the Journey ✨
          </button>
        </div>
      </div>
    </motion.form>
  );
};
