import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ListingCard from "@/components/ListingCard";
import { type Listing } from "@/types/listing";
import { api, getScraperName } from "@/lib/api";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  SlidersHorizontal, ArrowUpDown, MapPin, Sparkles,
  Search, Brain, TrendingUp, CheckCircle, Loader2, AlertTriangle
} from "lucide-react";

type SortOption = "truecost" | "price-asc" | "price-desc" | "distance" | "rating" | "match";
type PipelineStage = "scraping" | "analyzing" | "ranking" | "done";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "truecost", label: "True Cost" },
  { key: "price-asc", label: "$ Low → High" },
  { key: "price-desc", label: "$ High → Low" },
  { key: "distance", label: "Closest" },
  { key: "rating", label: "Top Rated" },
  { key: "match", label: "Best Match" },
];

const PIPELINE_STEPS = [
  {
    id: "scraping" as const,
    icon: Search,
    title: "Searching for Apartments",
    subtitle: "Scanning listings near your college...",
    activeColor: "text-sky-400",
    glowColor: "shadow-sky-500/30",
  },
  {
    id: "analyzing" as const,
    icon: Brain,
    title: "Spirit Agents Analyzing",
    subtitle: "Commute, budget, safety, hidden costs...",
    activeColor: "text-violet-400",
    glowColor: "shadow-violet-500/30",
  },
  {
    id: "ranking" as const,
    icon: TrendingUp,
    title: "Ranking by True Cost",
    subtitle: "Sorting from lowest to highest...",
    activeColor: "text-emerald-400",
    glowColor: "shadow-emerald-500/30",
  },
];

function stageIndex(stage: PipelineStage): number {
  return PIPELINE_STEPS.findIndex(s => s.id === stage);
}

