"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Ripple = { id: number; x: number; y: number; size: number };

export function HeroRipple({ children }: { children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const frame = useRef(0);
  const introduced = useRef(false);
  const lastPulse = useRef(0);
  const reduce = useReducedMotion();
  const filterId = "hero-water-" + useId().replace(/:/g, "");
  const [ripple, setRipple] = useState<Ripple | null>(null);

  function stop() {
    cancelAnimationFrame(frame.current);
    displacement.current?.setAttribute("scale", "0");
    setRipple(null);
  }

  function pulse(clientX?: number, clientY?: number) {
    if (!card.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = performance.now();
    if (now - lastPulse.current < 350) return;
    lastPulse.current = now;
    cancelAnimationFrame(frame.current);
    const rect = card.current.getBoundingClientRect();
    const x = clientX === undefined ? rect.width * .48 : clientX - rect.left;
    const y = clientY === undefined ? rect.height * .42 : clientY - rect.top;
    const size = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) * 2;
    setRipple({ id: now, x, y, size });
    const animate = (time: number) => {
      const progress = Math.min((time - now) / 2100, 1);
      // A short, shallow refraction moves the lettering with the same water pulse.
      const strength = Math.sin(progress * Math.PI) * (1 - progress) * 3.2;
      displacement.current?.setAttribute("scale", strength.toFixed(2));
      if (progress < 1 && !document.hidden) frame.current = requestAnimationFrame(animate);
      else stop();
    };
    frame.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    if (reduce) stop();
    const visibility = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame.current);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reduce]);

  return <motion.div
    ref={card}
    className={"hero-card hero-water-card" + (ripple ? " is-rippling" : "")}
    initial={false}
    whileInView={reduce ? undefined : { opacity: [.45, 1], y: [22, 0] }}
    viewport={{ once: true, amount: .08 }}
    transition={{ duration: .6, ease: [.22, 1, .36, 1] }}
    onViewportEnter={() => { if (!introduced.current) { introduced.current = true; pulse(); } }}
    onViewportLeave={stop}
    onPointerEnter={e => { if (e.pointerType === "mouse") pulse(e.clientX, e.clientY); }}
    onPointerDown={e => { if (e.button === 0) pulse(e.clientX, e.clientY); }}
    onFocusCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) pulse(); }}
  >
    <svg className="hero-water-filter" aria-hidden="true" focusable="false">
      <defs><filter id={filterId} x="-3%" y="-4%" width="106%" height="108%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".009 .018" numOctaves="1" seed="8" result="water" />
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="water" scale="0" xChannelSelector="R" yChannelSelector="G" />
      </filter></defs>
    </svg>
    {ripple && <div key={ripple.id} className="hero-water-rings" aria-hidden="true" style={{
      left: ripple.x, top: ripple.y, "--ripple-size": ripple.size + "px",
    } as CSSProperties}><i /><i /><i /></div>}
    <div className="hero-wave-content" style={ripple ? { filter: `url(#${filterId})` } : undefined}>{children}</div>
  </motion.div>;
}
