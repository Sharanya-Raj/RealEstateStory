import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import AgentScene from "@/components/AgentScene";
import { agents } from "@/data/agents";
import { type Listing } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";

// Dynamically generate dialogue using the backend LLM payload if available, or fallback to defaults
function generateDialogue(agentId: string, listing: Listing, college: string, aiPayload?: any, fairnessData?: any): string {
  if (aiPayload) {
    switch (agentId) {
      case "commute":
        return `🚗 Driving: ${aiPayload.commute?.driving}\n🚌 Transit: ${aiPayload.commute?.transit}\n\n"${aiPayload.commute?.llm_insight || 'Hmm, no commute data found.'}"`;
      case "budget":
        return `Base Rent: $${aiPayload.costBreakdown?.rent || listing.price}\n\n"${aiPayload.budgetInsight || 'My calculations are clouded.'}"`;
      case "market":
        return `It sits around the ${aiPayload.historicalPercent}th percentile for this ZIP code.\n\n"${aiPayload.historicalInsight || 'A landlord never reveals their secrets.'}"`;
      case "neighborhood":
        return `Walk Score: ${aiPayload.walkScore}/100\n\n"${aiPayload.safety?.summary || 'The spirits are quiet today.'}"`;
      case "hidden":
        return `Total True Cost: $${aiPayload.trueCost}/month.\n\n"I sense some hidden fees lurking in the shadows. Always read the contract!"`;
    }
  }

  // Fallback to static mock data dialogs if the backend fails
  switch (agentId) {
    case "commute":
      return `Tickets, please! The iron horse waits for no one! I've calculated your trek from ${listing.address} to ${college}—it's approximately ${listing.commuteMinutes} minutes, covering ${listing.distanceMiles} miles.\n\n${listing.distanceMiles < 1 ? "You're practically on campus! You could walk there in your slippers if you wanted." : listing.distanceMiles < 3 ? "A comfortable commute by bike or bus. The NJ Transit lines run frequently in this area." : "You'll want reliable transportation—a car or the bus line would serve you well. Check the NJ Transit schedule for express routes."}\n\nThe walk score for this area is ${listing.walkScore}/100, which means ${listing.walkScore > 80 ? "almost everything you need is within walking distance! Very convenient." : listing.walkScore > 60 ? "many errands can be done on foot, though you'll occasionally need wheels." : "you'll definitely want a car or bike for daily errands."}\n\n${listing.parkingIncluded ? "Good news—parking is included with this rental!" : "Keep in mind, parking is NOT included. You'll need to factor in street parking or a separate lot."}\n\nYour punctuality rating: ${listing.commuteMinutes <= 10 ? "⭐⭐⭐⭐⭐ Express Service!" : listing.commuteMinutes <= 20 ? "⭐⭐⭐⭐ Local Express" : "⭐⭐⭐ Scenic Route"}`;

    case "budget":
      const totalHidden = listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
      const totalMonthly = listing.price + totalHidden;
      return `Listen, kid—you can't live on roasted newts alone! I've looked at your coin purse and compared it to this rent at ${listing.address}.\n\nBase rent: $${listing.price}/month\n${listing.hiddenCosts.map((c) => `${c.name}: $${c.amount}/month`).join("\n")}\n\nTotal estimated monthly cost: $${totalMonthly}/month\n\n${listing.utilitiesIncluded ? "At least utilities are included—that's one less spirit to feed!" : "Utilities are NOT included, so budget an extra $100-150 depending on the season."}\n\n${listing.bedrooms >= 2 ? `With ${listing.bedrooms} bedrooms, you could split the cost with roommates. Per person with ${listing.bedrooms - 1} roommate(s): ~$${Math.round(totalMonthly / listing.bedrooms)}/month. That's much easier on the coin purse!` : "This is a solo dwelling—no splitting costs here, but no noisy roommates either!"}\n\nSecurity deposit is $${listing.securityDeposit}. Make sure you have that ready before move-in day.\n\nBudget Fit Score: ${totalMonthly < 1200 ? "⭐⭐⭐⭐⭐ Golden! Very affordable." : totalMonthly < 1600 ? "⭐⭐⭐⭐ Manageable with some budgeting." : totalMonthly < 2000 ? "⭐⭐⭐ Tight squeeze—be frugal!" : "⭐⭐ Expensive—make sure this fits your budget."}`;

    case "market":
      if (fairnessData) {
        return `Many things in this world are overpriced illusions. I have consulted my Great Ledger and analyzed this property carefully...

${fairnessData.explanation?.summary || "The property has been evaluated for market fairness."}

My verdict: The Market Fairness Score is ${fairnessData.fairness_score}/100!
You fall exactly in the ${fairnessData.percentile_position}th percentile for similar listings in this zip code.

${fairnessData.fairness_score >= 80 ? "A true craftsman knows the value of a roof. This landlord is pricing honestly—a rare gem indeed! ⭐⭐⭐⭐⭐" : fairnessData.fairness_score >= 50 ? "It's a tad higher than the market suggests. You might be able to negotiate especially if you sign a longer lease. ⭐⭐⭐" : "Beware! Don't pay for gold when they're selling you brass. This is significantly above market value. I'd strongly suggest looking at alternatives. ⭐"}

The property was built in ${listing.yearBuilt}. ${listing.yearBuilt > 2015 ? "Quite modern—expect fewer maintenance issues." : listing.yearBuilt > 2000 ? "Reasonably up-to-date, though some appliances might be aging." : "An older property. Ask about recent renovations."}`;
      }

      const diff = listing.price - listing.zillowEstimate;
      const fairness = diff <= 0 ? "Fair" : diff <= 100 ? "Slightly Above" : "Overpriced";
      return `Many things in this world are overpriced illusions. I have consulted the Great Ledger of Zillow to see if this landlord is being truthful.\n\nListed rent: $${listing.price}/month\nZillow estimate: $${listing.zillowEstimate}/month\nDifference: ${diff > 0 ? `+$${diff} above` : diff < 0 ? `$${Math.abs(diff)} below` : "Right at"} market value\n\nMy verdict: This rent is... ${fairness}!\n\n${fairness === "Fair" ? "A true craftsman knows the value of a roof. This landlord is pricing honestly—a rare gem indeed!" : fairness === "Slightly Above" ? "It's a tad higher than the market suggests. You might be able to negotiate $50-100 off, especially if you sign a longer lease." : "Beware! Don't pay for gold when they're selling you brass. This is significantly above market value. I'd strongly suggest negotiating or looking at alternatives."}\n\nThe property was built in ${listing.yearBuilt}. ${listing.yearBuilt > 2015 ? "Quite modern—expect fewer maintenance issues." : listing.yearBuilt > 2000 ? "Reasonably up-to-date, though some appliances might be aging." : "An older property. Ask about recent renovations and the condition of plumbing/electrical."}\n\nManaged by: ${listing.landlord}\n\nMarket Fairness Score: ${fairness === "Fair" ? "⭐⭐⭐⭐⭐ Honestly priced!" : fairness === "Slightly Above" ? "⭐⭐⭐⭐ Room to negotiate" : "⭐⭐ Overpriced—negotiate!"}`;

    case "neighborhood":
      return `I just did a fly-over of ${listing.city} on my broom! Here's what I spotted around ${listing.address}:\n\n🛒 Nearest grocery: ${listing.nearbyGrocery}\n💪 Nearest gym: ${listing.nearbyGym}\n🚶 Walk Score: ${listing.walkScore}/100\n\nSafety overview: The neighborhood scores ${listing.crimeScore}/10 on our safety index. ${listing.crimeScore >= 8 ? "It's a very peaceful area—hardly any 'stray spirits' wandering around! You'll feel safe walking at night." : listing.crimeScore >= 6 ? "Generally safe, but like any area, stay aware of your surroundings, especially late at night. The main streets are well-lit." : "Exercise some caution here, especially after dark. Stick to well-lit streets and consider the buddy system."}\n\n${listing.walkScore > 80 ? "This area is a walker's paradise! Coffee shops, restaurants, and parks are all nearby." : listing.walkScore > 60 ? "Most errands can be accomplished on foot, with some transit for longer trips." : "You'll want transportation for most outings, but there may be hidden gems within walking distance."}\n\n${listing.petFriendly ? "I spotted a lovely dog park nearby—perfect for furry companions!" : "Note: this rental doesn't allow pets, so your cat spirit will have to wait."}\n\nNeighborhood Vibe Score: ${listing.crimeScore >= 8 ? "⭐⭐⭐⭐⭐ Peaceful haven!" : listing.crimeScore >= 6 ? "⭐⭐⭐⭐ Lively but safe" : "⭐⭐⭐ Proceed with awareness"}`;

    case "hidden":
      const totalHiddenCosts = listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
      return `You see the chimney, but you forget the soot! I've crawled through the fine print of ${listing.address}—and nothing escapes my six eyes!\n\nHidden costs I've uncovered:\n${listing.hiddenCosts.map((c) => `🔍 ${c.name}: $${c.amount}/month`).join("\n")}\n\nTotal hidden monthly costs: $${totalHiddenCosts}\nTrue monthly cost (rent + hidden): $${listing.price + totalHiddenCosts}\n\n${!listing.parkingIncluded && "⚠️ Parking is NOT included! Street parking can be competitive near campus, and private lots run $50-100/month."}\n\n${!listing.utilitiesIncluded && "⚠️ Utilities are separate! In NJ winters, heating can spike to $150-200/month. Summer AC adds another $50-80."}\n\nAdditional things to check before signing:\n• Ask about lease break penalties\n• Confirm who handles maintenance requests and response time\n• Check if there's a rent increase clause for renewal\n• Ask about the security deposit return policy\n• Verify if renter's insurance is required (it usually is)\n\nTransparency Score: ${listing.hiddenCosts.length <= 2 ? "⭐⭐⭐⭐⭐ Very transparent!" : listing.hiddenCosts.length <= 3 ? "⭐⭐⭐⭐ Mostly upfront" : "⭐⭐⭐ Several hidden costs—read carefully!"}`;

    default:
      return "The spirits are silent on this matter...";
  }
}

