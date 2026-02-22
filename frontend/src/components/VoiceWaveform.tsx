import { motion } from "framer-motion";

interface VoiceWaveformProps {
  isPlaying: boolean;
}

const VoiceWaveform = ({ isPlaying }: VoiceWaveformProps) => {
  return (
    <div className="flex items-end gap-[3px] h-6 px-1">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={isPlaying ? {
            height: [8, 24, 12, 20, 8],
          } : {
            height: 8,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
          className="w-1 bg-gradient-to-t from-blue-400 to-sky-300 rounded-full shadow-[0_0_8px_rgba(100,200,255,0.5)]"
        />
      ))}
    </div>
  );
};

export default VoiceWaveform;