const PipelineLoadingScreen = ({
  stage,
  listingsFound,
  listingsAnalyzed,
  totalListings,
  college,
  error,
}: {
  stage: PipelineStage;
  listingsFound: number;
  listingsAnalyzed: number;
  totalListings: number;
  college: string;
  error: string | null;
}) => {
  const currentIdx = stageIndex(stage);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/30"
            initial={{ x: `${15 + i * 14}%`, y: "110%" }}
            animate={{ y: "-10%", opacity: [0, 0.6, 0] }}
            transition={{
              duration: 6 + i * 1.5,
              repeat: Infinity,
              delay: i * 1.2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Summoning the Spirits
          </h1>
          <p className="text-slate-300 text-sm">
            Analyzing apartments near <span className="text-sky-300 font-semibold">{college}</span>
          </p>
        </motion.div>

        {/* Pipeline steps */}
        <div className="space-y-4">
          {PIPELINE_STEPS.map((step, i) => {
            const isDone = currentIdx > i || stage === "done";
            const isActive = currentIdx === i && stage !== "done";
            const isPending = currentIdx < i;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${
                  isActive
                    ? `bg-white/[0.06] border-white/20 shadow-lg ${step.glowColor}`
                    : isDone
                    ? "bg-white/[0.03] border-white/10"
                    : "bg-white/[0.02] border-white/5 opacity-40"
                }`}
                style={{ backdropFilter: "blur(12px)" }}
              >
                {/* Icon circle */}
                <div
                  className={`relative flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-all duration-500 ${
                    isActive
                      ? `bg-white/10 ${step.activeColor}`
                      : isDone
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <CheckCircle size={20} />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 size={20} />
                    </motion.div>
                  ) : (
                    <Icon size={20} />
                  )}

                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-current opacity-50"
                      animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm transition-colors duration-300 ${
                      isActive ? "text-white" : isDone ? "text-slate-200" : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDone ? "text-slate-400" : "text-slate-400"}`}>
                    {isDone && step.id === "scraping" && listingsFound > 0
                      ? `Found ${listingsFound} apartment${listingsFound !== 1 ? "s" : ""}`
                      : isDone && step.id === "analyzing"
                      ? `${listingsAnalyzed} of ${totalListings} analyzed`
                      : isDone && step.id === "ranking"
                      ? "Sorted by true monthly cost"
                      : step.subtitle}
                  </p>
                </div>

                {/* Connector line */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`absolute left-[1.65rem] top-full w-px h-4 transition-colors duration-500 ${
                      isDone ? "bg-emerald-500/40" : "bg-white/10"
                    }`}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="text-red-300/70 text-xs mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Progress bar */}
        <div className="mt-8">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500"
              initial={{ width: "0%" }}
              animate={{
                width:
                  stage === "scraping" ? "20%" :
                  stage === "analyzing" ? "60%" :
                  stage === "ranking" ? "90%" :
                  "100%"
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Listings = () => {
  const navigate = useNavigate();
  const {
    preferences, setSelectedListingId,
    agentResults, setBatchAgentResults,
    getCachedListings, setCachedListings,
    mockMode,
  } = usePreferences();

  const [sortBy, setSortBy] = useState<SortOption>("truecost");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(preferences?.priceMax || 3000);
  const [listings, setListings] = useState<Listing[]>([]);

  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("scraping");
  const [pipelineDone, setPipelineDone] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [listingsAnalyzed, setListingsAnalyzed] = useState(0);

  const pipelineStarted = useRef(false);

  const scraperName = getScraperName(preferences?.college || "");

  const runPipeline = useCallback(async () => {
    if (pipelineStarted.current) return;
    pipelineStarted.current = true;

    setPipelineStage("scraping");

    // Cycle through visual stages while the backend does everything
    const t1 = setTimeout(() => setPipelineStage("analyzing"), 6000);
    const t2 = setTimeout(() => setPipelineStage("ranking"), 18000);

    try {
      const roommates = preferences?.wantRoommates
        ? (preferences.roommateCount >= 2 ? "2+" : "1+")
        : "solo";

      const result = await api.runPipeline({
        college: scraperName,
        budget: preferences?.priceMax || 1500,
        roommates,
        parking: preferences?.needsParking ? "1" : "not_needed",
        max_distance_miles: preferences?.maxCommuteMiles || 30,
        mock: mockMode,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const pipelineListings: Listing[] = result.listings || [];
      const pipelineAgentResults: any[] = result.agentResults || [];

      if (pipelineListings.length === 0) {
        setPipelineError("No apartments found near this location. Try widening your search.");
        return;
      }

      // Store everything at once — listings only appear AFTER agents finish
      setListings(pipelineListings);
      setCachedListings(scraperName, pipelineListings);

      if (pipelineAgentResults.length > 0) {
        setBatchAgentResults(pipelineAgentResults);
        setListingsAnalyzed(pipelineAgentResults.length);
      }

      // Brief ranking animation, then reveal
      setPipelineStage("ranking");
      await new Promise(r => setTimeout(r, 600));
      setPipelineStage("done");
      await new Promise(r => setTimeout(r, 400));
      setPipelineDone(true);
    } catch (e: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setPipelineError("Pipeline failed. " + (e?.message || ""));
    }
  }, [scraperName, preferences, setCachedListings, setBatchAgentResults, mockMode]);

  useEffect(() => {
    // Instant load from cache — skip the whole pipeline
    const cached = getCachedListings(scraperName);
    if (cached && cached.length > 0) {
      setListings(cached);
      setPipelineStage("done");
      setPipelineDone(true);
      return;
    }

    runPipeline();
  }, [scraperName, getCachedListings, runPipeline]);

  const filteredListings = useMemo(() => {
    let filtered = [...listings].filter((l) => l.price <= maxPrice);
    if (preferences?.maxCommuteMiles) {
      filtered = filtered.filter((l) => l.distanceMiles <= preferences.maxCommuteMiles);
    }

    switch (sortBy) {
      case "truecost":
        filtered.sort((a, b) => {
          const aCost = agentResults[a.id]?.trueCost ?? a.price;
          const bCost = agentResults[b.id]?.trueCost ?? b.price;
          return aCost - bCost;
        });
        break;
      case "price-asc": filtered.sort((a, b) => a.price - b.price); break;
      case "price-desc": filtered.sort((a, b) => b.price - a.price); break;
      case "distance": filtered.sort((a, b) => a.distanceMiles - b.distanceMiles); break;
      case "rating": filtered.sort((a, b) => b.rating - a.rating); break;
      case "match": filtered.sort((a, b) => {
        const aScore = agentResults[a.id]?.matchScore ?? 0;
        const bScore = agentResults[b.id]?.matchScore ?? 0;
        return bScore - aScore;
      }); break;
    }
    return filtered;
  }, [sortBy, maxPrice, preferences, listings, agentResults]);

  const handleListingClick = (id: string) => {
    setSelectedListingId(id);
    navigate(`/listing/${id}`);
  };

  return (
    <GhibliLayout showBack>
      <AnimatePresence mode="wait">
        {!pipelineDone ? (
          <motion.div
            key="loading"
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
          >
            <PipelineLoadingScreen
              stage={pipelineStage}
              listingsFound={listings.length}
              listingsAnalyzed={listingsAnalyzed}
              totalListings={listings.length}
              college={preferences?.college || "your college"}
              error={pipelineError}
            />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-6xl mx-auto px-4 sm:px-6 py-10"
          >
            {/* ── HEADER ── */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-blue-400" />
                <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
                  Ranked by True Cost
                </span>
              </div>
              <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                Your Best Options
              </h1>
              {preferences && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-slate-300 text-sm bg-black/40 px-3 py-1.5 rounded-full w-max border border-white/10">
                    <MapPin size={13} className="text-blue-300" />
                    <span>
                      Near <span className="text-white font-semibold">{preferences.college}</span>
                      {" · "}Budget up to{" "}
                      <span className="font-semibold text-white">${preferences.priceMax.toLocaleString()}/mo</span>
                    </span>
                  </div>
                  {Object.keys(agentResults).length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-emerald-300 bg-black/40 px-3 py-1.5 rounded-full border border-emerald-400/30">
                      <Sparkles size={12} />
                      <span className="font-semibold">
                        {Object.keys(agentResults).length} listings analyzed
                      </span>
                    </div>
                  )}
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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${showFilters
                    ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white border-transparent shadow-[0_4px_12px_rgba(100,150,255,0.3)]"
                    : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/50 shadow-md"
                  }`}
                style={{ backdropFilter: "blur(12px)" }}
              >
                <SlidersHorizontal size={14} />
                Filters
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <ArrowUpDown size={12} />
                <span className="font-semibold">Sort:</span>
              </div>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${sortBy === opt.key
                      ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white border-transparent shadow-[0_4px_12px_rgba(100,150,255,0.25)]"
                      : "bg-black/40 text-slate-300 border-white/20 hover:text-white hover:border-white/50 shadow-md"
                    }`}
                  style={{ backdropFilter: "blur(12px)" }}
                >
                  {opt.label}
                </button>
              ))}

              <span className="ml-auto text-xs text-slate-300 font-medium">
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
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-semibold tracking-widest uppercase text-blue-300">
                    Max Price
                  </label>
                  <span className="text-sm font-semibold text-white bg-black/60 px-3 py-1 rounded-full border border-white/20 shadow-md">
                    ${maxPrice.toLocaleString()}/mo
                  </span>
                </div>
                <input
                  type="range" min={500} max={5000} step={50} value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full commute-slider"
                  style={{
                    background: `linear-gradient(to right, #60a5fa ${((maxPrice - 500) / 4500) * 100}%, rgba(255,255,255,0.2) ${((maxPrice - 500) / 4500) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-slate-300 font-medium mt-2">
                  <span>$500</span><span>$5,000</span>
                </div>
              </motion.div>
            )}

            {/* ── LISTINGS GRID ── */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-24 flex flex-col items-center gap-4">
                <span className="text-5xl">🍃</span>
                <p className="font-playfair text-xl text-white font-bold drop-shadow-md">No nests found</p>
                <p className="text-slate-300 text-sm">Try adjusting your filters or distance</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    agentData={agentResults[listing.id] ?? null}
                    onClick={() => handleListingClick(listing.id)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GhibliLayout>
  );
};

export default Listings;
