import { Listing } from "@/data/mockListings";
import { MapPin, Bed, Bath, Ruler, Star } from "lucide-react";
import { motion } from "framer-motion";

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  index: number;
}

const ListingCard = ({ listing, onClick, index }: ListingCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(100,150,255,0.2)]"
      style={{
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Image / gradient banner */}
      <div
        className={`h-44 bg-gradient-to-br ${listing.imageGradient} relative overflow-hidden`}
        style={{ filter: "saturate(0.7) brightness(1.1)" }}
      >
        {/* Pastel overlay for light-mode harmony */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100/50 to-blue-100/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">🏠</span>
        </div>

        {/* Price badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold text-white shadow-md"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          ${listing.price.toLocaleString()}/mo
        </div>

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

        <p className="text-sm text-slate-300 italic mb-4 leading-relaxed drop-shadow-sm">{listing.shortDesc}</p>

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
        </div>
      </div>
    </motion.div>
  );
};

export default ListingCard;
