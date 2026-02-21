import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Bed, Dumbbell, ShoppingCart, Footprints, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Listing } from "@/data/mockData";

interface ListingCardProps {
  listing: Listing;
  index: number;
}

export const ListingCard = ({ listing, index }: ListingCardProps) => {
  const TrendIcon = listing.historicalTrend === "down" ? TrendingDown : listing.historicalTrend === "up" ? TrendingUp : Minus;
  const trendColor = listing.historicalTrend === "down" ? "text-ghibli-forest" : listing.historicalTrend === "up" ? "text-primary" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="ghibli-card p-5 relative"
    >
      {/* Rank badge */}
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-ghibli-gold flex items-center justify-center shadow-md">
        <span className="font-handwritten text-lg font-bold text-foreground">#{listing.rank}</span>
      </div>

      {/* Header */}
      <div className="ml-6 mb-3">
        <h3 className="font-heading text-lg font-semibold">{listing.name}</h3>
        <p className="flex items-center gap-1 text-muted-foreground text-sm font-body">
          <MapPin className="w-3.5 h-3.5" /> {listing.address}
        </p>
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-4 mb-3">
        <span className="text-2xl font-bold text-primary font-heading">${listing.rent}<span className="text-sm font-body font-normal text-muted-foreground">/mo</span></span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-body font-semibold">
          True Cost: ${listing.trueCost}/mo
        </span>
      </div>

      {/* Match Score */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <path
              d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--ghibli-gold))"
              strokeWidth="3"
              strokeDasharray={`${listing.matchScore}, 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-handwritten text-xs font-bold">{listing.matchScore}</span>
        </div>
        <span className="font-handwritten text-sm text-muted-foreground">Spirit Match</span>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-body text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.distanceToCampus}</span>
        <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{listing.bedrooms}bd</span>
        <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{listing.hasGym ? "✓" : "✗"}</span>
        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{listing.hasGrocery ? "✓" : "✗"}</span>
        <span className="flex items-center gap-1"><Footprints className="w-3 h-3" />{listing.walkScore}</span>
      </div>

      {/* Historical insight */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ghibli-chip-gold text-xs mb-4 ${trendColor}`}>
        <TrendIcon className="w-3.5 h-3.5" />
        <span className="font-handwritten text-sm">{listing.historicalInsight}</span>
      </div>

      {/* Action */}
      <Link to={`/listing/${listing.id}`} className="ghibli-btn-accent block text-center text-sm mt-1">
        View Details
      </Link>
    </motion.div>
  );
};
