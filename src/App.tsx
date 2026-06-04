import { Suspense, lazy, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShopSettingsProvider } from "@/contexts/ShopSettingsContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { BrandThemeProvider } from "@/contexts/BrandThemeContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";

function lazyWithRetry(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch(() => {
      if (!sessionStorage.getItem("chunk_reload")) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
      }
      sessionStorage.removeItem("chunk_reload");
      return importFn();
    })
  );
}

// Lazy load pages with retry for stale cache on mobile
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const POS = lazyWithRetry(() => import("./pages/POS"));
const Repairs = lazyWithRetry(() => import("./pages/Repairs"));
const Inventory = lazyWithRetry(() => import("./pages/Inventory"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const Suppliers = lazyWithRetry(() => import("./pages/Suppliers"));
const Expenses = lazyWithRetry(() => import("./pages/Expenses"));
const CustomerDebts = lazyWithRetry(() => import("./pages/CustomerDebts"));
const Invoices = lazyWithRetry(() => import("./pages/Invoices"));
const Statistics = lazyWithRetry(() => import("./pages/Statistics"));
const Profit = lazyWithRetry(() => import("./pages/Profit"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Warranty = lazyWithRetry(() => import("./pages/Warranty"));
const RepairTracking = lazyWithRetry(() => import("./pages/RepairTracking"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const Communaute = lazyWithRetry(() => import("./pages/Communaute"));
const MessagesPage = lazyWithRetry(() => import("./pages/Messages"));
const OnboardingSetup = lazyWithRetry(() => import("./pages/OnboardingSetup"));
const Team = lazyWithRetry(() => import("./pages/Team"));
const Services = lazyWithRetry(() => import("./pages/Services"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Stale-while-revalidate: serve from cache instantly, refresh in background
      staleTime: 5 * 60 * 1000,   // 5 min — data served instantly on nav
      gcTime: 15 * 60 * 1000,     // 15 min — keep in memory across routes
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ImpersonationProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/track/:token" element={<RepairTracking />} />
                <Route path="/r/:token" element={<RepairTracking />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/checkout" element={<Checkout />} />
                
                {/* Onboarding route - standalone layout */}
                <Route path="/onboarding/setup" element={
                  <ProtectedRoute>
                    <OnboardingSetup />
                  </ProtectedRoute>
                } />
                
                {/* Admin route - separate layout */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                
                {/* Protected routes */}
                <Route element={
                  <ProtectedRoute>
                    <ShopSettingsProvider>
                      <BrandThemeProvider>
                        <I18nProvider>
                          <NotificationsProvider>
                            <MainLayout />
                          </NotificationsProvider>
                        </I18nProvider>
                      </BrandThemeProvider>
                    </ShopSettingsProvider>
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/repairs" element={<Repairs />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/customer-debts" element={<CustomerDebts />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/profit" element={<Profit />} />
                  <Route path="/warranty" element={<Warranty />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/communaute" element={<Communaute />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/services" element={<Services />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ImpersonationProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
