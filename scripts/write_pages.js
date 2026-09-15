const fs = require('fs');

const resetContent = `import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft, Send, AtSign, CheckCircle, Phone, MessageCircle, Loader2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "admin_whatsapp")
      .single()
      .then(({ data }) => {
        if (data && (data as any).value) setAdminWhatsapp((data as any).value);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername && !trimmedEmail) {
      setError("Veuillez saisir votre nom d'utilisateur ou votre adresse e-mail");
      return;
    }

    if (trimmedUsername && trimmedUsername.length < 3) {
      setError("L'identifiant doit contenir au moins 3 caractères");
      return;
    }

    if (trimmedEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmedEmail)) {
      setError("Veuillez saisir une adresse e-mail valide");
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from("password_reset_requests" as any)
        .insert({ 
          username: trimmedUsername || trimmedEmail, 
          phone: trimmedPhone || null 
        } as any)
        .catch(() => {});

      await supabase.functions
        .invoke("send-password-reset", {
          body: {
            username: trimmedUsername || undefined,
            identifier: trimmedUsername || trimmedEmail,
            email: trimmedEmail || (trimmedUsername.includes("@") ? trimmedUsername : undefined),
            phone: trimmedPhone || undefined,
            origin: window.location.origin,
            redirectTo: \\\`\\\${window.location.origin}/update-password\\\`,
          },
        })
        .catch(() => {});

      setSuccess(true);
    } catch {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };
`;
