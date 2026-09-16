import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SLOT_CLASS =
  "h-14 w-11 sm:w-12 mx-1 rounded-xl border border-white/10 bg-white/[0.04] text-xl font-semibold text-white " +
  "transition-all duration-200 first:rounded-xl last:rounded-xl first:border-l " +
  "data-[active=true]:border-[hsla(217,91%,60%,0.6)] data-[active=true]:bg-[hsla(217,91%,60%,0.08)]";

/**
 * Premium 6-digit split code input.
 * Stateless wrapper over `input-otp` — the parent owns the value, so there is
 * no duplicated state and no render loop.
 */
export function OtpInput({ value, onChange, onComplete, disabled, autoFocus }: OtpInputProps) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern="[0-9]*"
      containerClassName="justify-center gap-0"
      aria-label="Code de vérification à 6 chiffres"
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} data-active={undefined} className={SLOT_CLASS} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
