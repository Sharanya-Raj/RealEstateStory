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
          className="lg:w-80 flex-shrink-0"
        >
          <div className="oracle-glass-strong p-8 h-full rounded-[2.5rem] flex flex-col justify-between">
            <div>
              <div className="text-center mb-8">
                <motion.div
                  animate={{ y: [0, -8, 0], filter: ["drop-shadow(0 4px 12px rgba(100,150,255,0.1))", "drop-shadow(0 12px 24px rgba(100,150,255,0.25))", "drop-shadow(0 4px 12px rgba(100,150,255,0.1))"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="text-7xl mb-4"
                >
                  {chatAgent.emoji}
                </motion.div>
                <h2 className="font-playfair text-3xl font-bold text-blue-950 mb-1">{chatAgent.character}</h2>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{chatAgent.movie}</p>
                <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">{chatAgent.description}</p>
              </div>

              <div className="oracle-glass p-5 rounded-2xl mb-8 border-blue-50/50">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Current Sanctuary</p>
                <p className="text-blue-900 font-bold text-sm truncate">{listing.address}</p>
                <p className="text-slate-400 text-xs mt-1 font-medium">${listing.price.toLocaleString()}/mo · {listing.bedrooms}bd/{listing.bathrooms}ba</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: FileText, label: "Summary", path: `/summary/${id}` },
                { icon: ArrowLeft, label: "Listing Info", path: `/listing/${id}` },
                { icon: Home, label: "All Sanctuaries", path: "/listings" },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-100/50 bg-white/40 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-all group"
                >
                  <link.icon size={16} className="group-hover:scale-110 transition-transform" />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Chat area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 oracle-glass-strong rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(100,150,255,0.1)]"
        >
          <ChatInterface messages={messages} onSend={handleSend} isLoading={isLoading} />
        </motion.div>
      </div>
    </GhibliLayout>
  );
};

export default Chat;
