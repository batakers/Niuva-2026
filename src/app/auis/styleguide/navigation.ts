export interface NavItem {
  name: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Foundation",
    items: [
      { name: "Colors", href: "/auis/styleguide#colors" },
      { name: "Surface proof", href: "/auis/styleguide#surface-proof" },
      { name: "Typography v1.0", href: "/auis/styleguide#typography" },
      { name: "Rhythm", href: "/auis/styleguide#rhythm" },
      { name: "Motion", href: "/auis/styleguide#motion-proof" },
    ],
  },
  {
    title: "Design System",
    items: [
      { name: "Architecture v1", href: "/auis/styleguide#architecture" },
      { name: "Core components", href: "/auis/styleguide#components" },
      { name: "P0 components", href: "/auis/styleguide#p0-components" },
      { name: "P1 components", href: "/auis/styleguide#p1-components" },
      { name: "Motion System v1", href: "/auis/styleguide#motion-system" },
      { name: "Patterns", href: "/auis/styleguide#patterns" },
      { name: "Component contracts", href: "/auis/styleguide#registry" },
      { name: "MVP wireframes", href: "/auis/wireframes" },
    ],
  },
  {
    title: "Review",
    items: [
      { name: "Semantic states", href: "/auis/styleguide#semantic-proof" },
      { name: "Contrast", href: "/auis/styleguide#contrast-proof" },
      { name: "Acceptance state", href: "/auis/styleguide#review-state" },
    ],
  },
];
