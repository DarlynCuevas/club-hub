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
import CalendarPage from "./pages/CalendarPage";
import Messages from "./pages/Messages";
import Teams from "./pages/admin/Teams";
import Profile from "./pages/Profile";
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
import Home from "./pages/Home";

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

  /* =======================
     RESET PASSWORD
  ======================= */
  if (forcePasswordReset && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  /* =======================
     CARGAR PLAYER PROFILE
  ======================= */
  useEffect(() => {
    if (!isAuthenticated || role !== "player" || !user) {
      setLoadingPlayer(false);
      return;
    }

    const loadPlayerProfile = async () => {
      const { data } = await supabase
        .from("players")
        .select("id, club_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setPlayerProfile(data ?? null);
      setLoadingPlayer(false);
    };

    loadPlayerProfile();
  }, [isAuthenticated, role, user]);

  /* =======================
     REDIRECCIÓN POST-LOGIN
  ======================= */
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    // Esperar datos del player
    if (role === "player" && loadingPlayer) return;

    // Ya estamos en una ruta válida
    if (location.pathname !== "/") return;

    switch (role) {
      case "super_admin":
        navigate("/home", { replace: true });
        break;

      case "parent":
        navigate("/dashboard/parent", { replace: true });
        break;

      case "player":
        if (!playerProfile || !playerProfile.club_id) {
          navigate("/player/onboarding", { replace: true });
        } else {
          navigate("/dashboard/player", { replace: true });
        }
        break;
    }
  }, [isAuthenticated, role, loadingPlayer, playerProfile, location.pathname]);

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

        <Route path="/dashboard/player" element={<PlayerDashboard />} />
        <Route path="/dashboard/parent" element={<ParentDashboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/events/:eventId" element={<EventDetail />} />

        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/teams" element={<Teams />} />
        <Route path="/admin/teams/:teamId" element={<TeamDetailAdmin />} />
        <Route path="/admin/players" element={<PlayersAdmin />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


/* =======================
   APP ROOT
======================= */
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
