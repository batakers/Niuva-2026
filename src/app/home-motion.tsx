"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Visual-only cycling word; the heading keeps its approved accessible name.
 * It runs one pass and settles back on the first (approved) word within five
 * seconds, so the motion ends on its own and needs no pause control (WCAG 2.2.2).
 */
export function HeroStageWord({ words }: Readonly<{ words: readonly string[] }>) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (reduced || words.length < 2) return;
    const stepMs = 4500 / words.length;
    const timers: number[] = [];
    for (let step = 1; step <= words.length; step += 1) {
      timers.push(window.setTimeout(() => setLeaving(true), step * stepMs - 320));
      timers.push(window.setTimeout(() => {
        setIndex(step % words.length);
        setLeaving(false);
      }, step * stepMs));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduced, words.length]);
  const settled = reduced || !leaving;
  return (
    <span
      className={cn(
        "inline-block font-semibold transition-[opacity,translate] duration-300 ease-[var(--ease-emphasis-token)]",
        settled ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {words[reduced ? 0 : index]}
    </span>
  );
}

/** A fact card that drifts with scroll at its own depth. */
export function DriftCard({ children, className, depth }: Readonly<{ children: ReactNode; className?: string; depth: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    const onScroll = () => {
      node.style.transform = `translate3d(0, ${(-window.scrollY * 0.12 * depth).toFixed(1)}px, 0)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [depth, reduced]);
  return <div ref={ref} className={className}>{children}</div>;
}

/** The hero mascot leans a little toward the pointer. */
export function LeaningMascot({ alt, src, className }: Readonly<{ alt: string; src: string; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 14;
      const y = (event.clientY / window.innerHeight - 0.5) * 8;
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);
  // Position lives on the outer box; the pointer transform only touches the inner one.
  // The greeting bob plays twice (4.8 s) and then rests, keeping idle motion under five seconds.
  return (
    <div className={className}>
      <div ref={ref} className="h-full transition-transform duration-500 ease-[var(--ease-emphasis-token)]">
        <Image
          alt={alt}
          className="h-full w-auto max-w-none object-contain drop-shadow-xl motion-safe:animate-[niuva-bob_2.4s_ease-in-out_2]"
          height={1400}
          preload
          sizes="(max-width: 768px) 90vw, 680px"
          src={src}
          width={1400}
        />
      </div>
    </div>
  );
}

export type ProcessStage = Readonly<{
  title: string;
  description: string;
  image: string;
  alt: string;
  bust?: boolean;
}>;

/** Sticky process scene: the mascot pose follows the stage nearest the middle of the screen. */
export function ProcessScene({ heading, stages }: Readonly<{ heading: ReactNode; stages: readonly ProcessStage[] }>) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    // Without IntersectionObserver the first stage simply stays visible.
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.stage));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const node of refs.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="grid gap-0 lg:grid-cols-2 lg:gap-10">
      <div className="px-5 pb-10 sm:px-10 lg:py-18 lg:pr-0 lg:pl-16">
        {heading}
        <ol className="mt-2">
          {stages.map((stage, index) => (
            <li
              key={stage.title}
              ref={(node) => { refs.current[index] = node; }}
              data-stage={index}
              aria-current={active === index ? "step" : undefined}
              className="flex min-h-[52vh] flex-col justify-center border-l-2 border-border pl-7 transition-colors duration-300 aria-[current=step]:border-brand-700 lg:min-h-[62vh]"
            >
              <h3 className="text-3xl font-medium tracking-[-0.02em] sm:text-4xl">{stage.title}</h3>
              <p className="mt-2.5 max-w-[40ch] text-lead leading-[1.6] text-muted-foreground">{stage.description}</p>
            </li>
          ))}
        </ol>
      </div>
      <div
        aria-hidden="true"
        className="sticky top-19 z-10 order-first m-3 h-[40vh] overflow-hidden rounded-[var(--radius-card)] bg-[radial-gradient(80%_70%_at_50%_40%,var(--neutral-50)_0%,var(--brand-100)_60%,var(--brand-200)_100%)] lg:order-none lg:top-24 lg:m-6 lg:ml-0 lg:h-[calc(100vh-7.5rem)]"
      >
        {stages.map((stage, index) => (
          <Image
            key={stage.image}
            alt=""
            className={cn(
              "absolute left-1/2 w-auto -translate-x-1/2 object-contain drop-shadow-lg transition-[opacity,translate,scale] duration-500 ease-[var(--ease-emphasis-token)]",
              stage.bust ? "bottom-0 h-[52%]" : "bottom-[8%] h-[76%]",
              active === index ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.97] opacity-0",
            )}
            height={1400}
            sizes="(max-width: 1024px) 70vw, 560px"
            src={stage.image}
            width={1400}
          />
        ))}
      </div>
    </div>
  );
}
