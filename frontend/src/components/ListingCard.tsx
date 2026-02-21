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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      className="glass-card-strong cursor-pointer group hover:scale-[1.02] transition-all duration-300 overflow-hidden"
    >
      {/* Image placeholder with gradient */}
      <div className={`h-44 bg-gradient-to-br ${listing.imageGradient} relative overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-50">🏠</span>
        </div>
        <div className="absolute top-3 right-3 glass-card px-2 py-1 text-sm font-semibold text-foreground">
          ${listing.price}/mo
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 glass-card px-2 py-1 text-xs">
          <Star className="h-3 w-3 text-ghibli-amber fill-ghibli-amber" />
          <span className="font-medium">{listing.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-playfair font-semibold text-foreground text-lg mb-1 group-hover:text-ghibli-forest transition-colors">
          {listing.address}
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="h-3 w-3" />
          <span>{listing.city}, {listing.state}</span>
          <span className="mx-1">·</span>
          <span>{listing.distanceMiles} mi away</span>
        </div>
        <p className="text-sm text-muted-foreground italic mb-3">{listing.shortDesc}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {listing.bedrooms} bed</span>
          <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {listing.bathrooms} bath</span>
          <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {listing.sqft} sqft</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ListingCard;
