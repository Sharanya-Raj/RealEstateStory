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
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-4xl mb-6 shadow-sm">
              ✨
            </div>
            <p className="font-playfair text-2xl font-bold text-blue-950 mb-2">Howl awaits your questions...</p>
            <p className="text-slate-400 font-medium max-w-sm mx-auto">Ask about commute secrets, contract shadows, or why the boiler man likes this place.</p>
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
              className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-none font-medium"
                  : "oracle-glass text-blue-900 rounded-tl-none border-blue-100/30"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5 ">
                  <span className="text-sm">✨</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Howl</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="oracle-glass rounded-[1.5rem] rounded-tl-none px-5 py-3 border-blue-100/30">
              <div className="flex items-center gap-3 text-blue-400 font-medium text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Howl is consulting his magic ledger...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-blue-50/50 bg-white/40 backdrop-blur-sm">
        <div className="flex gap-3 bg-white/60 p-1.5 rounded-2xl border border-blue-100 mx-auto w-full group focus-within:ring-4 focus-within:ring-blue-100 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Howl anything..."
            className="flex-1 bg-transparent px-4 py-3 text-blue-950 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="begin-btn flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg shadow-blue-200 transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
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
