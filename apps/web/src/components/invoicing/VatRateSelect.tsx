"use client";

import { VAT_RATE_OPTIONS, formatRate } from "@/lib/invoicing/options";

// Liste fixe des taux de TVA (plus de saisie libre, pour éviter une faute de
// frappe sur une facture). Un taux déjà enregistré hors de la liste reste
// proposé, pour ne jamais le perdre en modifiant une fiche existante.
export default function VatRateSelect({
  value,
  onChange,
  name,
  defaultValue,
  className,
}: {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const current = Number(value ?? defaultValue);
  const options = VAT_RATE_OPTIONS.includes(current) || !Number.isFinite(current)
    ? VAT_RATE_OPTIONS
    : [...VAT_RATE_OPTIONS, current].sort((a, b) => a - b);

  return (
    <select
      name={name}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      aria-label="Taux de TVA"
      className={className}
    >
      {options.map((rate) => (
        <option key={rate} value={String(rate)}>
          {formatRate(rate)}
        </option>
      ))}
    </select>
  );
}
