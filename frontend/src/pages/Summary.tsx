import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import { type Listing } from "@/types/listing";
import { api } from "@/lib/api";
import { usePreferences } from "@/contexts/PreferencesContext";
import { summaryAgent } from "@/data/agents";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  MessageCircle, ArrowLeft, Home, CheckCircle, AlertTriangle, Info,
  Sparkles, DollarSign, Wallet, Shield, Star, MapPin, Navigation, Calendar, Car
} from "lucide-react";

const ORACLE_COLORS = ["#60a5fa", "#38bdf8", "#818cf8", "#93c5fd", "#bfdbfe"];

const Summary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, aiPayload } = usePreferences();

  const fairnessData = location.state?.fairnessData;

  const [listing, setListing] = useState<Listing | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    api.getListing(id!)
      .then(data => {
        setListing(data);
        setIsFetching(false);
      })
      .catch(err => {
        console.error("Failed to fetch listing", err);
        setListing(null);
        setIsFetching(false);
      });
  }, [id]);

  // Play Kamaji's voiceover if available - moved up to follow Rules of Hooks
  useEffect(() => {
    if (aiPayload?.voiceoverBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${aiPayload.voiceoverBase64}`);
      audio.play().catch(e => console.error("Audio playback paused by browser:", e));
    }
  }, [aiPayload]);

  if (isFetching) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/20 flex items-center justify-center shadow-2xl animate-bounce">
            <span className="text-3xl drop-shadow-md">📜</span>
          </div>
          <p className="font-playfair text-xl text-white font-bold drop-shadow-md">Gathering your summary...</p>
          <p className="text-slate-300 text-sm drop-shadow-sm">Finishing the grand evaluation</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🍃</span>
          <p className="font-playfair text-2xl text-white font-bold drop-shadow-md">Summary Disappeared</p>
          <p className="text-slate-300 drop-shadow-sm">The evaluation could not be completed.</p>
        </div>
      </GhibliLayout>
    );
  }


  const totalHidden = aiPayload ? (aiPayload.trueCost - aiPayload.rent) : listing.hiddenCosts.reduce((s, c) => s + c.amount, 0);
  const totalMonthly = aiPayload ? aiPayload.trueCost : listing.price + totalHidden;
  const priceDiff = listing.price - listing.zillowEstimate;

  const costBreakdown = aiPayload?.costBreakdown ?
    [
      { name: "Base Rent", amount: aiPayload.costBreakdown.rent || aiPayload.rent },
      ...(aiPayload.costBreakdown.utilities ? [{ name: "Utilities", amount: aiPayload.costBreakdown.utilities }] : []),
      ...(aiPayload.costBreakdown.transportation ? [{ name: "Transportation", amount: aiPayload.costBreakdown.transportation }] : []),
      ...(aiPayload.costBreakdown.groceries ? [{ name: "Groceries", amount: aiPayload.costBreakdown.groceries }] : []),
    ] :
    [
      { name: "Base Rent", amount: listing.price },
      ...listing.hiddenCosts,
    ];

  const scores = aiPayload ? [
    { name: "Commute", score: aiPayload.commute.walking ? 4 : 3 },
    { name: "Budget", score: Math.round(aiPayload.matchScore / 20) },
    { name: "Fairness", score: aiPayload.percentile < 50 ? 5 : 3 },
    { name: "Safety", score: aiPayload.safety.score || 5 },
    { name: "Transparency", score: totalHidden < 100 ? 5 : 3 },
  ] : [
    { name: "Commute", score: listing.commuteMinutes <= 10 ? 5 : listing.commuteMinutes <= 20 ? 4 : 3 },
    { name: "Budget", score: totalMonthly < 1200 ? 5 : totalMonthly < 1600 ? 4 : totalMonthly < 2000 ? 3 : 2 },
    { name: "Fairness", score: priceDiff <= 0 ? 5 : priceDiff <= 100 ? 4 : 2 },
    { name: "Safety", score: Math.round(listing.crimeScore / 2) },
    { name: "Transparency", score: listing.hiddenCosts.length <= 2 ? 5 : listing.hiddenCosts.length <= 3 ? 4 : 3 },
  ];

  const scoreCalculations = [
    { name: "Commute", score: listing.commuteMinutes <= 10 ? 5 : listing.commuteMinutes <= 20 ? 4 : 3 },
    { name: "Budget", score: totalMonthly < 1200 ? 5 : totalMonthly < 1600 ? 4 : totalMonthly < 2000 ? 3 : 2 },
    { name: "Fairness", score: fairnessData ? Math.max(1, Math.min(5, Math.ceil(fairnessData.fairness_score / 20))) : (priceDiff <= 0 ? 5 : priceDiff <= 100 ? 4 : 2) },
    { name: "Safety", score: Math.round(listing.crimeScore / 2) },
    { name: "Transparency", score: listing.hiddenCosts.length <= 2 ? 5 : listing.hiddenCosts.length <= 3 ? 4 : 3 },
  ];

  const overallScore = aiPayload ? aiPayload.matchScore : Math.round((scoreCalculations.reduce((s, x) => s + x.score, 0) / scoreCalculations.length) * 20);

  const pros: string[] = aiPayload ? aiPayload.pros : [];
  const cons: string[] = aiPayload ? aiPayload.cons : [];

  if (!aiPayload) {
    if (listing.commuteMinutes <= 15) pros.push(`Short ${listing.commuteMinutes}-min commute`);
    else cons.push(`${listing.commuteMinutes}-min commute may be long`);
    if (priceDiff <= 0) pros.push("Priced at or below market value");
    else cons.push(`$${priceDiff} above Zillow estimate`);
    if (listing.crimeScore >= 7) pros.push("Safe neighborhood");
    else cons.push("Safety score could be better");
    if (listing.parkingIncluded) pros.push("Parking included");
    if (listing.utilitiesIncluded) pros.push("Utilities included");
    if (listing.petFriendly) pros.push("Pet friendly");
  }

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
        <style>{`
          .oracle-glass {
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          }
          .oracle-glass-strong {
            background: rgba(0,0,0,0.7);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          }
        `}</style>
        {/* Kamaji Grand Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="oracle-glass-strong p-8 lg:p-10 mb-12 rounded-[2.5rem] relative overflow-hidden"
        >
          {/* Decorative Sparkles */}
          <Sparkles className="absolute top-4 right-4 text-blue-200/50" size={100} />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <div className="w-24 h-24 rounded-3xl bg-black/40 border border-white/20 flex items-center justify-center text-5xl shadow-2xl animate-float overflow-hidden">
              {(() => {
                // Use the public kamaji image explicitly when rendering the summary header
                const kamajiPublic = new URL('/images/kamaji1.PNG', import.meta.url).href;
                const src = summaryAgent.character === 'Kamaji' ? kamajiPublic : summaryAgent.image;
                if (src) {
                  return <img src={src} alt={summaryAgent.name} className="w-full h-full object-cover" />;
                }
                return <span className="drop-shadow-md">{summaryAgent.emoji}</span>;
              })()}
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <div className="h-px w-8 bg-blue-300" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-300 drop-shadow-md">The Final Revelation</span>
                <div className="h-px w-8 bg-blue-300" />
              </div>
              <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                {summaryAgent.character}'s Grand Summary
              </h1>
              <p className="text-slate-200 font-quicksand text-lg italic leading-relaxed max-w-2xl drop-shadow-sm">
                "{aiPayload?.sophieSummary || `I've pulled all the threads together for ${listing.address}. Here is the true essence of your future sanctuary.`}"
              </p>
            </div>
          </div>
        </motion.div>

        {/* Overall Score Circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-16"
        >
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
              <circle 
                cx="80" cy="80" r="70" stroke="url(#blue-gradient)" strokeWidth="8" fill="transparent" 
                strokeDasharray={440} strokeDashoffset={440 - (440 * overallScore) / 100}
                strokeLinecap="round" className="drop-shadow-[0_0_12px_rgba(96,165,250,0.6)] transition-all duration-1000"
              />
              <defs>
                <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-playfair text-5xl font-bold text-white drop-shadow-md">{overallScore}%</span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-sky-200 mt-1 drop-shadow-sm">Match</span>
            </div>
          </div>
        </motion.div>

        {/* ── METRICS GRID ── */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          
          {/* Agent Scores Chart */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="oracle-glass bg-black/40 border border-white/20 p-8 rounded-[2rem] shadow-2xl"
          >
            <h2 className="font-playfair text-xl font-bold text-white mb-6 flex items-center gap-3 drop-shadow-md">
              <Star className="text-blue-300" size={20} />
              Agent Evaluations
            </h2>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scores}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontFamily: "Quicksand", fontSize: 11, fontWeight: 600, fill: "#64748b" }} dy={10} />
                  <YAxis hide domain={[0, 5]} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", fontFamily: "Quicksand" }} />
                  <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={32}>
                    {scores.map((_, i) => (
                      <Cell key={i} fill={ORACLE_COLORS[i % ORACLE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Cost Allocation Pie */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="oracle-glass bg-black/40 border border-white/20 p-8 rounded-[2rem] shadow-2xl"
          >
            <h2 className="font-playfair text-xl font-bold text-white mb-2 flex items-center gap-3 drop-shadow-md">
              <Wallet className="text-blue-300" size={20} />
              True Monthly Cost
            </h2>
            <p className="text-sm text-sky-200 font-bold mb-6 drop-shadow-sm">${totalMonthly.toLocaleString()}<span className="text-slate-300 font-medium"> total allocation</span></p>
            
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={6}>
                    {costBreakdown.map((_, i) => (
                      <Cell key={i} fill={ORACLE_COLORS[i % ORACLE_COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", fontFamily: "Quicksand" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
              {costBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/10 shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ORACLE_COLORS[i % ORACLE_COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider drop-shadow-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── INSIGHTS & REFERENCE ── */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Pros & Cons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 oracle-glass-strong bg-black/40 border border-white/20 p-8 rounded-[2.5rem] shadow-2xl"
          >
            <h2 className="font-playfair text-2xl font-bold text-white mb-8 flex items-center gap-3 drop-shadow-md">
              <span className="w-1.5 h-8 bg-blue-400 rounded-full" />
              The Oracle's Insights
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold tracking-[.2em] uppercase text-blue-300 mb-2 drop-shadow-sm">Sacred Blessings</h4>
                {pros.map((p) => (
                  <div key={p} className="flex items-start gap-3 p-3 rounded-2xl bg-black/60 border border-white/20 shadow-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-400/30">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
                    </div>
                    <span className="text-white text-sm font-medium">{p}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold tracking-[.2em] uppercase text-amber-300 mb-2 drop-shadow-sm">Mortal Cautions</h4>
                {cons.map((c) => (
                  <div key={c} className="flex items-start gap-3 p-3 rounded-2xl bg-black/60 border border-white/20 shadow-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-400/30">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                    </div>
                    <span className="text-white text-sm font-medium">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="oracle-glass bg-black/40 border border-white/20 p-8 rounded-[2.5rem] shadow-2xl"
          >
            <h2 className="font-playfair text-xl font-bold text-white mb-6 flex items-center gap-3 drop-shadow-md">
              <Info className="text-blue-300" size={20} />
              The Ledger
            </h2>
            <div className="space-y-3.5">
              {[
                { label: "Address", value: listing.address, icon: MapPin },
                { label: "Rent", value: `$${listing.price}`, icon: DollarSign },
                { label: "True Cost", value: `$${totalMonthly}`, icon: Wallet },
                { label: "Zip Fairness", value: fairnessData ? `${fairnessData.fairness_score}/100` : "Calculated", icon: Shield },
                { label: "Distance", value: `${listing.distanceMiles} mi`, icon: Navigation },
                { label: "Safe Score", value: `${listing.crimeScore}/10`, icon: Shield },
                { label: "Lease", value: `${listing.leaseTermMonths} mo`, icon: Calendar },
                { label: "Parking", value: listing.parkingIncluded ? "Yes" : "No", icon: Car },
              ].map((item) => (
                <div key={item.label} className="flex flex-col border-b border-white/10 pb-2 last:border-0 group">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{item.label}</span>
                  <span className="text-white font-bold group-hover:text-blue-300 transition-colors truncate">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ── FINAL NAVIGATION ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-6 mt-16 pt-12 border-t border-white/10"
        >
          <button 
            onClick={() => navigate(`/listing/${id}`)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-black/40 text-blue-200 font-bold hover:bg-black/60 transition-all text-sm shadow-lg"
          >
            <ArrowLeft size={16} /> Back to Detail
          </button>
          
          <button 
            onClick={() => navigate("/listings")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-black/40 text-blue-200 font-bold hover:bg-black/60 transition-all text-sm shadow-lg"
          >
            <Home size={16} /> All Sanctuaries
          </button>

          <button 
            onClick={() => navigate(`/chat/${id}`)}
            className="begin-btn flex items-center gap-3 px-10 py-4 rounded-xl text-white font-bold shadow-xl hover:scale-105 transition-transform"
          >
            <MessageCircle size={20} />
            Ask the Wizard ✨
          </button>
        </motion.div>

      </div>
    </GhibliLayout>
  );
};

export default Summary;
