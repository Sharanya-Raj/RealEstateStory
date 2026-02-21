import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ChatInterface from "@/components/ChatInterface";
import { chatAgent } from "@/data/agents";
import { mockListings } from "@/data/mockListings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileText } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Simple mock responses for demo (will be replaced with Gemini API)
function getMockResponse(question: string, listing: typeof mockListings[0]): string {
  const q = question.toLowerCase();
  if (q.includes("price") || q.includes("cost") || q.includes("rent") || q.includes("afford")) {
    const total = listing.price + listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
    return `The base rent is $${listing.price}/month. When you factor in hidden costs (${listing.hiddenCosts.map(c => c.name).join(", ")}), your true monthly cost is approximately $${total}. ${listing.utilitiesIncluded ? "Utilities are included, which is a nice perk!" : "Keep in mind utilities are separate."} The Zillow estimate for this area is $${listing.zillowEstimate}/month.`;
  }
  if (q.includes("safe") || q.includes("crime") || q.includes("dangerous") || q.includes("security")) {
    return `The safety score for this area is ${listing.crimeScore}/10. ${listing.crimeScore >= 7 ? "It's considered quite safe—well-lit streets and active community presence." : "Exercise normal caution, especially at night. The main roads are well-traveled."} I'd recommend checking the local police department's crime map for the most current data.`;
  }
  if (q.includes("commute") || q.includes("distance") || q.includes("far") || q.includes("close")) {
    return `This listing is ${listing.distanceMiles} miles from campus, roughly a ${listing.commuteMinutes}-minute commute. ${listing.parkingIncluded ? "Parking is included!" : "You'll need to arrange parking separately."} The walk score is ${listing.walkScore}/100.`;
  }
  if (q.includes("pet") || q.includes("dog") || q.includes("cat")) {
    return listing.petFriendly ? "Great news! This property is pet-friendly. You should still confirm specific pet policies (size limits, breed restrictions, deposits) with the landlord." : "Unfortunately, this property does not allow pets. If that's important to you, I'd suggest looking at other listings.";
  }
  if (q.includes("amenit") || q.includes("include") || q.includes("feature")) {
    return `This property offers: ${listing.amenities.join(", ")}. The unit is ${listing.sqft} sq ft with ${listing.bedrooms} bedroom(s) and ${listing.bathrooms} bathroom(s). Built in ${listing.yearBuilt}.`;
  }
  if (q.includes("move") || q.includes("when") || q.includes("available") || q.includes("lease")) {
    return `The move-in date is ${listing.moveInDate} with a ${listing.leaseTermMonths}-month lease term. Security deposit is $${listing.securityDeposit}. Contact ${listing.landlord} for application details.`;
  }
  return `That's a great question about ${listing.address}! Here's what I know: This is a ${listing.bedrooms}-bed/${listing.bathrooms}-bath unit at $${listing.price}/mo in ${listing.city}. It's ${listing.distanceMiles} miles from campus with a walk score of ${listing.walkScore}. The safety rating is ${listing.crimeScore}/10. Feel free to ask me anything more specific about the pricing, commute, neighborhood, or lease terms!`;
}

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = mockListings.find((l) => l.id === id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!listing) {
    navigate("/listings");
    return null;
  }

  const handleSend = async (text: string) => {
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((r) => setTimeout(r, 1200));

    const response = getMockResponse(text, listing);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);
  };

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-4 h-[calc(100vh-56px)] flex flex-col lg:flex-row gap-4">
        {/* Howl sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-72 flex-shrink-0"
        >
          <div className={`glass-card-strong p-6 bg-gradient-to-br ${chatAgent.bgGradient} h-full`}>
            <div className="text-center mb-4">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl mb-3"
              >
                {chatAgent.emoji}
              </motion.div>
              <h2 className="font-playfair text-xl font-bold text-foreground">{chatAgent.character}</h2>
              <p className="text-xs text-muted-foreground italic">{chatAgent.movie}</p>
              <p className="text-sm text-muted-foreground mt-2">{chatAgent.description}</p>
            </div>

            <div className="text-xs text-muted-foreground mt-4 mb-4">
              <p className="font-semibold text-foreground mb-1">Discussing:</p>
              <p>{listing.address}, {listing.city}</p>
              <p>${listing.price}/mo · {listing.bedrooms}bd/{listing.bathrooms}ba</p>
            </div>

            <div className="space-y-2">
              <Button variant="ghibli-outline" size="sm" className="w-full" onClick={() => navigate(`/summary/${id}`)}>
                <FileText className="h-3 w-3 mr-1" /> Summary
              </Button>
              <Button variant="ghibli-outline" size="sm" className="w-full" onClick={() => navigate(`/listing/${id}`)}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Listing Info
              </Button>
              <Button variant="ghibli-outline" size="sm" className="w-full" onClick={() => navigate("/listings")}>
                <Home className="h-3 w-3 mr-1" /> All Listings
              </Button>
              <Button variant="ghibli-outline" size="sm" className="w-full" onClick={() => navigate("/")}>
                <Home className="h-3 w-3 mr-1" /> Home
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Chat area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 glass-card-strong overflow-hidden flex flex-col"
        >
          <ChatInterface messages={messages} onSend={handleSend} isLoading={isLoading} />
        </motion.div>
      </div>
    </GhibliLayout>
  );
};

export default Chat;
