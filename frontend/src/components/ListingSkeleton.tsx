import { motion } from "framer-motion";

const ListingSkeleton = () => {
  return (
    <div className="relative group rounded-[2rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md h-[420px] shadow-2xl">
      {/* Image Placeholder */}
      <div className="h-48 w-full bg-white/5 relative overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <div className="h-6 w-3/4 bg-white/10 rounded-lg relative overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
        </div>

        {/* Price/Stats row */}
        <div className="flex justify-between">
          <div className="h-5 w-24 bg-white/5 rounded-lg relative overflow-hidden">
             <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
          <div className="h-5 w-16 bg-white/5 rounded-lg relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        </div>

        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/5 rounded relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
          <div className="h-3 w-5/6 bg-white/5 rounded relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        </div>

        {/* Footer buttons/pills */}
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-20 bg-white/10 rounded-full relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
          <div className="h-8 w-20 bg-white/10 rounded-full relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingSkeleton;
