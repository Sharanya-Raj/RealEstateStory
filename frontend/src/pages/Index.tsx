import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePreferences, UserPreferences } from "@/contexts/PreferencesContext";
import { njColleges, amenitiesList } from "@/data/colleges";
import { MapPin, Users, DollarSign, Car, Sparkles, Navigation } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { setPreferences } = usePreferences();

  const [college, setCollege] = useState("");
  const [collegeCity, setCollegeCity] = useState("");
  const [wantRoommates, setWantRoommates] = useState(false);
  const [roommateCount, setRoommateCount] = useState(1);
  const [priceMin, setPriceMin] = useState(500);
  const [priceMax, setPriceMax] = useState(2000);
  const [needsParking, setNeedsParking] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [maxCommute, setMaxCommute] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [priceError, setPriceError] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleCollegeChange = (name: string) => {
    setCollege(name);
    const found = njColleges.find((c) => c.name === name);
    setCollegeCity(found?.city || "");
  };

  const handleSubmit = () => {
    if (!priceMax || priceMax < priceMin) {
      setPriceError(true);
      return;
    }
    setPriceError(false);
    const prefs: UserPreferences = {
      college,
      collegeCity,
      wantRoommates,
      roommateCount: wantRoommates ? roommateCount : 0,
      priceMin,
      priceMax,
      needsParking,
      amenities: selectedAmenities,
      maxCommuteMiles: maxCommute,
    };
    setPreferences(prefs);
    navigate("/listings");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/90" />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-ghibli-meadow/20 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {!showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl mb-6"
            >
              🏡
            </motion.div>
            <h1 className="font-playfair text-5xl lg:text-6xl font-bold mb-4 ghibli-text-gradient">
              Ghibli Nest
            </h1>
            <p className="text-xl text-foreground/80 font-quicksand mb-2">
              Find Your Home Away From Home
            </p>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              A magical journey through New Jersey housing, guided by the spirits of Studio Ghibli.
            </p>
            <Button
              variant="ghibli"
              size="lg"
              className="text-lg px-8 py-6 rounded-2xl"
              onClick={() => setShowForm(true)}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Begin Your Journey
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl glass-card-strong p-8 lg:p-10"
          >
            <div className="text-center mb-8">
              <h2 className="font-playfair text-3xl font-bold text-foreground mb-2">
                Tell Us About Your Journey
              </h2>
              <p className="text-muted-foreground">Fill in your preferences to find the perfect nest</p>
            </div>

            <div className="space-y-6">
              {/* College Select */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <MapPin className="h-4 w-4 text-ghibli-forest" />
                  Select Your College in New Jersey
                </label>
                <select
                  value={college}
                  onChange={(e) => handleCollegeChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground font-quicksand focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choose a college...</option>
                  {njColleges.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} — {c.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Roommates */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <Users className="h-4 w-4 text-ghibli-sky" />
                  Do You Want Roommates?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setWantRoommates(false)}
                    className={`px-5 py-2 rounded-xl font-quicksand text-sm transition-all ${
                      !wantRoommates ? "bg-ghibli-meadow text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    No, solo
                  </button>
                  <button
                    onClick={() => setWantRoommates(true)}
                    className={`px-5 py-2 rounded-xl font-quicksand text-sm transition-all ${
                      wantRoommates ? "bg-ghibli-meadow text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Yes, with roommates
                  </button>
                  {wantRoommates && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">How many?</span>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={roommateCount}
                        onChange={(e) => setRoommateCount(parseInt(e.target.value) || 1)}
                        className="w-16 rounded-lg border border-input bg-card px-2 py-1 text-center text-foreground font-quicksand"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <DollarSign className="h-4 w-4 text-ghibli-amber" />
                  Price Range (required)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Min</span>
                    <input
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-input bg-card px-4 py-2 text-foreground font-quicksand"
                      placeholder="$500"
                    />
                  </div>
                  <span className="text-muted-foreground mt-4">—</span>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Max</span>
                    <input
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-input bg-card px-4 py-2 text-foreground font-quicksand"
                      placeholder="$2000"
                    />
                  </div>
                </div>
                {priceError && (
                  <p className="text-destructive text-sm mt-1">Please enter a valid price range.</p>
                )}
              </div>

              {/* Parking */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <Car className="h-4 w-4 text-ghibli-forest" />
                  Do You Need Parking?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNeedsParking(false)}
                    className={`px-5 py-2 rounded-xl font-quicksand text-sm transition-all ${
                      !needsParking ? "bg-ghibli-meadow text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    No car
                  </button>
                  <button
                    onClick={() => setNeedsParking(true)}
                    className={`px-5 py-2 rounded-xl font-quicksand text-sm transition-all ${
                      needsParking ? "bg-ghibli-meadow text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Yes, I drive
                  </button>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <Sparkles className="h-4 w-4 text-ghibli-pink" />
                  Desired Amenities
                </label>
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((amenity) => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-full text-xs font-quicksand transition-all ${
                        selectedAmenities.includes(amenity)
                          ? "bg-ghibli-sky text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commute Radius */}
              <div>
                <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                  <Navigation className="h-4 w-4 text-ghibli-sky" />
                  Max Distance to College: {maxCommute} miles
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={maxCommute}
                  onChange={(e) => setMaxCommute(parseInt(e.target.value))}
                  className="w-full accent-ghibli-meadow"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 mi</span>
                  <span>30 mi</span>
                </div>
              </div>

              {/* Submit */}
              <Button
                variant="ghibli"
                size="lg"
                className="w-full text-lg py-6 rounded-2xl mt-4"
                onClick={handleSubmit}
                disabled={!college}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Find My Nest
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Index;
