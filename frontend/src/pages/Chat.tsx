import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ChatInterface from "@/components/ChatInterface";
import { chatAgent } from "@/data/agents";
import { type Listing } from "@/types/listing";
import { api } from "@/lib/api";
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
    api.getListing(id!)
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
          <span className="text-5xl block mb-4 animate-bounce drop-shadow-md">🍂</span>
          <p className="font-playfair text-xl text-white font-bold drop-shadow-sm">Summoning Howl...</p>
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
      const data = await api.chat({
        listing_id: listing.id,
        question: text,
        listing_context: listing
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
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
                  className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-black/40 border border-white/20 flex items-center justify-center overflow-hidden shadow-xl"
                >
                  {chatAgent.image ? (
                    <img src={chatAgent.image} alt={chatAgent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl drop-shadow-md">{chatAgent.emoji}</span>
                  )}
                </motion.div>
                <h2 className="font-playfair text-3xl font-bold text-white mb-1 drop-shadow-md">{chatAgent.character}</h2>
                <p className="text-xs text-blue-300 font-bold uppercase tracking-widest drop-shadow-sm">{chatAgent.movie}</p>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-medium drop-shadow-sm">{chatAgent.description}</p>
              </div>

              <div className="oracle-glass bg-black/40 p-5 rounded-2xl mb-8 border border-white/20 shadow-lg">
                <p className="text-[10px] font-bold text-sky-200 uppercase tracking-widest mb-2 drop-shadow-sm">Current Sanctuary</p>
                <p className="text-white font-bold text-sm truncate">{listing.address}</p>
                <p className="text-slate-300 text-xs mt-1 font-medium">${listing.price.toLocaleString()}/mo · {listing.bedrooms}bd/{listing.bathrooms}ba</p>
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20 bg-black/40 text-blue-200 font-bold text-sm hover:bg-black/60 transition-all group shadow-md"
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
