import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Mail, RefreshCw } from "lucide-react";
import { howlAgent } from "@/data/mockData";
import { AgentAvatar } from "./AgentAvatar";
import { SootSprites } from "./SootSprites";
import { generateEmail } from "@/api/agents";

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingAddress: string;
}

export const NegotiationModal = ({ isOpen, onClose, listingId, listingAddress }: NegotiationModalProps) => {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchEmail = async () => {
    setLoading(true);
    const result = await generateEmail(listingId);
    setEmail(result);
    setLoading(false);
  };

  const handleOpen = () => {
    if (!email && !loading) fetchEmail();
  };

  // Trigger fetch on open
  if (isOpen && !email && !loading) handleOpen();

  const copyToClipboard = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mailtoLink = email
    ? `mailto:?subject=Inquiry about ${listingAddress}&body=${encodeURIComponent(email)}`
    : "#";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-ghibli-charcoal/30 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="ghibli-card p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative z-10"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <AgentAvatar agent={howlAgent} size="md" status="complete" />
              <div>
                <h3 className="font-heading text-xl font-semibold">Howl's Negotiation Letter</h3>
                <p className="font-handwritten text-muted-foreground text-lg">Shall I draft a letter? I can be quite persuasive...</p>
              </div>
            </div>

            {loading ? (
              <SootSprites text="Howl is crafting the perfect letter..." />
            ) : email ? (
              <>
                <div className="bg-background rounded-xl p-4 mb-4 border border-border">
                  <pre className="whitespace-pre-wrap font-body text-sm text-foreground leading-relaxed">{email}</pre>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <button onClick={copyToClipboard} className="ghibli-btn-primary flex items-center gap-2 text-sm">
                    <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                  <a href={mailtoLink} className="ghibli-btn-accent flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" /> Open in Email Client
                  </a>
                  <button
                    onClick={() => { setEmail(null); fetchEmail(); }}
                    className="ghibli-btn-gold flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> Regenerate
                  </button>
                </div>

                <p className="font-handwritten text-lg text-ghibli-gold text-center">
                  They won't be able to resist this one ✨
                </p>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
