import PlayersAdmin from "./pages/admin/Players";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Centers from "./pages/admin/Centers";
import RoleRedirect from "@/components/layout/RoleRedirect";
import CalendarPage from "./pages/shared/CalendarPage";
import Messages from "./pages/shared/Messages";
import Teams from "./pages/shared/Teams";
import Profile from "./pages/shared/Profile";
import PlayerDashboard from "./pages/player/PlayerDashboard";
import ResetPassword from "./pages/player/ResetPassword";
import NotFound from "./pages/NotFound";
import EventDetail from "./pages/EventDetail";
import AdminEvents from "./pages/admin/Events";
import TeamDetailAdmin from "./pages/admin/TeamDetailAdmin";
import { useEffect, useState } from "react";
import Players from "./pages/parent/Players";
import ParentDashboard from "./pages/parent/ParentDashboard";
import { supabase } from "./lib/supabase";
import Home from "./pages/admin/Home";
import { ClubProvider } from "@/contexts/ClubContext";
import Coaches from "./pages/admin/Coaches";
const queryClient = new QueryClient();

/* =======================
   PROTECTED ROUTE
======================= */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/* =======================
   APP ROUTES
======================= */
function AppRoutes() {
  const { isAuthenticated, role, forcePasswordReset, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [playerProfile, setPlayerProfile] = useState<any | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);



  // Redirección a reset-password usando useEffect para evitar errores de hooks
  useEffect(() => {
    if (forcePasswordReset && location.pathname !== "/reset-password") {
      navigate("/reset-password", { replace: true });
    }
  }, [forcePasswordReset, location.pathname, navigate]);

  /* =======================
     CARGAR PLAYER PROFILE
  ======================= */
  useEffect(() => {
    if (!isAuthenticated || role !== "player" || !user) {
      setLoadingPlayer(false);
      return;
    }

    const loadPlayerProfile = async () => {
      const { data: playerData } = await supabase
        .from("players")
        .select("id, club_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setPlayerProfile(playerData ?? null);
      setLoadingPlayer(false);
    };

    loadPlayerProfile();
  }, [isAuthenticated, role, user]);

  /* =======================
     REDIRECCIÓN POST-LOGIN
  ======================= */
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    // Si el usuario debe resetear la contraseña, no redirigir a dashboard
    if (forcePasswordReset) return;

    // Esperar datos del player
    if (role === "player" && loadingPlayer) return;

    // Ya estamos en una ruta válida
    if (location.pathname !== "/") return;

    switch (role) {
      case "super_admin":
        navigate("/home", { replace: true });
        break;

      case "parent":
        navigate("/parent/dashboard", { replace: true });
        break;

      case "player":
        navigate("/player/dashboard", { replace: true });
        break;
    }
  }, [isAuthenticated, role, loadingPlayer, playerProfile, location.pathname, forcePasswordReset]);

  return (
    <Routes>
      {/* LOGIN */}
      <Route path="/" element={<Auth />} />

      {/* RESET PASSWORD */}
      <Route
        path="/reset-password"
        element={
          <ProtectedRoute>
            <ResetPassword />
          </ProtectedRoute>
        }
      />

      {/* APP PROTEGIDA */}
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
        <Route path="/centers" element={<Centers />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/player/dashboard" element={<PlayerDashboard />} />
        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/parent/players" element={<Players />} />
        <Route path="/events/:eventId" element={<EventDetail />} />

        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/shared/teams" element={<Teams />} />
        <Route path="/admin/teams/:teamId" element={<TeamDetailAdmin />} />
        <Route path="/admin/players" element={<PlayersAdmin />} />
        <Route path="/admin/coaches" element={<Coaches />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


/* =======================
   APP ROOT
======================= */


import { HashRouter } from "react-router-dom";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HashRouter>
        <AuthProvider>
          <ClubProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </ClubProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
