import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import AgentScene from "@/components/AgentScene";
import { agents } from "@/data/agents";
import { type Listing } from "@/types/listing";
import { api, getScraperName } from "@/lib/api";
import { usePreferences } from "@/contexts/PreferencesContext";

/**
 * Generate rich dialogue for each agent, merging both the listing's own data
 * and the AI pipeline results (aiPayload) so every slide is content-rich
 * even when the LLM insight strings are empty.
 */
function generateDialogue(agentId: string, listing: Listing, college: string, aiPayload?: any, fairnessData?: any): string {
  const ai = aiPayload || {};

  const drivingTime = ai.commute?.driving ?? `${listing.commuteMinutes} mins`;
  const transitTime = ai.commute?.transit ?? "N/A";
  const walkScore = ai.walkScore ?? listing.walkScore ?? 65;
  const crimeScore = ai.safety?.score ?? listing.crimeScore ?? 7;
  const trueCost = ai.trueCost ?? (listing.price + listing.hiddenCosts.reduce((s, c) => s + c.amount, 0));
  const rent = ai.costBreakdown?.rent ?? ai.rent ?? listing.price;
  const matchScore = ai.matchScore;
  const percentile = ai.historicalPercent ?? ai.percentile ?? null;

  switch (agentId) {
    case "commute": {
      const commuteInsight = ai.commute?.llm_insight;
      return [
        `Tickets, please! The iron horse waits for no one! I've calculated your trek from ${listing.address} to ${college}.`,
        ``,
        `🚗 Driving: ${drivingTime}`,
        `🚌 Transit: ${transitTime}`,
        `📏 Distance: ${listing.distanceMiles} miles`,
        `🚶 Walk Score: ${walkScore}/100`,
        ``,
        listing.distanceMiles < 1
          ? "You're practically on campus! You could walk there in your slippers."
          : listing.distanceMiles < 3
          ? "A comfortable commute by bike or bus. NJ Transit lines run frequently here."
          : "You'll want reliable transportation—a car or bus route would serve you well.",
        ``,
        listing.parkingIncluded
          ? "Good news—parking is included with this rental!"
          : "Keep in mind, parking is NOT included. Factor in street parking or a private lot.",
        ``,
        walkScore > 80
          ? "This area is a walker's paradise! Coffee shops, restaurants, and parks all nearby."
          : walkScore > 60
          ? "Many errands can be done on foot, with some transit for longer trips."
          : "You'll want a car or bike for daily errands.",
        commuteInsight ? `\n"${commuteInsight}"` : "",
        ``,
        `Punctuality Rating: ${listing.commuteMinutes <= 10 ? "⭐⭐⭐⭐⭐ Express Service!" : listing.commuteMinutes <= 20 ? "⭐⭐⭐⭐ Local Express" : "⭐⭐⭐ Scenic Route"}`,
      ].filter(Boolean).join("\n");
    }

    case "budget": {
      const budgetInsight = ai.budgetInsight;
      const breakdown = ai.costBreakdown;
      const costLines = breakdown
        ? [
            breakdown.rent ? `Base Rent: $${breakdown.rent}/mo` : null,
            breakdown.utilities ? `Utilities: $${breakdown.utilities}/mo` : null,
            breakdown.transportation ? `Transportation: $${breakdown.transportation}/mo` : null,
            breakdown.groceries ? `Groceries: $${breakdown.groceries}/mo` : null,
          ].filter(Boolean)
        : [
            `Base Rent: $${listing.price}/mo`,
            ...listing.hiddenCosts.map((c) => `${c.name}: $${c.amount}/mo`),
          ];

      return [
        `Listen, kid—you can't live on roasted newts alone! I've looked at your coin purse and compared it to this rent at ${listing.address}.`,
        ``,
        ...costLines,
        ``,
        `💰 True Monthly Cost: $${trueCost}/mo`,
        matchScore != null ? `Spirit Match: ${matchScore}%` : null,
        ``,
        listing.utilitiesIncluded
          ? "At least utilities are included—that's one less spirit to feed!"
          : "Utilities are NOT included, so budget an extra $100–150 depending on the season.",
        ``,
        listing.bedrooms >= 2
          ? `With ${listing.bedrooms} bedrooms, you could split costs with roommates. Per person with ${listing.bedrooms - 1} roommate(s): ~$${Math.round(trueCost / listing.bedrooms)}/mo.`
          : "This is a solo dwelling—no splitting costs here, but no noisy roommates either!",
        ``,
        `Security deposit: $${listing.securityDeposit}. Have that ready before move-in day.`,
        budgetInsight ? `\n"${budgetInsight}"` : "",
        ``,
        `Budget Fit: ${trueCost < 1200 ? "⭐⭐⭐⭐⭐ Golden!" : trueCost < 1600 ? "⭐⭐⭐⭐ Manageable" : trueCost < 2000 ? "⭐⭐⭐ Tight squeeze" : "⭐⭐ Expensive—watch your budget."}`,
      ].filter(Boolean).join("\n");
    }

    case "market": {
      const fairnessInsight = ai.historicalInsight;

      if (fairnessData) {
        return [
          `Many things in this world are overpriced illusions. I've consulted my Great Ledger for ${listing.address}...`,
          ``,
          fairnessData.explanation?.summary || "The property has been evaluated for market fairness.",
          ``,
          `Market Fairness Score: ${fairnessData.fairness_score}/100`,
          `Percentile: ${fairnessData.percentile_position}th among similar listings in this ZIP`,
          percentile != null ? `Pipeline Percentile: ${percentile}th` : null,
          ``,
          fairnessData.fairness_score >= 80
            ? "This landlord is pricing honestly—a rare gem! ⭐⭐⭐⭐⭐"
            : fairnessData.fairness_score >= 50
            ? "A tad higher than the market suggests. You might negotiate, especially with a longer lease. ⭐⭐⭐"
            : "This is significantly above market value. Negotiate or look at alternatives. ⭐",
          ``,
          `Built in ${listing.yearBuilt}. ${listing.yearBuilt > 2015 ? "Quite modern—fewer maintenance issues expected." : listing.yearBuilt > 2000 ? "Reasonably up-to-date, though some appliances may be aging." : "An older property—ask about recent renovations."}`,
          `Managed by: ${listing.landlord}`,
        ].filter(Boolean).join("\n");
      }

      const pct = percentile ?? 50;
      const diff = listing.price - listing.zillowEstimate;
      return [
        `Many things in this world are overpriced illusions. I've consulted the Great Ledger for ${listing.address}.`,
        ``,
        `Listed Rent: $${listing.price}/mo`,
        `Zillow Estimate: $${listing.zillowEstimate}/mo`,
        diff !== 0 ? `Difference: ${diff > 0 ? `+$${diff} above` : `$${Math.abs(diff)} below`} market` : "Right at market value",
        `Market Percentile: ${pct}th`,
        ``,
        fairnessInsight ? `"${fairnessInsight}"` : null,
        ``,
        `Built in ${listing.yearBuilt}. ${listing.yearBuilt > 2015 ? "Quite modern—fewer maintenance issues." : listing.yearBuilt > 2000 ? "Reasonably up-to-date." : "An older property—ask about renovations."}`,
        `Managed by: ${listing.landlord}`,
        ``,
        `Market Fairness: ${diff <= 0 ? "⭐⭐⭐⭐⭐ Honestly priced!" : diff <= 100 ? "⭐⭐⭐⭐ Room to negotiate" : "⭐⭐ Overpriced—negotiate!"}`,
      ].filter(Boolean).join("\n");
    }

    case "neighborhood": {
      const safetySummary = ai.safety?.summary;
      return [
        `I just did a fly-over of ${listing.city} on my broom! Here's what I spotted around ${listing.address}:`,
        ``,
        `🛒 Nearest Grocery: ${listing.nearbyGrocery}`,
        `💪 Nearest Gym: ${listing.nearbyGym}`,
        `🚶 Walk Score: ${walkScore}/100`,
        `🛡️ Safety Score: ${crimeScore}/10`,
        ``,
        crimeScore >= 8
          ? "Very peaceful—hardly any 'stray spirits' wandering around! You'll feel safe at night."
          : crimeScore >= 6
          ? "Generally safe, but stay aware of your surroundings late at night. Main streets are well-lit."
          : "Exercise some caution after dark. Stick to well-lit streets and consider the buddy system.",
        ``,
        walkScore > 80
          ? "A walker's paradise! Coffee shops, restaurants, and parks are all nearby."
          : walkScore > 60
          ? "Most errands can be done on foot, with transit for longer trips."
          : "You'll want transportation for most outings, but there may be hidden gems within walking distance.",
        ``,
        listing.petFriendly
          ? "I spotted a lovely dog park nearby—perfect for furry companions! 🐾"
          : "Note: this rental doesn't allow pets, so your cat spirit will have to wait.",
        safetySummary ? `\n"${safetySummary}"` : "",
        ``,
        `Neighborhood Vibe: ${crimeScore >= 8 ? "⭐⭐⭐⭐⭐ Peaceful haven!" : crimeScore >= 6 ? "⭐⭐⭐⭐ Lively but safe" : "⭐⭐⭐ Proceed with awareness"}`,
      ].filter(Boolean).join("\n");
    }

    case "hidden": {
      const agenticBreakdown = ai.agenticBreakdown;
      const costItems = agenticBreakdown
        ? Object.entries(agenticBreakdown)
            .filter(([, v]) => typeof v === "number" && (v as number) > 0)
            .map(([k, v]) => `🔍 ${k}: $${v}/mo`)
        : listing.hiddenCosts.map((c) => `🔍 ${c.name}: $${c.amount}/mo`);

      const totalHiddenCosts = trueCost - rent;

      return [
        `You see the chimney, but you forget the soot! I've crawled through the fine print of ${listing.address}—nothing escapes my six eyes!`,
        ``,
        `Hidden costs I've uncovered:`,
        ...costItems,
        ``,
        `Total Hidden Costs: $${Math.round(totalHiddenCosts)}/mo`,
        `💰 True Monthly Cost (rent + hidden): $${trueCost}/mo`,
        ``,
        !listing.parkingIncluded ? "⚠️ Parking is NOT included! Street parking can be competitive near campus, and private lots run $50–100/mo." : null,
        !listing.utilitiesIncluded ? "⚠️ Utilities are separate! In NJ winters, heating can spike to $150–200/mo. Summer AC adds $50–80." : null,
        ``,
        `Things to check before signing:`,
        `• Lease break penalties`,
        `• Maintenance request response time`,
        `• Rent increase clause for renewal`,
        `• Security deposit return policy`,
        `• Whether renter's insurance is required`,
        ``,
        `Transparency Score: ${costItems.length <= 2 ? "⭐⭐⭐⭐⭐ Very transparent!" : costItems.length <= 4 ? "⭐⭐⭐⭐ Mostly upfront" : "⭐⭐⭐ Several hidden costs—read carefully!"}`,
      ].filter(Boolean).join("\n");
    }

    default:
      return "The spirits are silent on this matter...";
  }
}



