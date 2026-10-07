// Deterministic authored tension curve for 88 plies (ply 0..87)
// Range [0, 1]. Drives audio stems, fog adjustments, check intensity, and camera shake.

export const TENSION: number[] = [
  // Ply 0 (starting board)
  0.05,
  // Act I: Ply 1..24 (The Pirc - peaceful to modest tension)
  0.05,
  0.05,
  0.06,
  0.07,
  0.08,
  0.09,
  0.1,
  0.12,
  0.13,
  0.14,
  0.15,
  0.16,
  0.18,
  0.19,
  0.2,
  0.22,
  0.23,
  0.24,
  0.25,
  0.26,
  0.28,
  0.3,
  0.32,
  0.35,
  // Act II: Ply 25..46 (Tension building)
  0.36,
  0.38,
  0.4,
  0.42,
  0.45,
  0.47,
  0.49,
  0.52,
  0.54,
  0.56,
  0.58,
  0.6,
  0.62,
  0.65,
  0.68,
  0.7,
  0.72,
  0.74,
  0.78,
  0.8, // ply 43: 22.Nd5
  0.82,
  0.85, // ply 46: 23...Qd6
  // Act III: Ply 47..48 (The Sacrifice - breathless silence)
  0.08, // ply 47: 24.Rxd4!! (drop to dead silence)
  0.18, // ply 48: 24...cxd4 (heavy impact)
  // Act IV: Ply 49..70 (The Hunt - explosive climbing tension)
  0.65, // ply 49: 25.Re7+
  0.68, // ply 50: 25...Kb6
  0.74, // ply 51: 26.Qxd4+
  0.75, // ply 52: 26...Kxa5
  0.78, // ply 53: 27.b4+
  0.8, // ply 54: 27...Ka4
  0.82, // ply 55: 28.Qc3
  0.84, // ply 56: 28...Qxd5
  0.86, // ply 57: 29.Ra7
  0.87, // ply 58: 29...Bb7
  0.89, // ply 59: 30.Rxb7
  0.9, // ply 60: 30...Qc4
  0.93, // ply 61: 31.Qxf6
  0.94, // ply 62: 31...Kxa3
  0.95, // ply 63: 32.Qxa6+
  0.96, // ply 64: 32...Kxb4
  0.98, // ply 65: 33.c3+
  0.99, // ply 66: 33...Kxc3
  0.99, // ply 67: 34.Qa1+
  0.98, // ply 68: 34...Kd2
  1.0, // ply 69: 35.Qb2+
  0.35, // ply 70: 35...Kd1 (sudden pause, king cornered at d1)
  // Act V: Ply 71..87 (The Silence & Aftermath)
  0.45,
  0.42,
  0.48,
  0.45,
  0.4,
  0.38,
  0.42,
  0.4,
  0.36,
  0.35,
  0.32,
  0.3,
  0.28,
  0.25,
  0.22,
  0.2,
  0.02, // ply 87: 44.Qa7 (resignation, silence)
];

export function getTension(ply: number): number {
  if (ply < 0) return TENSION[0];
  if (ply >= TENSION.length) return TENSION[TENSION.length - 1];
  return TENSION[ply];
}
