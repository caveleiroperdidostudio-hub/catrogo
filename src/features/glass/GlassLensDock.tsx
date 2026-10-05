import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Cápsula de vidro com lente líquida deslizante.
 *
 * A lente é um bloco `overflow: hidden` que contém uma CÓPIA ampliada da
 * camada de ícones (`.glass-dock__world`), alinhada pixel a pixel com a
 * original por transformação. Assim os elementos sob a lente ficam de fato
 * ampliados, deslocados e levemente desfocados, sem alterar o layout real.
 *
 * O deslocamento é uma mola de verdade (integrador massa-mola-amortecedor em
 * requestAnimationFrame), então a lente acelera, desacelera e assenta com um
 * pequeno overshoot elástico — nunca um bezier simétrico e robótico.
 */

const SPRING = { stiffness: 150, damping: 15, mass: 1 };
/** Ampliação dos elementos dentro da lente. */
const MAGNIFY = 1.18;
/** Velocidade (px/s) que satura o achatamento elástico da lente. */
const SQUASH_REF = 1400;
/** Tempo parado em cada posição antes de partir para a próxima. */
const HOLD_MS = 1250;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function GridGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" aria-hidden="true">
      <g fill="currentColor">
        <rect x="3" y="3" width="8" height="8" rx="2.6" />
        <rect x="13" y="3" width="8" height="8" rx="2.6" />
        <rect x="3" y="13" width="8" height="8" rx="2.6" />
        <rect x="13" y="13" width="8" height="8" rx="2.6" />
      </g>
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
      <path
        d="M12 5.6v12.8M5.6 12h12.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DotsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="5.6" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="18.4" cy="12" r="1.9" />
      </g>
    </svg>
  );
}

type SlotDef = { id: string; label: string; variant: string; glyph: React.ReactNode };

const SLOTS: SlotDef[] = [
  { id: "menu", label: "Menu", variant: "glass-dock__slot--grid", glyph: <GridGlyph /> },
  { id: "create", label: "Criar", variant: "glass-dock__slot--plus", glyph: <PlusGlyph /> },
  { id: "more", label: "Mais opções", variant: "glass-dock__slot--round", glyph: <DotsGlyph /> },
];

export function GlassLensDock() {
  const barRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const slotEls = useRef<(HTMLButtonElement | null)[]>([]);
  const targetsRef = useRef<number[]>([]);
  const lensWRef = useRef(0);
  /** posição e velocidade atuais da mola (px / px·s⁻¹) */
  const xRef = useRef(0);
  const vRef = useRef(0);
  const targetRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const resumeAutoAtRef = useRef(0);

  const setSlot = useCallback((i: number, el: HTMLButtonElement | null) => {
    slotEls.current[i] = el;
  }, []);

  const goTo = useCallback((i: number) => {
    const next = targetsRef.current[i];
    if (next !== undefined) targetRef.current = next;
  }, []);

  const dragTo = useCallback((clientX: number) => {
    const bar = barRef.current;
    if (!bar || !lensWRef.current) return;
    const rect = bar.getBoundingClientRect();
    const next = clamp(clientX - rect.left - lensWRef.current / 2, 0, rect.width - lensWRef.current);
    targetRef.current = next;
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = false;
    dragStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragTo(event.clientX);
  }, [dragTo]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    if (Math.abs(event.clientX - dragStartXRef.current) > 4) movedRef.current = true;
    dragTo(event.clientX);
  }, [dragTo]);

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    resumeAutoAtRef.current = performance.now() + HOLD_MS * 2;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const nearest = targetsRef.current.reduce((best, target, index, targets) =>
      Math.abs(target - targetRef.current) < Math.abs(targets[best] - targetRef.current) ? index : best, 0);
    goTo(nearest);
  }, [goTo]);

  /* Mede as posições reais dos elementos para que a lente pare exatamente
     sobre o centro de cada um, em qualquer largura de tela. */
  useLayoutEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      const lens = lensRef.current;
      if (!bar || !lens) return;
      const lensW = lens.offsetWidth;
      if (!lensW) return;
      const max = Math.max(bar.clientWidth - lensW, 0);
      const first = targetsRef.current.length === 0;
      targetsRef.current = slotEls.current.map((el) =>
        el ? clamp(el.offsetLeft + el.offsetWidth / 2 - lensW / 2, 0, max) : 0,
      );
      lensWRef.current = lensW;
      if (first) {
        const start = targetsRef.current[1] ?? 0;
        xRef.current = start;
        targetRef.current = start;
      }
      targetRef.current = clamp(targetRef.current, 0, max);
    };

    measure();
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  /* Mola + deslocamento da lente. */
  useEffect(() => {
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
      last = now;

      if (dt > 0 && lensWRef.current) {
        // sub-passos fixos deixam a mola estável independente do fps
        const steps = Math.max(1, Math.ceil(dt / 0.004));
        const h = dt / steps;
        for (let s = 0; s < steps; s += 1) {
          const a =
            SPRING.stiffness * (targetRef.current - xRef.current) - SPRING.damping * vRef.current;
          vRef.current += (a / SPRING.mass) * h;
          xRef.current += vRef.current * h;
        }

        const lens = lensRef.current;
        const world = worldRef.current;
        if (lens && world) {
          const w = lensWRef.current;
          const stretch = Math.min(Math.abs(vRef.current) / SQUASH_REF, 1);
          const sx = 1 + stretch * 0.06;
          const sy = 1 - stretch * 0.045;
          const x = xRef.current;

          lens.style.transform = `translate3d(${x}px, 0, 0) scale(${sx}, ${sy})`;
          world.style.transformOrigin = `${x + w / 2}px 50%`;
          world.style.transform = `translate3d(${-x}px, 0, 0) scale(${MAGNIFY / sx}, ${MAGNIFY / sy})`;
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Passeio automático: esquerda → centro → direita e de volta. */
  useEffect(() => {
    let index = 1;
    let dir = 1;
    const id = window.setInterval(() => {
      if (draggingRef.current || performance.now() < resumeAutoAtRef.current) return;
      const count = targetsRef.current.length;
      if (count < 2) return;
      index += dir;
      if (index >= count - 1) {
        index = count - 1;
        dir = -1;
      } else if (index <= 0) {
        index = 0;
        dir = 1;
      }
      goTo(index);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [goTo]);

  return (
    <div className="glass-dock-stage">
      <div className="glass-dock" ref={barRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
        <div className="glass-dock__icons">
          {SLOTS.map((slot, i) => (
            <button
              key={slot.id}
              type="button"
              aria-label={slot.label}
              className={`glass-dock__slot ${slot.variant}`}
              ref={(el) => setSlot(i, el)}
              onClick={() => {
                if (movedRef.current) {
                  movedRef.current = false;
                  return;
                }
                goTo(i);
              }}
            >
              {slot.glyph}
            </button>
          ))}
        </div>

        <div className="glass-dock__lens" ref={lensRef} aria-hidden="true">
          <div className="glass-dock__world" ref={worldRef}>
            <div className="glass-dock__icons glass-dock__icons--refracted">
              {SLOTS.map((slot) => (
                <span key={slot.id} className={`glass-dock__slot ${slot.variant}`}>
                  {slot.glyph}
                </span>
              ))}
            </div>
          </div>
          <span className="glass-dock__chroma" />
          <span className="glass-dock__prism" />
          <span className="glass-dock__sheen" />
        </div>
      </div>
    </div>
  );
}

export default GlassLensDock;
