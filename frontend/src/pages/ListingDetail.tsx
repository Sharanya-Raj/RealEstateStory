import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Car, Bus, Bike, Footprints, Camera, MapPin, Shield, Sparkles, Check, X as XIcon, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getListingById } from "@/api/agents";
import { agents, howlAgent, type Listing } from "@/data/mockData";
import { AgentAvatar } from "@/components/AgentAvatar";
import { SootSprites } from "@/components/SootSprites";
import { NegotiationModal } from "@/components/NegotiationModal";
import { AgentStory } from "@/components/AgentStory";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStory, setShowStory] = useState(true);

  useEffect(() => {
    if (id) {
      getListingById(id).then((data) => { setListing(data); setLoading(false); });
    }
  }, [id]);

  if (loading) return <SootSprites text="Loading nest details..." />;
  if (listing && showStory) return <AgentStory listing={listing} onComplete={() => setShowStory(false)} />;
  if (!listing) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-5xl mb-4">🌳</p>
      <p className="font-handwritten text-xl text-muted-foreground">This nest seems to have vanished...</p>
      <Link to="/results" className="ghibli-btn-primary inline-block mt-6">Back to Results</Link>
    </div>
  );

  const kiki = agents[2];
  const noface = agents[3];
  const haku = agents[4];
  const jiji = agents[5];
  const sophie = agents[6];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Link to="/results" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* LEFT COLUMN - 3/5 */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-1">{listing.name}</h1>
              <p className="flex items-center gap-1 text-muted-foreground font-body"><MapPin className="w-4 h-4" />{listing.address}</p>
              <div className="flex items-baseline gap-4 mt-3">
                <span className="text-3xl font-bold text-primary font-heading">${listing.rent}<span className="text-base font-body font-normal text-muted-foreground">/mo</span></span>
                <span className="font-body text-sm text-muted-foreground">{listing.bedrooms} bed · {listing.bathrooms} bath · {listing.sqft} sqft</span>
              </div>
            </motion.div>

            {/* Image placeholders */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-secondary/60 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground/40" />
                </div>
              ))}
            </div>

            {/* Map placeholder */}
            <div className="rounded-xl bg-secondary/40 h-48 flex items-center justify-center border border-border">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-body text-sm">Map — Integration coming soon</p>
              </div>
            </div>

            {/* Description */}
            <div className="ghibli-card p-5">
              <h3 className="font-heading text-lg mb-2">About This Nest</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>

            {/* Amenities */}
            <div className="ghibli-card p-5">
              <h3 className="font-heading text-lg mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {["In-unit Laundry", "Dishwasher", "Air Conditioning", "Parking", "Pet Friendly", "Furnished", "Balcony/Patio", "Pool"].map((a) => (
                  <span
                    key={a}
                    className={`ghibli-chip text-xs ${listing.amenities.includes(a) ? "selected" : "opacity-40"}`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Commute - Kiki */}
            <div className="ghibli-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={kiki} size="sm" status="complete" />
                <div className="speech-bubble text-sm flex-1">Let me fly over and check the routes!</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Car, label: "Drive", value: listing.commute.driving },
                  { icon: Bus, label: "Transit", value: listing.commute.transit },
                  { icon: Bike, label: "Bike", value: listing.commute.biking },
                  { icon: Footprints, label: "Walk", value: listing.commute.walking },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-background p-3 text-center border border-border">
                    <Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-body text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - 2/5 */}
          <div className="lg:col-span-2 space-y-6">
            {/* True Cost - No-Face */}
            <div className="ghibli-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={noface} size="sm" status="complete" />
                <h3 className="font-heading text-lg">True Cost Breakdown</h3>
              </div>
              <div className="space-y-2 font-body text-sm">
                {[
                  { label: "Base Rent", value: listing.costBreakdown.rent },
                  { label: "Est. Utilities", value: listing.costBreakdown.utilities },
                  { label: "Transportation", value: listing.costBreakdown.transportation },
                  { label: "Groceries (nearby avg)", value: listing.costBreakdown.groceries },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">${value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-foreground">Total True Cost</span>
                  <span className="font-heading text-xl font-bold text-primary">${listing.trueCost}/mo</span>
                </div>
              </div>
            </div>

            {/* Safety - Haku */}
            <div className="ghibli-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={haku} size="sm" status="complete" />
                <h3 className="font-heading text-lg">Neighborhood Safety</h3>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--ghibli-forest))" strokeWidth="3" strokeDasharray={`${listing.safety.score * 10}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-bold">{listing.safety.score}/10</span>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" />Nearest police: {listing.safety.nearestPolice}</p>
                </div>
              </div>
              <p className="font-body text-sm text-muted-foreground">{listing.safety.summary}</p>
            </div>

            {/* Historical - Jiji */}
            <div className="ghibli-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={jiji} size="sm" status="complete" />
                <h3 className="font-heading text-lg">Historical Prices</h3>
              </div>
              <div className="speech-bubble text-sm mb-4">
                Based on my records, this is {listing.historicalInsight}. {listing.percentile < 50 ? "Not bad, human." : "Hmph, could be better."}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={listing.historicalPrices}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "Nunito" }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "Nunito" }} tickLine={false} axisLine={false} width={45} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(59,48,40,0.1)", fontFamily: "Nunito" }} />
                    <ReferenceLine y={listing.rent} stroke="hsl(var(--ghibli-terracotta))" strokeDasharray="6 4" label={{ value: "Current", position: "right", fontSize: 10, fontFamily: "Caveat", fill: "hsl(var(--ghibli-terracotta))" }} />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--ghibli-gold))" strokeWidth={2} dot={{ fill: "hsl(var(--ghibli-gold))", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Percentile bar */}
              <div className="mt-4">
                <p className="font-body text-xs text-muted-foreground mb-1">
                  Percentile: <strong>{listing.percentile}th</strong> for price in this area
                </p>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${listing.percentile}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full bg-ghibli-gold"
                  />
                </div>
              </div>
            </div>

            {/* Sophie's Assessment */}
            <div className="ghibli-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <AgentAvatar agent={sophie} size="sm" status="complete" />
                <h3 className="font-heading text-lg">Sophie's Assessment</h3>
              </div>

              {/* Match score */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--ghibli-gold))" strokeWidth="3" strokeDasharray={`${listing.matchScore}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-handwritten text-lg font-bold">{listing.matchScore}%</span>
                </div>
                <span className="font-handwritten text-lg text-muted-foreground">Spirit Match</span>
              </div>

              {/* Pros */}
              <div className="mb-3">
                {listing.pros.map((p) => (
                  <div key={p} className="flex items-start gap-2 mb-1">
                    <Check className="w-4 h-4 text-ghibli-forest mt-0.5 flex-shrink-0" />
                    <span className="font-body text-sm">{p}</span>
                  </div>
                ))}
              </div>

              {/* Cons */}
              <div className="mb-4">
                {listing.cons.map((c) => (
                  <div key={c} className="flex items-start gap-2 mb-1">
                    <XIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="font-body text-sm">{c}</span>
                  </div>
                ))}
              </div>

              <p className="font-body text-sm text-muted-foreground leading-relaxed">{listing.sophieSummary}</p>
            </div>
          </div>
        </div>

        {/* Howl's Negotiation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="ghibli-card p-6 md:p-8 mt-8"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <AgentAvatar agent={howlAgent} size="lg" status="complete" />
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-heading text-xl mb-1">Howl's Negotiation Service</h3>
              <p className="font-handwritten text-lg text-muted-foreground mb-4">
                Shall I draft a letter? I can be quite persuasive...
              </p>
              <button onClick={() => setShowModal(true)} className="ghibli-btn-gold inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Draft Negotiation Email
              </button>
            </div>
          </div>
        </motion.div>

        <NegotiationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          listingId={listing.id}
          listingAddress={listing.address}
        />
      </div>
    </div>
  );
};

export default ListingDetail;
