import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import { type Listing } from "@/types/listing";
import { api, getScraperName } from "@/lib/api";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  MapPin, Bed, Bath, Ruler, Star, Car, Zap, PawPrint,
  Calendar, Shield, DollarSign, Sparkles, ArrowLeft,
  Navigation, Wind, Cloud, TrendingUp, Wallet, CheckCircle, AlertTriangle
} from "lucide-react";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preferences, setSelectedListingId, setAiPayload, getAgentResult, setAgentResult, getCachedListings } = usePreferences();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState<any | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const agentFetchedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const scraperKey = getScraperName(preferences?.college || "");
    const cached = getCachedListings(scraperKey);
    if (cached) {
      const found = cached.find((l: any) => l.id === id);
      if (found) {
        setListing(found);
        setIsLoading(false);
        return;
      }
    }

    api.getListing(id)
      .then(data => {
        setListing(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listing", err);
        setListing(null);
        setIsLoading(false);
      });
  }, [id, preferences?.college, getCachedListings]);

  // Single consolidated effect: check cache first, only call API if nothing cached
  useEffect(() => {
    if (!id || !listing) return;

    // Already have agent data for this listing
    if (agentData?.id === listing.id) return;

    // Check pipeline batch cache
    const cached = getAgentResult(id);
    if (cached) {
      setAgentData(cached);
      setAiPayload(cached);
      return;
    }

    // No cached data — fetch individually (only once per listing)
    if (agentFetchedForId.current === listing.id) return;
    agentFetchedForId.current = listing.id;
    setIsAgentLoading(true);

    api.evaluateListing({
      address: listing.address,
      budget: preferences?.priceMax || 1500,
      mock_data: listing,
      college: getScraperName(preferences?.college || ""),
    })
      .then(data => {
        if (!data.error) {
          setAgentData(data);
          setAgentResult(listing.id, data);
          setAiPayload(data);
        }
      })
      .catch(err => {
        console.error("Agent evaluation failed:", err);
        agentFetchedForId.current = null;
      })
      .finally(() => setIsAgentLoading(false));
  }, [id, listing, agentData, preferences?.priceMax, preferences?.college, getAgentResult, setAgentResult, setAiPayload]);

  if (isLoading) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-3xl">🏠</span>
          </div>
          <p className="font-sans text-xl text-blue-900">Summoning listing details...</p>
          <p className="text-slate-400 text-sm">The oracle is searching</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🍃</span>
          <p className="font-sans text-2xl text-white font-bold drop-shadow-md">Listing Not Found</p>
          <p className="text-slate-300">The wind has carried this sanctuary away.</p>
          <button 
            onClick={() => navigate("/listings")}
            className="mt-4 px-6 py-2 rounded-xl bg-black/40 text-blue-300 border border-white/20 font-semibold hover:bg-white/10 transition-colors shadow-lg"
          >
            Back to listings
          </button>
        </div>
      </GhibliLayout>
    );
  }

  const handleBeginJourney = () => {
    const payload = agentData ?? getAgentResult(listing.id);
    if (payload) {
      setAiPayload(payload);
    }
    setSelectedListingId(listing.id);
    navigate(`/journey/${listing.id}`);
  };

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
        <style>{`
          .oracle-glass {
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          }
          .oracle-glass-strong {
            background: rgba(0,0,0,0.7);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          }
        `}</style>

        {/* Back navigation */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/listings")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors mb-8 font-medium text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center border border-white/80 group-hover:border-blue-200 transition-all">
            <ArrowLeft size={14} />
          </div>
          <span>Back to all listings</span>
        </motion.button>

        {/* ── HERO IMAGE AREA ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          className={`h-64 lg:h-96 rounded-[2.5rem] bg-gradient-to-br ${listing.imageGradient} relative overflow-hidden mb-12 shadow-[0_24px_64px_rgba(100,150,255,0.15)]`}
        >
          {/* Glass Overlay for theme harmony */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10" />
          
          {/* Floating decorative icons */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10"><Cloud size={100} /></div>
            <div className="absolute bottom-20 right-20"><Wind size={120} /></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12rem] opacity-30 drop-shadow-2xl">🏠</span>
          </div>

          {/* Top Price Badge */}
          <div className="absolute top-6 right-6 oracle-glass px-6 py-3 rounded-2xl">
            <span className="font-sans text-3xl font-bold text-white drop-shadow-md">
              ${listing.price.toLocaleString()}
              <span className="text-sm font-medium text-slate-300">/mo</span>
            </span>
          </div>

          {/* Rating/Landlord Badge */}
          <div className="absolute bottom-6 left-6 oracle-glass px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-lg border border-white/30">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-bold text-amber-200 text-sm">{listing.rating}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-blue-100 text-sm font-semibold tracking-wide drop-shadow-sm">{listing.landlord}</span>
          </div>
        </motion.div>

        {/* ── CONTENT ── */}
        <div className="space-y-12">
          
          {/* Title & Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-blue-300" />
              <span className="text-xs font-semibold tracking-widest uppercase text-blue-300 drop-shadow-md">
                Property Sanctuary
              </span>
            </div>
            <h1 className="font-sans text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-xl">
              {listing.address}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-300 drop-shadow-sm border border-white/10 bg-black/40 px-4 py-2 rounded-full w-max">
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-blue-300" />
                <span className="font-medium">{listing.city}, {listing.state} {listing.zip}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <div className="flex items-center gap-1.5 font-medium text-blue-200">
                <Navigation size={16} />
                <span>{listing.distanceMiles} miles from campus</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-5"
          >
            {[
              { icon: Bed, label: "Bedrooms", value: listing.bedrooms, color: "blue" },
              { icon: Bath, label: "Bathrooms", value: listing.bathrooms, color: "sky" },
              { icon: Ruler, label: "Sq Ft", value: listing.sqft, color: "blue" },
              { icon: Calendar, label: "Lease Term", value: `${listing.leaseTermMonths} mo`, color: "sky" },
            ].map((stat) => (
              <div key={stat.label} className="oracle-glass p-6 rounded-3xl text-center flex flex-col items-center gap-2 group hover:scale-105 transition-transform bg-black/40 border border-white/20">
                <div className={`w-10 h-10 rounded-2xl bg-black/60 border border-[var(--tw-colors-${stat.color}-400)] flex items-center justify-center text-${stat.color}-300 group-hover:bg-white/20 group-hover:text-white transition-all shadow-md`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white drop-shadow-md">{stat.value}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5 drop-shadow-sm">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="oracle-glass-strong bg-black/40 border border-white/20 p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl"
          >
            <div className="relative z-10">
              <h2 className="font-sans text-2xl font-bold text-white mb-4 flex items-center gap-3 drop-shadow-md">
                <span className="w-1.5 h-8 bg-blue-400 rounded-full" />
                About This Home
              </h2>
              <p className="text-slate-300 leading-relaxed text-lg font-light drop-shadow-sm">
                {listing.description}
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="oracle-glass bg-black/40 border border-white/20 p-8 rounded-[2rem] shadow-2xl"
            >
              <h3 className="font-sans text-xl font-bold text-white mb-5 drop-shadow-md">Amenities</h3>
              <div className="flex flex-wrap gap-2.5">
                {listing.amenities.map((a) => (
                  <span key={a} className="pill-tag px-4 py-2 rounded-full bg-black/60 border border-white/20 text-blue-200 text-xs font-bold tracking-wide shadow-sm">
                    {a}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Key Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="oracle-glass bg-black/40 border border-white/20 p-8 rounded-[2rem] shadow-2xl"
            >
              <h3 className="font-sans text-xl font-bold text-white mb-5 drop-shadow-md">Key Details</h3>
              <div className="space-y-4">
                {[
                  { icon: Car, label: "Parking", value: listing.parkingIncluded ? "Included ✓" : "Not included", iconColor: "text-blue-300" },
                  { icon: Zap, label: "Utilities", value: listing.utilitiesIncluded ? "Included ✓" : "Not included", iconColor: "text-amber-200" },
                  { icon: PawPrint, label: "Pets", value: listing.petFriendly ? "Friendly ✓" : "Not allowed", iconColor: "text-sky-300" },
                  { icon: Shield, label: "Security Deposit", value: `$${listing.securityDeposit}`, iconColor: "text-blue-400" },
                  { icon: DollarSign, label: "Zillow Estimate", value: `$${listing.zillowEstimate}/mo`, iconColor: "text-amber-300" },
                ].map((detail) => (
                  <div key={detail.label} className="flex items-center justify-between text-sm py-2 border-b border-white/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center ${detail.iconColor} border border-white/20 shadow-md`}>
                        <detail.icon size={16} />
                      </div>
                      <span className="text-slate-300 font-medium">{detail.label}</span>
                    </div>
                    <span className="text-white font-bold">{detail.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── AGENT INSIGHTS SECTION ── */}
          {(isAgentLoading || agentData) && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="oracle-glass-strong bg-black/40 border border-white/20 p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl"
            >
              <div className="relative z-10">
                <h2 className="font-sans text-2xl font-bold text-white mb-2 flex items-center gap-3 drop-shadow-md">
                  <Sparkles className="text-sky-300" size={22} />
                  Spirit Agent Analysis
                </h2>
                <p className="text-slate-400 text-sm mb-6">AI agents have evaluated this property for you</p>

                {isAgentLoading && !agentData ? (
                  <div className="flex flex-col items-center py-8 gap-4">
                    <motion.div
                      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl"
                    >
                      🔮
                    </motion.div>
                    <p className="text-sky-300 font-semibold text-sm animate-pulse">Spirits are evaluating this sanctuary...</p>
                  </div>
                ) : agentData ? (
                  <div className="space-y-6">
                    {/* Top stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Match Score */}
                      <div className="text-center p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="text-3xl font-bold text-white drop-shadow-md">{agentData.matchScore ?? "—"}%</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-sky-300 mt-1">Spirit Match</div>
                      </div>
                      {/* True Cost */}
                      <div className="text-center p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="text-3xl font-bold text-white drop-shadow-md flex items-center justify-center gap-1">
                          <Wallet size={18} className="text-blue-300" />
                          ${agentData.trueCost ? Math.round(agentData.trueCost).toLocaleString() : listing.price.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-blue-300 mt-1">True Cost/mo</div>
                      </div>
                      {/* Commute */}
                      <div className="text-center p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="text-3xl font-bold text-white drop-shadow-md">{agentData.commute?.driving ?? `${listing.commuteMinutes}m`}</div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-300 mt-1">Drive Time</div>
                      </div>
                      {/* Safety */}
                      <div className="text-center p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="text-3xl font-bold text-white drop-shadow-md flex items-center justify-center gap-1">
                          <Shield size={18} className="text-emerald-300" />
                          {agentData.safety?.score ?? listing.crimeScore}/10
                        </div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-300 mt-1">Safety</div>
                      </div>
                    </div>

                    {/* Market insight */}
                    {agentData.historicalInsight && (
                      <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className="text-blue-300" />
                          <span className="text-xs font-bold tracking-widest uppercase text-blue-300">Market Position</span>
                          {agentData.percentile != null && (
                            <span className="ml-auto text-sm font-bold text-white">{agentData.percentile}th percentile</span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{agentData.historicalInsight}</p>
                      </div>
                    )}

                    {/* Budget insight */}
                    {agentData.budgetInsight && (
                      <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-amber-300" />
                          <span className="text-xs font-bold tracking-widest uppercase text-amber-300">Budget Analysis</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{agentData.budgetInsight}</p>
                      </div>
                    )}

                    {/* Pros & Cons */}
                    {(agentData.pros?.length > 0 || agentData.cons?.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {agentData.pros?.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-300">Blessings</span>
                            {agentData.pros.map((p: string) => (
                              <div key={p} className="flex items-start gap-2 text-sm text-white">
                                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {agentData.cons?.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300">Cautions</span>
                            {agentData.cons.map((c: string) => (
                              <div key={c} className="flex items-start gap-2 text-sm text-white">
                                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Kamaji summary */}
                    {agentData.sophieSummary && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-sky-500/10 border border-blue-400/20">
                        <p className="text-sky-100 text-sm italic leading-relaxed">"{agentData.sophieSummary}"</p>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-sky-400 mt-2">— Kamaji, the Oracle</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* CTA Footer */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center py-12 border-t border-white/10"
          >
            <div className="inline-block p-1 rounded-full bg-black/40 border border-white/20 mb-6 shadow-md">
              <Sparkles size={20} className="text-blue-300 animate-pulse" />
            </div>
            <h3 className="font-sans text-2xl lg:text-3xl font-bold text-white mb-4 drop-shadow-md">
              Begin Your Magical Journey
            </h3>
            <p className="text-slate-300 mb-8 max-w-lg mx-auto leading-relaxed drop-shadow-sm">
              Explore the true spirit of this home through our collective of specialized AI agents.
            </p>
            <button
              onClick={handleBeginJourney}
              className="begin-btn flex items-center justify-center gap-3 px-12 py-5 rounded-2xl text-white font-bold text-xl tracking-wide mx-auto border border-white/20 shadow-xl"
            >
              <Sparkles size={22} />
              Consult the Oracle
              <Navigation size={20} />
            </button>
          </motion.div>

        </div>
      </div>
    </GhibliLayout>
  );
};

export default ListingDetail;
