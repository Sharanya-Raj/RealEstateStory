import { motion } from "framer-motion";
import { SearchForm } from "@/components/SearchForm";
import { HillsSilhouette } from "@/components/HillsSilhouette";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative watercolor-gradient overflow-hidden pb-24 pt-12 md:pt-20">
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-3"
          >
            Find Your Perfect Nest
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-handwritten text-2xl md:text-3xl text-muted-foreground mb-10"
          >
            Guided by the spirits of Studio Ghibli
          </motion.p>

          <SearchForm />
        </div>

        <HillsSilhouette />
      </section>
    </div>
  );
};

export default Index;
