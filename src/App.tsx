import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import Messages from "./pages/Messages";
import Teams from "./pages/Teams";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import EventDetail from "./pages/EventDetail";
import AdminEvents from "./pages/admin/Events";
import { useLocation } from 'react-router-dom';
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
  return (
    <Navigate
      to="/"
      replace
      state={{ from: location.pathname }}
    />
  );
}
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/home" replace /> : <Auth />} 
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/events/:eventId" element={<EventDetail />} />
        <Route path="/admin/events" element={<AdminEvents />} />

      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
