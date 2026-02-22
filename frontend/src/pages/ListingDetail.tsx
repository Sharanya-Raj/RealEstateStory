import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import { type Listing } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  MapPin, Bed, Bath, Ruler, Star, Car, Zap, PawPrint,
  Calendar, Shield, DollarSign, Sparkles, ArrowLeft,
  Navigation, Wind, Cloud
} from "lucide-react";

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedListingId } = usePreferences();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/listings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setListing(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listing", err);
        setListing(null);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-3xl">🏠</span>
          </div>
          <p className="font-playfair text-xl text-blue-900">Summoning listing details...</p>
          <p className="text-slate-400 text-sm">The oracle is searching</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🍃</span>
          <p className="font-playfair text-2xl text-blue-950 font-bold">Listing Not Found</p>
          <p className="text-slate-400">The wind has carried this sanctuary away.</p>
          <button 
            onClick={() => navigate("/listings")}
            className="mt-4 px-6 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 font-semibold hover:bg-blue-100 transition-colors"
          >
            Back to listings
          </button>
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
      <div className="container mx-auto px-4 py-12 max-w-4xl relative z-10">
        
        {/* Back navigation */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/listings")}
          className="group flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors mb-8 font-medium text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center border border-white/80 group-hover:border-blue-200 transition-all">
            <ArrowLeft size={14} />
          </div>
          <span>Back to all listings</span>
        </motion.button>

        {/* ── HERO IMAGE AREA ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          className={`h-64 lg:h-96 rounded-[2.5rem] bg-gradient-to-br ${listing.imageGradient} relative overflow-hidden mb-12 shadow-[0_24px_64px_rgba(100,150,255,0.15)]`}
        >
          {/* Glass Overlay for theme harmony */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10" />
          
          {/* Floating decorative icons */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10"><Cloud size={100} /></div>
            <div className="absolute bottom-20 right-20"><Wind size={120} /></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12rem] opacity-30 drop-shadow-2xl">🏠</span>
          </div>

          {/* Top Price Badge */}
          <div className="absolute top-6 right-6 oracle-glass px-6 py-3 rounded-2xl">
            <span className="font-playfair text-3xl font-bold text-blue-900">
              ${listing.price.toLocaleString()}
              <span className="text-sm font-medium text-blue-500/70">/mo</span>
            </span>
          </div>

          {/* Rating/Landlord Badge */}
          <div className="absolute bottom-6 left-6 oracle-glass px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="font-bold text-amber-700 text-sm">{listing.rating}</span>
            </div>
            <div className="h-4 w-px bg-blue-100" />
            <span className="text-blue-800 text-sm font-semibold tracking-wide">{listing.landlord}</span>
          </div>
        </motion.div>

        {/* ── CONTENT ── */}
        <div className="space-y-12">
          
          {/* Title & Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
                Property Sanctuary
              </span>
            </div>
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-blue-950 mb-4 leading-tight">
              {listing.address}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-blue-300" />
                <span className="font-medium">{listing.city}, {listing.state} {listing.zip}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-100" />
              <div className="flex items-center gap-1.5 font-medium text-blue-400">
                <Navigation size={16} />
                <span>{listing.distanceMiles} miles from campus</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-5"
          >
            {[
              { icon: Bed, label: "Bedrooms", value: listing.bedrooms, color: "blue" },
              { icon: Bath, label: "Bathrooms", value: listing.bathrooms, color: "sky" },
              { icon: Ruler, label: "Sq Ft", value: listing.sqft, color: "blue" },
              { icon: Calendar, label: "Lease Term", value: `${listing.leaseTermMonths} mo`, color: "sky" },
            ].map((stat) => (
              <div key={stat.label} className="oracle-glass p-6 rounded-3xl text-center flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                <div className={`w-10 h-10 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-400 group-hover:bg-${stat.color}-400 group-hover:text-white transition-all`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-950">{stat.value}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="oracle-glass-strong p-8 sm:p-10 rounded-[2.5rem] relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="font-playfair text-2xl font-bold text-blue-950 mb-4 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-blue-400 rounded-full" />
                About This Home
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg font-light">
                {listing.description}
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="oracle-glass p-8 rounded-[2rem]"
            >
              <h3 className="font-playfair text-xl font-bold text-blue-950 mb-5">Amenities</h3>
              <div className="flex flex-wrap gap-2.5">
                {listing.amenities.map((a) => (
                  <span key={a} className="pill-tag px-4 py-2 rounded-full bg-white/60 border border-white/80 text-blue-700 text-xs font-bold tracking-wide shadow-sm">
                    {a}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Key Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="oracle-glass p-8 rounded-[2rem]"
            >
              <h3 className="font-playfair text-xl font-bold text-blue-950 mb-5">Key Details</h3>
              <div className="space-y-4">
                {[
                  { icon: Car, label: "Parking", value: listing.parkingIncluded ? "Included ✓" : "Not included", iconColor: "text-blue-400" },
                  { icon: Zap, label: "Utilities", value: listing.utilitiesIncluded ? "Included ✓" : "Not included", iconColor: "text-amber-400" },
                  { icon: PawPrint, label: "Pets", value: listing.petFriendly ? "Friendly ✓" : "Not allowed", iconColor: "text-sky-400" },
                  { icon: Shield, label: "Security Deposit", value: `$${listing.securityDeposit}`, iconColor: "text-blue-500" },
                  { icon: DollarSign, label: "Zillow Estimate", value: `$${listing.zillowEstimate}/mo`, iconColor: "text-amber-500" },
                ].map((detail) => (
                  <div key={detail.label} className="flex items-center justify-between text-sm py-2 border-b border-blue-50/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center ${detail.iconColor} border border-white/60`}>
                        <detail.icon size={16} />
                      </div>
                      <span className="text-slate-400 font-medium">{detail.label}</span>
                    </div>
                    <span className="text-blue-900 font-bold">{detail.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* CTA Footer */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center py-12 border-t border-blue-50"
          >
            <div className="inline-block p-1 rounded-full bg-blue-50 mb-6">
              <Sparkles size={20} className="text-blue-400 animate-pulse" />
            </div>
            <h3 className="font-playfair text-2xl lg:text-3xl font-bold text-blue-950 mb-4">
              Begin Your Magical Journey
            </h3>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              Explore the true spirit of this home through our collective of specialized AI agents.
            </p>
            <button
              onClick={handleBeginJourney}
              className="begin-btn flex items-center justify-center gap-3 px-12 py-5 rounded-2xl text-white font-bold text-xl tracking-wide mx-auto"
            >
              <Sparkles size={22} />
              Consult the Oracle
              <Navigation size={20} />
            </button>
          </motion.div>

        </div>
      </div>
    </GhibliLayout>
  );
};

export default ListingDetail;
