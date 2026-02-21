import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ListingCard from "@/components/ListingCard";
import { type Listing } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";
import { SlidersHorizontal, ArrowUpDown, MapPin, Sparkles } from "lucide-react";

type SortOption = "price-asc" | "price-desc" | "distance" | "rating";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "distance",   label: "Closest" },
  { key: "price-asc",  label: "$ Low → High" },
  { key: "price-desc", label: "$ High → Low" },
  { key: "rating",     label: "Top Rated" },
];

const Listings = () => {
  const navigate = useNavigate();
  const { preferences, setSelectedListingId } = usePreferences();
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(preferences?.priceMax || 3000);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/listings")
      .then(res => res.json())
      .then(data => { setListings(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const filteredListings = useMemo(() => {
    let filtered = [...listings].filter((l) => l.price <= maxPrice);
    if (preferences?.maxCommuteMiles) {
      filtered = filtered.filter((l) => l.distanceMiles <= preferences.maxCommuteMiles);
    }
    switch (sortBy) {
      case "price-asc":  filtered.sort((a, b) => a.price - b.price); break;
      case "price-desc": filtered.sort((a, b) => b.price - a.price); break;
      case "distance":   filtered.sort((a, b) => a.distanceMiles - b.distanceMiles); break;
      case "rating":     filtered.sort((a, b) => b.rating - a.rating); break;
    }
    return filtered;
  }, [sortBy, maxPrice, preferences, listings]);

  const handleListingClick = (id: string) => {
    setSelectedListingId(id);
    navigate(`/listing/${id}`);
  };

  return (
    <GhibliLayout showBack>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
              Available Nests
            </span>
          </div>
          <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-blue-950 mb-2 leading-tight">
            Find Your Sanctuary
          </h1>
          {preferences && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin size={13} className="text-blue-300" />
              <span>
                Near <span className="text-blue-600 font-semibold">{preferences.college}</span>
                {" · "}Budget up to{" "}
                <span className="font-semibold text-blue-600">${preferences.priceMax.toLocaleString()}/mo</span>
              </span>
            </div>
          )}
        </motion.div>

        {/* ── CONTROLS ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
              showFilters
                ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white border-transparent shadow-[0_4px_12px_rgba(100,150,255,0.3)]"
                : "bg-white/50 text-slate-500 border-white/70 hover:text-blue-500 hover:border-blue-200"
            }`}
            style={{ backdropFilter: "blur(12px)" }}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>

          {/* Sort pills */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown size={12} />
            <span className="font-semibold">Sort:</span>
          </div>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                sortBy === opt.key
                  ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white border-transparent shadow-[0_4px_12px_rgba(100,150,255,0.25)]"
                  : "bg-white/50 text-slate-500 border-white/70 hover:text-blue-500 hover:border-blue-200"
              }`}
              style={{ backdropFilter: "blur(12px)" }}
            >
              {opt.label}
            </button>
          ))}

          <span className="ml-auto text-xs text-slate-400 font-medium">
            {filteredListings.length} result{filteredListings.length !== 1 ? "s" : ""}
          </span>
        </motion.div>

        {/* ── FILTER PANEL ── */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.45)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow: "0 4px 20px rgba(100,150,255,0.1)",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold tracking-widest uppercase text-blue-400">
                Max Price
              </label>
              <span className="text-sm font-semibold text-slate-700 bg-blue-50/80 px-3 py-1 rounded-full border border-blue-100">
                ${maxPrice.toLocaleString()}/mo
              </span>
            </div>
            <input
              type="range" min={500} max={5000} step={50} value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full"
              style={{
                WebkitAppearance: "none", appearance: "none",
                height: "6px", borderRadius: "9999px",
                background: `linear-gradient(to right, #60a5fa ${((maxPrice - 500) / 4500) * 100}%, #dbeafe ${((maxPrice - 500) / 4500) * 100}%)`,
                outline: "none", cursor: "pointer",
              }}
            />
            <div className="flex justify-between text-xs text-blue-300 font-medium mt-2">
              <span>$500</span><span>$5,000</span>
            </div>
          </motion.div>
        )}

        {/* ── LISTINGS GRID ── */}
        {isLoading ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">🏠</span>
            </div>
            <p className="font-playfair text-xl text-blue-900">Finding nests for you…</p>
            <p className="text-slate-400 text-sm">The oracle is searching</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <span className="text-5xl">🍃</span>
            <p className="font-playfair text-xl text-blue-900">No nests found</p>
            <p className="text-slate-400 text-sm">Try adjusting your filters or distance</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => handleListingClick(listing.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </GhibliLayout>
  );
};

export default Listings;
