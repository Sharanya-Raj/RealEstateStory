import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  onSend: (message: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
}

const ChatInterface = ({ onSend, messages, isLoading }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await onSend(msg);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-24 px-4 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-black/40 border border-white/20 flex items-center justify-center text-4xl mb-6 shadow-xl">
              ✨
            </div>
            <p className="font-playfair text-2xl font-bold text-white mb-2 drop-shadow-md">Howl awaits your questions...</p>
            <p className="text-slate-300 font-medium max-w-sm mx-auto drop-shadow-sm">Ask about commute secrets, contract shadows, or why the boiler man likes this place.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 shadow-md ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none font-medium border border-blue-500/50"
                  : "oracle-glass text-slate-200 rounded-tl-none border-white/20"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5 ">
                  <span className="text-sm">✨</span>
                  <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest drop-shadow-sm">Howl</span>
                </div>
              )}
              <p className="text-sm leading-relaxed drop-shadow-sm">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="oracle-glass rounded-[1.5rem] rounded-tl-none px-5 py-3 border-white/20 shadow-md">
              <div className="flex items-center gap-3 text-sky-300 font-medium text-sm drop-shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Howl is consulting his magic ledger...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex gap-3 bg-black/60 p-1.5 rounded-2xl border border-white/20 mx-auto w-full group focus-within:ring-4 focus-within:ring-white/10 transition-all shadow-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Howl anything..."
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none font-medium"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="begin-btn flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg shadow-black/50 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium uppercase tracking-tight">The Wizard usually replies within seconds</p>
      </form>
    </div>
  );
};

export default ChatInterface;
