import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, LogIn, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 text-center shadow-lg backdrop-blur-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Compass className="h-7 w-7 text-primary" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          RepairPro
        </p>
        <h1 className="mt-2 text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {location.pathname}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/auth">
              <LogIn className="mr-2 h-4 w-4" />
              Se connecter
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
