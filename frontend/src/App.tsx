import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import Index from "./pages/Index";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Journey from "./pages/Journey";
import Summary from "./pages/Summary";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import SpiritedOracle from "./pages/SpiritedOracle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PreferencesProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SpiritedOracle />} />
            <Route path="/main" element={<Index />} />
            <Route path="/oracle" element={<SpiritedOracle />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/journey/:id" element={<Journey />} />
            <Route path="/summary/:id" element={<Summary />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PreferencesProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
