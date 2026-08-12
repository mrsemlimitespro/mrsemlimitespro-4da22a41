/**
 * Estilo "Particles Soft" — chuva sutil de brilhos subindo pela tela.
 * Fixo, atrás de tudo, com blend-mode leve — dá vida sem competir com o conteúdo.
 */
export function SoftParticles({ count = 30 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    >
      {particles.map((i) => {
        const left = (i * 37) % 100;
        const size = 2 + (i % 4);
        const duration = 8 + (i % 7);
        const delay = (i * 0.4) % 8;
        const hue = [
          "rgba(255,120,220,0.9)",
          "rgba(120,180,255,0.9)",
          "rgba(180,255,220,0.9)",
          "rgba(255,220,180,0.9)",
        ][i % 4];
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              bottom: "-20px",
              width: size,
              height: size,
              background: hue,
              boxShadow: `0 0 ${size * 3}px ${hue}`,
              animation: `soft-rise ${duration}s linear ${delay}s infinite`,
              opacity: 0,
            }}
          />
        );
      })}
      <style>{`
        @keyframes soft-rise {
          0%   { transform: translateY(0);     opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
