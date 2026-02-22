import { type Listing } from "@/types/listing";
import { MapPin, Bed, Bath, Ruler, Star, Sparkles, DollarSign, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface ListingCardProps {
  listing: Listing;
  agentData?: any | null;
  onClick: () => void;
  index: number;
}

const ListingCard = ({ listing, agentData, onClick, index }: ListingCardProps) => {
  const trueCost = agentData?.trueCost;
  const matchScore = agentData?.matchScore;
  const safetyScore = agentData?.safety?.score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={onClick}
      className="group relative rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-black/40 border border-white/10 backdrop-blur-md"
    >
      {/* Image Section */}
      <div className="h-48 w-full relative overflow-hidden">
        {listing.imageUrl ? (
          <img 
            src={listing.imageUrl} 
            alt={listing.address}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${listing.imageGradient} transition-transform duration-700 group-hover:scale-110`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

        {/* Price badge — show true cost when available */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold text-white shadow-md"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${trueCost ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.2)"}`,
          }}
        >
          {trueCost ? (
            <span className="flex flex-col items-end leading-tight">
              <span className="text-blue-300">${Math.round(trueCost).toLocaleString()}<span className="text-[10px] text-slate-300">/mo true</span></span>
              {trueCost !== listing.price && (
                <span className="text-[10px] text-slate-400 line-through">${listing.price.toLocaleString()} base</span>
              )}
            </span>
          ) : (
            <span>${listing.price.toLocaleString()}/mo</span>
          )}
        </div>

        {/* Match score badge (agent data) */}
        {matchScore != null && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-md"
            style={{
              background: matchScore >= 75 ? "rgba(34,197,94,0.7)" : matchScore >= 50 ? "rgba(234,179,8,0.7)" : "rgba(239,68,68,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {matchScore}% match
          </div>
        )}

        {/* Rating badge */}
        <div
          className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-md"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          {listing.rating}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-playfair font-semibold text-white text-lg mb-1 leading-tight group-hover:text-blue-300 transition-colors drop-shadow-md">
          {listing.address}
        </h3>

        <div className="flex items-center gap-1 text-slate-300 text-sm mb-3 drop-shadow-sm">
          <MapPin className="h-3 w-3 text-sky-300" />
          <span>{listing.city}, {listing.state}</span>
          <span className="mx-1 text-slate-500">·</span>
          <span className="text-sky-200 font-medium">{listing.distanceMiles} mi away</span>
        </div>

        {/* Agent insight summary or fallback description */}
        {agentData?.sophieSummary ? (
          <p className="text-sm text-sky-200 italic mb-4 leading-relaxed drop-shadow-sm line-clamp-2">
            "{agentData.sophieSummary}"
          </p>
        ) : (
          <p className="text-sm text-slate-300 italic mb-4 leading-relaxed drop-shadow-sm">{listing.shortDesc}</p>
        )}

        {/* Agent-enriched stats row */}
        {agentData && (
          <div className="flex items-center gap-3 text-xs mb-3 flex-wrap">
            {agentData.commute?.driving && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 font-semibold">
                🚗 {agentData.commute.driving}
              </span>
            )}
            {safetyScore != null && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-semibold">
                <Shield className="h-3 w-3" /> {safetyScore}/10
              </span>
            )}
            {agentData.walkScore != null && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200 font-semibold">
                🚶 {agentData.walkScore}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-300 pt-3 border-t border-white/10 drop-shadow-sm">
          <span className="flex items-center gap-1 font-medium text-white">
            <Bed className="h-3.5 w-3.5 text-sky-300" />
            {listing.bedrooms} bed
          </span>
          <span className="flex items-center gap-1 font-medium text-white">
            <Bath className="h-3.5 w-3.5 text-sky-300" />
            {listing.bathrooms} bath
          </span>
          <span className="flex items-center gap-1 font-medium text-white">
            <Ruler className="h-3.5 w-3.5 text-sky-300" />
            {listing.sqft} sqft
          </span>
          {agentData && (
            <span className="ml-auto flex items-center gap-1 font-semibold text-sky-300">
              <Sparkles className="h-3 w-3" /> Analyzed
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ListingCard;
