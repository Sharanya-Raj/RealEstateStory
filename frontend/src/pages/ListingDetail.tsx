import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import { mockListings } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Button } from "@/components/ui/button";
import {
  MapPin, Bed, Bath, Ruler, Star, Car, Zap, PawPrint,
  Calendar, Shield, DollarSign, Sparkles, ArrowLeft,
} from "lucide-react";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedListingId } = usePreferences();
  const listing = mockListings.find((l) => l.id === id);

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Listing not found 🍃</p>
          <Button variant="ghibli-outline" className="mt-4" onClick={() => navigate("/listings")}>
            Back to listings
          </Button>
        </div>
      </GhibliLayout>
    );
  }

  const handleBeginJourney = () => {
    setSelectedListingId(listing.id);
    navigate(`/journey/${listing.id}`);
  };

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/listings")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to listings
        </Button>

        {/* Hero image area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`h-64 lg:h-80 rounded-2xl bg-gradient-to-br ${listing.imageGradient} relative overflow-hidden mb-8`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-9xl opacity-30">🏠</span>
          </div>
          <div className="absolute bottom-4 left-4 glass-card px-4 py-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-ghibli-amber fill-ghibli-amber" />
              <span className="font-semibold text-foreground">{listing.rating}</span>
              <span className="text-muted-foreground text-sm">· {listing.landlord}</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 glass-card px-4 py-2">
            <span className="font-playfair text-2xl font-bold text-foreground">${listing.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Title & Address */}
          <div className="mb-6">
            <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-foreground mb-2">
              {listing.address}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{listing.city}, {listing.state} {listing.zip}</span>
              <span>·</span>
              <span>{listing.distanceMiles} miles from campus</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Bed, label: "Bedrooms", value: listing.bedrooms },
              { icon: Bath, label: "Bathrooms", value: listing.bathrooms },
              { icon: Ruler, label: "Sq Ft", value: listing.sqft },
              { icon: Calendar, label: "Lease", value: `${listing.leaseTermMonths} mo` },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-1 text-ghibli-forest" />
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="glass-card-strong p-6 mb-6">
            <h2 className="font-playfair text-xl font-semibold text-foreground mb-3">About This Home</h2>
            <p className="text-foreground leading-relaxed">{listing.description}</p>
          </div>

          {/* Features grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Amenities */}
            <div className="glass-card p-5">
              <h3 className="font-playfair text-lg font-semibold text-foreground mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <span key={a} className="px-3 py-1 rounded-full bg-ghibli-meadow/20 text-ghibli-forest text-xs font-quicksand">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Key details */}
            <div className="glass-card p-5">
              <h3 className="font-playfair text-lg font-semibold text-foreground mb-3">Key Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-ghibli-forest" />
                  <span>Parking: {listing.parkingIncluded ? "Included ✓" : "Not included"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-ghibli-amber" />
                  <span>Utilities: {listing.utilitiesIncluded ? "Included ✓" : "Not included"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-ghibli-pink" />
                  <span>Pets: {listing.petFriendly ? "Friendly ✓" : "Not allowed"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-ghibli-sky" />
                  <span>Security Deposit: ${listing.securityDeposit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-ghibli-amber" />
                  <span>Zillow Estimate: ${listing.zillowEstimate}/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-ghibli-forest" />
                  <span>Move-in: {listing.moveInDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Begin Journey CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground mb-4 font-quicksand">
              Ready to learn everything about this listing through our magical agents?
            </p>
            <Button
              variant="ghibli"
              size="lg"
              className="text-lg px-10 py-6 rounded-2xl"
              onClick={handleBeginJourney}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Begin the Journey
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </GhibliLayout>
  );
};

export default ListingDetail;