const Journey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preferences, aiPayload, setAiPayload, getAgentResult, getCachedListings } = usePreferences();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(true);

  const [fairnessData, setFairnessData] = useState<any>(null);
  const [isFetchingFairness, setIsFetchingFairness] = useState(false);

  // Load listing from cache; only hit the API as a last resort
  useEffect(() => {
    if (!id) return;

    const scraperKey = getScraperName(preferences?.college || "");
    const cached = getCachedListings(scraperKey);
    if (cached) {
      const found = cached.find((l: any) => l.id === id);
      if (found) {
        setListing(found);
        setIsFetching(false);
        return;
      }
    }

    api.getListing(id)
      .then(data => { setListing(data); setIsFetching(false); })
      .catch(err => { 
        console.error("Failed to fetch listing", err); 
        setListing(null);
        setIsFetching(false); 
      });
  }, [id, preferences?.college, getCachedListings]);

  const college = preferences?.college || "your college";
  const currentAgent = agents[currentStep];

  useEffect(() => {
    if (currentAgent.id === "market" && !fairnessData && listing) {
      setIsFetchingFairness(true);
      api.checkFairness({ listing_id: listing.id, listing_rent: listing.price, zip_code: listing.city || listing.zip })
        .then((data) => { setFairnessData(data); setIsFetchingFairness(false); })
        .catch((err) => { console.error("Failed to fetch fairness AI", err); setIsFetchingFairness(false); });
    }
  }, [currentAgent.id, fairnessData, listing]);

  const fetchingForId = useRef<string | null>(null);

  // Load AI payload: context → batch cache → individual API call
  useEffect(() => {
    if (!listing) return;

    // 1. Context already has this listing's payload (set by ListingDetail)
    if (aiPayload?.id === listing.id) {
      setIsAiLoading(false);
      return;
    }

    // 2. Batch pipeline cache (from Listings page)
    const cached = getAgentResult(listing.id);
    if (cached) {
      setAiPayload(cached);
      setIsAiLoading(false);
      return;
    }

    // 3. Last resort: individual evaluate call (only once per listing)
    if (fetchingForId.current === listing.id) return;
    fetchingForId.current = listing.id;

    (async () => {
      try {
        setIsAiLoading(true);
        const data = await api.evaluateListing({
          address: listing.address,
          budget: preferences?.priceMax || 1500,
          mock_data: listing,
          college: getScraperName(preferences?.college || ""),
        });
        if (!data.error) setAiPayload(data);
      } catch (e) {
        console.error("AI fetching failed, falling back to static dialogues", e);
        fetchingForId.current = null;
      } finally {
        setIsAiLoading(false);
      }
    })();
  }, [listing, aiPayload, preferences?.priceMax, preferences?.college, setAiPayload, getAgentResult]);

  const handleNext = useCallback(() => {
    if (currentStep < agents.length - 1) {
      setIsLoading(true);
      setTimeout(() => { setCurrentStep((s) => s + 1); setIsLoading(false); }, 700);
    } else {
      navigate(`/summary/${id}`, { state: { fairnessData } });
    }
  }, [currentStep, navigate, id, fairnessData]);

  if (isFetching) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center shadow-2xl animate-bounce">
            <span className="text-3xl">🏠</span>
          </div>
          <p className="font-playfair text-xl text-white font-bold drop-shadow-md">Preparing your journey...</p>
          <p className="text-slate-300 text-sm drop-shadow-sm">The spirits are marking your path</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-white font-bold drop-shadow-md">Listing not found 🍃</p>
        </div>
      </GhibliLayout>
    );
  }

  const dialogue = generateDialogue(currentAgent.id, listing, college, aiPayload, fairnessData);
  const sceneIsLoading = isLoading || isFetchingFairness;

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-8 relative z-10">
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
        {isAiLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="text-7xl mb-6"
              style={{ filter: "drop-shadow(0 0 28px rgba(166,215,132,0.6))" }}
            >
              🚂
            </motion.div>
            <h2 className="font-playfair text-3xl font-bold mb-2 text-white drop-shadow-md">Summoning the Spirits...</h2>
            <p className="text-sky-300 font-semibold tracking-wide font-quicksand uppercase text-xs drop-shadow-sm">Kamaji is evaluating {listing.address}</p>
          </div>
        ) : (
          <AgentScene
            agent={currentAgent}
            dialogue={dialogue}
            isLoading={sceneIsLoading}
            onNext={handleNext}
            isLast={currentStep === agents.length - 1}
            stepNumber={currentStep}
            totalSteps={agents.length}
            audioBase64={aiPayload?.audioStreams?.[currentAgent.id] ?? null}
          />
        )}
      </div>
    </GhibliLayout>
  );
};

export default Journey;

