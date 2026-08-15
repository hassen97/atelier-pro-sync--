import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { SubscriptionPlan } from "@/hooks/useSubscriptionPlans";

interface IndustrialPricingProps {
  plans: SubscriptionPlan[];
  onPlanClick: (planId: string) => void;
}

export function IndustrialPricing({ plans, onPlanClick }: IndustrialPricingProps) {
  return (
    <section id="tarifs" className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <div className="rp-section-head">
          <span className="rp-eyebrow">Plans tarifaires · en dinars</span>
          <h2>
            Des tarifs simples,
            <br />
            un seul standard.
          </h2>
          <p>Pas de frais cachés. Pas de mauvaise surprise.</p>
        </div>
        <div className="rp-plans">
          {plans.map((plan, i) => {
            const features = Array.isArray(plan.features)
              ? plan.features
              : ((plan.features as { display?: string[] })?.display ?? []);
            return (
              <div className={`rp-plan${plan.highlight ? " rp-plan-popular" : ""}`} key={plan.id}>
                <div className="rp-tier">Plan · {String(i + 1).padStart(2, "0")}</div>
                <h3>{plan.name}</h3>
                <div className="rp-plan-desc">{plan.description}</div>
                <div className="rp-price">
                  {plan.price === 0 ? (
                    "0 DT"
                  ) : (
                    <>
                      {plan.price} <small>{plan.currency}</small>
                    </>
                  )}
                </div>
                <div className="rp-per">{plan.period || "par mois"}</div>
                <ul>
                  {features.map((feat: string, j: number) => (
                    <li key={j}>{feat}</li>
                  ))}
                </ul>
                {plan.price === 0 ? (
                  <Link to="/auth?tab=register" className="rp-btn rp-btn-ghost">
                    Démarrer <ArrowRight size={14} />
                  </Link>
                ) : (
                  <button
                    className={`rp-btn ${plan.highlight ? "rp-btn-primary" : "rp-btn-ghost"}`}
                    onClick={() => onPlanClick(plan.id)}
                  >
                    Choisir ce plan <ArrowRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
