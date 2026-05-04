import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import StudentResources from "./pages/StudentResources";
import CourseDashboard from "./pages/CourseDashboard";
import StudentGrades from "./pages/StudentGrades";
import AdminPanel from "./pages/AdminPanel";

import Login from "./pages/Login";
import Upload from "./pages/Upload";
import StudentUpload from "./pages/StudentUpload";
import VerifySubmission from "./pages/VerifySubmission";
import Pastebin from "./pages/Pastebin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Wykaz from "./pages/Wykaz";
import WykazEmbed from "./pages/WykazEmbed";
import WykazRanking from "./pages/WykazRanking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/student-resources" element={<StudentResources />} />
            <Route path="/zasoby" element={<StudentResources />} />
            <Route path="/course/:courseCode" element={<CourseDashboard />} />
            <Route path="/grades" element={<StudentGrades />} />
            <Route path="/admin" element={<AdminPanel />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/upload/:courseId" element={<StudentUpload />} />
            <Route path="/verify-submission" element={<VerifySubmission />} />
            <Route path="/pastebin" element={<Pastebin />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/wykaz" element={<Wykaz />} />
            <Route path="/wykaz/embed" element={<WykazEmbed />} />
            <Route path="/wykaz/ranking" element={<WykazRanking />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
