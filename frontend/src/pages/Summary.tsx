import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import GhibliLayout from "@/components/GhibliLayout";
import { type Listing } from "@/data/mockListings";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Button } from "@/components/ui/button";
import { summaryAgent } from "@/data/agents";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  MessageCircle, ArrowLeft, Home, CheckCircle, AlertTriangle, Info,
} from "lucide-react";

const COLORS = ["#A6D784", "#8FB1E9", "#F2B5C1", "#F4A460", "#5B8C3E"];

const Summary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, aiPayload } = usePreferences();

  const fairnessData = location.state?.fairnessData;

  const [listing, setListing] = useState<Listing | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/listings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
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

  if (isFetching) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <span className="text-5xl block mb-4 animate-bounce">🍂</span>
          <p className="text-xl text-muted-foreground">Gathering your summary...</p>
        </div>
      </GhibliLayout>
    );
  }

  if (!listing) {
    return (
      <GhibliLayout showBack>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Listing not found 🍃</p>
        </div>
      </GhibliLayout>
    );
  }

  // Play Kamaji's voiceover if available
  useEffect(() => {
    if (aiPayload?.voiceoverBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${aiPayload.voiceoverBase64}`);
      audio.play().catch(e => console.error("Audio playback paused by browser:", e));
    }
  }, [aiPayload]);

  // Use LLM-generated insights if available, fallback to dummy math otherwise
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
    {
      name: "Commute",
      score: listing.commuteMinutes <= 10 ? 5 : listing.commuteMinutes <= 20 ? 4 : 3,
    },
    {
      name: "Budget",
      score: totalMonthly < 1200 ? 5 : totalMonthly < 1600 ? 4 : totalMonthly < 2000 ? 3 : 2,
    },
    {
      name: "Fairness",
      score: fairnessData
        ? Math.max(1, Math.min(5, Math.ceil(fairnessData.fairness_score / 20)))
        : (priceDiff <= 0 ? 5 : priceDiff <= 100 ? 4 : 2),
    },
    {
      name: "Safety",
      score: Math.round(listing.crimeScore / 2),
    },
    {
      name: "Transparency",
      score: listing.hiddenCosts.length <= 2 ? 5 : listing.hiddenCosts.length <= 3 ? 4 : 3,
    },
  ];

  const overallScore = aiPayload ? aiPayload.matchScore : Math.round((scoreCalculations.reduce((s, x) => s + x.score, 0) / scoreCalculations.length) * 20);

  const pros: string[] = aiPayload ? aiPayload.pros : [];
  const cons: string[] = aiPayload ? aiPayload.cons : [];

  if (!aiPayload) {
    if (listing.commuteMinutes <= 15) pros.push(`Short ${listing.commuteMinutes}-min commute`);
    else cons.push(`${listing.commuteMinutes}-min commute may be long`);

    if (priceDiff <= 0) pros.push("Priced at or below market value");
    else cons.push(`$${priceDiff} above Zillow estimate`);

    if (fairnessData) {
      if (fairnessData.fairness_score >= 80) pros.push("Exceptional market value");
      else if (fairnessData.fairness_score < 40) cons.push("Priced significantly above market value");
    } else {
      if (priceDiff <= 0) pros.push("Priced at or below market value");
      else cons.push(`$${priceDiff} above Zillow estimate`);
    }

    if (listing.crimeScore >= 7) pros.push("Safe neighborhood");
    else cons.push("Safety score could be better");

    if (listing.parkingIncluded) pros.push("Parking included");
    else cons.push("No parking included");

    if (listing.utilitiesIncluded) pros.push("Utilities included");
    else cons.push("Utilities not included");

    if (listing.petFriendly) pros.push("Pet friendly");
    if (listing.amenities.length >= 5) pros.push(`${listing.amenities.length} amenities included`);
  }

  return (
    <GhibliLayout showBack>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Kamaji Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card-strong p-6 lg:p-8 mb-8 bg-gradient-to-br ${summaryAgent.bgGradient}`}
        >
          <div className="flex items-start gap-4">
            <div className="text-5xl animate-sway">{summaryAgent.emoji}</div>
            <div>
              <h1 className="font-playfair text-2xl lg:text-3xl font-bold text-foreground mb-1">
                {summaryAgent.character}'s Grand Summary
              </h1>
              <p className="text-muted-foreground italic">
                "{aiPayload?.sophieSummary || `I've pulled all the threads together for ${listing.address}. Here is everything you need to find your way home.`}"
              </p>
            </div>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-ghibli-meadow/20 border-4 border-ghibli-meadow/40 mb-3">
            <span className="font-playfair text-4xl font-bold text-ghibli-forest">{overallScore}%</span>
          </div>
          <p className="font-playfair text-lg text-foreground">Overall Match Score</p>
        </motion.div>

        {/* Agent Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mb-8"
        >
          <h2 className="font-playfair text-xl font-semibold text-foreground mb-4">Agent Ratings</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scores}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(101, 30%, 80%)" />
              <XAxis dataKey="name" tick={{ fontFamily: "Quicksand", fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fontFamily: "Quicksand", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontFamily: "Quicksand" }} />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {scores.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Cost Breakdown Pie */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h2 className="font-playfair text-xl font-semibold text-foreground mb-4">
              Monthly Cost Breakdown — ${totalMonthly}/mo
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={costBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {costBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", fontFamily: "Quicksand" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {costBreakdown.map((item, i) => (
                <span key={item.name} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.name}: ${item.amount}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Pros & Cons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h2 className="font-playfair text-xl font-semibold text-foreground mb-4">Pros & Cons</h2>
            <div className="space-y-3">
              {pros.map((p) => (
                <div key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-ghibli-meadow flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{p}</span>
                </div>
              ))}
              {cons.map((c) => (
                <div key={c} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-ghibli-amber flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{c}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Key Facts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 mb-8"
        >
          <h2 className="font-playfair text-xl font-semibold text-foreground mb-4">
            <Info className="inline h-5 w-5 mr-2 text-ghibli-sky" />
            Quick Reference
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {[
              ["Address", `${listing.address}, ${listing.city}`],
              ["Monthly Rent", `$${listing.price}`],
              ["True Monthly Cost", `$${totalMonthly}`],
              ["Zillow Estimate", `$${listing.zillowEstimate}`],
              ["Distance", `${listing.distanceMiles} mi`],
              ["Commute", `${listing.commuteMinutes} min`],
              ["Walk Score", `${listing.walkScore}/100`],
              ["Safety Score", `${listing.crimeScore}/10`],
              ["Beds / Baths", `${listing.bedrooms} / ${listing.bathrooms}`],
              ["Sq Ft", `${listing.sqft}`],
              ["Year Built", `${listing.yearBuilt}`],
              ["Lease Term", `${listing.leaseTermMonths} months`],
              ["Move-In", listing.moveInDate],
              ["Parking", listing.parkingIncluded ? "Included" : "Not included"],
              ["Pets", listing.petFriendly ? "Allowed" : "Not allowed"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border/30 pb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 py-6"
        >
          <Button variant="ghibli-outline" onClick={() => navigate(`/listing/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Listing
          </Button>
          <Button variant="ghibli-outline" onClick={() => navigate("/listings")}>
            <Home className="h-4 w-4 mr-1" /> All Listings
          </Button>
          <Button variant="ghibli" size="lg" className="px-8" onClick={() => navigate(`/chat/${id}`)}>
            <MessageCircle className="h-5 w-5 mr-2" />
            Ask Howl Your Questions ✨
          </Button>
        </motion.div>
      </div>
    </GhibliLayout>
  );
};

export default Summary;
