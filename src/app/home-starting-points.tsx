"use client";

import Image from "next/image";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StartingPath = Readonly<{
  id: string;
  /** Short chip label; `title` stays the full question as the path's heading. */
  label: string;
  title: string;
  description: string;
  action: ReactNode;
  image: string;
  alt: string;
  /** Example bubbles and fact cards laid over the mascot panel. */
  notes: ReactNode;
}>;

const subscribeNothing = () => () => {};

/**
 * Starting points as one chooser: option chips (`aria-pressed`) switch the path text and the mascot
 * panel. Without JavaScript, and before hydration, every path is listed and the chips stay hidden.
 */
export function StartingPoints({ paths }: Readonly<{ paths: readonly StartingPath[] }>) {
  const enhanced = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [active, setActive] = useState(0);
  const panelId = useId();
  return (
    <div className="mt-10 sm:mt-12">
      <div aria-label="Pilih titik mulai" className="flex flex-wrap gap-2" hidden={!enhanced} role="group">
        {paths.map((path, index) => (
          <Button
            aria-controls={panelId}
            aria-pressed={active === index}
            className="hover:bg-brand-50 hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background"
            key={path.id}
            onClick={() => setActive(index)}
            type="button"
            variant="outline"
          >
            {path.label}
          </Button>
        ))}
      </div>
      <div className="mt-6 grid items-center gap-8 sm:mt-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <div aria-live={enhanced ? "polite" : undefined} id={panelId}>
          {paths.map((path, index) => (
            <div className={cn(!enhanced && index > 0 && "mt-12")} hidden={enhanced && active !== index} key={path.id}>
              <h3 className="text-2xl font-medium tracking-[-0.015em] sm:text-3xl">{path.title}</h3>
              <p className="mt-3 max-w-[44ch] text-lead leading-[1.65] text-muted-foreground">{path.description}</p>
              <div className="mt-5">{path.action}</div>
            </div>
          ))}
        </div>
        <div className="relative h-85 overflow-hidden rounded-[var(--radius-media)] bg-brand-100 sm:h-105">
          {paths.map((path, index) => (
            <div
              aria-hidden={active !== index}
              className={cn(
                "absolute inset-0 transition-[opacity,translate] duration-[var(--duration-slow-token)] ease-[var(--ease-emphasis-token)]",
                active === index ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
              )}
              key={path.id}
            >
              <Image alt={path.alt} className="absolute -bottom-2 left-1/2 h-[112%] w-auto -translate-x-1/2 object-contain" height={1400} sizes="(max-width: 1024px) 90vw, 560px" src={path.image} width={1400} />
              {path.notes}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
