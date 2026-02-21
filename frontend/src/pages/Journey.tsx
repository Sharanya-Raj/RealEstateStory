import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GhibliLayout from "@/components/GhibliLayout";
import AgentScene from "@/components/AgentScene";
import { agents } from "@/data/agents";
import { mockListings } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";

// Pre-built dialogue for each agent based on listing data
function generateDialogue(agentId: string, listing: typeof mockListings[0], college: string): string {
  switch (agentId) {
    case "commute":
      return `Tickets, please! The iron horse waits for no one! I've calculated your trek from ${listing.address} to ${college}—it's approximately ${listing.commuteMinutes} minutes, covering ${listing.distanceMiles} miles.

${listing.distanceMiles < 1 ? "You're practically on campus! You could walk there in your slippers if you wanted." : listing.distanceMiles < 3 ? "A comfortable commute by bike or bus. The NJ Transit lines run frequently in this area." : "You'll want reliable transportation—a car or the bus line would serve you well. Check the NJ Transit schedule for express routes."}

The walk score for this area is ${listing.walkScore}/100, which means ${listing.walkScore > 80 ? "almost everything you need is within walking distance! Very convenient." : listing.walkScore > 60 ? "many errands can be done on foot, though you'll occasionally need wheels." : "you'll definitely want a car or bike for daily errands."}

${listing.parkingIncluded ? "Good news—parking is included with this rental!" : "Keep in mind, parking is NOT included. You'll need to factor in street parking or a separate lot."}

Your punctuality rating: ${listing.commuteMinutes <= 10 ? "⭐⭐⭐⭐⭐ Express Service!" : listing.commuteMinutes <= 20 ? "⭐⭐⭐⭐ Local Express" : "⭐⭐⭐ Scenic Route"}`;

    case "budget":
      const totalHidden = listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
      const totalMonthly = listing.price + totalHidden;
      return `Listen, kid—you can't live on roasted newts alone! I've looked at your coin purse and compared it to this rent at ${listing.address}.

Base rent: $${listing.price}/month
${listing.hiddenCosts.map((c) => `${c.name}: $${c.amount}/month`).join("\n")}

Total estimated monthly cost: $${totalMonthly}/month

${listing.utilitiesIncluded ? "At least utilities are included—that's one less spirit to feed!" : "Utilities are NOT included, so budget an extra $100-150 depending on the season."}

${listing.bedrooms >= 2 ? `With ${listing.bedrooms} bedrooms, you could split the cost with roommates. Per person with ${listing.bedrooms - 1} roommate(s): ~$${Math.round(totalMonthly / listing.bedrooms)}/month. That's much easier on the coin purse!` : "This is a solo dwelling—no splitting costs here, but no noisy roommates either!"}

Security deposit is $${listing.securityDeposit}. Make sure you have that ready before move-in day.

Budget Fit Score: ${totalMonthly < 1200 ? "⭐⭐⭐⭐⭐ Golden! Very affordable." : totalMonthly < 1600 ? "⭐⭐⭐⭐ Manageable with some budgeting." : totalMonthly < 2000 ? "⭐⭐⭐ Tight squeeze—be frugal!" : "⭐⭐ Expensive—make sure this fits your budget."}`;

    case "market":
      const diff = listing.price - listing.zillowEstimate;
      const fairness = diff <= 0 ? "Fair" : diff <= 100 ? "Slightly Above" : "Overpriced";
      return `Many things in this world are overpriced illusions. I have consulted the Great Ledger of Zillow to see if this landlord is being truthful.

Listed rent: $${listing.price}/month
Zillow estimate: $${listing.zillowEstimate}/month
Difference: ${diff > 0 ? `+$${diff} above` : diff < 0 ? `$${Math.abs(diff)} below` : "Right at"} market value

My verdict: This rent is... ${fairness}!

${fairness === "Fair" ? "A true craftsman knows the value of a roof. This landlord is pricing honestly—a rare gem indeed!" : fairness === "Slightly Above" ? "It's a tad higher than the market suggests. You might be able to negotiate $50-100 off, especially if you sign a longer lease." : "Beware! Don't pay for gold when they're selling you brass. This is significantly above market value. I'd strongly suggest negotiating or looking at alternatives."}

The property was built in ${listing.yearBuilt}. ${listing.yearBuilt > 2015 ? "Quite modern—expect fewer maintenance issues." : listing.yearBuilt > 2000 ? "Reasonably up-to-date, though some appliances might be aging." : "An older property. Ask about recent renovations and the condition of plumbing/electrical."}

Managed by: ${listing.landlord}

Market Fairness Score: ${fairness === "Fair" ? "⭐⭐⭐⭐⭐ Honestly priced!" : fairness === "Slightly Above" ? "⭐⭐⭐⭐ Room to negotiate" : "⭐⭐ Overpriced—negotiate!"}`;

    case "neighborhood":
      return `I just did a fly-over of ${listing.city} on my broom! Here's what I spotted around ${listing.address}:

🛒 Nearest grocery: ${listing.nearbyGrocery}
💪 Nearest gym: ${listing.nearbyGym}
🚶 Walk Score: ${listing.walkScore}/100

Safety overview: The neighborhood scores ${listing.crimeScore}/10 on our safety index. ${listing.crimeScore >= 8 ? "It's a very peaceful area—hardly any 'stray spirits' wandering around! You'll feel safe walking at night." : listing.crimeScore >= 6 ? "Generally safe, but like any area, stay aware of your surroundings, especially late at night. The main streets are well-lit." : "Exercise some caution here, especially after dark. Stick to well-lit streets and consider the buddy system."}

${listing.walkScore > 80 ? "This area is a walker's paradise! Coffee shops, restaurants, and parks are all nearby." : listing.walkScore > 60 ? "Most errands can be accomplished on foot, with some transit for longer trips." : "You'll want transportation for most outings, but there may be hidden gems within walking distance."}

${listing.petFriendly ? "I spotted a lovely dog park nearby—perfect for furry companions!" : "Note: this rental doesn't allow pets, so your cat spirit will have to wait."}

Neighborhood Vibe Score: ${listing.crimeScore >= 8 ? "⭐⭐⭐⭐⭐ Peaceful haven!" : listing.crimeScore >= 6 ? "⭐⭐⭐⭐ Lively but safe" : "⭐⭐⭐ Proceed with awareness"}`;

    case "hidden":
      const totalHiddenCosts = listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
      return `You see the chimney, but you forget the soot! I've crawled through the fine print of ${listing.address}—and nothing escapes my six eyes!

Hidden costs I've uncovered:
${listing.hiddenCosts.map((c) => `🔍 ${c.name}: $${c.amount}/month`).join("\n")}

Total hidden monthly costs: $${totalHiddenCosts}
True monthly cost (rent + hidden): $${listing.price + totalHiddenCosts}

${!listing.parkingIncluded && "⚠️ Parking is NOT included! Street parking can be competitive near campus, and private lots run $50-100/month."}

${!listing.utilitiesIncluded && "⚠️ Utilities are separate! In NJ winters, heating can spike to $150-200/month. Summer AC adds another $50-80."}

Additional things to check before signing:
• Ask about lease break penalties
• Confirm who handles maintenance requests and response time
• Check if there's a rent increase clause for renewal
• Ask about the security deposit return policy
• Verify if renter's insurance is required (it usually is)

Transparency Score: ${listing.hiddenCosts.length <= 2 ? "⭐⭐⭐⭐⭐ Very transparent!" : listing.hiddenCosts.length <= 3 ? "⭐⭐⭐⭐ Mostly upfront" : "⭐⭐⭐ Several hidden costs—read carefully!"}`;

    default:
      return "The spirits are silent on this matter...";
  }
}

const Journey = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const listing = mockListings.find((l) => l.id === id);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const college = preferences?.college || "your college";

  const handleNext = useCallback(() => {
    if (currentStep < agents.length - 1) {
      setIsLoading(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setIsLoading(false);
      }, 800);
    } else {
      navigate(`/summary/${id}`);
    }
  }, [currentStep, navigate, id]);

  if (!listing) {
    navigate("/listings");
    return null;
  }

  const currentAgent = agents[currentStep];
  const dialogue = generateDialogue(currentAgent.id, listing, college);

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-8">
        <AgentScene
          agent={currentAgent}
          dialogue={dialogue}
          isLoading={isLoading}
          onNext={handleNext}
          isLast={currentStep === agents.length - 1}
          stepNumber={currentStep}
          totalSteps={agents.length}
        />
      </div>
    </GhibliLayout>
  );
};

export default Journey;
