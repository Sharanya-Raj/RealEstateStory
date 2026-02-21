import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { usePreferences, UserPreferences } from "@/contexts/PreferencesContext";
import { njColleges, amenitiesList } from "@/data/colleges";
import { MapPin, Users, DollarSign, Car, Sparkles, Navigation } from "lucide-react";
import { MagneticButton } from "@/components/MagneticButton";
import heroBg from "@/assets/hero-bg.jpg";

// SVG Noise filter URI for frosted glass grain texture
const NOISE_FILTER = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23noise)' opacity='0.08'/></svg>`;

// Layered frosted glass card with spotlight hover
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlightBg = useTransform(
    [mouseX, mouseY],
    ([x, y]: number[]) =>
      `radial-gradient(320px circle at ${x}px ${y}px, rgba(59,130,246,0.12) 0%, transparent 65%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{
        background: "rgba(10, 18, 50, 0.88)",
        backdropFilter: "blur(44px) saturate(2)",
        WebkitBackdropFilter: "blur(44px) saturate(2)",
        border: "1px solid rgba(90, 140, 255, 0.18)",
        boxShadow: "0 8px 60px rgba(5, 10, 50, 0.7), inset 0 1px 0 rgba(120, 180, 255, 0.15)",
      }}
    >
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.35]"
        style={{ backgroundImage: `url("${NOISE_FILTER}")`, backgroundSize: "220px 220px" }}
      />
      {/* Mouse spotlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: spotlightBg }}
      />
      {/* Top specular shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent pointer-events-none z-0" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

const heroVariants = {
  initial: { opacity: 0, y: 40, filter: "blur(12px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -30, scale: 0.96, filter: "blur(8px)", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const formVariants = {
  initial: { opacity: 0, scale: 0.88, y: 60, filter: "blur(16px)" },
  animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.92, filter: "blur(8px)", transition: { duration: 0.4 } },
};

// Kinetic word-by-word title animation
const KineticTitle = ({ text }: { text: string }) => {
  const words = text.split(" ");
  return (
    <motion.h1
      className="font-playfair text-5xl lg:text-7xl font-bold ghibli-text-gradient leading-tight mb-4"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          variants={{
            hidden: { opacity: 0, y: 32, rotateX: -20 },
            show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
};

// Floating glowing particles
const Particles = () => (
  <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          left: `${8 + i * 8}%`,
          top: `${10 + (i % 4) * 22}%`,
          width: i % 3 === 0 ? 10 : 5,
          height: i % 3 === 0 ? 10 : 5,
          background: i % 2 === 0 ? "rgba(59,130,246,0.45)" : "rgba(100,200,255,0.35)",
          boxShadow: i % 2 === 0 ? "0 0 18px 6px rgba(59,130,246,0.4)" : "0 0 14px 4px rgba(100,200,255,0.35)",
        }}
        animate={{ y: [0, -14, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
      />
    ))}
  </div>
);

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
    if (!priceMax || priceMax < priceMin) { setPriceError(true); return; }
    setPriceError(false);
    const prefs: UserPreferences = {
      college, collegeCity, wantRoommates,
      roommateCount: wantRoommates ? roommateCount : 0,
      priceMin, priceMax, needsParking,
      amenities: selectedAmenities, maxCommuteMiles: maxCommute,
    };
    setPreferences(prefs);
    navigate("/listings");
  };

  const inputCls = "w-full rounded-2xl border border-blue-500/20 bg-blue-950/40 px-4 py-3 text-white font-quicksand focus:outline-none focus:ring-2 focus:ring-blue-400/60 placeholder-blue-300/40 backdrop-blur-sm transition-all";
  const toggleCls = (active: boolean) =>
    `px-5 py-2 rounded-xl font-quicksand text-sm transition-all duration-200 cursor-pointer ${active ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-blue-950/50 text-blue-200 hover:bg-blue-900/60 border border-blue-500/20"}`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with blue tint */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }}>
        {/* Blue color tint filter */}
        <div className="absolute inset-0" style={{ background: "rgba(10, 20, 80, 0.65)" }} />
        {/* Dark gradient toward bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
      </div>

      <Particles />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div
              key="hero"
              variants={heroVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center max-w-2xl"
            >
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl mb-6 inline-block"
                style={{ filter: "drop-shadow(0 0 24px rgba(59,130,246,0.6))" }}
              >
                🏡
              </motion.div>

              <KineticTitle text="Ghibli Nest" />

              <motion.p
                className="text-xl text-foreground/80 font-quicksand mb-2"
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.7 } }}
              >
                Find Your Home Away From Home
              </motion.p>
              <motion.p
                className="text-muted-foreground mb-10 max-w-md mx-auto"
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8, duration: 0.7 } }}
              >
                A magical journey through New Jersey housing, guided by the spirits of Studio Ghibli.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1.0, duration: 0.6 } }}
              >
                <MagneticButton
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-quicksand font-bold text-lg text-white transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(100,200,255,0.75))",
                    boxShadow: "0 0 40px rgba(59,130,246,0.4), 0 4px 20px rgba(0,0,0,0.4)",
                  } as React.CSSProperties}
                >
                  <Sparkles className="h-5 w-5" />
                  Begin Your Journey
                </MagneticButton>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-2xl"
            >
              <GlassCard className="p-8 lg:p-10">
                <div className="text-center mb-8">
                  <h2 className="font-playfair text-3xl font-bold text-foreground mb-2">Tell Us About Your Journey</h2>
                  <p className="text-muted-foreground">Fill in your preferences to find the perfect nest</p>
                </div>

                <div className="space-y-6">
                  {/* College */}
                  <div>
                    <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                      <MapPin className="h-4 w-4 text-ghibli-forest" />
                      Select Your College in New Jersey
                    </label>
                    <select value={college} onChange={(e) => handleCollegeChange(e.target.value)} className={inputCls}>
                      <option value="">Choose a college...</option>
                      {njColleges.map((c) => (
                        <option key={c.name} value={c.name}>{c.name} — {c.city}</option>
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
                      <button onClick={() => setWantRoommates(false)} className={toggleCls(!wantRoommates)}>No, solo</button>
                      <button onClick={() => setWantRoommates(true)} className={toggleCls(wantRoommates)}>Yes, with roommates</button>
                      {wantRoommates && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">How many?</span>
                          <input type="number" min={1} max={6} value={roommateCount}
                            onChange={(e) => setRoommateCount(parseInt(e.target.value) || 1)}
                            className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-foreground font-quicksand" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                      <DollarSign className="h-4 w-4 text-ghibli-amber" />
                      Price Range (required)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Min</span>
                        <input type="number" value={priceMin} onChange={(e) => setPriceMin(parseInt(e.target.value) || 0)} className={inputCls} placeholder="$500" />
                      </div>
                      <span className="text-muted-foreground mt-4">—</span>
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Max</span>
                        <input type="number" value={priceMax} onChange={(e) => setPriceMax(parseInt(e.target.value) || 0)} className={inputCls} placeholder="$2000" />
                      </div>
                    </div>
                    {priceError && <p className="text-destructive text-sm mt-1">Please enter a valid price range.</p>}
                  </div>

                  {/* Parking */}
                  <div>
                    <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                      <Car className="h-4 w-4 text-ghibli-forest" />
                      Do You Need Parking?
                    </label>
                    <div className="flex gap-4">
                      <button onClick={() => setNeedsParking(false)} className={toggleCls(!needsParking)}>No car</button>
                      <button onClick={() => setNeedsParking(true)} className={toggleCls(needsParking)}>Yes, I drive</button>
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
                        <motion.button
                          key={amenity}
                          onClick={() => toggleAmenity(amenity)}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-3 py-1.5 rounded-full text-xs font-quicksand transition-all ${
                            selectedAmenities.includes(amenity)
                              ? "bg-ghibli-sky/70 text-white border border-ghibli-sky/40 shadow-md"
                              : "bg-white/6 text-muted-foreground border border-white/10 hover:bg-white/12"
                          }`}
                        >
                          {amenity}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Commute */}
                  <div>
                    <label className="flex items-center gap-2 font-quicksand font-semibold text-foreground mb-2">
                      <Navigation className="h-4 w-4 text-ghibli-sky" />
                      Max Distance to College: <span className="text-ghibli-meadow ml-1">{maxCommute} miles</span>
                    </label>
                    <input type="range" min={1} max={30} value={maxCommute}
                      onChange={(e) => setMaxCommute(parseInt(e.target.value))}
                      className="w-full accent-ghibli-meadow" />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>1 mi</span><span>30 mi</span></div>
                  </div>

                  {/* Submit */}
                  <MagneticButton
                    onClick={handleSubmit}
                    disabled={!college}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-quicksand font-bold text-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(100,200,255,0.7))",
                      boxShadow: "0 0 36px rgba(59,130,246,0.35), 0 4px 20px rgba(0,0,0,0.35)",
                    } as React.CSSProperties}
                  >
                    <Sparkles className="h-5 w-5" />
                    Find My Nest
                  </MagneticButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
