import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Car, Footprints, Plus, Minus } from "lucide-react";
import { type SearchParams } from "@/api/agents";
import { AgentAvatar } from "./AgentAvatar";
import { agents } from "@/data/mockData";

const amenityOptions = [
  "In-unit Laundry", "Dishwasher", "Air Conditioning", "Parking",
  "Pet Friendly", "Furnished", "Balcony/Patio", "Pool",
];

const nearbyOptions = ["Gym within walking distance", "Grocery store within walking distance"];

export const SearchForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<SearchParams>({
    university: "",
    budget: 1200,
    roommates: 0,
    hasCar: false,
    amenities: [],
    nearbyPreferences: [],
    notes: "",
  });

  const totoro = agents[0];

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const toggleNearby = (n: string) =>
    setForm((f) => ({
      ...f,
      nearbyPreferences: f.nearbyPreferences.includes(n)
        ? f.nearbyPreferences.filter((x) => x !== n)
        : [...f.nearbyPreferences, n],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/results", { state: form });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="ghibli-card p-6 md:p-8 max-w-2xl mx-auto"
    >
      {/* Totoro helper */}
      <div className="flex items-start gap-4 mb-6">
        <AgentAvatar agent={totoro} size="md" status="complete" showBubble bubbleText="Tell me what you're looking for!" />
      </div>

      {/* University */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-1 block">University Name *</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            required
            value={form.university}
            onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
            placeholder="e.g., University of Michigan"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Budget */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-1 block">
          Monthly Budget: <span className="text-primary font-bold">${form.budget}</span>
        </label>
        <input
          type="range"
          min={400}
          max={3000}
          step={50}
          value={form.budget}
          onChange={(e) => setForm((f) => ({ ...f, budget: +e.target.value }))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-border"
        />
        <div className="flex justify-between text-xs text-muted-foreground font-body mt-1">
          <span>$400</span><span>$3,000</span>
        </div>
      </div>

      {/* Roommates */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-1 block">Number of Roommates</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, roommates: Math.max(0, f.roommates - 1) }))}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-body text-lg font-bold w-8 text-center">{form.roommates}</span>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, roommates: Math.min(6, f.roommates + 1) }))}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Has Car */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-2 block">Do you have a car?</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, hasCar: true }))}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm transition-all duration-300 ${
              form.hasCar ? "bg-accent text-accent-foreground shadow-md" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Car className="w-4 h-4" /> Yes
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, hasCar: false }))}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm transition-all duration-300 ${
              !form.hasCar ? "bg-accent text-accent-foreground shadow-md" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Footprints className="w-4 h-4" /> No
          </button>
        </div>
      </div>

      {/* Amenities */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-2 block">Amenities</label>
        <div className="flex flex-wrap gap-2">
          {amenityOptions.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`ghibli-chip ${form.amenities.includes(a) ? "selected" : ""}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby */}
      <div className="mb-5">
        <label className="font-handwritten text-lg text-foreground mb-2 block">Nearby Preferences</label>
        <div className="flex flex-col gap-2">
          {nearbyOptions.map((n) => (
            <label key={n} className="flex items-center gap-2 cursor-pointer font-body text-sm">
              <input
                type="checkbox"
                checked={form.nearbyPreferences.includes(n)}
                onChange={() => toggleNearby(n)}
                className="w-4 h-4 rounded accent-ghibli-forest"
              />
              {n}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="font-handwritten text-lg text-foreground mb-1 block">Additional Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Anything else the spirits should know? e.g., 'I need a quiet neighborhood'"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-background border border-border font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
        />
      </div>

      {/* Submit */}
      <button type="submit" className="ghibli-btn-primary w-full text-base">
        Send the Spirits Searching ✨
      </button>
    </motion.form>
  );
};
