import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ChatInterface from "@/components/ChatInterface";
import { chatAgent } from "@/data/agents";
import { type Listing } from "@/data/mockListings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileText } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoadingListing, setIsLoadingListing] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch listing from backend instead of mockListings
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/listings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setListing(data);
        setIsLoadingListing(false);
      })
      .catch(err => {
        console.error("Failed to fetch listing for chat", err);
        setListing(null);
        setIsLoadingListing(false);
      });
  }, [id]);

  if (isLoadingListing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <span className="text-5xl block mb-4 animate-bounce">🍂</span>
          <p className="text-xl text-muted-foreground">Summoning Howl...</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    navigate("/listings");
    return null;
  }

  const handleSend = async (text: string) => {
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          question: text,
          listing_context: listing
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "My castle hit some turbulence! Please try again." }]);
      }
    } catch (e) {
      console.error("Chat API error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: "The connection to my castle was lost. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
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
