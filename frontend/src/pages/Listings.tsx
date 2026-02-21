import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import ListingCard from "@/components/ListingCard";
import { mockListings } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";

type SortOption = "price-asc" | "price-desc" | "distance" | "rating";

const Listings = () => {
  const navigate = useNavigate();
  const { preferences, setSelectedListingId } = usePreferences();
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(preferences?.priceMax || 3000);

  const filteredListings = useMemo(() => {
    let listings = [...mockListings];
    
    // Filter by price
    listings = listings.filter((l) => l.price <= maxPrice);
    
    // Filter by commute distance
    if (preferences?.maxCommuteMiles) {
      listings = listings.filter((l) => l.distanceMiles <= preferences.maxCommuteMiles);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        listings.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        listings.sort((a, b) => b.price - a.price);
        break;
      case "distance":
        listings.sort((a, b) => a.distanceMiles - b.distanceMiles);
        break;
      case "rating":
        listings.sort((a, b) => b.rating - a.rating);
        break;
    }

    return listings;
  }, [sortBy, maxPrice, preferences]);

  const handleListingClick = (id: string) => {
    setSelectedListingId(id);
    navigate(`/listing/${id}`);
  };

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Available Nests 🏠
          </h1>
          {preferences && (
            <p className="text-muted-foreground">
              Near <span className="text-ghibli-forest font-semibold">{preferences.college}</span> · Budget up to <span className="font-semibold">${preferences.priceMax}/mo</span>
            </p>
          )}
        </motion.div>

        {/* Sort & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            variant="ghibli-outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
          </Button>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowUpDown className="h-3 w-3" />
            <span>Sort:</span>
          </div>
          {(
            [
              { key: "distance", label: "Closest" },
              { key: "price-asc", label: "$ Low" },
              { key: "price-desc", label: "$ High" },
              { key: "rating", label: "Top Rated" },
            ] as { key: SortOption; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-quicksand transition-all ${
                sortBy === opt.key
                  ? "bg-ghibli-meadow text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass-card p-4 mb-6"
          >
            <label className="font-quicksand text-sm font-semibold text-foreground">
              Max Price: ${maxPrice}/mo
            </label>
            <input
              type="range"
              min={500}
              max={3000}
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-ghibli-meadow mt-2"
            />
          </motion.div>
        )}

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">🍃</span>
            <p className="font-playfair text-xl text-foreground mb-2">No nests found</p>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => handleListingClick(listing.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </GhibliLayout>
  );
};

export default Listings;
