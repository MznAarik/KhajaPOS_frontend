/** Subtle top-right card accents inspired by business-admin surfaces. Layer after base gradients when needed. */
export const cardTopRightAccent =
  "radial-gradient(420px 200px at 88% 0%, color-mix(in srgb, var(--primary) 15%, transparent), transparent 66%)";

export const cardTopRightAccentSoft =
  "radial-gradient(380px 180px at 90% 0%, color-mix(in srgb, var(--primary) 9%, transparent), transparent 70%)";

export const cardTopRightAccentFor = (color: string, strength: "soft" | "medium" = "soft") => {
  const alpha = strength === "medium" ? "15%" : "10%";
  const size = strength === "medium" ? "420px 200px at 88% 0%" : "360px 170px at 90% 0%";
  const fade = strength === "medium" ? "66%" : "70%";
  return `radial-gradient(${size}, color-mix(in srgb, ${color} ${alpha}, transparent), transparent ${fade})`;
};
