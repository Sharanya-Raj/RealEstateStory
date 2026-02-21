import { motion } from "framer-motion";

interface SootSpriteProps {
  count?: number;
  text?: string;
}

const SootSprite = ({ index }: { index: number }) => (
  <motion.div
    className="relative w-8 h-8"
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 0.6, repeat: Infinity, delay: index * 0.15, ease: "easeInOut" }}
  >
    <div className="w-8 h-8 rounded-full bg-ghibli-charcoal relative">
      <div className="absolute top-2 left-1.5 w-1.5 h-1.5 rounded-full bg-card" />
      <div className="absolute top-2 right-1.5 w-1.5 h-1.5 rounded-full bg-card" />
    </div>
  </motion.div>
);

export const SootSprites = ({ count = 3, text = "The spirits are working..." }: SootSpriteProps) => (
  <div className="flex flex-col items-center gap-4 py-12">
    <div className="flex gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SootSprite key={i} index={i} />
      ))}
    </div>
    <p className="font-handwritten text-xl text-muted-foreground">{text}</p>
  </div>
);
