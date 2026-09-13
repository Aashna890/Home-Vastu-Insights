import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import ScrollToTop from "@/components/ScrollToTop";
import VastuAnalyzer from "@/pages/VastuAnalyzer";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<VastuAnalyzer />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;