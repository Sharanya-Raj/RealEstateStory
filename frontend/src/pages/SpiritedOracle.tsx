import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MapPin, Wind, Cloud, Navigation, ChevronDown, Home } from "lucide-react";
import { usePreferences, UserPreferences } from "@/contexts/PreferencesContext";
import { njColleges, amenitiesList } from "@/data/colleges";

/* ─────────────────────────────────────────────
   DUAL RANGE SLIDER
───────────────────────────────────────────── */
function DualRangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

  const handleMouseDown = useCallback(
    (thumb: "lo" | "hi") => (e: React.MouseEvent) => {
      e.preventDefault();
      const moveHandler = (ev: MouseEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const raw = ((ev.clientX - rect.left) / rect.width) * (max - min) + min;
        const snapped = Math.round(raw / 100) * 100;
        const clamped = Math.max(min, Math.min(max, snapped));
        if (thumb === "lo") {
          onChange([Math.min(clamped, value[1] - 100), value[1]]);
        } else {
          onChange([value[0], Math.max(clamped, value[0] + 100)]);
        }
      };
      const upHandler = () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);
      };
      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", upHandler);
    },
    [min, max, value, onChange]
  );

  const loPercent = getPercent(value[0]);
  const hiPercent = getPercent(value[1]);
  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
          Budget Range
        </span>
        <span className="text-sm font-semibold text-slate-700 bg-blue-50/80 px-3 py-1 rounded-full border border-blue-100">
          {fmt(value[0])} — {fmt(value[1])}/mo
        </span>
      </div>
      <div className="relative h-8 flex items-center" ref={trackRef}>
        <div className="absolute w-full h-1.5 rounded-full bg-blue-100" />
        <div
          className="absolute h-1.5 rounded-full bg-gradient-to-r from-blue-300 to-sky-400"
          style={{ left: `${loPercent}%`, width: `${hiPercent - loPercent}%` }}
        />
        <div
          onMouseDown={handleMouseDown("lo")}
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-blue-400 shadow-[0_2px_12px_rgba(100,150,255,0.4)] -translate-x-1/2 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10"
          style={{ left: `${loPercent}%` }}
        />
        <div
          onMouseDown={handleMouseDown("hi")}
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-sky-400 shadow-[0_2px_12px_rgba(100,200,255,0.4)] -translate-x-1/2 cursor-grab active:cursor-grabbing transition-transform hover:scale-110 z-10"
          style={{ left: `${hiPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-blue-300 font-medium">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SEGMENTED CONTROL
───────────────────────────────────────────── */
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex bg-white/50 rounded-2xl p-1 border border-white/70 gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`relative z-10 flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
            value === opt
              ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white shadow-[0_4px_12px_rgba(100,150,255,0.35)]"
              : "text-slate-500 hover:text-blue-500"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FLOATING ORBS
───────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          top: "-15%", left: "-10%",
          background: "radial-gradient(circle, rgba(147,197,253,0.45) 0%, rgba(186,230,255,0.2) 60%, transparent 100%)",
          filter: "blur(80px)",
          animation: "orbFloat1 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[550px] h-[550px] rounded-full"
        style={{
          top: "5%", right: "-8%",
          background: "radial-gradient(circle, rgba(125,211,252,0.4) 0%, rgba(186,230,255,0.15) 60%, transparent 100%)",
          filter: "blur(70px)",
          animation: "orbFloat2 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[800px] h-[500px] rounded-full"
        style={{
          bottom: "-10%", left: "20%",
          background: "radial-gradient(circle, rgba(167,210,255,0.35) 0%, rgba(219,234,254,0.2) 60%, transparent 100%)",
          filter: "blur(90px)",
          animation: "orbFloat3 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[350px] h-[350px] rounded-full"
        style={{
          top: "45%", right: "5%",
          background: "radial-gradient(circle, rgba(186,230,255,0.5) 0%, rgba(224,242,254,0.2) 70%, transparent 100%)",
          filter: "blur(60px)",
          animation: "orbFloat4 14s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function SpiritedOracle() {
  const navigate = useNavigate();
  const { setPreferences } = usePreferences();

  // Mirror the shape of UserPreferences
  const [college, setCollege] = useState("");
  const [collegeCity, setCollegeCity] = useState("");
  const [roommatesOpt, setRoommatesOpt] = useState("Solo");      // "Solo" | "1+" | "2+"
  const [parkingOpt, setParkingOpt] = useState("Not Needed");    // "Not Needed" | "1 Spot" | "2 Spots"
  const [budget, setBudget] = useState<[number, number]>([500, 2000]);
  const [maxCommute, setMaxCommute] = useState(10);
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCollegeChange = (name: string) => {
    setCollege(name);
    const found = njColleges.find((c) => c.name === name);
    setCollegeCity(found?.city || "");
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roommateMap: Record<string, { want: boolean; count: number }> = {
    "Solo":  { want: false, count: 0 },
    "1+":    { want: true,  count: 1 },
    "2+":    { want: true,  count: 2 },
  };

  const handleBegin = () => {
    if (!college) return;
    setIsSubmitting(true);

    const prefs: UserPreferences = {
      college,
      collegeCity,
      wantRoommates: roommateMap[roommatesOpt].want,
      roommateCount: roommateMap[roommatesOpt].count,
      priceMin: budget[0],
      priceMax: budget[1],
      needsParking: parkingOpt !== "Not Needed",
      amenities: Array.from(selectedAmenities),
      maxCommuteMiles: maxCommute,
    };

    setPreferences(prefs);
    navigate("/listings");
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden font-quicksand"
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 40%, #dbeafe 70%, #eff6ff 100%)",
      }}
    >
      <style>{`
        @keyframes orbFloat1 {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(30px,-40px) scale(1.05)}
          66%{transform:translate(-20px,20px) scale(0.97)}
        }
        @keyframes orbFloat2 {
          0%,100%{transform:translate(0,0) scale(1)}
          40%{transform:translate(-40px,30px) scale(1.08)}
          70%{transform:translate(25px,-20px) scale(0.95)}
        }
        @keyframes orbFloat3 {
          0%,100%{transform:translate(0,0) scale(1)}
          30%{transform:translate(50px,-30px) scale(1.04)}
          60%{transform:translate(-30px,40px) scale(1.02)}
        }
        @keyframes orbFloat4 {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(-20px,-35px) scale(1.1)}
        }
        @keyframes fadeSlideUp {
          from{opacity:0;transform:translateY(32px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes titleReveal {
          from{opacity:0;transform:translateY(24px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes subtleBreath {
          0%,100%{opacity:0.7;transform:scale(1)}
          50%{opacity:1;transform:scale(1.015)}
        }
        .animate-title{animation:titleReveal 1s cubic-bezier(0.22,1,0.36,1) both}
        .animate-tagline{animation:fadeSlideUp 1s 0.25s cubic-bezier(0.22,1,0.36,1) both}
        .animate-card{animation:fadeSlideUp 1s 0.45s cubic-bezier(0.22,1,0.36,1) both}
        .animate-icons{animation:subtleBreath 4s ease-in-out infinite}

        .oracle-glass{
          background:rgba(255,255,255,0.42);
          backdrop-filter:blur(36px) saturate(1.6);
          -webkit-backdrop-filter:blur(36px) saturate(1.6);
          border:1px solid rgba(255,255,255,0.65);
          box-shadow:0 8px 32px rgba(100,150,255,0.13),0 2px 8px rgba(150,200,255,0.1),inset 0 1px 0 rgba(255,255,255,0.7);
        }

        .select-wrapper{position:relative}
        .select-wrapper select{
          appearance:none;-webkit-appearance:none;
          width:100%;
          background:rgba(255,255,255,0.6);
          border:1.5px solid rgba(200,225,255,0.7);
          border-radius:16px;
          padding:14px 44px 14px 48px;
          font-family:'Quicksand',sans-serif;
          font-size:15px;font-weight:500;
          color:#1e3a6e;outline:none;
          transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
          cursor:pointer;
        }
        .select-wrapper select:focus{
          border-color:rgba(100,170,255,0.8);
          background:rgba(255,255,255,0.85);
          box-shadow:0 0 0 3px rgba(100,170,255,0.12);
        }
        .select-wrapper select option{color:#1e3a6e;background:#f0f7ff}

        .begin-btn{
          background:linear-gradient(135deg,#60a5fa 0%,#38bdf8 100%);
          box-shadow:0 8px 24px rgba(96,165,250,0.4),0 2px 8px rgba(56,189,248,0.25);
          transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease;
        }
        .begin-btn:not(:disabled):hover{
          transform:translateY(-3px);
          box-shadow:0 16px 40px rgba(96,165,250,0.5),0 4px 12px rgba(56,189,248,0.35);
        }
        .begin-btn:disabled{opacity:0.45;cursor:not-allowed}

        .pill-tag{transition:transform 0.2s ease,box-shadow 0.2s ease}
        .pill-tag:hover{transform:scale(1.06)}

        .nav-glass{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border-bottom:1px solid rgba(200,225,255,0.4);
        }

        .commute-slider{
          -webkit-appearance:none;appearance:none;
          width:100%;height:6px;border-radius:9999px;
          background:linear-gradient(to right,#60a5fa,#38bdf8);
          outline:none;cursor:pointer;
        }
        .commute-slider::-webkit-slider-thumb{
          -webkit-appearance:none;appearance:none;
          width:20px;height:20px;border-radius:50%;
          background:#fff;border:2px solid #60a5fa;
          box-shadow:0 2px 12px rgba(100,150,255,0.4);
          transition:transform 0.15s;
        }
        .commute-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}
      `}</style>

      <FloatingOrbs />

      {/* ── NAV ── */}
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center shadow-[0_4px_12px_rgba(96,165,250,0.4)]">
              <Home size={14} className="text-white" />
            </div>
            <span className="font-playfair text-lg font-semibold text-blue-950 tracking-tight">
              The Spirited Oracle
            </span>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-32 pb-6 text-center px-4">
        <div className="flex justify-center items-center gap-8 mb-6 animate-icons">
          <Cloud size={20} className="text-blue-200" />
          <Wind size={18} className="text-sky-300" />
          <Sparkles size={22} className="text-blue-300" />
          <Wind size={18} className="text-sky-200" />
          <Cloud size={20} className="text-blue-200" />
        </div>

        <h1 className="animate-title font-playfair text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.1] mb-6">
          <span style={{ background:"linear-gradient(135deg,#1e3a6e 0%,#1d4ed8 40%,#0284c7 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Find Your
          </span>
          <br />
          <span style={{ background:"linear-gradient(135deg,#3b82f6 0%,#38bdf8 50%,#67e8f9 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Sanctuary
          </span>
        </h1>

        <p className="animate-tagline text-slate-500 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed font-light">
          Where every home tells a story and every story finds its home.{" "}
          <span className="text-blue-400 font-medium">Let the oracle guide you.</span>
        </p>

        <div className="animate-tagline mt-8 flex justify-center">
          <div className="flex flex-col items-center gap-1 text-blue-300">
            <span className="text-xs tracking-widest uppercase font-medium">Begin Journey</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── FORM CARD ── */}
      <section className="relative z-10 px-4 pb-24 max-w-2xl mx-auto">
        <div className="oracle-glass rounded-3xl p-8 sm:p-12 animate-card">

          {/* Card header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center border border-white/80">
              <Navigation size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-playfair text-2xl font-semibold text-blue-950">Your Journey Preferences</h2>
              <p className="text-sm text-slate-400 mt-0.5">Curate your perfect home search</p>
            </div>
          </div>

          <div className="space-y-8">

            {/* ── COLLEGE / LOCATION ── */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest uppercase text-blue-400 flex items-center gap-1.5">
                <MapPin size={11} /> Your College
              </label>
              <div className="select-wrapper">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none z-10" />
                <select value={college} onChange={(e) => handleCollegeChange(e.target.value)}>
                  <option value="">Choose your college…</option>
                  {njColleges.map((c) => (
                    <option key={c.name} value={c.name}>{c.name} — {c.city}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

            {/* ── ROOMMATES & PARKING ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-blue-400">Roommates</label>
                <SegmentedControl options={["Solo", "1+", "2+"]} value={roommatesOpt} onChange={setRoommatesOpt} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-blue-400">Parking</label>
                <SegmentedControl options={["Not Needed", "1 Spot", "2 Spots"]} value={parkingOpt} onChange={setParkingOpt} />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

            {/* ── BUDGET SLIDER ── */}
            <DualRangeSlider min={500} max={5000} value={budget} onChange={setBudget} />

            <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

            {/* ── MAX COMMUTE ── */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold tracking-widest uppercase text-blue-400 flex items-center gap-1.5">
                  <Navigation size={11} /> Max Distance to Campus
                </label>
                <span className="text-sm font-semibold text-slate-700 bg-blue-50/80 px-3 py-1 rounded-full border border-blue-100">
                  {maxCommute} miles
                </span>
              </div>
              <input
                type="range" min={1} max={30} value={maxCommute}
                onChange={(e) => setMaxCommute(parseInt(e.target.value))}
                className="commute-slider"
              />
              <div className="flex justify-between text-xs text-blue-300 font-medium">
                <span>1 mi</span><span>30 mi</span>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

            {/* ── AMENITIES ── */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-widest uppercase text-blue-400 flex items-center gap-1.5">
                <Sparkles size={11} /> Desired Amenities
              </label>
              <div className="flex flex-wrap gap-2.5">
                {amenitiesList.map((a) => {
                  const active = selectedAmenities.has(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`pill-tag flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-blue-400 to-sky-400 text-white border-transparent shadow-[0_4px_16px_rgba(100,160,255,0.35)]"
                          : "bg-white/60 text-slate-600 border-white/70 hover:border-blue-200 hover:shadow-[0_0_0_3px_rgba(100,170,255,0.12)] hover:text-blue-600"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

            {/* ── CTA BUTTON ── */}
            <button
              type="button"
              onClick={handleBegin}
              disabled={!college || isSubmitting}
              className="begin-btn w-full py-5 rounded-2xl text-white font-bold text-lg tracking-wide flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <Sparkles size={20} className="animate-spin" />
                  Casting the spell…
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Begin My Journey
                  <Navigation size={18} />
                </>
              )}
            </button>

            {!college && (
              <p className="text-center text-xs text-blue-300 -mt-4">
                Choose a college to unlock your journey ✦
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Cloud size={14} className="text-blue-200" />
          <span>Powered by mystical algorithms & good vibes</span>
          <Sparkles size={14} className="text-blue-200" />
        </div>
      </section>
    </div>
  );
}