// Agent-specific ambient page backgrounds for cinematic cross-fades
const agentPageBg: Record<string, string> = {
  commute:      "radial-gradient(ellipse at 60% 30%, rgba(59,130,246,0.18) 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, rgba(100,200,255,0.10) 0%, transparent 60%)",
  budget:       "radial-gradient(ellipse at 40% 20%, rgba(99,102,241,0.18) 0%, transparent 65%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.10) 0%, transparent 60%)",
  market:       "radial-gradient(ellipse at 30% 40%, rgba(14,165,233,0.18) 0%, transparent 65%), radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.12) 0%, transparent 55%)",
  neighborhood: "radial-gradient(ellipse at 50% 20%, rgba(139,92,246,0.18) 0%, transparent 65%), radial-gradient(ellipse at 80% 70%, rgba(168,85,247,0.10) 0%, transparent 60%)",
  hidden:       "radial-gradient(ellipse at 20% 50%, rgba(30,40,100,0.35) 0%, transparent 65%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)",
};

const Journey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preferences, aiPayload, setAiPayload } = usePreferences();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(true);

  const [fairnessData, setFairnessData] = useState<any>(null);
  const [isFetchingFairness, setIsFetchingFairness] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/listings/${id}`)
      .then(res => { if (!res.ok) throw new Error("Not found"); return res.json(); })
      .then(data => { setListing(data); setIsFetching(false); })
      .catch(err => { console.error("Failed to fetch listing", err); setListing(null); setIsFetching(false); });
  }, [id]);

  const college = preferences?.college || "your college";
  const currentAgent = agents[currentStep];

  useEffect(() => {
    if (currentAgent.id === "market" && !fairnessData && listing) {
      setIsFetchingFairness(true);
      fetch("http://127.0.0.1:8000/api/fairness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id, listing_rent: listing.price, zip_code: listing.zip || "Ann Arbor" }),
      })
        .then((res) => { if (!res.ok) throw new Error("API fairness error"); return res.json(); })
        .then((data) => { setFairnessData(data); setIsFetchingFairness(false); })
        .catch((err) => { console.error("Failed to fetch fairness AI", err); setIsFetchingFairness(false); });
    }
  }, [currentAgent.id, fairnessData, listing]);

  useEffect(() => {
    if (!listing) return;
    const fetchAI = async () => {
      try {
        setIsAiLoading(true);
        const response = await fetch("http://localhost:8000/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: listing.address, budget: preferences?.priceMax || 1500, mock_data: listing })
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.error) setAiPayload(data);
        }
      } catch (e) {
        console.error("AI fetching failed, falling back to static", e);
      } finally {
        setIsAiLoading(false);
      }
    };
    if (!aiPayload || aiPayload.id !== listing.id) {
      fetchAI();
    } else {
      setIsAiLoading(false);
    }
  }, [listing, preferences?.priceMax, setAiPayload, aiPayload]);

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
        <div className="container mx-auto px-4 py-16 text-center">
          <span className="text-5xl block mb-4 animate-bounce">🍂</span>
          <p className="text-xl text-muted-foreground">Preparing your journey...</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Listing not found 🍃</p>
        </div>
      </GhibliLayout>
    );
  }

  const dialogue = generateDialogue(currentAgent.id, listing, college, aiPayload, fairnessData);
  const sceneIsLoading = isLoading || isFetchingFairness;

  return (
    <GhibliLayout showBack>
      {/* Cinematic per-agent ambient background cross-fade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentAgent.id + "-bg"}
          className="fixed inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          style={{ background: agentPageBg[currentAgent.id] ?? "none" }}
          aria-hidden
        />
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8 relative z-10">
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
            <h2 className="font-playfair text-2xl font-semibold mb-2 text-foreground">Summoning the Spirits...</h2>
            <p className="text-muted-foreground font-quicksand">Kamaji is evaluating {listing.address}</p>
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

