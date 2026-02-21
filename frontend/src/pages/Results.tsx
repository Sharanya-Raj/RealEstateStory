import { useState, useEffect } from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { AgentPipeline } from "@/components/AgentPipeline";
import { ListingCard } from "@/components/ListingCard";
import { SootSprites } from "@/components/SootSprites";
import { AgentAvatar } from "@/components/AgentAvatar";
import { agents, type Listing } from "@/data/mockData";

type SortOption = "recommendation" | "cost" | "distance" | "value";

const Results = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recommendation");
  const [filters, setFilters] = useState({ gym: false, grocery: false, pet: false });
  
  const [backendData, setBackendData] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const address = searchParams.get("university") || "New Jersey";
  const budget = searchParams.get("budget") ? parseInt(searchParams.get("budget") as string) : 2000;

  // 1. Fetch real backend data from our FastMCP bridge
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, budget })
        });
        
        if (!response.ok) throw new Error("Backend failed");
        const json = await response.json();
        
        if (json.error) throw new Error(json.error);
        
        // The API currently returns a singular listing dict, wrap it in array
        setBackendData([json as Listing]);
      } catch (e: any) {
        console.error(e);
        setError("The spirits could not find a path forward. (Backend error)");
      }
    };
    
    fetchListing();
  }, [address, budget]);

  // Simulate agent pipeline
  useEffect(() => {
    const steps = [0, 1, 2, 3, 4, 5]; // sequential 0 through 5
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((step, i) => {
      timers.push(setTimeout(() => setCurrentStep(step), (i + 1) * 1500));
    });
    timers.push(setTimeout(() => { setCurrentStep(6); setShowResults(true); }, (steps.length + 1) * 1500));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Audio effect for Kamaji
  useEffect(() => {
    if (showResults && backendData.length > 0) {
      const activeListing = backendData[0] as any;
      if (activeListing.voiceoverBase64) {
        try {
          const snd = new Audio("data:audio/mp3;base64," + activeListing.voiceoverBase64);
          snd.volume = 0.5;
          snd.play().catch((e: any) => console.log("Audio autoplay prevented", e));
        } catch (e) {
          console.log("Audio play failed");
        }
      }
    }
  }, [showResults, backendData]);

  const kamaji = agents[5];
  const activeListingItem = backendData[0] as any;

  let filtered = [...backendData];
  if (filters.gym) filtered = filtered.filter((l) => l.hasGym);
  if (filters.grocery) filtered = filtered.filter((l) => l.hasGrocery);
  if (filters.pet) filtered = filtered.filter((l) => l.petFriendly);

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "cost": return a.trueCost - b.trueCost;
      case "distance": return parseFloat(a.distanceToCampus) - parseFloat(b.distanceToCampus);
      case "value": return a.percentile - b.percentile;
      default: return a.rank - b.rank;
    }
  });

  const toggleFilter = (key: keyof typeof filters) =>
    setFilters((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </Link>

        {/* Pipeline */}
        <div className="ghibli-card p-4 mb-8 overflow-hidden">
          <h2 className="font-heading text-xl text-center mb-2">Spirit Pipeline</h2>
          <AgentPipeline currentStep={currentStep} />
        </div>

        {/* Results */}
        <AnimatePresence>
          {!showResults ? (
            <SootSprites text="The spirits are searching..." count={5} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              {/* Kamaji intro */}
              <div className="flex items-start gap-4 mb-8">
                <AgentAvatar agent={kamaji} size="lg" status="complete" />
                <div className="speech-bubble flex-1">
                  <p className="text-lg font-handwritten italic text-muted-foreground">
                    {activeListingItem?.sophieSummary 
                      ? `"${activeListingItem.sophieSummary}"` 
                      : `"I've pulled all the threads together. Here is the summary of your journey."`}
                  </p>
                </div>
              </div>

              {/* Sort & Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-full px-4 py-2 bg-card border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="recommendation">Spirit Recommendation</option>
                  <option value="cost">Lowest True Cost</option>
                  <option value="distance">Closest to Campus</option>
                  <option value="value">Best Historical Value</option>
                </select>

                {(["gym", "grocery", "pet"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={`ghibli-chip text-xs ${filters[key] ? "selected" : ""}`}
                  >
                    {key === "gym" ? "Has Gym" : key === "grocery" ? "Has Grocery" : "Pet Friendly"}
                  </button>
                ))}
              </div>

              {/* Listing Grid */}
              {error ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">💨</p>
                  <p className="font-handwritten text-xl text-red-500">{error}</p>
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">🌳</p>
                  <p className="font-handwritten text-xl text-muted-foreground">
                    No nests found matching your wishes. Try adjusting your filters?
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {sorted.map((listing, i) => (
                    <ListingCard key={listing.id} listing={listing} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Results;
