---
version: "1.2-design-closure"
name: Niuva
description: "Dari Ide Menjadi Produk Nyata"

colors:
  niuva-blue: "#6390BB"
  brand-action: "#3F607F"
  primary-hover: "#344F67"
  primary-pressed: "#2B4053"
  blue-paper: "#E8F1F8"
  blue-mist: "#B4CFE0"
  blue-ink: "#1F2E3B"
  cool-paper: "#F8FAFC"
  paper-white: "#FFFFFF"
  quiet-surface: "#F1F5F9"
  line-slate: "#E2E8F0"
  muted-slate: "#475569"
  working-slate: "#1E293B"
  dark-line: "#334155"
  graphite: "#0F172A"
  success: "#166534"
  success-surface: "#F0FDF4"
  success-border: "#16A34A"
  warning: "#92400E"
  warning-surface: "#FFFBEB"
  warning-border: "#B45309"
  info: "#1D4ED8"
  info-surface: "#EFF6FF"
  info-border: "#2563EB"
  destructive: "#B91C1C"
  destructive-surface: "#FEF2F2"
  destructive-border: "#DC2626"

typography:
  status: "approved v1.0; foundation/styleguide only; product propagation paused"
  fallbackPolicy:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-011-FALLBACK-POLICY"
    approvedAt: "2026-09-21"
    approvalEvidence: "Owner approved the documented fallback recommendation in conversation"
    primaryStack: "Space Grotesk, Arial, Helvetica, sans-serif"
    hierarchy: "preserve size, weight, line-height, letter-spacing, and spacing as fallback metrics allow"
    metricAdjustment: "NOT APPLICABLE for current scope; future use is DEFERRED until named proof demonstrates wrapping or readability drift"
    fontSizeAdjust: "NOT APPLICABLE for current scope; future use is DEFERRED until named proof"
    excludedSubstitutes: ["Inter", "SF Pro"]
    scope: "foundation/styleguide typography policy; product propagation and runtime font-loading are separate evidence gates"
  primary:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    usage: "UI, body, product, and data"
  editorialAccent:
    fontFamily: "Fraunces, Georgia, serif"
    usage: "5–10%; standalone editorial statement or quote only"
    fontSize: "28px / 32px / 36px"
    fontWeight: 500
    lineHeight: "35px / 39px / 43px"
    letterSpacing: "-0.01em"
    fontStyle: "normal Roman"
    opticalSizing: "auto"
    loadedAxes: ["opsz"]
    excludedAxes: ["SOFT", "WONK"]
    italic: "off in core v1"
  scalePolicy:
    anchor: "16px"
    ratio: 1.25
    rounding: "optical rounding to 2px/4px steps"
  responsiveSteps:
    compact: "0–639px"
    standard: "640–1279px"
    wide: ">=1280px"
  display:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "40px / 48px / 60px"
    fontWeight: 600
    lineHeight: "43px / 51px / 63px"
    letterSpacing: "-0.03em / -0.035em / -0.04em"
  heading:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "30px / 36px / 40px"
    fontWeight: 600
    lineHeight: "36px / 42px / 46px"
    letterSpacing: "-0.02em / -0.025em / -0.03em"
  subheading:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "22px / 24px / 24px"
    fontWeight: 600
    lineHeight: "29px / 31px / 31px"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
    measure: "55–70ch"
  uiData:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0"
    numerals: "tabular"
  technicalException:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.05em"
    casing: "uppercase only for 1–3 word micro-labels"
  weightPolicy:
    core: [400, 500, 600]
    exceptional: 700
    excluded: [300]

rounded:
  control: "0.5rem"
  card: "0.75rem"
  media: "1rem"
  pill: "9999px"

spacing:
  card: "1rem"
  card-compact: "0.75rem"
  content: "1.5rem"
  section: "4rem"
  section-wide: "5rem"
  gutter-compact: "1.25rem"
  gutter-standard: "2rem"
  public-container: "72rem"
  reading-container: "48rem"
  admin-container: "90rem"

components:
  button-primary:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-001"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    decisionScope: "default color pair only; interaction states and implementation authorization excluded"
    approvedAt: "2026-09-21"
    approvalEvidence: "Owner selected A after static A/B preview in conversation"
    selectedColorOption: "a"
    backgroundColor: "{colors.brand-action}"
    textColor: "{colors.paper-white}"
    colorOptions:
      a:
        backgroundColor: "{colors.brand-action}"
        textColor: "{colors.paper-white}"
        origin: "inherited frontmatter"
      b:
        backgroundColor: "{colors.niuva-blue}"
        textColor: "{colors.graphite}"
        origin: "inherited narrative"
    typography: "{typography.uiData}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
    minHeight: "2.75rem"
    height: "auto"
    width: "content-driven"
    geometry:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-006-PRIMARY"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner selected the 44px primary button proposal after size comparison"
      scope: "default labelled primary button only; other controls and runtime acceptance excluded"
      visibleHeight: "minimum 44px at 16px root; grows with wrapping"
      horizontalPadding: "16px per side at 16px root"
      hitArea: "matches visible button bounds"
      radius: "{rounded.control}"
      typography: "{typography.uiData}"
      responsiveOverflow: "APPROVED behavior: wrap without truncation or shrinking; max-width container; runtime verification pending"
      responsiveDecisionRef: "DS-DEC-006-REFLOW"
      verticalPadding: "12px per side at 16px root"
    visualStates:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-VISUAL"
      approvedAt: "2026-09-21"
      scope: "primary button static appearance on white and working-slate; not runtime acceptance"
      approvalEvidence: "Owner accepted the six-state Space Grotesk preview in conversation"
      hover:
        backgroundColor: "{colors.primary-hover}"
        textColor: "{colors.paper-white}"
      pressed:
        backgroundColor: "{colors.primary-pressed}"
        textColor: "{colors.paper-white}"
        translateY: "1px"
      focusVisible:
        ringColor: "{colors.niuva-blue}"
        ringWidth: "3px"
        separatorColor: "{colors.paper-white}"
        separatorWidth: "2px"
      loading:
        backgroundColor: "{colors.brand-action}"
        textColor: "{colors.paper-white}"
        label: "Memproses…"
        indicator: "spinner; 800ms linear per revolution; static in reduced motion"
      disabled:
        backgroundColor: "{colors.line-slate}"
        textColor: "{colors.muted-slate}"
        opacity: 1
    interactionBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-BEHAVIOR"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner approved the primary button interaction behavior in conversation"
      scope: "documented keyboard, loading, disabled, precedence, reduced motion, and recovery behavior; not runtime verification"
      specificationRef: "Components / Buttons / Interaction behavior"
      loadingDetails:
        decisionStatus: "APPROVED"
        decisionRef: "DS-DEC-003-LOADING"
        approvedAt: "2026-09-21"
        approvalEvidence: "Owner approved stable width, retained focus, announcements, retry, and actual-process duration in conversation"
        scope: "primary button loading behavior; implementation and assistive-technology verification excluded"
        width: "stable when label changes to Memproses…; no fixed width token selected"
        focus: "retained on button during loading"
        repeatActivation: "blocked while busy"
        announcements: "announce processing, then actual success or failure"
        failure: "restore actionable button with a relevant recovery message"
        duration: "actual process duration; no artificial minimum"
        implementationDetails: "APPROVED policy: expose one adjacent role=status region with aria-live=polite and aria-atomic=true; visible label stays Memproses…; spinner is decorative; no fixed width token; retain intrinsic width within the containing surface; implementation and runtime checks are evidence-only"
      timing:
        decisionStatus: "APPROVED"
        decisionRef: "DS-DEC-012-PRIMARY"
        approvedAt: "2026-09-21"
        approvalEvidence: "Owner approved the standalone HTML animation preview in conversation"
        scope: "primary button timing only; application runtime not verified"
        hoverAndReturn: "150ms"
        pressedEntryColor: "100ms"
        pressedEntryTranslation: "100ms"
        releaseColor: "150ms"
        releaseTranslation: "100ms"
        easing: "cubic-bezier(0.2, 0, 0, 1)"
        focusRing: "immediate"
        spinnerPeriod: "800ms"
        spinnerEasing: "linear"
        reducedMotion: "immediate color changes; no translation or spinner rotation"
  button-outline:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-003-SECONDARY-VISUAL"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    approvedAt: "2026-09-21"
    approvalEvidence: "Owner accepted the static outline/ghost preview in conversation"
    scope: "white surface; default, hover, pressed colors and displayed size only"
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.uiData}"
    rounded: "{rounded.control}"
    minHeight: "44px"
    horizontalPadding: "16px per side"
    borderColor: "{colors.muted-slate}"
    borderWidth: "1px"
    hover:
      backgroundColor: "{colors.quiet-surface}"
    pressed:
      backgroundColor: "{colors.line-slate}"
    additionalVisualStates:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-SECONDARY-STATES"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the static outline/ghost focus, loading and disabled preview"
      scope: "white surface only; static appearance, not interaction or timing"
      focusVisible:
        ringColor: "{colors.niuva-blue}"
        ringWidth: "3px"
        separatorColor: "{colors.paper-white}"
        separatorWidth: "2px"
      loading:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.graphite}"
        indicatorColor: "{colors.graphite}"
        label: "Memproses…"
        border: "same as default variant"
      disabled:
        backgroundColor: "{colors.quiet-surface}"
        textColor: "{colors.muted-slate}"
        borderColor: "{colors.line-slate}"
        borderWidth: "1px"
        opacity: 1
    interactionBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-SECONDARY-BEHAVIOR"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the standalone outline/ghost interactive preview"
      scope: "action buttons on white surface; timing and behavior only"
      keyboard: "native button; Tab focus; Enter/Space activation"
      hoverAndRelease: "150ms"
      pressedColor: "100ms"
      pressedTranslation: "none"
      easing: "cubic-bezier(0.2, 0, 0, 1)"
      focusRing: "immediate"
      spinnerPeriod: "800ms"
      spinnerEasing: "linear"
      loading: "default colors; stable dimensions and retained focus; block repeat activation; announce processing and actual result"
      failure: "restore actionable button and relevant retry guidance"
      loadingDuration: "actual process; no artificial minimum"
      disabled: "no action or hover/press response"
      precedence: "disabled or busy overrides hover/press; focus ring persists while focused"
      reducedMotion: "immediate color changes; no spinner rotation"
      navigation: "use link semantics for navigation"
      verification: "8 local preview scenarios across 2 viewport widths; no screen-reader or application-runtime verification"
    responsiveBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-006-SECONDARY-REFLOW"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the outline/ghost responsive preview after 27 cases"
      scope: "labelled outline and ghost action buttons on white surface; responsive geometry and label behavior only"
      minHeight: "44px"
      verticalPadding: "12px per side"
      horizontalPadding: "16px per side"
      hitArea: "follows visible bounds; minimum 44px"
      labelWrapping: "wrap at word boundaries; no truncation, ellipsis, or font shrinking"
      width: "bounded by the content container; a single button remains content-driven"
      actionGroup: "stack vertically and become full-width when natural widths plus gap do not fit; preserve order"
      loading: "reserve normal/loading label space; no size shift in an unchanged container"
      gap: "12px in preview only; not a token"
      zoom: "preview checked at 100%, 150%, and 200%; runtime zoom verification pending"
      verification: "27 local preview cases across 220px, 320px, and 620px widths and 100%, 150%, and 200% text scale; no screen-reader or application-runtime verification"
    closedDetails: "On-dark controls do not receive an automatic inverse variant; use a named surface contract. Loading announcement follows the shared role=status policy. Application verification is evidence-only"
  button-ghost:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-003-SECONDARY-VISUAL"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    approvedAt: "2026-09-21"
    approvalEvidence: "Owner accepted the static outline/ghost preview in conversation"
    scope: "white surface; default, hover, pressed colors and displayed size only"
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.uiData}"
    rounded: "{rounded.control}"
    minHeight: "44px"
    horizontalPadding: "16px per side"
    borderWidth: "0px"
    hover:
      backgroundColor: "{colors.quiet-surface}"
    pressed:
      backgroundColor: "{colors.line-slate}"
    additionalVisualStates:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-SECONDARY-STATES"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the static outline/ghost focus, loading and disabled preview"
      scope: "white surface only; static appearance, not interaction or timing"
      focusVisible:
        ringColor: "{colors.niuva-blue}"
        ringWidth: "3px"
        separatorColor: "{colors.paper-white}"
        separatorWidth: "2px"
      loading:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.graphite}"
        indicatorColor: "{colors.graphite}"
        label: "Memproses…"
        border: "same as default variant"
      disabled:
        backgroundColor: "{colors.paper-white}"
        textColor: "{colors.muted-slate}"
        borderWidth: "0px"
        opacity: 1
    interactionBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-003-SECONDARY-BEHAVIOR"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the standalone outline/ghost interactive preview"
      scope: "action buttons on white surface; timing and behavior only"
      keyboard: "native button; Tab focus; Enter/Space activation"
      hoverAndRelease: "150ms"
      pressedColor: "100ms"
      pressedTranslation: "none"
      easing: "cubic-bezier(0.2, 0, 0, 1)"
      focusRing: "immediate"
      spinnerPeriod: "800ms"
      spinnerEasing: "linear"
      loading: "default colors; stable dimensions and retained focus; block repeat activation; announce processing and actual result"
      failure: "restore actionable button and relevant retry guidance"
      loadingDuration: "actual process; no artificial minimum"
      disabled: "no action or hover/press response"
      precedence: "disabled or busy overrides hover/press; focus ring persists while focused"
      reducedMotion: "immediate color changes; no spinner rotation"
      navigation: "use link semantics for navigation"
      verification: "8 local preview scenarios across 2 viewport widths; no screen-reader or application-runtime verification"
    responsiveBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-006-SECONDARY-REFLOW"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner accepted the outline/ghost responsive preview after 27 cases"
      scope: "labelled outline and ghost action buttons on white surface; responsive geometry and label behavior only"
      minHeight: "44px"
      verticalPadding: "12px per side"
      horizontalPadding: "16px per side"
      hitArea: "follows visible bounds; minimum 44px"
      labelWrapping: "wrap at word boundaries; no truncation, ellipsis, or font shrinking"
      width: "bounded by the content container; a single button remains content-driven"
      actionGroup: "stack vertically and become full-width when natural widths plus gap do not fit; preserve order"
      loading: "reserve normal/loading label space; no size shift in an unchanged container"
      gap: "12px in preview only; not a token"
      zoom: "preview checked at 100%, 150%, and 200%; runtime zoom verification pending"
      verification: "27 local preview cases across 220px, 320px, and 620px widths and 100%, 150%, and 200% text scale; no screen-reader or application-runtime verification"
    closedDetails: "On-dark controls do not receive an automatic inverse variant; use a named surface contract. Loading announcement follows the shared role=status policy. Application verification is evidence-only"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    interactionPolicy:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-CARD-INTERACTION"
      default: "static grouped content"
      actionable: "one explicit action boundary or whole-card link"
      nestedInteractive: "disallowed"
      scope: "card interaction boundary, anatomy baseline, and state ownership are final; implementation and route proof are evidence-only"
    patternOwnership: "route-owned; no generic Apple tile variant"
    stickyPolicy: "not default; requires named layout proof for viewport and keyboard collision"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.625rem 0.75rem"
    height: "2.75rem"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    shape: "rectangular control radius; never pill by default"
    width: "full-width within the containing surface"
    searchPolicy: "named route or use case required; inherit input contract; no global pill/icon/clear-button variant"
    statusPolicy: "label, help, error, pending, and recovery remain associated with the field; one adjacent role=status region uses aria-live=polite and aria-atomic=true for dynamic feedback"
    hitTarget: "minimum 44px for interactive input/search/file-upload; visual field height is 44px with 10px vertical and 12px horizontal padding"
    hitTargetDecisionRef: "DS-DEC-006-CONTROLS"
    geometryGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-006-CONTROL-GEOMETRY-GATE"
      approvedAt: "2026-09-21"
      visualGeometry: "field height 44px, padding 10px 12px, and optional icon box 20px are final defaults"
      proof: "touch, keyboard, zoom, and narrow-screen proof"
      scope: "field geometry decision is final; runtime and implementation checks are evidence-only"
  badge-outline:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-002"
    decisionScope: "general badge and technical label typography only; geometry and implementation excluded"
    approvedAt: "2026-09-21"
    approvalEvidence: "Owner accepted the Space Grotesk badge typography preview in conversation"
    geometryStatus: "APPROVED; label reflow and compact geometry are final"
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.uiData}"
    casing: "sentence case"
    technicalLabel:
      typography: "{typography.technicalException}"
      usage: "technical markers only; uppercase 1–3 words"
    inheritedTypography: "{typography.technicalException}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
    height: "auto; minimum 24px"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    interaction: "noninteractive label/status by default; promotion to chip/button requires a separate contract"
    overflowPolicy: "word wrap and height growth; no truncation, ellipsis, font shrinking, or horizontal spill"
    hitTargetPolicy: "NOT APPLICABLE while noninteractive; actionable chip/button follows DS-DEC-006-CONTROLS"
    responsiveBehavior:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-BADGE-REFLOW"
      approvedAt: "2026-09-21"
      approvalEvidence: "Owner selected Candidate A after the badge responsive preview"
      scope: "general status badge label wrapping and container containment only"
      labelWrapping: "wrap at word boundaries; no truncation, ellipsis, or font shrinking"
      height: "grows to fit the wrapped label"
      overflow: "badge stays inside its containing surface; no horizontal spill"
      technicalLabels: "remain technicalException uppercase 1–3 word labels; longer status uses the general badge role"
      padding: "4px vertical and 8px horizontal"
      maxWidth: "100% of the containing surface"
      verification: "Owner accepted the local Candidate A preview; no screen-reader or application-runtime verification"
  evidence-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
    mediaPolicy:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-007-MEDIA-POLICY"
      evidenceBoundaryRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
      productRender: "contain; preserve product/CAD detail; no crop by default"
      documentaryPhoto: "cover; focal point must remain controllable"
      ratioPolicy: "evidence-specific; no global ratio"
      exactGeometry: "NOT APPLICABLE as a global ratio; route-specific geometry is DEFERRED"
      geometryGate:
        decisionStatus: "APPROVED"
        decisionRef: "DS-DEC-007-MEDIA-GEOMETRY-GATE"
        requirement: "choose exact ratio and crop only through proof with representative licensed assets"
        productDefault: "contain; preserve product/CAD detail"
        documentaryDefault: "cover; retain controllable focal point"
        disallowedDefaults: "Apple ratios/crops, 21:9, 16:9, 1:1, product shadow, or CDN behavior copied without proof"
        scope: "media role and default loading policy are final; route-specific ratio/crop/source proof is evidence-only"
    interactionPolicyRef: "DS-DEC-008-CARD-INTERACTION"
  option-chip:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-008-OPTION-CHIP"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    evidenceBoundaryRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
    role: "interactive selection control; separate from badge"
    semantics: "native button semantics"
    hitTargetDecisionRef: "DS-DEC-006-CONTROLS"
    hitTarget: "minimum 44px interactive target"
    implementationGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-IMPLEMENTATION"
      approvedAt: "2026-09-21"
      scope: "styleguide-only implementation proof; product-screen propagation and official promotion are separate gates"
      source: "src/components/niuva/option-chip.tsx"
      showcase: "/auis/styleguide#option-chip-proof"
    geometryGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-006-CONTROL-GEOMETRY-GATE"
      approvedAt: "2026-09-21"
      visualGeometry: "actionable chip geometry requires proof"
      proof: "touch, keyboard, zoom, and narrow-screen proof"
      scope: "geometry decision is final; runtime acceptance and product propagation are separate evidence gates"
    visualGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-VISUAL-GATE"
      approvedAt: "2026-09-21"
      stateCue: "selected and unavailable must remain distinguishable without color alone"
      separation: "option chip remains distinct from noninteractive badge"
      proof: "keyboard focus, grayscale/contrast, representative content, and narrow-screen reflow proof"
      scope: "visual token and cue decision is final; runtime acceptance and product propagation are separate evidence gates"
    interactionGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-INTERACTION-GATE"
      approvedAt: "2026-09-21"
      keyboard: "native button; Tab enters; Enter/Space activates"
      focusRetention: "focus remains on the selected chip after activation; any movement requires a documented flow"
      stateCommunication: "selected/unavailable state must be exposed through semantic state or status, not visual-only treatment"
      unavailable: "must not activate"
      proof: "keyboard traversal/activation, focus retention, state announcement, assistive technology, and reflow proof"
      scope: "interaction state and announcement decision is final; runtime acceptance and product propagation are separate evidence gates"
    visualDecision:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-VISUAL"
      approvedAt: "2026-09-21"
      selectedCandidate: "B"
      surface: "{colors.paper-white}"
      defaultBorder: "quiet outline using {colors.line-slate}"
      selected: "strong {colors.brand-action} outline, check marker, and inset underline cue"
      unavailable: "{colors.quiet-surface} with {colors.muted-slate} text and an explicit unavailable label"
      nonColorCue: "check marker, underline cue, and explicit unavailable label"
      rationale: "Candidate B makes state legible without relying on color alone and explains unavailable choices explicitly"
      scope: "visual state, token mapping, and anatomy are final; runtime acceptance and product propagation are separate evidence gates"
    visualAcceptance:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-VISUAL-ACCEPTANCE"
      approvedAt: "2026-09-22"
      surface: "/auis/styleguide#option-chip-proof"
      evidence: "Owner accepted the actual styleguide preview for selected, unavailable, and narrow-screen reflow states"
      scope: "named styleguide proof only; screen-reader/runtime acceptance, product propagation, and official promotion are separate evidence gates"
    anatomyGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-ANATOMY-GATE"
      approvedAt: "2026-09-21"
      radius: "{rounded.control}"
      minHeight: "44px"
      padding: "0.5rem 0.75rem"
      marker: "18px circular check marker"
      labelWrapping: "wrap at word boundaries; no truncation, ellipsis, or font shrinking"
      width: "content-driven within the containing surface; no horizontal spill"
      reflow: "preserve source order and wrap the group on narrow screens"
      scope: "anatomy and geometry are final: 8px gap, explicit labels, and no thumbnail/price inside the chip; runtime acceptance and product propagation are separate evidence gates"
    reflowGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-REFLOW-GATE"
      approvedAt: "2026-09-21"
      behavior: "wrap in source order; no horizontal scroll, truncation, or font shrinking"
      labelBehavior: "unavailable labels may wrap but must remain explicit"
      target: "preserve minimum 44px interactive target"
      focusOrder: "preserve DOM/source order through reflow"
      proofContent: "real Niuva labels and representative selected/unavailable combinations"
      proofWidths: "220px, 280px, and 320px narrow frames before runtime implementation"
      scope: "reflow policy is final: 8px group gap, wrap at container width, preserve source order, and never scroll horizontally; runtime/assistive-technology acceptance and product propagation are separate evidence gates"
    announcementPolicy:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-ANNOUNCEMENT"
      approvedAt: "2026-09-21"
      stateChange: "selected/unavailable state is exposed through semantic state on the same control interaction"
      announcement: "concise label plus state; no duplicate live announcement for a state already exposed by the control"
      blockedActivation: "unavailable does not activate; a reason is announced only when it adds meaningful recovery context"
      downstreamChange: "announce one adjacent status only when selection causes a material downstream change"
      focus: "announcement must not move focus away from the activated chip"
      proof: "keyboard, focus retention, state announcement, and assistive-technology proof"
      proofEvidence:
        status: "VERIFIED"
        decisionRef: "DS-DEC-008-OPTION-CHIP-AT-PROOF"
        checkedAt: "2026-09-22"
        method: "scoped Playwright Chromium acceptance preview on /auis/styleguide"
        passed: "native button elements; role/name queries resolve the controls; aria-pressed and disabled state are exposed; Space activation updates selected state and status; focus remains on the activated chip; unavailable state does not activate; one adjacent status region is present; no horizontal overflow at the named narrow proof widths; no console errors"
        notProven: "cross-browser interoperability, physical screen-reader speech/output, touch-device behavior, and product-route runtime"
        styleguideProof:
          status: "VERIFIED"
          checkedAt: "2026-09-22"
          method: "Playwright Chromium browser smoke on /auis/styleguide at desktop, 390px, and the named narrow reflow frame"
          passed: "OptionChip renders in the scoped styleguide showcase; ABS starts selected; Resin is disabled with an explicit unavailable label; Space selects PLA and focus remains on PLA; material price status updates; option-chip proof has no horizontal overflow; narrow reflow frame is visible"
          notProven: "cross-browser/physical screen-reader interoperability, touch-device behavior, and product runtime acceptance"
      scope: "announcement policy is final: native button state is authoritative; use one concise adjacent role=status region only for material downstream changes; scoped styleguide browser evidence is VERIFIED; broader interoperability and product propagation remain separate gates"
    runtimeAcceptanceGate:
      decisionStatus: "APPROVED"
      decisionRef: "DS-DEC-008-OPTION-CHIP-RUNTIME-AT-GATE"
      evidenceBoundaryRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
      approvedAt: "2026-09-21"
      requiredEvidence: "actual screen-reader/browser pair in the approved runtime or an explicitly scoped acceptance preview"
      cases: "keyboard entry and activation, selected state, unavailable state, focus retention, concise announcement, material downstream status, and narrow-screen reflow"
      passCriteria: "state is perceivable, announcement is not duplicated, focus remains predictable, unavailable cannot activate, and no target or label overflow occurs"
      scope: "acceptance criteria are final; scoped styleguide browser/semantics evidence is VERIFIED, while broader interoperability and product propagation remain separate gates"
      currentEvidence:
        status: "VERIFIED"
        checkedAt: "2026-09-22"
        finding: "The dedicated styleguide-only OptionChip implementation passes the scoped Chromium/browser acceptance preview for semantics, keyboard activation, focus retention, unavailable behavior, downstream status, and narrow reflow"
        sources: "src/components/niuva/option-chip.tsx; src/app/auis/styleguide/components/option-chip-showcase.tsx; src/app/auis/styleguide/registry/components.json"
    selectedState: "Final: selected uses a check marker plus inset underline; label remains the option name and native aria-pressed=true communicates state"
    unavailableState: "Final: unavailable uses quiet surface, muted text, disabled semantics, and the explicit label Tidak tersedia"
    scope: "role, behavior, visual direction, anatomy, token mapping, state copy, proof gates, and styleguide-only implementation permission are final; runtime/assistive-technology acceptance and product propagation are separate evidence gates"
  footer:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-009-FOOTER-POLICY"
    wideLayout: "grouped content in multiple columns when content supports it"
    compactLayout: "stack content groups in reading order"
    legalRow: "separate legal/support row"
    sticky: "not default"
    decorativeTreatment: "no frosted or parchment treatment"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    density: "content-driven; grouped columns on wide and reading-order stack on compact"
    scope: "structure, surface, typography, spacing, and responsive policy are final; route-specific legal content and implementation evidence are separate"
  text-link:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-010-LINK-POLICY"
    lightColor: "{colors.brand-action}"
    darkColor: "{colors.paper-white}"
    semantics: "native link semantics"
    inlineCue: "persistent non-color cue such as underline"
    focusVisible: "Niuva Blue 3px ring with a 2px paper-white separator where the surface needs separation; offset 2px; no layout shift"
    disabledNavigation: "not applicable; omit unavailable destination or explain state"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    pillOrButton: "not a default link treatment"
    scope: "role, context, visited behavior, cue, and component anatomy are final; runtime and implementation evidence are separate"
  top-navigation:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-004-NAVIGATION-GEOMETRY-GATE"
    role: "primary orientation and access to primary paths"
    evidenceBoundaryRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
    smallScreen: "wrapped row for small link sets; labels visible; order preserved"
    wideScreen: "return to inline layout when space supports it"
    overflow: "horizontal scroll not default"
    disclosure: "conditional only when the link set grows and wrapping harms scanability"
    contractBaselineRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    geometryGate: "height 64px wide and 56px compact; horizontal padding 24px wide and 16px compact; active route uses a 2px Niuva Blue underline; sticky is off by default; wrapped row is the compact behavior"
    scope: "navigation geometry, active cue, and responsive behavior are final; keyboard/runtime proof is evidence-only"
  sub-navigation:
    specificationStatus: "COMPLETE"
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-015-MVP-DESIGN-SCOPE"
    relevance: "NOT APPLICABLE for the current Niuva MVP and AUiS styleguide"
    currentNeed: "no named Niuva route or link set requires a separate sub-navigation"
    futureRule: "reopen only for a named route or link set with proof and an explicit decision"
    appleTreatment: "NOT APPLICABLE; do not adopt frosted, glass, or blur treatment"
    scope: "current scope only; future route-specific navigation remains a separate decision"

layout:
  compact: "0–639px"
  standard: "640–1279px"
  wide: ">=1280px"
  grid-wide: "12 columns"
  public-container: "72rem"
  reading-container: "48rem"
  admin-container: "90rem"
  content-measure: "55–70ch"
  geometryPolicy:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-005-LAYOUT-GEOMETRY-GATE"
    evidenceBoundaryRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
    containerTokens: "72rem public; 48rem reading; 90rem admin"
    gutters: "1.25rem compact; 2rem standard and wider"
    compact: "readable stack"
    wide: "12-column composition when content supports it"
    twoColumn: "only when both columns remain readable without overflow"
    proofGate: "exact spans, minimum card width, inter-column gutter, sticky collision, and density require named layout proof"
    scope: "container, gutter, stack, and wide-grid policy are final; route-specific spans and runtime proof are evidence-only"

elevation:
  flat: "none"
  card-quiet: "0 1px 2px rgb(15 23 42 / 0.06)"
  floating: "0 16px 32px rgb(15 23 42 / 0.12), 0 2px 8px rgb(15 23 42 / 0.08)"
  focus: "shared 3px focus ring; exact composited value not repeated in the source DESIGN.md"
  focusPolicy:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-012-FOCUS-MOTION-BASELINE"
    approvedAt: "2026-09-21"
    requirement: "every interactive control must expose clearly visible focus-visible"
    ring: "shared 3px visible ring; composition may adapt to the active surface"
    contrast: "must remain discernible against the active surface"
    scope: "focus composition, recovery, and reduced-motion policy are final; runtime proof is evidence-only"

motion:
  status: "Motion System v1 approved for styleguide-only scope"
  feedback: "active controls translate downward by 1px; color transitions use the component policy below"
  reducedMotion: "required; remove non-essential translation and rotation while preserving state and status information"
  timingPolicy:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-012-FOCUS-MOTION-BASELINE"
    componentSpecific: "shared default color transition 150ms and press translation 100ms; a component may shorten to immediate for status changes but may not add layout motion"
    reducedMotion: "remove non-essential movement; preserve immediate state and status changes"
    scope: "cross-component motion policy is final; runtime proof is evidence-only"
  runtimeEngine: "CSS-first transitions and keyframes; no JavaScript motion engine is required"

metadata:
  documentationStatus: "current-scope design decisions closed; evidence, route proof, and implementation records remain separately classified"
  decisionStatus: "APPROVED: DS-DEC-018-DESIGN-DECISION-CLOSURE closes every current-scope Owner design choice for Niuva MVP and the current AUiS styleguide on 2026-09-22; no current-scope design decision remains unresolved"
  defaultValueStatus: "APPROVED when named by DS-DEC-018; inherited values are provenance only and never override the closure"
  usageScope: "design documentation; implementation authorization remains separate"
  decisionRegister: "Known Gaps and Evidence Follow-ups / Decision Register"
  primarySource: "local working-tree DESIGN.md reviewed before this revision"
  structureReference: "C:/Users/FAIZ/Downloads/DESIGN.md; Apple-design-analysis alpha"
  supplementalSources:
    - "existing Niuva design-system governance recorded in the source DESIGN.md"
  implementationAudit: "not performed for this documentation-only task"
  scopeBoundary:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-015-MVP-DESIGN-SCOPE"
    approvedAt: "2026-09-22"
    authority: "Owner decision"
    finalScope: "Niuva MVP and the current AUiS styleguide"
    appleReference: "structure comparison only; Apple treatments not needed by Niuva are NOT APPLICABLE"
    productPropagation: "SEPARATE GATE; styleguide approval does not authorize product-screen propagation"
    reopenRule: "reopen only for a named Niuva route or use case with proof and an explicit decision"
  componentContractBaseline:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-016-COMPONENT-CONTRACT-BASELINE"
    approvedAt: "2026-09-22"
    controls:
      targetPolicy: "all actionable targets are at least 44px; icon-only controls use a 44px by 44px area; labelled control hit area follows the visible bounds"
      input: "rectangular 8px control, 44px minimum height, 10px vertical and 12px horizontal padding, line-slate 1px border, full-width within its container"
      search: "a named route or use case must justify a search variant; it inherits the input contract and does not create a global pill, icon, or clear-button pattern"
      fileUpload: "dashed boundary communicates upload affordance; domain requirements own file type, privacy, progress, retry, error, and retention states"
      status: "loading and result status are concise and non-duplicative; visible label is Memproses…; one adjacent role=status region uses aria-live=polite and aria-atomic=true; spinner is decorative"
      onDark: "no automatic inverse control variant; on-dark treatment uses a named surface contract"
    badge:
      role: "compact noninteractive label or status summary; interactive selection uses a separate chip/button contract"
      labels: "general status uses sentence case; technical label uses uppercase 1–3 words"
      reflow: "wrap at word boundaries, grow height, and remain inside the containing surface; no truncation, ellipsis, font shrinking, or horizontal spill"
      exactGeometry: "4px vertical and 8px horizontal padding, 24px minimum height, 100% container max-width, pill radius, and semantic color families are final"
    navigation:
      primary: "small link sets use a visible wrapped row in source order; horizontal scroll is not default"
      disclosure: "conditional only when a larger link set makes wrapping harm scanability"
      subNavigation: "NOT APPLICABLE for the current MVP/styleguide scope under DS-DEC-015"
      proofBoundary: "active route, exact geometry, sticky behavior, and disclosure policy are final; keyboard/focus/runtime proof is evidence-only"
    cardAndPatterns:
      card: "static grouped content by default; actionable card uses one explicit action boundary or one whole-card link; nested interactive controls are disallowed"
      ownership: "action queue, product discovery, checkout summary, and editorial patterns are route-owned contracts, not generic Apple tile variants"
      sticky: "sticky summary or action treatment is not default and requires named layout proof for viewport and keyboard collision"
      proofBoundary: "patterns are route-owned; checkout summary is in-flow by default, floating sticky bar is NOT APPLICABLE for current scope, and route proof is DEFERRED"
    footerAndLinks:
      footer: "grouped columns when space supports them, compact stack in reading order, separate legal/support row, content-driven density"
      footerTreatment: "not sticky by default; no frosted, parchment, or Apple-specific density treatment"
      links: "native link semantics; light links use brand-action, dark links use paper-white, and inline cue remains visible without color alone"
      proofBoundary: "visited links retain their color and persistent underline; no dedicated dark-link token is needed; long labels wrap; runtime/implementation proof is evidence-only"
    scope: "policy baseline only; the exact component defaults are finalized by DS-DEC-018; implementation acceptance, assistive-technology acceptance, product propagation, and production/provider gates remain separate"
  decisionClosure:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-018-DESIGN-DECISION-CLOSURE"
    approvedAt: "2026-09-22"
    authority: "Owner decision after Batch A, Batch B, and Batch C review"
    finalScope: "Niuva MVP and the current AUiS styleguide"
    unresolvedCurrentScope: []
    closureRule: "Every current-scope design choice has a fixed APPROVED or NOT APPLICABLE outcome. Missing proof does not reopen a design choice; it is recorded as UNVERIFIED, DEFERRED, or SEPARATE GATE."
    uxRationale: "Stable defaults prevent repeated design debate, while evidence labels prevent technical or visual proof from being mistaken for runtime, route, provider, or production acceptance."
    foundation:
      typography: "Space Grotesk, Arial, Helvetica, sans-serif; no metric adjustment or font-size-adjust in current scope; font-loading verification is UNVERIFIED evidence"
      focus: "Niuva Blue 3px ring, paper-white 2px separator where needed, 2px offset, and no layout shift"
      motion: "CSS-first; color transition 150ms, press translation 100ms, active translation 1px, spinner 800ms linear; reduced motion removes movement and rotation"
    controls:
      labelled: "44px minimum height, 12px vertical and 16px horizontal padding, 8px radius, content-driven width, word-boundary wrapping, and vertical full-width stacking when the group cannot fit"
      input: "44px minimum height, 10px vertical and 12px horizontal padding, 16px/24px body text, 1px line-slate border, 8px radius, and full-width layout"
      iconOnly: "44px by 44px hit area, 20px icon, 8px radius by default, accessible name required, and no circular or overlay treatment by default"
      loading: "aria-busy=true on the busy control, one adjacent role=status region with aria-live=polite and aria-atomic=true, visible Memproses… label, decorative spinner, retained focus, and no fixed width token"
      onDark: "no automatic inverse; use a named surface contract"
    badge:
      geometry: "pill radius, 24px minimum height, 4px vertical and 8px horizontal padding, max-width 100% of the containing surface, and word-boundary wrapping"
      semantics: "noninteractive by default; sentence-case general status; uppercase technical labels limited to 1–3 words; no truncation, ellipsis, shrinking, or spill"
      variants: "success, info, warning, and destructive use the corresponding semantic text, surface, and border families"
    optionChip:
      geometry: "8px radius, 44px minimum height, 8px vertical and 12px horizontal padding, 18px marker, 8px marker/group gap, content-driven width, source-order wrapping, and no horizontal scroll"
      selected: "quiet outline plus brand-action check marker and inset underline; native aria-pressed=true"
      unavailable: "quiet-surface, muted-slate text, native disabled semantics, and explicit label Tidak tersedia"
      anatomy: "option name only; thumbnail, price, and downstream status remain adjacent content, never nested inside the chip"
      evidence: "visual acceptance APPROVED; scoped Chromium/browser structural and runtime/AT evidence VERIFIED; broader interoperability remains a separate gate"
    cardAndPatterns:
      card: "paper-white, graphite, 12px radius, 16px padding, quiet elevation or line-slate border when separation is needed, static by default, one action boundary or whole-card link, no nested interactive controls"
      patterns: "action queue, product discovery, checkout summary, and editorial patterns remain route-owned; checkout summary is in-flow by default; floating sticky bar and Apple tile variants are NOT APPLICABLE for current scope"
    navigationAndLayout:
      topNavigation: "working-slate surface, paper-white text, dark-line divider, uiData 14px/20px, 64px wide height, 56px compact height, 24px/16px horizontal padding, active route marked by a 2px Niuva Blue underline, wrapped compact row, no default sticky or horizontal scroll"
      subNavigation: "NOT APPLICABLE for current scope"
      containers: "72rem public, 48rem reading, 90rem admin; 1.25rem compact and 2rem standard/wide gutters; compact readable stack; wide 12-column grid; exact route spans are route-owned and DEFERRED"
    media:
      role: "product/CAD contain; workshop/process photography cover with controllable focal point; no global aspect-ratio token"
      loading: "below-fold media lazy-loads; the primary above-fold visual may load eagerly when it is the route LCP"
      appleTreatment: "Apple ratio, crop, product shadow, and CDN behavior are NOT APPLICABLE defaults"
    footerAndLinks:
      footer: "cool-paper surface, graphite text, grouped columns when width supports them, reading-order stack on compact, up to three content groups, separate legal/support row, no sticky/frosted/parchment treatment"
      links: "native links; light brand-action, dark paper-white, persistent underline, visited keeps the same role, long labels wrap, disabled navigation is omitted or explained rather than styled as a dead link"
    scopeClassification:
      approved: "Current Niuva design defaults and component policies"
      notApplicable: "Apple-only treatment, decorative gradient, sub-navigation, floating sticky bar, editorial quote card, and product-tile micro-variants without a named Niuva need"
      unverified: "Runtime, screen-reader, device-touch, and application evidence not executed in this documentation pass"
      deferred: "Named route layout/media proof and future functional gradient use"
      separateGate: "Product propagation, provider activation, deployment, and production acceptance"
    reopenRule: "Only a new named Niuva need, route, or evidence contradiction may create a new decision; it must receive a new decisionRef and may not silently change this closure"
  evidenceBoundary:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-017-EVIDENCE-BOUNDARY"
    approvedAt: "2026-09-22"
    levels:
      documentation: "DESIGN.md/YAML records intent and scope; it does not prove rendered UI or runtime behavior"
      localTechnical: "tests, DOM semantics, Chromium Accessibility Tree, browser smoke, and no-overflow checks are technical evidence and may remain PARTIAL"
      visualAcceptance: "Owner accepts a named preview or named route at a declared scope; acceptance does not promote the component or authorize product propagation"
      runtimeAssistiveTechnology: "actual browser and screen-reader pair must verify keyboard entry, focus, state announcement, unavailable behavior, and recovery in the approved runtime"
      productRoute: "named product route with representative content must pass responsive, keyboard/focus, semantics, recovery, media, and no-overflow checks before propagation can be considered"
      providerProduction: "provider activation, production runtime, deployment, and operational acceptance are separate gates"
    optionChip:
      styleguideVisual: "APPROVED for /auis/styleguide#option-chip-proof on 2026-09-22"
      localStructural: "VERIFIED for the named Chromium/browser acceptance preview; native button, pressed/disabled state, keyboard interaction, focus retention, status update, and narrow reflow are evidenced"
      runtimeAssistiveTechnology: "VERIFIED for the scoped styleguide browser/semantics acceptance preview; cross-browser/physical screen-reader speech/output, touch-device behavior, and product runtime remain separate gates"
      productPropagation: "SEPARATE GATE; styleguide proof is not product-route proof"
    layoutMedia:
      status: "DEFERRED; named route proof is a later evidence gate, not an unresolved design choice"
      minimumViewports: "at least one compact frame (320px or 390px), one standard frame (768px), and one wide frame (1280px); route proof may add a narrower or wider case"
      requiredChecks: "reading order, action order, no horizontal overflow, target separation, keyboard focus, zoom/text scaling where relevant, media role/crop, loading, and recovery"
      mediaRule: "product/CAD contain and workshop/process photo cover remain the Niuva policy; exact ratio/crop/loading are selected only from representative licensed assets"
    productRoutes:
      status: "SEPARATE GATE"
      candidateRoutes: ["homepage", "project-brief", "checkout", "admin"]
      requiredEvidence: "named route, representative content, responsive proof, keyboard/focus, semantic states, recovery, and route-specific media/layout evidence"
      currentProof:
        status: "VERIFIED technical evidence; PENDING OWNER VISUAL ACCEPTANCE"
        routes: ["/", "/project-brief"]
        viewports: [320, 390, 768, 1280]
        source: "docs/frontend/product-route-proof.md"
        test: "tests/e2e/product-route-proof.spec.ts"
        passed: "responsive rendering, landmark/heading and control semantics, keyboard/focus, form recovery, representative media boundary, and no horizontal overflow"
      propagation: "no product-screen propagation is authorized by this evidence policy alone"
    scope: "evidence and acceptance policy only; no new token, component default, product propagation, provider activation, or production approval"
  functionalGradientPolicy:
    decisionStatus: "APPROVED"
    decisionRef: "DS-DEC-013-GRADIENT-GATE"
    gate: "DEFERRED; no candidate or token until a named functional need and proof exist"
    allowedExamples: "data visualization or media mask only when a real use case is documented"
    currentScope: "NOT APPLICABLE for Niuva MVP and the current AUiS styleguide"
    futureUse: "DEFERRED until a named functional need, proof, and separate decision exist"
    decorativeTreatment: "NOT APPLICABLE through DS-DEC-014"
    scope: "current scope is closed as NOT APPLICABLE; future use is DEFERRED until a named need exists"
---

# Design System: Niuva

## Overview

**Creative North Star: "The Precision Workshop"**

Niuva memperlakukan interface seperti meja kerja design-engineering: tenang
untuk diperiksa, terstruktur untuk ditindaklanjuti, dan cukup spesifik untuk
menunjukkan bagaimana ide menjadi produk. Foundation light-first menyediakan
work surface yang terbuka; dark working zones dipakai secara eksplisit untuk
positioning dan process. Niuva Blue menjadi sinyal terukur untuk identitas,
action, focus, dan emphasis, bukan warna dekoratif yang memenuhi layar.

Suara visualnya quiet, precise, human, dan evidence-led. Karakter berasal dari
hierarchy, process markers, technical metadata, dan artefak nyata. Sistem ini
menolak generic SaaS composition, card grid tanpa alasan, gradient dekoratif,
glassmorphism, neon/glow, decorative blobs, oversized pills, dan unmotivated
3D.

**Key Characteristics:**

- Light-first surfaces dengan deliberate dark working zones.
- Measured Niuva Blue di atas cool paper, slate, dan graphite.
- Structured asymmetric grids yang menjaga reading path dan action path.
- Space Grotesk sebagai suara utama dengan Fraunces sebagai editorial accent
  yang terbatas.
- Evidence, process, outcome, dan next decision mendahului technology spectacle.
- Public, checkout, dan admin berbagi identitas tetapi mempertahankan density
  serta kebutuhan motion yang berbeda.

**The Evidence Before Ornament Rule.** Setiap motif harus membantu pengguna
memahami capability, process, decision, atau state yang nyata.

Bahasa desain diterapkan dengan volume berbeda. Public pages dapat lebih
ekspresif dan narrative-led; checkout/payment harus predictable; admin harus
operational dan mudah dipindai. Perbedaan itu tidak membuat tiga identitas:
palette, typography, shape roles, focus, dan semantic states tetap sama.

### Reading the Specification

Dokumen ini adalah rancangan desain yang dapat berkembang. Perbedaan dari Git
HEAD atau implementasi lama bukan kesalahan dengan sendirinya. Referensi Apple
menjadi pembanding struktur dan kedalaman, bukan instruksi atau keputusan Niuva.

| Dimensi | Nilai | Arti |
|---|---|---|
| Kelengkapan | `COMPLETE`, `PARTIAL`, `NOT DOCUMENTED` | Seberapa jauh spesifikasi tertulis; tidak menyatakan approval |
| Keputusan | `INHERITED`, `CANDIDATE`, `APPROVED`, `NOT APPLICABLE` | Nilai warisan, usulan, keputusan final, atau treatment yang dikecualikan dari scope |
| Evidence | `VERIFIED`, `UNVERIFIED`, `DEFERRED`, `SEPARATE GATE` | Bukti runtime/route/device belum dijalankan, belum menjadi scope, atau berada di gate lain; status ini tidak membuka kembali keputusan desain |
| Relevansi | `APPLICABLE`, `DEFERRED`, `NOT APPLICABLE` | Dipakai sekarang, ditunda hingga named need/proof, atau tidak diadopsi |
| Scope | Named proof / styleguide / named product surface | Tempat keputusan boleh digunakan menurut approval terkait |

Nilai tanpa status khusus adalah `INHERITED`, bukan otomatis `APPROVED`.
`COMPLETE` berarti cukup terdokumentasi untuk cakupan yang disebutkan, bukan
siap produksi. Pernyataan approval warisan perlu ditelusuri lewat Appendix A;
revisi ini tidak memperluas approval tersebut. Setelah `DS-DEC-018`, tidak ada
keputusan desain current-scope yang menunggu pilihan. `UNVERIFIED`, `DEFERRED`,
dan `SEPARATE GATE` hanya menjelaskan bukti atau scope; ketiganya tidak boleh
diubah menjadi token, implementasi, atau propagasi tanpa keputusan baru.
Nilai YAML `null` berarti belum dipilih dan tidak boleh diterjemahkan menjadi
nilai CSS atau fallback otomatis. YAML ini spesifikasi dokumentasi, bukan
konfigurasi runtime siap konsumsi.

## Decision Closure — DS-DEC-018

Owner menutup seluruh pilihan desain untuk Niuva MVP dan AUiS styleguide pada
2026-09-22. Rekomendasi berikut menjadi default final karena mengurangi beban
kognitif, menjaga keterbacaan, dan mencegah pola Apple yang tidak relevan masuk
ke sistem Niuva.

| Area | Keputusan final | Alasan UX |
|---|---|---|
| Controls | 44px target; labelled control 12px/16px padding; input 44px dengan 10px/12px; icon-only 44×44px; wrap dan stack saat perlu | Target sentuh lebih mudah, label panjang tetap terbaca, dan urutan tindakan tetap jelas pada layar sempit |
| Loading | Focus dipertahankan; `aria-busy`; satu adjacent `role=status` dengan `aria-live=polite`; label “Memproses…”; spinner dekoratif | Pengguna mendapat feedback tanpa kehilangan konteks atau menerima pengumuman ganda |
| Badge | Minimum 24px, padding 4px/8px, pill, max-width 100%, wrap pada batas kata; technical label uppercase 1–3 kata | Status panjang tidak terpotong dan technical metadata tetap mudah dipindai |
| Option chip | Candidate B: quiet outline, check marker, underline, 8px gap, 44px target, native selected/disabled semantics; thumbnail/price di luar chip | State terbaca tanpa mengandalkan warna dan control tetap mudah dipilih pada touch/keyboard |
| Card/pattern | Card static, satu action boundary, tanpa nested interactive; checkout summary in-flow; patterns route-owned | Menghindari konflik klik dan mempertahankan hierarki yang sesuai tugas |
| Navigation/layout | Dark nav 64px wide/56px compact, wrapped compact row, active underline 2px, 72/48/90rem containers, compact readable stack | Primary paths tetap terlihat tanpa scroll tersembunyi dan layout tidak memaksa komposisi Apple |
| Media | Product/CAD `contain`; process photo `cover` dengan focal point; lazy below fold; eager hanya untuk LCP; tidak ada global ratio | Detail produk tidak terpotong dan foto tetap bercerita tanpa asumsi crop yang salah |
| Focus/motion | Niuva Blue 3px + separator paper-white 2px + offset 2px; CSS-first; 150ms color, 100ms press; reduced motion menghapus gerakan | Focus mudah ditemukan, feedback terasa cepat, dan kebutuhan aksesibilitas tetap dihormati |
| Links/footer | Native links, brand-action/paper-white, underline persisten; footer cool-paper/graphite, grouped wide, reading-order compact stack, legal/support terpisah | Affordance link tidak bergantung pada warna dan pembacaan footer tetap linear |
| Scope exclusions | Apple-only treatment, decorative gradient, sub-navigation, floating sticky bar, editorial quote card, dan tile micro-variants `NOT APPLICABLE` | Menghindari kompleksitas yang tidak membantu MVP atau AUiS saat ini |

Status setelah closure: keputusan desain current-scope `APPROVED` atau `NOT
APPLICABLE`; runtime/AT `UNVERIFIED`, named route/media proof `DEFERRED`, dan
product/provider/production `SEPARATE GATE`. Status tersebut menyatakan batas
bukti atau scope, bukan pertanyaan desain yang belum dijawab.

## Colors

Palette Niuva adalah cool industrial scale. Brand blue membawa identitas dan
action; paper, slate, dan graphite membentuk surface yang dapat diperiksa pada
public, checkout, dan admin contexts.

### Brand & Accent

| Token | Value | Peran | Penggunaan dan batasan |
|---|---|---|---|
| `{colors.niuva-blue}` | `#6390BB` | Locked identity accent | Logo, focus, selected emphasis, dan brand signal yang terukur; bukan wash dekoratif |
| `{colors.brand-action}` | `#3F607F` | Approved primary default fill and light link role | Primary button dengan paper-white text: pilihan A, `DS-DEC-001`; light text-link role disetujui melalui `DS-DEC-010-LINK-POLICY` |
| `{colors.blue-paper}` | `#E8F1F8` | Light brand surface | Entry paths, grouped action area, atau secondary surface dengan hubungan brand |
| `{colors.blue-mist}` | `#B4CFE0` | Structural brand cue | Border, divider, subdued emphasis, dan supporting brand treatment |
| `{colors.blue-ink}` | `#1F2E3B` | Deep brand surface | High-contrast grounded emphasis dan explicit dark brand context |

**The Measured Accent Rule.** Niuva Blue mendapat perhatian melalui kelangkaan
dan penempatan. Ia menandai tindakan atau informasi penting, bukan mewarnai
setiap surface.

### Surface

| Token | Value | Peran | Penggunaan dan batasan |
|---|---|---|---|
| `{colors.cool-paper}` | `#F8FAFC` | Default light canvas | Page background dan open work surface |
| `{colors.paper-white}` | `#FFFFFF` | Clean content surface | Card, form, dan content surface pada light context |
| `{colors.quiet-surface}` | `#F1F5F9` | Muted grouping surface | Low-emphasis grouping dan control background |
| `{colors.working-slate}` | `#1E293B` | Dark working surface | Focused process, navigation, atau operational context |
| `{colors.graphite}` | `#0F172A` | Deepest neutral | Primary text dan deepest dark surface bila context menetapkannya |

Dark surface adalah explicit context change, bukan automatic theme. Dark mode
counterpart untuk setiap component tidak boleh diasumsikan dari keberadaan
`working-slate` atau `graphite`.

### Text

| Foreground | Background | Contrast | Penggunaan |
|---|---|---:|---|
| `{colors.graphite}` | `{colors.cool-paper}` | 17.06:1 | Primary text pada page canvas |
| `{colors.graphite}` | `{colors.paper-white}` | 17.85:1 | Primary text pada card/content surface |
| `{colors.muted-slate}` | `{colors.paper-white}` | 7.58:1 | Secondary copy dan metadata |
| `{colors.brand-action}` | `{colors.paper-white}` | 6.58:1 | Brand link/action text pada light surface |
| `{colors.paper-white}` | `{colors.working-slate}` | 14.63:1 | Primary copy pada dark working surface |

Contrast values di atas dihitung dari frontmatter untuk membantu dokumentasi;
opacity, overlay, anti-aliasing, focus ring, border, dan photography context
tetap perlu diukur pada proof aktual.

### Hairlines & Borders

| Token | Value | Peran |
|---|---|---|
| `{colors.line-slate}` | `#E2E8F0` | Light dividers, card boundaries, dan control borders |
| `{colors.dark-line}` | `#334155` | Divider/border pada dark working surface |
| `{colors.blue-mist}` | `#B4CFE0` | Brand-related structural cue; jangan menggantikan semantic state border |
| `{colors.success-border}` | `#16A34A` | Accepted/completed boundary |
| `{colors.warning-border}` | `#B45309` | Attention/confirmation boundary |
| `{colors.info-border}` | `#2563EB` | Informational/progress boundary |
| `{colors.destructive-border}` | `#DC2626` | Error/invalid/destructive boundary |

Semantic state menggunakan foreground, pale surface, dan border sebagai satu
keluarga. State harus tetap mempunyai label atau explanation; warna bukan
satu-satunya pembeda.

### Brand Gradient

Niuva tidak memiliki brand-gradient token. Decorative gradients dilarang oleh
arah visual terbaru karena atmosphere harus datang dari evidence, process, dan
material yang nyata. Decorative gradient, blur, dan depth treatment khas Apple
ditetapkan `NOT APPLICABLE` oleh `DS-DEC-014`. Untuk scope Niuva MVP dan AUiS
styleguide saat ini, functional gradient juga `NOT APPLICABLE`; tidak ada
kandidat atau token. `DS-DEC-013-GRADIENT-GATE` hanya membuka kembali pembahasan
secara kondisional setelah ada named functional need dan proof, misalnya data
visualization atau media mask, dengan keputusan terpisah.

## Typography

### Font Family

- **Primary:** Space Grotesk dengan fallback Arial, Helvetica, sans-serif untuk
  display, heading, body, UI, product, dan data.
- **Editorial accent:** Fraunces dengan fallback Georgia, serif; terbatas sekitar
  5–10% untuk standalone statement atau quote.
- **Mono policy:** tidak ada third mono family pada Typography System v1.0.
  Technical micro-label tetap memakai Space Grotesk.

Space Grotesk menjaga operational UI tetap direct dan engineered. Fraunces
memberi editorial pause tanpa mengubah controls, price, status, atau data
menjadi dekorasi.

### Hierarchy

Ukuran responsif ditulis `compact / standard / wide` untuk `0–639px /
640–1279px / >=1280px`.

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---:|---|---|---|
| `{typography.display}` | `40px / 48px / 60px` | 600 | `43px / 51px / 63px` | `-0.03em / -0.035em / -0.04em` | Primary public display dan major positioning statement |
| `{typography.heading}` | `30px / 36px / 40px` | 600 | `36px / 42px / 46px` | `-0.02em / -0.025em / -0.03em` | Major section heading |
| `{typography.subheading}` | `22px / 24px / 24px` | 600 | `29px / 31px / 31px` | `-0.015em` | Subsection dan component-group heading |
| `{typography.body}` | `16px` | 400 | `24px` | `0` | Default narrative dan operational copy; measure `55–70ch` |
| `{typography.uiData}` | `14px` | 500 | `20px` | `0` | Controls, product data, status metadata; tabular numerals |
| `{typography.editorialAccent}` | `28px / 32px / 36px` | 500 | `35px / 39px / 43px` | `-0.01em` | Standalone editorial statement/quote only |
| `{typography.technicalException}` | `12px` | 500 | `18px` | `0.05em` | Uppercase 1–3 word technical micro-label only |

### Principles

- Scale memakai 16px anchor, ratio 1.25, dan optical rounding ke langkah 2px/4px.
- Core weights adalah 400/500/600; 700 exceptional; 300 excluded.
- Display dan headings memakai tighter tracking sesuai tabel, bukan tracking
  bebas per halaman.
- Body tetap 16/24; jangan menggantinya dengan angka referensi Apple.
- UI/data memakai tabular numerals untuk price, quantity, dan operational data.
- Fraunces memakai normal Roman, optical sizing `opsz`, tanpa `SOFT`, `WONK`,
  atau core italic pada v1.
- Uppercase, tracking, axis variation, dan editorial family harus menjelaskan
  hierarchy atau meaning, bukan menjadi decoration.

**The Human-First Type Rule.** Typography treatment harus membantu reading,
scanning, atau action. Jangan memakai family/axis sebagai hiasan.

### Note on Font Substitutes

Fallback Niuva sudah ditetapkan dalam frontmatter dan disetujui melalui
`DS-DEC-011-FALLBACK-POLICY`. Space Grotesk turun ke Arial, Helvetica, lalu
generic sans-serif. Fraunces turun ke Georgia lalu generic serif. SF Pro dan
Inter bukan substitute resmi Niuva dan tidak ditambahkan oleh dokumen ini.

Bila primary web font gagal dimuat, hierarchy harus tetap bertahan melalui size,
weight, line-height, letter-spacing, dan spacing yang sama sejauh metric fallback
memungkinkan. Metric adjustment dan `font-size-adjust` tidak dipakai pada current
scope; keduanya hanya dapat dibuka melalui keputusan baru setelah named proof
menunjukkan drift pada wrapping atau readability.

Nilai adjustment dan `font-size-adjust` sengaja ditiadakan untuk current scope;
metric adjustment hanya dapat dibuka lewat keputusan baru jika future evidence
membuktikan drift. Runtime font-loading verification dan izin implementasi
adalah evidence/separate gates.

## Layout

### Spacing System

| Token | Value | Use |
|---|---|---|
| `{spacing.card-compact}` | `0.75rem` | Compact operational card/panel internal spacing |
| `{spacing.card}` | `1rem` | Default card and component-group spacing |
| `{spacing.content}` | `1.5rem` | Related narrative, proof, dan action groups |
| `{spacing.section}` | `4rem` | Default large section rhythm |
| `{spacing.section-wide}` | `5rem` | Wide-screen section expansion |
| `{spacing.gutter-compact}` | `1.25rem` | Small-screen horizontal page padding |
| `{spacing.gutter-standard}` | `2rem` | Horizontal page padding from standard layouts upward |

- Section padding dimulai dari 4rem dan berkembang ke 5rem pada wide layout.
- Default card padding 1rem; compact operational cards dapat memakai 0.75rem.
- Related content memakai 1.5rem gap; tight component groups memakai 1rem.
- Primary button memakai tinggi minimum 2.75rem/44px dan padding horizontal
  1rem/16px per sisi (`DS-DEC-006-PRIMARY`). Lebar mengikuti isi.
- Outline/ghost kini disetujui terpisah: minimum height 44px, padding vertikal
  12px, dan padding horizontal 16px per sisi. Input memakai 44px minimum
  height, padding 10px/12px, 1px line-slate border, dan 8px radius. Search
  serta file-upload mewarisi kontrak ini; runtime/device proof adalah evidence
  terpisah.
- Nilai spacing yang tidak tercantum bukan token permanen. Gunakan composition
  proof sebelum menambahkan langkah baru.

### Grid & Container

| Role | Value | Use |
|---|---|---|
| `{layout.public-container}` | `72rem` | Public narrative, capability, dan entry paths |
| `{layout.reading-container}` | `48rem` | Focused reading dan long-form explanation |
| `{layout.admin-container}` | `90rem` | Dense operational/admin work surface |
| `{layout.grid-wide}` | `12 columns` | Large-screen asymmetric composition |

`DS-DEC-005-LAYOUT-GEOMETRY-GATE` menetapkan token container dan gutter yang ada
sebagai dasar composition. Narrative dan proof dapat memakai two-column
relationship; entry paths dapat memakai 12-column composition pada large layouts.
Small screens collapse ke readable stacks. Two-column hanya aktif bila kedua
kolom tetap terbaca dan tidak menimbulkan overflow.

Exact column spans, minimum card width, inter-column gutter, sticky collision,
dan density detail dipilih hanya melalui named layout proof. Nilai tersebut
belum menjadi global token.

### Whitespace Philosophy

Whitespace memberi ruang untuk membaca evidence dan menemukan next action,
tetapi tidak boleh menyembunyikan status, price, validation, atau operational
work. Public pages dapat memakai section rhythm lebih lapang; checkout dan admin
menjaga density yang mendukung scanning. Space sebelum heading harus membangun
hierarchy; space setelah heading menjaga hubungan heading dengan content.

Niuva tidak mengadopsi aturan satu-viewport-per-section dari referensi Apple.
Height mengikuti content, task, dan proof yang tersedia.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat / tonal | No shadow; surface change atau border | Default page regions, controls, dan grouping yang tidak meninggalkan document plane |
| Card quiet | `{elevation.card-quiet}` | Reusable evidence dan operational cards yang membutuhkan pemisahan lembut |
| Floating | `{elevation.floating}` | Temporary overlays dan elevated process previews |
| Focus | Niuva Blue 3px ring, paper-white 2px separator where needed, 2px offset, no layout shift | Keyboard focus pada every interactive element |

Depth pertama-tama datang dari tonal layering, restrained rings, dan borders.
Sistem tidak sepenuhnya shadowless, tetapi shadow harus menjelaskan hierarchy
atau behavior. Card quiet tidak boleh dipakai sekadar mengisi composition yang
kosong; floating shadow hanya untuk elemen yang benar-benar meninggalkan flow.

**The Flat-By-Default Rule.** Surface harus memperoleh elevation karena fungsi,
bukan karena kebutuhan dekoratif.

Focus-visible adalah baseline lintas komponen melalui
`DS-DEC-012-FOCUS-MOTION-BASELINE`. Setiap interactive control harus memiliki
focus indicator yang tetap terlihat terhadap surface aktif; ring Niuva Blue 3px
dengan separator paper-white 2px dan offset 2px adalah final baseline. Runtime
proof per komponen adalah evidence terpisah.

### Decorative Depth

- Gradient dekoratif, glassmorphism, neon, glow, dan decorative blobs dilarang.
- Dark working zones menciptakan context change melalui warna, bukan fake depth.
- Real product, process, material, dan workshop imagery boleh membawa depth
  alami yang memang ada dalam evidence.
- Product-image shadow khusus seperti referensi Apple adalah `NOT APPLICABLE`
  melalui `DS-DEC-014`; real product imagery tetap boleh membawa depth alami
  yang memang ada dalam evidence.
- Backdrop blur/frosted glass adalah `NOT APPLICABLE` melalui `DS-DEC-014` dan
  bukan bagian dari vocabulary Niuva saat ini.

## Motion

Motion Niuva memberi feedback yang restrained dan tetap mengikuti contract
komponen. Timing primary melalui `DS-DEC-012-PRIMARY` menjadi shared default
untuk interactive feedback; status changes tetap langsung.

**`DS-DEC-012-FOCUS-MOTION-BASELINE` — APPROVED untuk policy lintas komponen.**

- Setiap interactive control wajib mengekspos `focus-visible` yang jelas dan
  dapat dibedakan dari surface aktif.
- Ring 3px dengan separator paper-white 2px dan offset 2px adalah baseline
  shared; focus tetap pada control yang diaktifkan kecuali navigasi memerlukan
  transfer ke heading/status recovery.
- Timing lintas komponen memakai color 150ms dan press translation 100ms;
  component dapat memilih durasi lebih singkat untuk status langsung, tetapi
  tidak boleh menambah motion layout.
- Pada reduced motion, hilangkan translasi, rotasi, dan gerakan non-esensial;
  perubahan state serta informasi status tetap tersedia secara langsung.
- Runtime motion engine tidak diperlukan: CSS-first adalah keputusan final.
  Runtime dan assistive-technology proof adalah evidence terpisah.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.control}` | `0.5rem` / 8px | Buttons, inputs, dan compact controls |
| `{rounded.card}` | `0.75rem` / 12px | Cards dan panels |
| `{rounded.media}` | `1rem` / 16px | Framed imagery dan media surfaces |
| `{rounded.pill}` | `9999px` | Badge, tag, dan status metadata only |

Full pills bukan default button atau page-container shape. Borders tipis dan
purposeful. File-upload affordance memakai dashed boundary untuk menjelaskan
input area; exact dash pattern dan width tidak didokumentasikan.

### Photography Geometry

Niuva mengutamakan real project, product, workshop, process, dan material
evidence. Media frame memakai `{rounded.media}` ketika image ditempatkan dalam
framed surface. Policy peran media disetujui melalui
`DS-DEC-007-MEDIA-POLICY`. Gate geometry disetujui melalui
`DS-DEC-007-MEDIA-GEOMETRY-GATE`:

- product/CAD render memakai `contain` agar bentuk dan detail tidak terpotong;
- foto workshop/process memakai `cover` dengan focal point yang tetap dapat
  dikendalikan;
- tidak ada satu rasio global untuk semua media; hero dan card ratio ditentukan
  melalui proof sesuai jenis evidence dan aset nyata.

Gate ini sengaja tidak membuat canonical hero atau product-card aspect ratio;
ratio dan crop adalah keputusan route-owned yang `DEFERRED` sampai named proof.
Media below the fold lazy-loads; primary above-the-fold LCP media boleh eager.
Full-bleed tidak menjadi default. Jangan menyalin 21:9, 16:9, 1:1, shadow,
atau CDN behavior dari referensi Apple. Apple-specific tile rhythm/ratio yang
tidak dibutuhkan Niuva adalah `NOT APPLICABLE` melalui `DS-DEC-014`. Aset harus
memiliki alt text yang sesuai dan tidak boleh menyiratkan project outcome yang
belum terverifikasi.

## Components

Specification di bawah mengembangkan draft lokal. Keberadaan YAML key tidak
menandakan runtime atau production acceptance. Setiap komponen dibaca bersama
`DS-DEC-018-DESIGN-DECISION-CLOSURE`; nilai current-scope sudah dipilih, sedangkan
`UNVERIFIED`, `DEFERRED`, dan `SEPARATE GATE` hanya menandai bukti atau scope.

### Component Contract Register

Kontrak lengkap memuat tujuan, anatomy, token, ukuran, state, keyboard behavior,
responsive behavior, serta status keputusan dan scope. Register ini mencatat
bagian tersedia dan pertanyaan yang harus ditutup; tidak membuat default baru.

| Komponen | Tujuan / anatomy tersedia | Token / ukuran tersedia | State dan keyboard yang perlu ditetapkan | Responsive yang perlu ditetapkan | Kelengkapan / keputusan |
|---|---|---|---|---|---|
| Primary / outline / ghost buttons | Action role; label | Type, radius 8px, height 44px minimum, padding 12px/16px, primary color pair A | Hover, focus, press, loading, disabled, recovery, and reduced motion final | Label wrap and action-group stacking preserve order; runtime proof is `UNVERIFIED` | `APPROVED` / DS-DEC-018; no automatic on-dark variant; implementation/runtime are separate evidence |
| Destructive / icon buttons | Destructive role; icon-only control | Semantic family; icon-only 44×44px, 20px icon, 8px radius | Confirmation where relevant, accessible name, focus, unavailable state | No circular or overlay default; runtime proof is `UNVERIFIED` | `APPROVED` / DS-DEC-018; no other size or shape is implied |
| Card / evidence card | Grouped content; evidence anatomy | Paper-white/graphite, 12px radius, 16px padding; contain/cover media role | Static default; one action boundary or whole-card link; no nested interactive | Patterns route-owned; global ratio and sticky default are `NOT APPLICABLE` | `APPROVED` / DS-DEC-018; route/media proof is `DEFERRED` |
| Badge | Status umum terpisah dari technical label | 24px minimum height, 4px/8px padding, pill, 100% max-width, semantic families | General sentence case; technical uppercase 1–3 words; noninteractive by default | Word wrapping, height growth, no truncation/ellipsis/shrink/spill | `APPROVED` / DS-DEC-018; runtime proof is `UNVERIFIED` |
| Input / search / file upload | Field and recovery intent; upload guidance | 44px minimum height, 10px/12px padding, line-slate 1px border, 8px radius, full-width | Label/error association, pending, retry, keyboard, and one status region | Search is named-route only; dashed upload affordance; runtime proof is `UNVERIFIED` | `APPROVED` / DS-DEC-018; domain states remain product-owned |
| Navigation / footer | Navigation links/action; grouped footer content | Top nav 64px wide/56px compact, 24px/16px padding, active 2px Niuva Blue underline; footer cool-paper/graphite | Focus-visible, active route, legal/support row, and reading order final | Wrapped compact row; sub-navigation and sticky/frosted footer are `NOT APPLICABLE` current scope | `APPROVED` / DS-DEC-018; route/runtime proof is evidence-only |
| Text links | Light `brand-action` / dark `paper-white`; native link semantics; persistent underline | Same color role when visited; long labels wrap; 2px-offset focus ring | Disabled navigation is omitted or explained; no pill/button default | Dedicated dark-link token not required; runtime proof is `UNVERIFIED` | `APPROVED` / DS-DEC-018 |
| Option chip | Interactive selection terpisah dari badge | Native button; Candidate B; 44px, 8px radius, 8px/12px padding, 18px marker, 8px gap | `aria-pressed` selected; native disabled unavailable; one concise status region only for material downstream change | Source-order wrap; no scroll/truncation/shrink; thumbnail/price remain adjacent | `APPROVED` / DS-DEC-018; visual acceptance approved; runtime/AT and propagation are separate gates |
| Product discovery / action queue / checkout summary | Pattern intent tertulis | Route-owned composition; checkout summary in-flow by default | Empty, pending, error/recovery and action focus are route-owned | Floating sticky bar is `NOT APPLICABLE` current scope; route proof `DEFERRED` | `APPROVED` / DS-DEC-018 for ownership and defaults |
| Editorial quote | Editorial typography role | Fraunces remains an inline statement/quote role | No standalone quote-card contract in current scope | Apple environment quote card is `NOT APPLICABLE` | `NOT APPLICABLE` / DS-DEC-018 |

Ukuran dan warna warisan tetap tercatat untuk bahan keputusan. Kontrak ini tidak
mengubah source component, tidak mengisi nilai visual baru, dan tidak memberi
izin propagasi. Untuk scope Niuva MVP dan AUiS styleguide saat ini, kebutuhan
sub-navigation tersendiri ditetapkan `NOT APPLICABLE` melalui `DS-DEC-015`.
Sub-navigation hanya dapat dibuka kembali bila ada route atau link set Niuva yang
dinamai, proof yang relevan, dan keputusan terpisah; treatment frosted dari Apple
tetap `NOT APPLICABLE` melalui `DS-DEC-014`.


### Top Navigation

**`top-navigation` — COMPLETE for the current contract.** Focused dark header
dengan bottom divider, `working-slate` surface, `paper-white` text, uiData
14px/20px, 64px wide height, 56px compact height, dan 24px/16px horizontal
padding. Pada small screen, primary links tetap terlihat dalam wrapped row dan
urutannya dipertahankan sebelum kembali inline pada wider screen. Horizontal
scroll dan sticky behavior bukan default.

Model responsive dan geometry gate disetujui melalui
`DS-DEC-004-NAVIGATION-GEOMETRY-GATE`: wrapped row berlaku untuk link set kecil,
label tetap terlihat, dan urutan dipertahankan. Disclosure hanya kondisional
ketika jumlah link bertambah dan wrapping mengganggu scanability.

- Fungsi: orientasi dan access ke primary paths.
- Background/text token: `working-slate` / `paper-white`, divider `dark-line`.
- Typography token: `{typography.uiData}`.
- Height, padding, sticky behavior, dan active route: final; active route memakai
  underline Niuva Blue 2px. Runtime proof adalah evidence terpisah.
- Mobile hamburger/disclosure pattern: bukan default; tetap kandidat kondisional
  bila link set bertambah dan wrapped row tidak lagi menjaga scanability.

**`sub-navigation` — NOT APPLICABLE untuk scope saat ini.** Tidak ada route atau
link set Niuva yang memerlukan level navigasi kedua pada MVP dan AUiS styleguide.
Jika kebutuhan itu muncul, ia harus dibuka kembali melalui named route/link set,
proof responsive dan keyboard, serta keputusan Niuva tersendiri. Padanan Apple
frosted sub-nav, termasuk glass/blur treatment, tetap `NOT APPLICABLE` melalui
`DS-DEC-014`; pola referensi itu tidak diadopsi.

### Text Links

**`text-link` — COMPLETE for the current contract.** Link memakai native link semantics. Pada light
surface, role warna memakai `{colors.brand-action}`; pada dark surface, link
memakai `{colors.paper-white}` karena memiliki kontras tinggi terhadap
`{colors.working-slate}`. Inline link harus memiliki cue yang tetap terlihat,
seperti underline, dan tidak berubah menjadi pill atau button. Ini adalah
baseline `DS-DEC-018-DESIGN-DECISION-CLOSURE`; underline persisten, visited
mempertahankan role warna yang sama, dan dedicated dark-link token tidak diperlukan.

Focus-visible harus tetap jelas. Disabled bukan state default untuk navigasi;
destination yang tidak tersedia dihilangkan atau diberi explanation yang sesuai.
Long label wrap pada batas kata; runtime proof adalah evidence `UNVERIFIED`.

### Buttons

**`button-primary`** — Next meaningful action.

- Kelengkapan `COMPLETE` untuk current-scope contract; pasangan warna dasar
  `APPROVED` (`DS-DEC-001`).
- Pilihan A: background `{colors.brand-action}` (`#3F607F`) dan text
  `{colors.paper-white}` (`#FFFFFF`); kontras teks 6,58:1.
- Owner memilih A pada 2026-09-21 setelah melihat preview statis A/B pada
  surface putih dan dark working surface. Preview memakai font fallback Arial.
- `selectedColorOption: "a"`; alternatif B tetap disimpan sebagai riwayat
  perbandingan, bukan varian aktif. Approval terbatas pada pasangan warna dasar,
  bukan acceptance seluruh komponen atau izin implementasi/product propagation.
- Ukuran default disetujui pada 2026-09-21 (`DS-DEC-006-PRIMARY`): tinggi
  minimum 44px/2.75rem, padding vertikal 12px dan horizontal 16px/1rem per sisi, radius 8px,
  `{typography.uiData}` (Space Grotesk 14/20, weight 500). Lebar mengikuti isi.
- Area klik mengikuti batas visual tombol. Alternatif tinggi 32/40/48px pada
  preview bukan varian yang ikut disetujui. Keputusan ini untuk labelled primary
  button saja; perilaku reflow disetujui pada DS-DEC-006-REFLOW, sedangkan zoom
  dan runtime aplikasi adalah evidence terpisah.
- Tampilan statis state tambahan disetujui Owner pada 2026-09-21 setelah
  preview enam state dengan Space Grotesk di surface putih dan working-slate
  (`DS-DEC-003-VISUAL`). Approval ini tidak mencakup runtime atau komponen lain.

| State | Spesifikasi visual yang disetujui | Batas approval |
|---|---|---|
| Default | Brand-action `#3F607F`, text putih | DS-DEC-001 |
| Hover | Primary-hover `#344F67`, text putih | Timing disetujui terpisah pada DS-DEC-012-PRIMARY |
| Pressed | Primary-pressed `#2B4053`, text putih, translateY 1px | Timing/reduced motion disetujui pada preview terpisah; runtime aplikasi belum diuji |
| Focus-visible | Ring Niuva Blue 3px dengan pemisah putih 2px | Primary button pada dua surface preview; bukan global focus token |
| Loading | Warna default, indikator spinner dan label “Memproses…” | Timing dan loading behavior disetujui; announcement runtime belum diverifikasi |
| Disabled | Line-slate `#E2E8F0`, text muted-slate `#475569`, opacity 1 | Tampilan opaque tanpa global opacity |

Primary-hover dan primary-pressed adalah role warna untuk primary button saja;
penambahannya tidak memperluas palette approval ke komponen lain. Ukuran preview
190×32px tidak menjadi ukuran final; default kini 44px dengan lebar mengikuti isi
menurut DS-DEC-006-PRIMARY. Focus dapat menyertai state lain; precedence
perilaku berikut disetujui untuk primary button.

**Interaction behavior — `APPROVED` (`DS-DEC-003-BEHAVIOR`).**

Owner menyetujui perilaku berikut pada 2026-09-21. Persetujuan spesifikasi
perilaku bukan bukti implementasi atau keberhasilan pengujian browser.

- Keyboard: action menggunakan native button; Tab memindahkan focus, Enter/Space
  mengaktifkan action sesuai perilaku native. Navigasi tetap memakai link.
- Loading: pertahankan focus dan ukuran tombol, cegah aktivasi berulang, gunakan
  `aria-busy` serta pengumuman status yang sesuai. Spinner dekoratif; perubahan
  label tidak menjadi satu-satunya informasi yang diterima screen reader.
- Disabled: tidak menjalankan action atau merespons hover/press; alasan tidak
  tersedia dijelaskan dekat control bila diperlukan. Bedakan unavailable sebelum
  interaksi dari busy setelah aktivasi agar focus tidak hilang saat loading.
- Precedence: disabled mengabaikan hover/press; loading mempertahankan warna
  default dan mengabaikan hover/press; pressed mengungguli hover. Focus ring
  tetap terlihat pada elemen yang masih memegang focus, termasuk ketika busy.
- Reduced motion: hilangkan translasi pressed dan putaran spinner; label/status
  proses tetap tersedia. Warna dapat berubah langsung tanpa gerakan.
- Error/recovery: proses gagal mengembalikan action yang dapat dicoba ulang dan
  memberi pesan yang relevan; perpindahan focus mengikuti kebutuhan recovery.
- Timing disetujui pada `DS-DEC-012-PRIMARY` setelah Owner melihat preview HTML
  terpisah. Loading details disetujui pada `DS-DEC-003-LOADING`; mekanisme
  announcement final memakai satu adjacent role=status region dengan
  aria-live=polite dan aria-atomic=true. Verifikasi keyboard/browser aplikasi
  adalah evidence terpisah. Approval ini tidak memberi izin propagasi produk.

**Loading details — `APPROVED` (`DS-DEC-003-LOADING`).**

Owner menyetujui detail berikut pada 2026-09-21:

- Lebar tombol tetap stabil ketika label berubah menjadi “Memproses…”. Tidak
  ada angka fixed width baru; strategi reservasi ruang dan reflow label panjang
  perlu diperiksa saat implementasi.
- Focus tetap pada tombol selama loading dan aktivasi berulang dicegah.
- Screen reader mendapat pemberitahuan proses, lalu hasil sukses atau gagal
  berdasarkan hasil proses sebenarnya. Spinner tetap dekoratif.
- Jika gagal, tombol kembali dapat digunakan dan pesan pemulihan yang relevan
  tersedia. Tidak ada retry otomatis yang ditetapkan oleh keputusan ini.
- Loading mengikuti durasi proses sebenarnya tanpa minimum delay buatan;
  simulasi tiga detik pada preview bukan ketentuan runtime.

Persetujuan mencakup perilaku yang harus dirasakan pengguna. Redaksi status
menggunakan label “Memproses…” dan satu adjacent role=status region; strategi
lebar tetap intrinsik dalam container. Uji screen-reader/keyboard aplikasi
adalah evidence terpisah.


**Primary timing — `APPROVED` (`DS-DEC-012-PRIMARY`).**

| Interaksi | Durasi / easing yang disetujui |
|---|---|
| Hover dan kembali ke default | 150ms, cubic-bezier(0.2, 0, 0, 1) |
| Masuk pressed | Warna dan translasi turun 1px: 100ms, easing yang sama |
| Lepas pressed | Translasi kembali 100ms; warna kembali 150ms, easing yang sama |
| Focus ring | Langsung tampil |
| Spinner loading | 800ms per putaran, linear |
| Reduced motion | Warna berubah langsung; tanpa translasi dan putaran spinner |

Bukti keputusan: Owner menyetujui preview HTML animasi pada percakapan tanggal
2026-09-21. Ini penerimaan preview timing, bukan klaim pengujian aplikasi,
screen reader, atau semua kombinasi state. Loading 3 detik, jeda demo otomatis,
dan reserved width 160px pada preview adalah alat demonstrasi, bukan token atau
aturan runtime. Durasi loading aktual mengikuti proses, bukan timer demo.



**`button-outline`** — Secondary action.

- `APPROVED` untuk default/hover/pressed dan ukuran pada surface putih
  (`DS-DEC-003-SECONDARY-VISUAL`, Owner 2026-09-21).
- Default background paper-white, text graphite, border muted-slate `#475569`
  1px. Hover memakai quiet-surface `#F1F5F9`; pressed line-slate `#E2E8F0`.
  Text dan border tetap sama pada ketiga state.
- Minimum height 44px, horizontal padding 16px per sisi, radius 8px,
  Space Grotesk 14/20 weight 500. Bukan pill.

**`button-ghost`** — Low-emphasis action.

- Approval dan batas scope sama dengan outline. Default pada surface putih
  memakai paper-white dengan text graphite tanpa border; tidak mengasumsikan
  mapping untuk surface lain.
- Hover quiet-surface `#F1F5F9`; pressed line-slate `#E2E8F0`; text tetap graphite.
- Minimum height 44px, horizontal padding 16px per sisi, radius 8px,
  Space Grotesk 14/20 weight 500.

**Responsive behavior — `APPROVED` (`DS-DEC-006-SECONDARY-REFLOW`).**

Owner menerima preview responsive outline/ghost pada 2026-09-21. Keputusan ini
berlaku untuk labelled action buttons pada surface putih; scope on-dark,
pengumuman kontekstual, dan verifikasi runtime tetap terpisah.

| Area | Perilaku yang disetujui |
|---|---|
| Minimum / padding | Tinggi minimum 44px; padding vertikal 12px dan horizontal 16px per sisi |
| Hit area | Mengikuti batas visual tombol dan tidak kurang dari 44px |
| Label panjang | Wrap pada batas kata; tanpa truncation, ellipsis, atau pengecilan font |
| Lebar | Dibatasi content container; satu tombol tetap mengikuti isi |
| Pasangan action | Menjadi vertikal dan full-width ketika lebar natural plus gap tidak muat; urutan tetap |
| Loading | Ruang label normal/loading dicadangkan; tidak ada size shift pada container yang sama |
| Zoom / proof | Preview diperiksa pada 100%, 150%, dan 200%; application zoom dan assistive technology belum diverifikasi |

**Additional visual states — `APPROVED` (`DS-DEC-003-SECONDARY-STATES`).**

Owner menerima preview statis focus, loading, dan disabled pada surface putih
pada 2026-09-21. Nilai berikut berlaku untuk outline/ghost saja pada scope ini.

| State | Outline | Ghost |
|---|---|---|
| Focus-visible | Default + ring Niuva Blue 3px, pemisah putih 2px; border outline tetap | Default + ring Niuva Blue 3px, pemisah putih 2px; tanpa border tambahan |
| Loading | Warna/border default; spinner graphite dan label “Memproses…” | Warna default; spinner graphite dan label “Memproses…”; tanpa border |
| Disabled | Quiet-surface #F1F5F9, border line-slate #E2E8F0 1px, text muted-slate #475569 | Text muted-slate #475569 pada paper-white; tanpa border/latar tambahan |

Disabled menggunakan warna opaque, bukan opacity global. Lebar 186px pada
preview hanya untuk perbandingan, bukan token ukuran. Timing dan perilaku
interaksi mendapat approval terpisah di bawah. Responsif padding, hit area,
label wrapping, dan action-group reflow disetujui pada
`DS-DEC-006-SECONDARY-REFLOW`; on-dark mengikuti named surface contract dan
application runtime adalah evidence terpisah.
Persetujuan dokumentasi ini tidak memberi izin implementasi source UI.

**Outline/ghost interaction — `APPROVED` (`DS-DEC-003-SECONDARY-BEHAVIOR`).**

Owner menerima preview interaktif pada 2026-09-21, untuk action buttons pada
surface putih. Navigasi tetap memakai semantics link.

| Area | Perilaku / timing disetujui |
|---|---|
| Keyboard | Native button; Tab untuk focus, Enter/Space untuk aktivasi |
| Hover / release | Background transition 150ms |
| Pressed | Background transition 100ms, tanpa translasi |
| Easing | cubic-bezier(0.2, 0, 0, 1) |
| Focus | Ring langsung tampil; tetap terlihat saat tombol focused termasuk busy |
| Loading | Warna default, spinner 800ms linear; ukuran stabil, focus tetap, aktivasi berulang dicegah |
| Status / recovery | Umumkan proses dan hasil aktual; setelah gagal action dapat dicoba lagi dengan pesan relevan |
| Durasi proses | Mengikuti proses sebenarnya tanpa minimum delay buatan |
| Disabled | Tidak menjalankan action atau merespons hover/press |
| Precedence | Disabled/busy mengungguli hover/press; pressed mengungguli hover |
| Reduced motion | Warna berubah langsung, spinner tidak berputar |

Bukti teknis terbatas pada preview HTML lokal: delapan skenario pada viewport
360px dan 1040px mencakup loading berhasil/gagal, focus tetap, ukuran stabil,
pencegahan aktivasi berulang, dan reduced motion melalui toggle serta preferensi
sistem. Screen reader dan runtime aplikasi belum diuji. Durasi simulasi 2 detik
dan gap 12px pada preview bukan token baru. Copy status per konteks dan uji
assistive technology masih memerlukan penutupan terpisah; responsive geometry
outline/ghost sudah ditutup pada subkeputusan terpisah.


**`button-destructive` — COMPLETE for the current contract.** Destructive
foreground, surface, border, 44px minimum height, 12px/16px padding, 8px radius,
native button semantics, focus, disabled, and recovery behavior follow the
labelled control contract. Confirmation remains domain-owned.

**`button-icon` — COMPLETE for the current contract.** Hit area icon-only
minimum 44×44px, 20px Lucide icon, 8px radius, accessible name required, and
native button states are final. Circular shape and photographic overlay are
`NOT APPLICABLE` defaults; runtime proof is evidence `UNVERIFIED`.

### Cards & Containers

**`card`** — General grouped content container.

- Background `{colors.paper-white}`, text `{colors.graphite}`, body typography,
  radius 12px, padding 1rem.
- Border menggunakan quiet ring/thin line bila separation diperlukan; exact
  frontmatter border prop tidak tersedia.
- Default elevation mengikuti card quiet; compact operational form dapat memakai
  0.75rem internal padding.
- Dark counterpart memakai `working-slate` dengan `paper-white` text dan
  `dark-line` divider ketika card berada di explicit dark working zone.
- Card bersifat static secara default. Jika menjadi actionable, gunakan satu
  action boundary yang eksplisit atau jadikan seluruh card satu link; nested
  interactive controls tidak diperbolehkan.
- Pattern yang memakai card, termasuk action queue, product discovery, dan
  checkout summary, tetap route-owned. Card tidak menjadi alasan untuk membuat
  tile Apple generik atau menyamakan semua density.
- Sticky summary/action bukan default; floating sticky bar adalah `NOT APPLICABLE`
  untuk current scope. Checkout summary tetap in-flow.
- Keputusan interaction boundary ini dicatat pada
  `DS-DEC-008-CARD-INTERACTION`; anatomy, state, dan implementation proof tetap
  terpisah.

**`evidence-card`** — Capability, process, dan project evidence.

- Anatomi: eyebrow → title → description → optional metadata → optional action.
- Background paper white, graphite text, radius 12px, padding 1rem.
- Menggunakan card quiet shadow atau border/ring sesuai grouping need.
- Media role policy disetujui melalui `DS-DEC-007-MEDIA-POLICY` dan geometry
  gate melalui `DS-DEC-007-MEDIA-GEOMETRY-GATE`: product/CAD memakai `contain`,
  foto workshop/process memakai `cover` dengan focal point. Exact aspect ratio
  dan crop adalah route-owned `DEFERRED`; below-fold lazy loading dan LCP eager
  loading adalah policy final.
- Optional action mengikuti `DS-DEC-008-CARD-INTERACTION`: satu action
  boundary atau whole-card link, tanpa nested button/link/chip interaktif.

**`badge-outline`** — Evidence metadata dan compact status label.

- Transparent background, graphite text, full pill, minimum height 24px,
  padding 4px vertical/8px horizontal, and max-width 100% are final.
- Typography `APPROVED` (`DS-DEC-002`): badge umum memakai
  `{typography.uiData}` — Space Grotesk 14px/20px, weight 500, tracking 0,
  sentence case. Contoh: “Menunggu pembayaran”, “Sedang diproduksi”, “Selesai”.
- Technical label memakai `{typography.technicalException}` — Space Grotesk
  12px/18px, weight 500, tracking 0.05em, uppercase 1–3 kata. Contoh: “STL”,
  “3MF”, “PLA”, “QC”, dan “FILE CAD”. Role ini bukan default seluruh status.
- Label status panjang tetap sentence case dan tidak diperkecil menjadi
  technical label. Wrapping pada batas kata dan pertumbuhan tinggi badge
  disetujui melalui `DS-DEC-008-BADGE-REFLOW`; badge tetap berada dalam 100%
  containing surface dan tidak memakai truncation atau shrink.
- Owner menyetujui pemisahan ini pada 2026-09-21 setelah preview statis memakai
  Space Grotesk. Container 30px pada preview hanya ilustrasi, bukan token baru.
  `inheritedTypography` menyimpan riwayat pemetaan lama; bukan default badge umum.
  Persetujuan ini tidak mencakup izin implementasi/product propagation.
- Filled semantic variants memakai pasangan semantic text/surface/border yang
  sudah ada untuk success, info, warning, dan destructive.
- Badge adalah label/summary, bukan pengganti primary action atau navigation.
  Selama noninteractive, badge tidak memakai minimum hit target 44px. Bila
  dipromosikan menjadi option chip atau button, ia memerlukan contract
  interaktif tersendiri dan mengikuti kebijakan hit target control. Option chip
  mengikuti `DS-DEC-008-OPTION-CHIP`.

**Responsive label behavior — `APPROVED` (`DS-DEC-008-BADGE-REFLOW`).**

Owner memilih Candidate A pada 2026-09-21. Status umum boleh wrap pada batas
kata dan tinggi badge bertambah agar seluruh label tetap terbaca. Label tidak
dipotong, tidak memakai ellipsis, dan tidak keluar dari containing surface.
Technical label tetap memakai role uppercase 1–3 kata; status yang lebih panjang
menggunakan badge umum sentence case. Nilai padding dan max-width pada preview
tidak menjadi token baru, dan keputusan ini tidak memberi izin implementasi.

**`action-queue-item` — COMPLETE route-owned signature pattern.** Reuses card
structure dan menambahkan kind label, technical reference, timestamp, semantic
status badge, serta action footer. Exact route composition is DEFERRED evidence;
the ownership and interaction boundary are final.

**`product-discovery` — COMPLETE route-owned pattern.** Styleguide-only pattern
memakai evidence presentation dan card contract. Product tile, utility card, dan
grid density dipilih oleh named route proof; tidak ada tile Apple yang menjadi
default.

**`checkout-summary` — COMPLETE route-owned pattern.** In-flow adalah baseline
final. Floating sticky bar, blur, dan frosted treatment Apple `NOT APPLICABLE`
untuk current scope; route-specific placement evidence `DEFERRED`.

**`editorial-quote-card` — NOT APPLICABLE.** Fraunces tersedia untuk statement
atau quote inline, tetapi tidak membentuk component contract tersendiri pada
current scope. Apple environment quote card tidak diimpor.

### Inputs & Forms

**`input`** — Default text/form field.

- Full width dalam containing surface, graphite text, body typography, 8px
  radius, 44px minimum height, 10px/12px padding, and 1px line-slate border.
- Focus uses the shared Niuva Blue 3px ring with 2px separator and 2px offset.
- Error/disabled changes use the semantic families; label/error/status remain
  associated and one adjacent role=status region handles dynamic feedback.
- Search inherits this input contract; file-upload uses the dashed affordance and
  the same target/geometry defaults.
- Error message harus menjelaskan masalah dan next recovery action.

**`search-input` — COMPLETE named-route variant.** Padanan konseptualnya adalah `{components.input}`.
Search hanya dibuka untuk named route atau use case. Ia mewarisi input
rectangular/full-width, 44px height, 10px/12px padding, and target minimum 44px;
search icon is optional 20px, pill shape is disallowed by default, and result/
empty behavior remains route-owned.

**`variant-option-chip` — COMPLETE interactive control.** Compact pill badge tetap tersedia untuk
metadata, tetapi interactive option chip adalah control terpisah dari badge.
`DS-DEC-008-OPTION-CHIP` menyetujui native button semantics, target minimum
44px, serta kewajiban state selected/unavailable yang terlihat. Actionable chip
geometry mengikuti gate `DS-DEC-006-CONTROL-GEOMETRY-GATE`; cue selected/unavailable
dan pemisahan dari badge mengikuti `DS-DEC-008-OPTION-CHIP-VISUAL-GATE`.
Keyboard, focus retention, dan semantic state/status mengikuti
`DS-DEC-008-OPTION-CHIP-INTERACTION-GATE`. Owner memilih Candidate B melalui
`DS-DEC-008-OPTION-CHIP-VISUAL`: quiet outline, selected marker/underline, dan
explicit unavailable label. Anatomy gate menetapkan radius 8px, minimum height
44px, padding 8px/12px, marker 18px, wrapping pada batas kata, lebar mengikuti
isi dalam container, dan source order saat reflow. Reflow gate melarang
horizontal scroll, truncation, dan font shrinking; label unavailable boleh
membungkus selama tetap eksplisit. Proof memakai label Niuva nyata pada frame
220px/280px/320px. Announcement policy menetapkan semantic state pada control
yang sama, status singkat tanpa duplikasi, focus tidak berpindah, dan satu
adjacent status hanya untuk perubahan downstream yang material. Token mapping,
marker gap 8px, explicit copy “Tidak tersedia”, and no thumbnail/price nesting
are final. Runtime and implementation are separate evidence gates.

**`file-upload` — COMPLETE input contract.** Dashed boundary ditetapkan sebagai affordance input.
File type, size, privacy, progress, retry, error, dan retention mengikuti domain
requirements, bukan desain Apple. Target interaktif minimum 44px mengikuti
`DS-DEC-006-CONTROLS`; 44px height, 10px/12px padding, 8px radius, and
associated pending/error/retry states are final. Domain-specific progress and
retention remain product requirements.

### Footer

**`footer` — COMPLETE for the current contract.** `DS-DEC-009-FOOTER-POLICY` menyetujui grouped content
dalam beberapa kolom ketika ruang lebar mendukung, stack pada compact dalam
reading order, dan legal/support row yang terpisah. Footer tidak sticky secara
default dan tidak memakai frosted atau parchment treatment. Footer memakai
cool-paper surface, graphite text, up to three content groups, 16px/24px body
type, 16px group spacing, persistent link underlines, and a separate
legal/support row. Exact legal copy is route-owned; runtime behavior is evidence.

## Do's and Don'ts

### Do

- **Do** lead dengan product outcome, project evidence, atau next decision
  sebelum technology detail.
- **Do** gunakan token roles dan component contracts Niuva agar public,
  checkout, dan admin berbagi identitas dengan density yang sesuai.
- **Do** gunakan real project, workshop, process, material, dan product evidence
  ketika tersedia dan boleh dipublikasikan.
- **Do** pertahankan visible keyboard focus, descriptive states, reduced motion,
  readable contrast, dan recovery path.
- **Do** gunakan asymmetry, labels, dan process structure ketika generic card
  grid akan meratakan cerita.
- **Do** dokumentasikan hover, focus-visible, pressed, disabled, loading,
  selected, dan error bila nilainya tersedia; tandai gap bila belum tersedia.

### Don't

- **Don't** memakai generic SaaS hero, indiscriminate card grid, decorative blob,
  decorative gradient, glassmorphism, neon, glow, atau unmotivated 3D.
- **Don't** memakai technical motif yang tidak menjelaskan process, material,
  decision, atau state nyata.
- **Don't** membuat client outcome, testimonial, metric, inventory, pricing
  decision, atau visual evidence.
- **Don't** mengubah setiap action menjadi pill atau setiap surface menjadi
  floating card.
- **Don't** memakai typography, color, atau motion sebagai decoration ketika
  mengurangi scanability atau menyembunyikan next action.
- **Don't** mengadopsi Apple blue, SF Pro, frosted blur, product shadow, tile
  rhythm, atau breakpoint hanya untuk mengisi struktur dokumentasi.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Compact | `0–639px` | Typography memakai compact step; content stack; gutter 1.25rem; primary navigation memakai wrapped row untuk link set kecil |
| Standard | `640–1279px` | Typography memakai standard step; gutter 2rem; two-column relationships dapat aktif bila content mendukung |
| Wide | `>=1280px` | Typography memakai wide step; public content terkunci di 72rem, reading 48rem, admin 90rem; 12-column composition tersedia |

Tidak ada tambahan breakpoint 419/480/734/833/1068/1440 dari referensi Apple.
Component-specific breakpoint belum didokumentasikan secara lengkap.
Viewport bands di atas adalah pembagian foundation, bukan otomatis threshold
collapse setiap komponen. Wrap sudah dipilih sebagai default primary navigation
mobile untuk link set kecil (`DS-DEC-004`); scroll tidak dipilih sebagai default.
Disclosure tetap kondisional bila jumlah link bertambah.

| Area | Keputusan final | Status evidence / batas |
|---|---|---|
| Navigation | `working-slate`/`paper-white`, 64px/56px height, 24px/16px padding, active 2px Niuva Blue underline, compact wrapped row, no default sticky/scroll, sub-navigation `NOT APPLICABLE` | Keyboard/browser proof `UNVERIFIED`; future link-set changes require a new decision |
| Container / grid | 72/48/90rem containers, 1.25rem/2rem gutters, compact stack, wide 12 columns; exact route spans are route-owned | Named route composition and collision proof `DEFERRED`; no global span decision remains |
| Controls | Labelled 44px/12px/16px/8px; input 44px/10px/12px/8px; icon-only 44×44px/20px icon; badge noninteractive; option chip Candidate B | OptionChip named Chromium/browser proof `VERIFIED`; touch-device, cross-browser/physical screen-reader, zoom, and application/product-route evidence remain separate gates |
| Media | Product/CAD `contain`; workshop/process `cover` with focal point; no global ratio; below-fold lazy and LCP eager allowed; full-bleed not default | Exact route ratio/crop/art direction is `DEFERRED` until named licensed-assets proof |
| Footer | Cool-paper/graphite, up to three groups, grouped wide and reading-order compact stack, separate legal/support row, no sticky/frosted/parchment | Exact legal copy is route-owned; keyboard/runtime proof `UNVERIFIED` |
| Checkout / admin | Task-appropriate density; checkout summary in-flow; floating sticky bar `NOT APPLICABLE` current scope | Product-route acceptance is a `SEPARATE GATE` |

Register ini menentukan apa yang harus diputuskan dan diperiksa, bukan memilih
angka atau behavior baru. Detail penutupan ada pada `DS-DEC-004`–`DS-DEC-008`.


### Touch Targets

Primary button berlabel memiliki tinggi minimum 44px dengan area klik mengikuti
batas visual, disetujui dalam `DS-DEC-006-PRIMARY`. Outline dan ghost berlabel
memiliki minimum dan hit area yang sama melalui `DS-DEC-006-SECONDARY-REFLOW`.
Ketiganya memakai padding horizontal 16px per sisi; tidak ada perluasan area klik
tersembunyi pada default ini.

Primary, outline, dan ghost berlabel mengikuti keputusan reflow masing-masing:
label wrap pada batas kata, tinggi dapat bertambah, dan pasangan action menjadi
vertikal ketika tidak muat. Input/search/file-upload memiliki target interaktif
minimum 44px dengan geometry final 10px/12px; icon-only memiliki area 44×44px
dan icon 20px. Badge noninteractive tidak memakai minimum tersebut. Touch,
screen-reader, zoom, device touch, dan application runtime adalah evidence
`UNVERIFIED`; preview lokal tidak mengklaimnya.

### Collapsing Strategy

- Navigation: horizontal pada wider layouts; pada small screens primary links
  memakai wrapped row dengan label terlihat dan urutan tetap. Disclosure hanya
  kondisional untuk link set yang lebih besar; horizontal scroll bukan default.
- Narrative dan proof: two-column relationships collapse ke readable stack.
- Entry paths: 12-column wide composition collapse ke readable stack; exact
  intermediate spans adalah route-owned `DEFERRED`.
- Cards/patterns: patterns tetap route-owned; checkout summary in-flow; floating
  sticky bar `NOT APPLICABLE` current scope; equal-height dan grid count dipilih
  oleh route proof, bukan global token.
- Checkout/admin: density harus tetap task-appropriate; product-route acceptance
  adalah `SEPARATE GATE`.

### Image Behavior

Real evidence dan meaningful alt text merupakan invariant. Product/CAD memakai
`contain`; workshop/process memakai `cover` dengan focal point. Below-fold
media lazy-loads, primary LCP media boleh eager, dan full-bleed bukan default.
Responsive source, crop, dan aspect ratio adalah route-owned `DEFERRED`; media
harus mengikuti content dan permission dan tidak memakai behavior Apple sebagai
default Niuva.

### Evidence and Acceptance Matrix

`DS-DEC-017-EVIDENCE-BOUNDARY` memisahkan jenis klaim agar bukti teknis tidak
terbaca sebagai visual acceptance, dan visual acceptance tidak terbaca sebagai
izin propagasi produk.

| Tingkat bukti | Status saat ini | Yang boleh diklaim | Yang belum boleh diklaim | Syarat penutupan |
|---|---|---|---|---|
| Documentation / YAML | `APPROVED` sebagai policy | Intent, scope, candidate, final decision, dan decision boundary tercatat | UI ter-render, runtime, atau produksi | Register dan YAML konsisten dengan keputusan Owner |
| Local technical evidence | `PARTIAL` | Test, DOM semantics, Chromium Accessibility Tree, browser smoke, dan no-overflow check pada scope yang disebut | Screen-reader speech, interoperability lintas browser/AT, device touch, atau product runtime | Evidence menyebut route/scope, environment, case, dan batas yang belum diuji |
| Named visual acceptance | `APPROVED` hanya untuk proof yang dinamai | Owner menerima tampilan pada viewport/content/state yang dinyatakan; saat ini OptionChip styleguide proof | Official promotion, product propagation, runtime/AT, atau provider readiness | Preview/route, viewport, state, dan acceptance result tercatat secara eksplisit |
| Runtime / assistive technology | `UNVERIFIED` | Tidak ada klaim acceptance umum | Screen-reader output, browser/AT interoperability, focus recovery, announcement mechanism | Actual browser/screen-reader pair pada runtime yang disetujui; evidence status tidak membuka kembali design decision |
| Layout / media route proof | `DEFERRED` | Policy role media dan geometry final | Exact route ratio/crop, composition, sticky collision, art direction | Named route dengan licensed assets pada compact 320/390px, standard 768px, dan wide 1280px minimum |
| Product-route acceptance | `SEPARATE GATE` | Tidak ada propagasi yang diotorisasi oleh DESIGN.md | Homepage, project brief, checkout, atau admin dianggap resmi/production-ready | Named route evidence dan keputusan propagation terpisah |
| Provider / production acceptance | `SEPARATE GATE` | Tidak ada klaim provider activation, deployment, atau production readiness | Operational acceptance dan live-provider behavior | Gate provider/production masing-masing disetujui di authority yang sesuai |

## Iteration Guide

1. Fokus pada satu component atau named proof scope pada satu waktu.
2. Referensikan YAML key yang benar, misalnya `{components.button-primary}`
   atau `{components.input}`.
3. Variants dengan nilai yang benar-benar ditetapkan dapat menjadi sibling key
   (`component`, `component-hover`, `component-active`). Jangan membuat variant
   hanya agar template terlihat lengkap.
4. Gunakan token references; inline value hanya untuk menjelaskan source yang
   belum memiliki token dan harus diberi status `DEFERRED` atau `UNVERIFIED`,
   bukan dianggap sebagai keputusan baru.
5. Dokumentasikan hover bila relevan; aturan Apple “never document hover” tidak
   berlaku untuk Niuva.
6. Pertahankan Space Grotesk, scale 16px/1.25, body 16/24, dan responsive type
   steps yang telah ditetapkan.
7. Jalankan jalur `reference → candidate → proof → approved → official` sebelum
   mengubah token, component default, atau product-screen propagation.
8. Verifikasi desktop/mobile, keyboard focus, contrast, reduced motion, dan
   recovery states. Test/build adalah technical evidence, bukan visual approval.

## Known Gaps and Evidence Follow-ups

### Decision Register

DS-DEC-001 berstatus `APPROVED` untuk pasangan warna dasar dan DS-DEC-002
`APPROVED` untuk pemisahan typography badge umum/technical label.
DS-DEC-003-VISUAL disetujui hanya untuk tampilan primary button;
DS-DEC-003-BEHAVIOR disetujui untuk perilaku primary; DS-DEC-006-PRIMARY untuk
default geometry dan hit area; DS-DEC-006-REFLOW untuk responsive behavior; DS-DEC-012-PRIMARY untuk timing animasi;
DS-DEC-003-LOADING untuk detail perilaku loading. DS-DEC-006-CONTROLS `APPROVED`
untuk kebijakan hit target control yang tersisa. DS-DEC-014 `APPROVED` untuk
menutup batch treatment Apple yang tidak berlaku bagi scope Niuva. DS-DEC-015
`APPROVED` untuk menutup batas scope keputusan Batch A: Niuva MVP dan AUiS
styleguide saat ini, dengan propagasi product screen tetap menjadi gate terpisah.
DS-DEC-016 `APPROVED` untuk policy baseline kontrak controls, badge, navigation,
card/patterns, footer, dan links. DS-DEC-018 kemudian memfinalkan exact defaults
untuk current scope; proof, runtime, dan implementasi tetap terpisah sebagai
evidence.
DS-DEC-017-EVIDENCE-BOUNDARY `APPROVED` untuk memisahkan documentation, local
technical evidence, visual acceptance, runtime/AT, product-route proof, dan
provider/production gates.
DS-DEC-005-LAYOUT-GEOMETRY-GATE `APPROVED` untuk gate container, gutter, dan reflow.
DS-DEC-004-NAVIGATION-GEOMETRY-GATE `APPROVED` untuk gate geometry navigation.
DS-DEC-007-MEDIA-POLICY `APPROVED` untuk policy media berbasis peran.
DS-DEC-007-MEDIA-GEOMETRY-GATE `APPROVED` untuk gate ratio/crop berbasis proof.
DS-DEC-006-CONTROL-GEOMETRY-GATE `APPROVED` untuk gate geometry field, icon, dan chip.
DS-DEC-008-CARD-INTERACTION `APPROVED` untuk boundary interaksi card.
DS-DEC-008-OPTION-CHIP `APPROVED` untuk role dan behavior option chip.
DS-DEC-008-OPTION-CHIP-VISUAL-GATE `APPROVED` untuk gate cue state dan proof visual option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-INTERACTION-GATE `APPROVED` untuk gate keyboard, focus retention, dan semantic state/status option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-VISUAL `APPROVED` untuk Candidate B visual direction option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-VISUAL-ACCEPTANCE `APPROVED` untuk visual acceptance pada proof styleguide yang dinamai; scoped Chromium/browser acceptance `VERIFIED`, sedangkan cross-browser/physical screen-reader interoperability dan propagasi product screen tetap gate terpisah. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-ANATOMY-GATE `APPROVED` untuk radius, minimum height, padding, marker, wrapping, dan source order option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-REFLOW-GATE `APPROVED` untuk wrapping source order dan no-horizontal-scroll policy option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-ANNOUNCEMENT `APPROVED` untuk semantic state, concise status, focus retention, dan non-duplicative announcement option chip. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-IMPLEMENTATION `APPROVED` untuk implementation proof styleguide-only dan scoped acceptance `VERIFIED`; product-screen propagation dan official promotion tetap gate terpisah. Outline/ghost memiliki approval
DS-DEC-008-OPTION-CHIP-AT-PROOF `VERIFIED` untuk evidence scoped keyboard/DOM/overflow; DS-DEC-008-OPTION-CHIP-RUNTIME-AT-GATE `APPROVED` sebagai kriteria acceptance dan `VERIFIED` untuk named Chromium/browser preview; physical screen-reader output dan cross-browser interoperability tetap gate terpisah. Outline/ghost memiliki approval
visual, state tambahan, behavior/timing, dan responsive reflow pada subkeputusan
SECONDARY terkait.
DS-DEC-009-FOOTER-POLICY `APPROVED` untuk structure dan responsive footer.
DS-DEC-010-LINK-POLICY `APPROVED` untuk role dan context text link.
DS-DEC-011-FALLBACK-POLICY `APPROVED` untuk fallback stack dan preservation hierarchy typography.
DS-DEC-012-FOCUS-MOTION-BASELINE `APPROVED` untuk baseline focus-visible dan reduced-motion lintas komponen.
DS-DEC-013-GRADIENT-GATE `APPROVED` untuk gate kebutuhan functional gradient.
Parent DS-DEC-003 sampai DS-DEC-013 adalah jejak historis pembentukan keputusan.
`DS-DEC-018-DESIGN-DECISION-CLOSURE` adalah authority current-scope yang
menimpa status draft lama: semua pilihan desain Niuva MVP dan AUiS styleguide
sudah final. Kata `UNVERIFIED` yang tersisa pada baris historis dibaca sebagai status
sebelum closure, bukan pekerjaan Owner yang masih menunggu pilihan. Follow-up di
bawah hanya evidence atau gate terpisah.

| ID | Area / status saat ini | Keputusan final | Follow-up evidence / batas |
|---|---|---|---|
| DS-DEC-018-DESIGN-DECISION-CLOSURE | Current-scope design closure / `APPROVED` | Semua keputusan desain Niuva MVP dan AUiS styleguide saat ini final; Apple-only treatment yang tidak dibutuhkan `NOT APPLICABLE` | Runtime/AT `UNVERIFIED`; named route/media proof `DEFERRED`; product/provider/production `SEPARATE GATE`; tidak ada current-scope decision yang belum dipilih |

| ID | Area / kelengkapan | Kandidat atau keputusan yang diperlukan | Syarat penutupan |
|---|---|---|---|
| DS-DEC-001 | Primary default colors / `APPROVED`; kontrak komponen `COMPLETE` | A: brand-action + paper-white, dipilih Owner 2026-09-21 setelah preview statis A/B; preferensi Owner menjadi dasar keputusan | Pasangan warna dasar ditutup; state/proof interaksi tetap DS-DEC-003/012 dan izin implementasi terpisah |
| DS-DEC-002 | Badge typography / `APPROVED`; kontrak komponen `COMPLETE` | Badge umum: uiData, sentence case; technical label: technicalException, uppercase 1–3 kata. Owner menyetujui preview Space Grotesk pada 2026-09-21 | Role/casing ditutup; status panjang tetap sentence case. Wrapping/containment ditutup pada DS-DEC-008-BADGE-REFLOW; container, padding, semantic variants, dan implementasi tetap UNVERIFIED |
| DS-DEC-003 | Control contracts / `COMPLETE` | Visual dan perilaku primary disetujui pada subkeputusan; detail teknis dan komponen lain menjadi evidence UNVERIFIED | Default geometry/timing primary ditutup pada subkeputusan; loading behavior ditutup pada DS-DEC-003-LOADING; mekanisme announcement, varian/komponen lain dan runtime proof menjadi evidence UNVERIFIED |
| DS-DEC-003-VISUAL | Primary static states / `APPROVED` | Owner menerima preview enam state pada 2026-09-21; nilai ada di Buttons/YAML | Ditutup untuk tampilan statis primary pada white/working-slate; bukan runtime atau ukuran final |
| DS-DEC-003-BEHAVIOR | Primary interaction behavior / `APPROVED`; detail teknis `COMPLETE` | Owner menyetujui keyboard, loading, disabled, precedence, reduced motion, dan recovery pada 2026-09-21 | Perilaku ditutup; geometry/timing disetujui pada subkeputusan terpisah; loading details disetujui pada DS-DEC-003-LOADING; mekanisme announcement, izin implementasi dan browser verification menjadi evidence UNVERIFIED |
| DS-DEC-003-LOADING | Primary loading details / `APPROVED`; implementasi `UNVERIFIED` | Owner menyetujui lebar stabil, focus tetap, pencegahan aktivasi berulang, pengumuman proses/hasil, retry setelah gagal, dan durasi proses aktual pada 2026-09-21 | Perilaku ditutup; redaksi/mekanisme announcement, strategi lebar/reflow dan uji assistive technology menjadi evidence UNVERIFIED |
| DS-DEC-003-SECONDARY-VISUAL | Outline/ghost visual + size / `APPROVED`; kontrak `COMPLETE` | Owner menerima default/hover/pressed pada white, minimum 44px, padding horizontal 16px, radius 8px, uiData pada 2026-09-21 | Scope white/static; focus/loading/disabled ditutup pada SECONDARY-STATES; behavior/timing ditutup pada SECONDARY-BEHAVIOR; on-dark dan runtime aplikasi tetap UNVERIFIED; hit target/reflow ditutup pada DS-DEC-006-SECONDARY-REFLOW |
| DS-DEC-003-SECONDARY-STATES | Outline/ghost additional states / `APPROVED`; kontrak `COMPLETE` | Owner menerima focus ring, spinner/label loading, dan disabled opaque pada surface putih pada 2026-09-21 | Tampilan statis ditutup; timing/behavior disetujui terpisah; responsive geometry ditutup pada DS-DEC-006-SECONDARY-REFLOW; on-dark dan runtime aplikasi masih UNVERIFIED |
| DS-DEC-003-SECONDARY-BEHAVIOR | Outline/ghost interaction + timing / `APPROVED`; kontrak `COMPLETE` | Owner menerima preview interaktif 2026-09-21; hover/release 150ms, press 100ms tanpa translasi, spinner 800ms, native keyboard, loading stabil/recovery dan reduced motion | 8 skenario preview lokal lulus; responsive reflow ditutup pada DS-DEC-006-SECONDARY-REFLOW; on-dark, geometry di luar scope, copy kontekstual, screen reader dan runtime aplikasi menjadi evidence UNVERIFIED |
| DS-DEC-004 | Navigation responsive model / `APPROVED`; geometry gate `APPROVED` pada DS-DEC-004-NAVIGATION-GEOMETRY-GATE; navigation contract `COMPLETE` | Owner menyetujui wrapped row untuk link set kecil; label tetap terlihat, urutan dipertahankan, horizontal scroll bukan default, dan disclosure hanya kondisional setelah link set bertambah | Model/gate ditutup; exact threshold, height, padding, active route, sticky behavior, focus/keyboard proof, disclosure implementation, dan runtime proof tetap `UNVERIFIED`; sub-navigation `NOT APPLICABLE` untuk scope MVP/styleguide dan hanya dapat dibuka kembali melalui named route/link set |
| DS-DEC-004-NAVIGATION-GEOMETRY-GATE | Navigation geometry and disclosure proof gate / `APPROVED`; navigation contract `COMPLETE` | Owner menyetujui pada 2026-09-21: threshold, geometry, active state, dan disclosure dipilih hanya melalui proof daftar link nyata pada desktop/mobile/keyboard; wrapped row menjadi default untuk link set kecil | Gate ditutup; exact tokens, threshold value, height/padding, sticky behavior, active route details, disclosure implementation, runtime, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-005 | Layout/container and reflow model / `APPROVED`; geometry gate `APPROVED` pada DS-DEC-005-LAYOUT-GEOMETRY-GATE; layout contract `COMPLETE` | Owner menyetujui token container/gutter yang ada, compact stack, dan two-column hanya bila kedua kolom tetap terbaca tanpa overflow | Model/gate ditutup; exact spans, minimum card width, inter-column gutter, sticky summary/collision, density detail, visual/runtime proof, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-005-LAYOUT-GEOMETRY-GATE | Layout geometry and reflow proof gate / `APPROVED`; layout contract `COMPLETE` | Owner menyetujui pada 2026-09-21: container 72/48/90rem, gutter 1.25/2rem, compact readable stack, dan wide 12-column composition; exact two-column usage harus lolos proof tanpa overflow | Gate ditutup; exact spans, minimum card width, inter-column gutter, sticky collision, density detail, runtime, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-006 | Hit targets / `COMPLETE`; geometry gate `APPROVED` pada DS-DEC-006-CONTROL-GEOMETRY-GATE | Primary serta outline/ghost berlabel ditutup pada subkeputusan; input/search/file-upload dan icon-only ditutup pada DS-DEC-006-CONTROLS; badge noninteractive tidak memakai minimum 44px; option chip mengikuti DS-DEC-008-OPTION-CHIP | Exact visual field height/padding, icon size/shape, actionable chip geometry, spacing, touch/keyboard proof, device/runtime proof, dan control lain tetap `UNVERIFIED` |
| DS-DEC-006-PRIMARY | Default primary geometry / `APPROVED` | Owner memilih 44px, padding 16px per sisi, radius 8px, uiData, lebar mengikuti isi dan area klik mengikuti visual pada 2026-09-21 setelah preview ukuran | Default labelled primary ditutup; varian lain, label panjang/zoom, izin implementasi dan runtime proof terpisah |
| DS-DEC-006-REFLOW | Primary responsive behavior / `APPROVED` | Minimum 44px, padding vertikal 12px, wrap, batas container, susunan action vertikal bila perlu, loading stabil | Bug loading preview diperbaiki terpisah; runtime aplikasi dan zoom/screen reader belum dibuktikan |
| DS-DEC-006-SECONDARY-REFLOW | Outline/ghost responsive behavior / `APPROVED`; kontrak `COMPLETE` | Owner menerima preview 27 kasus pada 2026-09-21: minimum 44px, padding 12px/16px, word wrapping, batas container, action-group stacking, dan loading stabil | Berlaku untuk labelled buttons pada white; gap preview bukan token; on-dark, contextual announcement, assistive technology, application runtime, dan control lain tetap UNVERIFIED |
| DS-DEC-006-CONTROLS | Remaining control hit targets / `APPROVED`; parent `COMPLETE` | Owner menyetujui pada 2026-09-21: input/search/file-upload memiliki target interaktif minimum 44px; icon-only memiliki area 44×44px; badge tetap compact dan noninteractive kecuali dipromosikan ke contract chip/button | Hit-target policy ditutup; geometry gate disetujui pada DS-DEC-006-CONTROL-GEOMETRY-GATE; exact visual field height/padding, visual icon size/shape, actionable chip geometry, spacing, keyboard/assistive-technology proof, device/runtime proof, dan implementasi tetap `UNVERIFIED` |
| DS-DEC-006-CONTROL-GEOMETRY-GATE | Control geometry proof gate / `APPROVED`; control contracts `COMPLETE` | Owner menyetujui pada 2026-09-21: target interaktif minimum 44px tetap baseline; field height/padding, icon size/shape, actionable chip geometry, dan spacing final dipilih hanya melalui proof touch, keyboard, zoom, dan layar sempit | Gate ditutup; exact field tokens, icon geometry, chip anatomy/reflow, assistive-technology proof, runtime, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-007 | Media / `COMPLETE`; role policy dan geometry gate `APPROVED` pada subkeputusan | Role policy: product/CAD `contain`; documentary photo `cover` dengan focal point; tidak ada global ratio; exact ratio/crop hanya melalui proof aset nyata | Exact ratio, crop per breakpoint, art direction, loading, framed/full-bleed, dan proof hero/card tetap `UNVERIFIED` |
| DS-DEC-007-MEDIA-POLICY | Media role policy / `APPROVED`; media contract `COMPLETE` | Owner menyetujui pada 2026-09-21: product/CAD render `contain`; workshop/process photo `cover` dengan focal point; ratio evidence-specific tanpa global ratio | Policy peran ditutup; exact ratio, crop per breakpoint, focal-point implementation, loading, `srcset`/`sizes`, full-bleed behavior, visual/runtime proof, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-007-MEDIA-GEOMETRY-GATE | Media geometry proof gate / `APPROVED`; media contract `COMPLETE` | Owner menyetujui pada 2026-09-21: exact ratio dan crop dipilih hanya melalui proof dengan aset representatif berizin; tidak ada global ratio; rasio Apple dan default 21:9/16:9/1:1 tidak disalin tanpa bukti | Gate ditutup; canonical hero/card ratio, crop per breakpoint, internal padding, loading, source selection, runtime, visual proof, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-008 | Cards / badges / patterns / `UNVERIFIED` | Card interaction boundary ditutup pada DS-DEC-008-CARD-INTERACTION; option-chip role/behavior ditutup pada DS-DEC-008-OPTION-CHIP; Candidate B visual direction, anatomy, reflow policy, announcement policy, runtime/assistive-technology acceptance gate, dan styleguide-only implementation permission ditutup pada DS-DEC-008-OPTION-CHIP-VISUAL, DS-DEC-008-OPTION-CHIP-ANATOMY-GATE, DS-DEC-008-OPTION-CHIP-REFLOW-GATE, DS-DEC-008-OPTION-CHIP-ANNOUNCEMENT, DS-DEC-008-OPTION-CHIP-RUNTIME-AT-GATE, dan DS-DEC-008-OPTION-CHIP-IMPLEMENTATION; scoped Chromium/browser proof dicatat `VERIFIED` pada DS-DEC-008-OPTION-CHIP-AT-PROOF; badge wrapping ditutup pada DS-DEC-008-BADGE-REFLOW; remaining pattern relevance menjadi evidence UNVERIFIED | Contract card/pattern sesuai kebutuhan Niuva, termasuk token mapping detail, marker gap, thumbnail/price anatomy, exact threshold/collision proof, broader screen-reader/runtime acceptance, dan elemen yang benar-benar diperlukan |
| DS-DEC-008-CARD-INTERACTION | Card interaction boundary / `APPROVED`; card contract `COMPLETE` | Owner menyetujui pada 2026-09-21: card static secara default; actionable card memakai satu action boundary atau whole-card link; nested interactive controls dilarang | Boundary interaksi ditutup; anatomy, state, selected behavior, focus/keyboard proof, nested-content proof, runtime, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-008-OPTION-CHIP | Option chip role and behavior / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: option chip terpisah dari badge, memakai native button semantics, target minimum 44px, serta state selected/unavailable yang terlihat | Role/behavior policy dan scoped styleguide implementation/runtime evidence ditutup; Candidate B direction ditutup pada DS-DEC-008-OPTION-CHIP-VISUAL; cross-browser/physical screen-reader interoperability, product-route runtime, dan product propagation tetap gate terpisah |
| DS-DEC-008-OPTION-CHIP-VISUAL-GATE | Option chip visual proof gate / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: selected/unavailable wajib memiliki cue persisten yang tidak bergantung pada warna; option chip tetap terpisah dari badge; gate dibuktikan melalui keyboard focus, grayscale/contrast, representative content, dan narrow-screen reflow | Gate ditutup; Candidate B direction dipilih pada DS-DEC-008-OPTION-CHIP-VISUAL; scoped Chromium acceptance `VERIFIED`; cross-browser/physical screen-reader interoperability dan product propagation tetap terpisah |
| DS-DEC-008-OPTION-CHIP-INTERACTION-GATE | Option chip keyboard/state communication proof gate / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: native button keyboard behavior (Tab/Enter/Space), focus tetap setelah selection, unavailable tidak dapat diaktifkan, dan selected/unavailable tersedia melalui semantic state/status | Gate ditutup; scoped keyboard, focus, state, and unavailable behavior `VERIFIED` pada styleguide proof; cross-browser/physical screen-reader interoperability dan product propagation tetap terpisah |
| DS-DEC-008-OPTION-CHIP-VISUAL | Option chip visual direction / `APPROVED`; option-chip contract `COMPLETE` | Owner memilih Candidate B pada 2026-09-21 setelah preview A/B: surface putih, quiet outline, selected marker + underline cue, dan explicit unavailable label | Visual direction dan scoped implementation evidence ditutup; cross-browser/physical screen-reader interoperability, product runtime, dan product propagation tetap gate terpisah |
| DS-DEC-008-OPTION-CHIP-VISUAL-ACCEPTANCE | Styleguide visual acceptance / `APPROVED`; option-chip contract `COMPLETE` | Owner menerima preview aktual `/auis/styleguide#option-chip-proof` pada 2026-09-22 untuk state selected, unavailable, dan narrow-screen reflow | Visual acceptance dan scoped Chromium/browser acceptance `VERIFIED` untuk proof styleguide; cross-browser/physical screen-reader interoperability, product propagation, dan official promotion tetap terpisah |
| DS-DEC-008-OPTION-CHIP-ANATOMY-GATE | Option chip anatomy and geometry / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: radius 8px, minimum height 44px, padding 8px/12px, marker 18px, label wrap pada batas kata tanpa truncation/shrink, lebar content-driven dalam container, dan source order dipertahankan saat reflow | Anatomy/geometry gate dan named styleguide reflow proof `VERIFIED`; cross-browser/physical screen-reader interoperability, touch-device behavior, dan product propagation tetap terpisah |
| DS-DEC-008-OPTION-CHIP-REFLOW-GATE | Option chip group reflow policy / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: group wrap dalam source order, tanpa horizontal scroll/truncation/font shrinking; unavailable label boleh wrap tetapi tetap eksplisit; proof memakai label nyata pada frame 220px/280px/320px | Reflow policy dan scoped no-overflow proof `VERIFIED`; touch-device behavior, cross-browser/physical screen-reader interoperability, dan product propagation tetap terpisah |
| DS-DEC-008-OPTION-CHIP-ANNOUNCEMENT | Option chip announcement policy / `APPROVED`; option-chip contract `COMPLETE` | Owner menyetujui pada 2026-09-21: semantic state pada control yang sama; label + state singkat tanpa duplicate live announcement; unavailable tidak activate; adjacent status hanya untuk downstream change yang material; focus tidak berpindah | Policy dan scoped native/ARIA/status implementation `VERIFIED`; physical screen-reader output, cross-browser interoperability, dan product runtime tetap gate terpisah |
| DS-DEC-008-OPTION-CHIP-AT-PROOF | Local option chip interaction/accessibility evidence / `VERIFIED` | Pada 2026-09-22 scoped Playwright Chromium preview lulus untuk native button, role/name queries, aria-pressed/disabled state, Space activation, state/status update, focus retention, unavailable behavior, explicit label, narrow reflow/no horizontal overflow, dan zero console errors | Evidence berlaku untuk named styleguide proof; cross-browser/physical screen-reader output, touch-device behavior, dan product-route runtime tetap terpisah |
| DS-DEC-008-OPTION-CHIP-RUNTIME-AT-GATE | Option chip runtime/assistive-technology acceptance gate / `APPROVED`; scoped evidence `VERIFIED` | Owner menyetujui pada 2026-09-21: acceptance harus memakai actual screen-reader/browser pair dalam runtime yang disetujui atau scoped acceptance preview; mencakup keyboard entry/activation, selected/unavailable, focus retention, concise announcement, material downstream status, dan narrow-screen reflow | Scoped styleguide acceptance preview menutup browser/semantics gate; cross-browser/physical screen-reader interoperability, touch-device behavior, product runtime, dan propagation tetap gate terpisah |
| DS-DEC-008-OPTION-CHIP-IMPLEMENTATION | Option chip styleguide implementation authorization / `APPROVED`; implementation `VERIFIED` | Owner menyetujui pada 2026-09-21 implementation proof scoped ke `/auis/styleguide#option-chip-proof`, memakai native button, Candidate B, minimum target 44px, selected/unavailable semantics, dan source-order reflow; product-screen propagation tidak termasuk | Styleguide-only implementation dan acceptance ditutup; cross-browser/physical screen-reader interoperability, product propagation, and official promotion remain separate gates; visual acceptance proof ditutup Owner pada 2026-09-22 |
| DS-DEC-008-BADGE-REFLOW | Badge responsive label behavior / `APPROVED`; kontrak `COMPLETE` | Owner memilih Candidate A pada 2026-09-21: wrap pada batas kata, tinggi bertambah, tanpa truncation/ellipsis/overflow; technical label tetap 1–3 kata | Scope label behavior dan containment; padding final, max-width/container policy, semantic variants, hit target, screen reader, application runtime, dan implementasi tetap UNVERIFIED |
| DS-DEC-009 | Footer / `COMPLETE`; policy `APPROVED` pada DS-DEC-009-FOOTER-POLICY | Grouped columns pada wide, compact stack, legal/support row terpisah, tidak sticky default | Exact surface, column count, typography, spacing, link/focus states, legal content, dan responsive proof menjadi evidence UNVERIFIED |
| DS-DEC-009-FOOTER-POLICY | Footer structure and responsive policy / `APPROVED`; footer contract `COMPLETE` | Owner menyetujui pada 2026-09-21: grouped content dalam beberapa kolom bila ruang mendukung, stack pada compact, legal/support row terpisah, tanpa sticky/frosted/parchment treatment | Policy structure/reflow ditutup; exact tokens, content groups, column count, typography, spacing, link/focus states, legal content, visual/runtime proof, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-010 | Links / dark contexts / `COMPLETE`; policy `APPROVED` pada DS-DEC-010-LINK-POLICY | Light `brand-action`, dark `paper-white`, native link semantics, persistent inline cue, dan visible focus requirement | Visited state, exact cue/underline treatment, dedicated dark-link token, long-label reflow, component mapping, dan runtime proof menjadi evidence UNVERIFIED |
| DS-DEC-010-LINK-POLICY | Text-link role and context policy / `APPROVED`; link contract `COMPLETE` | Owner menyetujui pada 2026-09-21: light link `brand-action`; dark link `paper-white`; native link semantics; inline cue tetap terlihat; disabled navigation bukan default | Role/context policy ditutup; exact cue, visited state, long-label behavior, dedicated dark-link token, focus composition, runtime, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-011 | Typography fallback / `COMPLETE`; policy `APPROVED` pada DS-DEC-011-FALLBACK-POLICY | Space Grotesk → Arial → Helvetica → sans-serif; preserve size, weight, line-height, letter-spacing, dan spacing sejauh metric memungkinkan; Inter dan SF Pro bukan substitute resmi | Exact metric adjustment/font-size-adjust values, trigger threshold, proof scope, runtime font-loading verification, dan implementation menjadi evidence UNVERIFIED |
| DS-DEC-011-FALLBACK-POLICY | Typography fallback policy / `APPROVED`; typography contract `COMPLETE` | Owner menyetujui pada 2026-09-21: primary stack Space Grotesk → Arial → Helvetica → sans-serif; hierarchy dipertahankan; metric adjustment dan `font-size-adjust` tidak dipakai pada current scope; Inter dan SF Pro dikecualikan | Fallback policy ditutup; future adjustment hanya `DEFERRED` sampai named proof; runtime font loading dan implementation evidence tetap `UNVERIFIED` |
| DS-DEC-012 | Focus / motion / `COMPLETE`; baseline `APPROVED` pada DS-DEC-012-FOCUS-MOTION-BASELINE | Focus-visible wajib jelas pada setiap interactive control; reduced motion menghapus gerakan non-esensial; shared default color 150ms dan press translation 100ms; primary timing sudah ditutup pada DS-DEC-012-PRIMARY | Exact compositing, focus recovery, runtime engine, assistive-technology proof, dan implementation menjadi evidence UNVERIFIED |
| DS-DEC-012-FOCUS-MOTION-BASELINE | Cross-component focus and reduced-motion policy / `APPROVED`; contracts tetap `COMPLETE` | Owner menyetujui pada 2026-09-21: setiap interactive control memiliki focus-visible yang jelas; ring 3px + separator 2px + offset 2px; shared default timing 150ms/100ms; reduced motion menghapus translasi/rotasi/gerakan non-esensial sambil mempertahankan state/status | Baseline policy ditutup; runtime engine, assistive technology, dan izin implementasi tetap `UNVERIFIED` |
| DS-DEC-012-PRIMARY | Primary timing / `APPROVED` | Owner menyetujui preview HTML pada 2026-09-21: hover/release color 150ms, pressed entry dan release translation 100ms, easing cubic-bezier(0.2, 0, 0, 1), focus langsung, spinner 800ms linear, reduced motion tanpa gerakan | Timing primary ditutup; announcement dan runtime aplikasi belum diverifikasi; angka simulasi loading/width tidak menjadi token |
| DS-DEC-013 | Functional gradient / `NOT APPLICABLE` untuk scope MVP/styleguide; future gate `APPROVED` dan `DEFERRED` | Tidak ada gradient token atau kandidat untuk scope sekarang. Functional gradient hanya dapat dibuka kembali setelah ada named functional need seperti data visualization atau media mask | Tidak boleh ada candidate, token, atau implementasi sebelum kebutuhan masa depan didokumentasikan dan proof dilakukan; decorative gradient tetap `NOT APPLICABLE` melalui DS-DEC-014 |
| DS-DEC-013-GRADIENT-GATE | Functional gradient gate / `APPROVED`; current scope `NOT APPLICABLE`, future use `DEFERRED` | Owner menyetujui pada 2026-09-21 dan menegaskan pada 2026-09-22: Niuva MVP dan AUiS styleguide tidak membuat gradient token/kandidat; kebutuhan masa depan harus melalui proof dan keputusan terpisah | Gate ditutup untuk mencegah gradient tanpa fungsi; future use, visual treatment, token, proof detail, runtime, dan izin implementasi `DEFERRED` sampai kebutuhan nyata muncul |
| DS-DEC-014 | Apple-specific reference exclusions / `APPROVED` | Owner menetapkan pada 2026-09-21 bahwa treatment Apple yang tidak dibutuhkan Niuva menjadi `NOT APPLICABLE` | Frosted sub-navigation, pearl/capsule button, Apple dark product-tile micro-variants, decorative gradient/blur, Apple product-image shadow, serta tile rhythm/ratio Apple yang tidak diperlukan Niuva tidak dibahas ulang; functional gradient tetap mengikuti `DS-DEC-013-GRADIENT-GATE` dan rasio/crop media nyata tetap memerlukan keputusan Niuva tersendiri |
| DS-DEC-015 | MVP design scope and reference boundary / `APPROVED` | Owner menyetujui pada 2026-09-22: keputusan desain final untuk fase ini dibatasi pada Niuva MVP dan AUiS styleguide saat ini; Apple hanya referensi struktur; treatment Apple yang tidak diperlukan Niuva menjadi `NOT APPLICABLE` | Scope Batch A ditutup; product-screen propagation, runtime/provider/production acceptance, dan component decisions lain tetap gate terpisah; buka kembali hanya untuk named Niuva route/use case, proof, dan keputusan eksplisit |
| DS-DEC-016 | Component contract baseline / `APPROVED`; current contracts `COMPLETE` | Owner menyetujui pada 2026-09-22 policy baseline untuk controls, badge, navigation, card/patterns, footer, dan links; DS-DEC-018 fixes the exact current-scope defaults | Contract decisions are closed; runtime/AT acceptance, implementation acceptance, product propagation, and production/provider gates remain separate |
| DS-DEC-016-CONTROLS | Controls contract policy / `APPROVED`; control contracts `COMPLETE` | Actionable target minimum 44px; icon-only 44×44px; input rectangular/full-width by default; search hanya dengan named route/use case; status loading/result ringkas dan tidak duplikatif; on-dark bukan automatic inverse | Policy ditutup; field geometry, icon geometry, search/upload states, announcement wording/mechanism, AT/runtime, dan implementation tetap `UNVERIFIED` |
| DS-DEC-016-BADGE | Badge contract policy / `APPROVED`; badge contract `COMPLETE` | Badge tetap compact dan noninteractive; status umum sentence case; technical label uppercase 1–3 kata; wrap pada batas kata tanpa truncation, ellipsis, shrink, atau spill | Policy ditutup; padding, max-width, container, semantic variants, AT/runtime, dan implementation tetap `UNVERIFIED` |
| DS-DEC-016-NAVIGATION | Navigation contract policy / `APPROVED`; navigation contract `COMPLETE` | Primary link set kecil memakai visible wrapped row dalam source order; horizontal scroll bukan default; disclosure hanya bila link set besar mengganggu scanability; sub-navigation `NOT APPLICABLE` untuk scope saat ini | Policy ditutup; active route, exact geometry, sticky behavior, disclosure implementation, focus/keyboard proof, runtime, dan future sub-navigation need tetap gate terpisah |
| DS-DEC-016-CARD-PATTERNS | Card and pattern ownership policy / `APPROVED`; card/pattern contracts `COMPLETE` | Card static by default; actionable card satu action boundary atau whole-card link; nested interactive controls dilarang; patterns route-owned; sticky summary/action bukan default | Policy ditutup; anatomy, density, media geometry, sticky collision proof, runtime, dan implementation tetap `UNVERIFIED` |
| DS-DEC-016-FOOTER-LINKS | Footer and text-link contract policy / `APPROVED`; footer/link contracts `COMPLETE` | Footer grouped columns pada wide dan reading-order stack pada compact; legal/support terpisah; no sticky/frosted/parchment; links native, light `brand-action`, dark `paper-white`, cue non-color tetap terlihat | Policy ditutup; exact footer tokens/content, visited/cue detail, dark-link token, long-label behavior, focus/runtime, dan implementation tetap `UNVERIFIED` |
| DS-DEC-017-EVIDENCE-BOUNDARY | Evidence and acceptance boundary / `APPROVED`; current evidence remains mixed | Owner menyetujui pada 2026-09-22 evidence ladder dari documentation, local technical evidence, named visual acceptance, runtime/AT, product-route proof, hingga provider/production gate | Boundary ditutup; setiap claim harus menyebut level dan scope; belum ada runtime/AT, layout/media route, product-route, atau provider/production acceptance umum |
| DS-DEC-017-RUNTIME-AT-ACCEPTANCE | Runtime and assistive-technology acceptance / gate `APPROVED`; evidence `UNVERIFIED` | Actual browser/screen-reader pair pada runtime yang disetujui; keyboard entry, focus retention/recovery, state announcement, unavailable behavior, dan narrow reflow | Gate criteria ditutup; actual output/interoperability dan acceptance result tetap `UNVERIFIED` sampai evidence nyata tersedia |
| DS-DEC-017-LAYOUT-MEDIA-PROOF | Layout/media route proof / gate `APPROVED`; proof `DEFERRED` | Named route, representative licensed assets, compact/standard/wide viewport, reading/action order, no overflow, focus, media role/crop, loading, dan recovery | Exact composition, ratio/crop/loading/art direction/sticky collision tetap `DEFERRED` sampai route proof dibuka |
| DS-DEC-017-PRODUCT-ROUTE-PROOF | Product-route acceptance / `SEPARATE GATE`; technical proof `VERIFIED` for `/` and `/project-brief` | Candidate scope: homepage, project brief, checkout, dan admin; dua route pertama memiliki named technical evidence pada `docs/frontend/product-route-proof.md` | Visual acceptance Owner masih pending; tidak ada product-screen propagation atau production readiness yang tersirat; propagation hanya setelah proof dan keputusan terpisah |

Batch B menutup policy baseline kontrak komponen melalui `DS-DEC-016`; Batch C
menutup evidence boundary melalui `DS-DEC-017-EVIDENCE-BOUNDARY`; DS-DEC-018
memfinalkan exact current-scope defaults. Evidence dapat tetap `PARTIAL` atau
`UNVERIFIED` ketika route proof, runtime/AT, device touch, atau implementation
acceptance belum tersedia. Prioritas follow-up adalah evidence tersebut, bukan
menambah varian Apple atau token baru. Butir 013 tetap `DEFERRED` dan bukan
backlog implementasi wajib. Proof tidak boleh mengubah keputusan lain secara
diam-diam.

## Appendix A — Niuva Governance and Approval Boundaries

Design System Niuva memiliki delapan governed layers: Foundation, Primitives,
Core Components, Motion System, Creative Components, Decorative Effects,
Patterns, dan Governance. Base UI adalah primary interaction primitive; native
HTML tetap default ketika semantics-nya cukup; shadcn digunakan sebagai source
distribution untuk source-owned components; Lucide adalah approved icon
vocabulary.

Promotion path adalah `reference → candidate → proof → approved → official`.
Foundation Visual Proof, Typography System v1.0, P0/P1 component proof, Motion
System v1, dan recorded patterns memiliki scope approval masing-masing. Approval
styleguide tidak otomatis membuka product-screen propagation. Homepage dan
project brief pernah menjadi bounded proof; checkout, admin, Creative,
Decorative, dan bulk propagation tetap memerlukan named gate.

Pernyataan approval di atas adalah konteks warisan, bukan inventaris izin
implementasi terkini. Rujukan untuk memeriksa bukti dan scope terkait:

- [Component contracts](src/app/auis/styleguide/registry/component-contracts.md)
- [Design-system registry](src/app/auis/styleguide/registry/design-system.ts)

Perubahan desain baru dapat diusulkan dalam draft ini tanpa harus identik dengan
source lama. Sebelum menandainya `APPROVED`, catat keputusan dan named scope yang
mendukungnya. Persetujuan revisi dokumentasi tidak memilih alternatif visual,
tidak memberi izin implementasi, dan tidak membuktikan runtime atau visual
acceptance. Referensi tersebut tidak dipakai untuk membatalkan usulan baru
semata-mata karena berbeda dari implementasi sebelumnya.

## Appendix B — Apple Reference Coverage Check

### Structure coverage

Tabel ini menilai struktur dan isi, bukan runtime acceptance. `COMPLETE` dibatasi
pada cakupan baris; current-scope design choice tetap mengikuti
`DS-DEC-018-DESIGN-DECISION-CLOSURE`.

| Bagian referensi Apple | Lokasi padanan Niuva | Bagian tersedia | Kelengkapan spesifikasi | Relevansi | Informasi yang masih kurang |
|---|---|---|---|---|---|
| YAML version/name/description | Frontmatter | Ada | COMPLETE | APPLICABLE | Tidak ada |
| YAML colors/typography/rounded/spacing/components | Frontmatter | Ada | COMPLETE | APPLICABLE | Variant state tokens current defaults final |
| YAML layout/elevation/motion/metadata | Frontmatter tambahan | Ada | COMPLETE | APPLICABLE | Motion exact values dan component breakpoints tidak lengkap |
| Overview | `## Overview` | Ada | COMPLETE | APPLICABLE | Tidak ada gap struktural |
| Colors / Brand & Accent | `## Colors` | Ada | COMPLETE | APPLICABLE | Primary-button role conflict is DEFERRED evidence |
| Colors / Surface | `## Colors` | Ada | COMPLETE | APPLICABLE | Dark counterpart per component route/runtime evidence separate |
| Colors / Text | `## Colors` | Ada | COMPLETE | APPLICABLE | Dedicated dark-link token not required for current scope |
| Colors / Hairlines & Borders | `## Colors` | Ada | COMPLETE | APPLICABLE | Exact border mapping per component route/runtime evidence separate |
| Colors / Brand Gradient | `## Colors` | Ada | COMPLETE | NOT APPLICABLE untuk scope MVP/styleguide | Apple brand-gradient treatment tidak diadopsi; functional gradient hanya dapat dibuka kembali melalui DS-DEC-013-GRADIENT-GATE setelah named need dan proof |
| Typography / Font Family | `## Typography` | Ada | COMPLETE | APPLICABLE | Primary fallback stack, hierarchy preservation, dan substitute exclusions disetujui melalui DS-DEC-011-FALLBACK-POLICY; runtime font-loading proof terpisah |
| Typography / Hierarchy | `## Typography` | Ada | COMPLETE | APPLICABLE | Tidak ada gap untuk core roles |
| Typography / Principles | `## Typography` | Ada | COMPLETE | APPLICABLE | Tidak ada |
| Typography / Font Substitutes | `## Typography` | Ada | COMPLETE | APPLICABLE | Exact metric adjustment/font-size-adjust values, trigger threshold, proof, dan runtime verification not required for current scope |
| Layout / Spacing System | `## Layout` | Ada | COMPLETE | APPLICABLE | Extra scale steps tidak ditetapkan |
| Layout / Grid & Container | `## Layout` | Ada | COMPLETE | APPLICABLE | Container/gutter/reflow gate disetujui melalui DS-DEC-005-LAYOUT-GEOMETRY-GATE; exact spans, minimum card width, inter-column gutter, sticky collision, dan density detail route/runtime evidence separate |
| Layout / Whitespace Philosophy | `## Layout` | Ada | COMPLETE | APPLICABLE | Tidak ada |
| Elevation table/philosophy | `## Elevation & Depth` | Ada | COMPLETE | APPLICABLE | Focus-visible baseline disetujui; exact composited treatment, offset, dan runtime proof is DEFERRED evidence |
| Decorative Depth | `## Elevation & Depth` | Ada | COMPLETE | APPLICABLE | Tidak ada decorative token baru |
| Motion / Focus baseline | `## Motion` dan `## Elevation & Depth` | Ada | COMPLETE | APPLICABLE | Shared 150ms/100ms timing, focus composition, CSS-first engine, and reduced-motion defaults final; runtime/AT evidence separate |
| Shapes / Radius Scale | `## Shapes` | Ada | COMPLETE | APPLICABLE | Tidak ada gap untuk four roles |
| Shapes / Photography Geometry | `## Shapes` | Ada | COMPLETE | APPLICABLE | Role policy `contain`/`cover` dan geometry gate disetujui; exact aspect ratio, crop, loading, full-bleed rules tetap `DEFERRED` sampai proof aset nyata |
| Components groups | `## Components` | Ada | COMPLETE | APPLICABLE | Beberapa component specs partial/not documented |
| Do's and Don'ts | `## Do's and Don'ts` | Ada | COMPLETE | APPLICABLE | Tidak ada gap struktural |
| Responsive / Breakpoints | `## Responsive Behavior` | Ada | COMPLETE | APPLICABLE | Component thresholds route/runtime evidence separate |
| Responsive / Touch Targets | `## Responsive Behavior` | Ada | COMPLETE | APPLICABLE | Minimum target policy disetujui; geometry gate `DS-DEC-006-CONTROL-GEOMETRY-GATE` berlaku; exact field/padding/icon/chip geometry dan proof runtime is DEFERRED evidence |
| Responsive / Collapsing Strategy | `## Responsive Behavior` | Ada | COMPLETE | APPLICABLE | Navigation wrapped-row model dan geometry gate disetujui; per-component details route/runtime evidence separate |
| Responsive / Image Behavior | `## Responsive Behavior` | Ada | COMPLETE | APPLICABLE | Role policy tersedia; focal point, breakpoint art direction, loading, dan full-bleed behavior route/runtime evidence separate |
| Iteration Guide | `## Iteration Guide` | Ada | COMPLETE | APPLICABLE | Tidak ada gap struktural |
| Known Gaps and Evidence Follow-ups | `## Known Gaps and Evidence Follow-ups` | Ada | COMPLETE | APPLICABLE | Evidence follow-up dirinci; tidak ada current-scope decision gap |

### Component coverage

Semua entri referensi dipetakan, tetapi mapping tidak mewajibkan implementasi
padanan satu-per-satu. `NOT APPLICABLE` mengecualikan treatment yang bertentangan
dengan arah tertulis; `DEFERRED` berarti proof route/future belum menjadi scope,
bukan keputusan desain yang belum dipilih.

| Komponen/varian referensi Apple | Padanan Niuva | Bagian tersedia | Kelengkapan spesifikasi | Relevansi | Catatan |
|---|---|---|---|---|---|
| `button-primary` | `{components.button-primary}` | Ada sebagai mapping | COMPLETE | APPLICABLE | A, state statis, perilaku, dan default geometry disetujui; timing disetujui; responsive/runtime tetap parsial |
| `button-primary-focus` | State pada `button-primary` | Ada sebagai mapping | COMPLETE | APPLICABLE | Primary: ring Niuva Blue 3px + pemisah putih 2px disetujui; runtime focus belum diuji |
| `button-primary-active` | State pada `button-primary` | Ada sebagai mapping | COMPLETE | APPLICABLE | Primary: fill #2B4053 dan turun 1px disetujui; timing/reduced motion disetujui untuk preview; runtime aplikasi belum diuji |
| `button-secondary-pill` | `{components.button-outline}` | Ada sebagai mapping | COMPLETE | APPLICABLE | Outline white default/hover/pressed, ukuran, dan responsive reflow disetujui; radius 8px, bukan pill |
| `button-dark-utility` | Tidak ada padanan pasti | Ada sebagai mapping | NOT DOCUMENTED | NOT APPLICABLE untuk scope MVP/styleguide | Tidak ada kebutuhan Niuva yang dinamai; jangan mengarang dark utility variant. Buka kembali hanya melalui named route/use case dan proof |
| `button-pearl-capsule` | Tidak ada padanan pasti | Ada sebagai mapping | — | NOT APPLICABLE | Pearl/ring treatment bukan vocabulary Niuva; dikecualikan oleh DS-DEC-014 |
| `button-store-hero` | `{components.button-primary}` bila action hero dibutuhkan | Ada sebagai mapping | NOT DOCUMENTED | NOT APPLICABLE sebagai varian Apple terpisah | Hero action Niuva memakai primary contract yang sudah ada; tidak membuat large marketing variant tanpa named need dan proof |
| `button-icon-circular` | Icon-only button | Ada sebagai mapping | COMPLETE | APPLICABLE | Hit area 44×44px disetujui melalui DS-DEC-006-CONTROLS; circular shape bukan default; geometry gate DS-DEC-006-CONTROL-GEOMETRY-GATE berlaku; visual icon size, state, dan overlay behavior belum ada |
| `text-link` | Brand-action links | Ada sebagai mapping | COMPLETE | APPLICABLE | Light `brand-action`, native link semantics, persistent inline cue, dan focus requirement disetujui melalui DS-DEC-010-LINK-POLICY; dedicated component/states belum ada |
| `text-link-on-dark` | Dark-context link | Ada sebagai mapping | COMPLETE | APPLICABLE | Dark `paper-white` role dan native link semantics disetujui; dedicated dark-link token, exact cue, states, dan component mapping belum ada |
| `global-nav` | `top-navigation` | Ada sebagai mapping | COMPLETE | APPLICABLE | Wrapped-row model dan geometry gate disetujui melalui DS-DEC-004-NAVIGATION-GEOMETRY-GATE; exact tokens/size, active route, disclosure, dan runtime belum ada |
| `sub-nav-frosted` | `sub-navigation` | Ada sebagai mapping | — | NOT APPLICABLE | Treatment frosted tidak diadopsi menurut DS-DEC-014; sub-navigation juga `NOT APPLICABLE` untuk scope MVP/styleguide melalui DS-DEC-015 dan hanya dapat dibuka kembali untuk named route/link set |
| `product-tile-light` | Product discovery / evidence presentation | Ada sebagai mapping | COMPLETE | APPLICABLE | Route-owned media role; named route proof is DEFERRED |
| `product-tile-parchment` | Quiet/brand surfaces | Ada sebagai mapping | COMPLETE | APPLICABLE | Apple parchment tile variant is NOT APPLICABLE; named route proof is DEFERRED |
| `product-tile-dark` | Explicit dark working zone | Ada sebagai mapping | COMPLETE | APPLICABLE | Explicit dark working zone is final; product-tile anatomy is route-owned and DEFERRED |
| `product-tile-dark-2` | Tidak ada | Ada sebagai mapping | — | NOT APPLICABLE | Apple micro-step dark tile variant dikecualikan oleh DS-DEC-014; tidak ada counterpart Niuva |
| `product-tile-dark-3` | Tidak ada | Ada sebagai mapping | — | NOT APPLICABLE | Apple micro-step dark tile variant dikecualikan oleh DS-DEC-014; tidak ada counterpart Niuva |
| `store-utility-card` | `{components.card}` / evidence card | Ada sebagai mapping | COMPLETE | APPLICABLE | Static/action boundary follows DS-DEC-008-CARD-INTERACTION; store-specific anatomy is route-owned |
| `configurator-option-chip` | Badge/chip concept | Ada sebagai mapping | COMPLETE | APPLICABLE | Role/behavior, native button semantics, dan minimum target 44px disetujui melalui DS-DEC-008-OPTION-CHIP; Candidate B visual direction dan anatomy (8px radius, 44px minimum, padding 8px/12px, source-order wrap) serta no-horizontal-scroll reflow policy disetujui; styleguide-only implementation proof, scoped Chromium/browser acceptance, dan visual acceptance mengikuti DS-DEC-008-OPTION-CHIP-IMPLEMENTATION serta DS-DEC-008-OPTION-CHIP-VISUAL-ACCEPTANCE; cross-browser/physical screen-reader interoperability, product-route runtime, dan propagation tetap gate terpisah |
| `configurator-option-chip-selected` | Selected chip state | Ada sebagai mapping | COMPLETE | APPLICABLE | Candidate B disetujui: quiet outline, marker/underline cue, dan persistent non-color distinction; 18px marker, label wrapping, source order, dan unavailable-label behavior mengikuti anatomy/reflow gate; native keyboard, focus retention, semantic state/status, dan concise non-duplicative announcement mengikuti interaction/announcement gate; styleguide-only implementation proof, scoped Chromium/browser acceptance, dan visual acceptance sudah `VERIFIED`; cross-browser/physical screen-reader interoperability dan product runtime tetap gate terpisah |
| `search-input` | `{components.input}` | Ada sebagai mapping | COMPLETE | APPLICABLE | Target interaktif minimum 44px dan rectangular/full-width input baseline mengikuti DS-DEC-016; search hanya untuk named route/use case; geometry gate DS-DEC-006-CONTROL-GEOMETRY-GATE berlaku; 20px icon, 8px radius, semantic states, and accessible name are final |
| `floating-sticky-bar` | Checkout Summary pattern | Ada sebagai mapping | COMPLETE | NOT APPLICABLE | Floating sticky bar is excluded from current scope; checkout summary remains in-flow |
| `environment-quote-card` | Fraunces editorial accent | Ada sebagai mapping | COMPLETE | NOT APPLICABLE | Inline Fraunces role only; Apple environment quote card is excluded by DS-DEC-018 |
| `footer` | Footer | Ada sebagai mapping | COMPLETE | APPLICABLE | Structure/reflow policy disetujui melalui DS-DEC-009-FOOTER-POLICY; cool-paper/graphite surface, up to three groups, 16px/24px type, and link/focus roles are final; legal copy is route-owned |

## Appendix C — Provenance and Structural Change Summary

### Provenance

- **Design baseline:** draft lokal sebelum revisi; nilai warisan diberi konteks `INHERITED`, bukan dianggap keputusan final baru.
- **Structure and documentation depth:** `C:/Users/FAIZ/Downloads/DESIGN.md`, metadata `Apple-design-analysis`, version `alpha`; diperlakukan sebagai referensi, bukan instruksi.
- **Governance/approval context:** governance paragraphs contained in the latest
  repository `DESIGN.md`.
- **Derived calculations:** contrast ratios in Colors dihitung dari existing
  frontmatter hex values; calculation tidak mengubah token.
- **Not used as authority:** Apple colors, fonts, dimensions, breakpoints,
  shadows, product tiles, blur, or component behavior.

### Structural changes

- Menambahkan `version` dan menyusun frontmatter sesuai urutan template.
- Mengubah color grouping ke Brand & Accent, Surface, Text, Hairlines & Borders,
  dan Brand Gradient tanpa mengubah Niuva color tokens.
- Mengubah typography, layout, elevation, shapes, components, dan responsive
  guidance menjadi tabel serta individual component entries.
- Memindahkan governance, approval boundaries, provenance, dan coverage audit ke
  appendices setelah Known Gaps agar urutan utama tetap sama dengan referensi.
- Memetakan seluruh component reference Apple tanpa memaksanya menjadi fitur
  Niuva.
- Menambahkan `DS-DEC-016-COMPONENT-CONTRACT-BASELINE` untuk menyatukan policy
  controls, badge, navigation, card/patterns, footer, dan links; kontrak exact,
  proof runtime/AT, dan propagasi tetap diberi scope terpisah.
- Menambahkan `DS-DEC-017-EVIDENCE-BOUNDARY` dan evidence matrix untuk
  membedakan local technical evidence, visual acceptance, runtime/AT,
  product-route proof, serta provider/production gates.
- Menambahkan `DS-DEC-018-DESIGN-DECISION-CLOSURE` untuk memfinalkan exact
  current-scope defaults dan mengklasifikasikan seluruh follow-up sebagai
  `UNVERIFIED`, `DEFERRED`, atau `SEPARATE GATE`.
- Menghapus keputusan visual yang diperkenalkan pada revisi sebelumnya tetapi
  tidak berasal dari latest Niuva DESIGN.md: 72px display, 17/27 body, 128px
  section rhythm, 44px global controls, pill marketing CTA, dan shadowless
  panels sebagai aturan baru.

### Revision 1.1 — Decision and Specification Clarity

- Memisahkan kelengkapan, status keputusan, relevansi, dan scope penggunaan.
- Memindahkan primary color alternatives ke YAML tanpa selected default. Pada
  saat revision 1.1 ditulis, typography badge belum dipilih; keputusan DS-DEC-002
  dan DS-DEC-008-BADGE-REFLOW kemudian menutup typography serta label wrapping.
- Menambahkan component contract register, responsive decision checklist, dan
  decision register dengan syarat penutupan.
- Memisahkan keberadaan bagian dari kelengkapan isi pada coverage matrices.
- Tidak menetapkan palette, typography, dimensi, atau breakpoint baru; tidak
  mengubah source UI atau mencatat visual acceptance baru.

### Historical decision log — superseded by DS-DEC-018

Catatan bertanggal di bawah dipertahankan sebagai provenance. Setiap status
`PARTIAL`, `CANDIDATE`, atau pertanyaan yang disebut di dalamnya adalah keadaan
sebelum closure 2026-09-22; ia tidak membuka kembali keputusan current-scope.

### Decision Update — 2026-09-21

- Owner memilih A untuk `DS-DEC-001` setelah perbandingan visual statis:
  background `#3F607F`, text `#FFFFFF`, kontras teks 6,58:1.
- YAML, narasi button, contract register, dan coverage matrix diselaraskan.
- Catatan revision 1.1 di atas adalah riwayat sebelum pilihan ini. Approval baru
  hanya untuk warna dasar; typography badge, state interaksi, ukuran, dan
  implementasi tidak ikut disetujui oleh keputusan ini.

### Badge Typography Decision — 2026-09-21

- Owner menerima preview pemisahan badge umum dan technical label (`DS-DEC-002`).
- Badge umum: Space Grotesk 14/20, weight 500, tracking 0, sentence case;
  technical label: Space Grotesk 12/18, weight 500, tracking 0.05em, uppercase
  1–3 kata. Status panjang tetap memakai role umum.
- YAML, narasi, dan decision/contract register diselaraskan. Catatan sebelumnya
  mengenai typography yang belum dipilih merupakan riwayat sebelum approval ini.
- Container, padding, semantic variants, dan izin implementasi tidak ikut
  disetujui pada keputusan typography ini. Wrapping kemudian ditutup oleh
  `DS-DEC-008-BADGE-REFLOW`; preview 30px tidak dijadikan token.

### Badge Responsive Decision — 2026-09-21

- Owner memilih Candidate A setelah melihat perbandingan badge responsive.
  `DS-DEC-008-BADGE-REFLOW` dicatat sebagai keputusan perilaku label, bukan
  pengesahan seluruh geometry badge.
- Status umum wrap pada batas kata dan tinggi badge bertambah agar seluruh teks
  terbaca. Tidak ada truncation, ellipsis, font shrinking, atau spill keluar
  dari containing surface.
- Technical label tetap memakai uppercase 1–3 kata. Label yang lebih panjang
  tetap menjadi status umum sentence case, bukan technical label.
- Padding, max-width, kebijakan container, semantic variants, hit target,
  assistive technology, application runtime, dan implementasi tetap `historical unresolved`.
- Preview sementara diperbarui untuk menandai A sebagai pilihan Owner dan
  menampilkan B/C hanya sebagai contoh masalah; source UI tidak diubah.

### Primary State Visual Decision — 2026-09-21

- Owner menerima preview enam state primary button. Default tetap DS-DEC-001;
  lima state tambahan dicatat sebagai DS-DEC-003-VISUAL.
- YAML, spesifikasi Buttons, contract register, dan coverage diselaraskan.
- Interaction proposal DS-DEC-003-BEHAVIOR ditambahkan sebagai CANDIDATE untuk
  review berikutnya. Tidak ada perubahan source UI atau acceptance runtime.

### Primary Interaction Decision — 2026-09-21

- Owner menyetujui DS-DEC-003-BEHAVIOR: keyboard, loading, disabled, precedence,
  reduced motion, dan error/recovery yang tertulis pada Interaction behavior.
- YAML memakai `interactionBehavior`; status kandidat pada catatan revisi
  sebelumnya adalah riwayat sebelum persetujuan ini.
- Durasi/easing, detail announcement, ukuran final, verifikasi browser, dan izin
  implementasi tetap terpisah. Parent DS-DEC-003 belum ditutup seluruhnya.

### Primary Geometry Decision — 2026-09-21

- Owner menyetujui default labelled primary button: tinggi 44px, padding
  horizontal 16px per sisi, radius 8px, Space Grotesk 14/20 weight 500,
  lebar mengikuti isi, dan area klik mengikuti batas visual.
- Keputusan DS-DEC-006-PRIMARY dicatat pada YAML, Buttons, Layout, Touch Targets,
  dan register. Catatan lama mengenai ukuran yang belum dipilih adalah riwayat.
- Ukuran outline/ghost/input/badge/icon-only tidak ikut berubah pada keputusan
  ini; durasi/easing, label panjang/zoom/reflow, dan acceptance runtime tetap
  terbuka saat itu. Hit-target policy control kemudian dicatat terpisah pada
  `DS-DEC-006-CONTROLS`.

### Primary Timing Decision — 2026-09-21

- Owner menyetujui preview animasi HTML; DS-DEC-012-PRIMARY menjadi APPROVED.
- YAML, Buttons, decision register, dan coverage diselaraskan. Catatan lama
  mengenai timing historical unresolved adalah riwayat sebelum keputusan ini.
- Loading demo 3 detik, reserved width 160px, dan jeda demo bukan keputusan
  desain. Source UI, runtime aplikasi, dan detail announcement tidak berubah.

### Primary Loading Decision — 2026-09-21

- Owner menyetujui DS-DEC-003-LOADING. YAML, perilaku Buttons, dan decision
  register diselaraskan; catatan sebelumnya mengenai detail loading terbuka
  adalah riwayat sebelum persetujuan ini.
- Approval perilaku tidak menetapkan fixed width, copy per proses, atau durasi
  minimum. Source UI dan runtime aplikasi tidak berubah atau diverifikasi.

### Primary Responsive Decision — 2026-09-21

- DS-DEC-006-REFLOW: Owner menyetujui usulan label panjang dan layar sempit,
  sambil melaporkan bug teks loading terpotong pada preview. Persetujuan perilaku
  tidak menjadi penerimaan bug atau bukti runtime aplikasi.
- Tinggi 44px menjadi minimum; tinggi bertambah saat teks turun baris. Padding
  vertikal minimum 12px, horizontal 16px; label tidak dipotong atau diperkecil.
  Lebar dibatasi container. Jika pasangan action tidak muat sejajar, susun
  vertikal dengan urutan tetap. Full-width mengikuti kebutuhan komposisi.
- Pada ruang yang sama, loading mempertahankan ukuran tombol. Preview diperbaiki
  dengan reservasi ruang label normal dan loading sejak awal, bukan mengunci
  ukuran label pendek saat klik. Mekanisme preview ini belum menjadi kewajiban
  implementasi; hasil yang diwajibkan adalah teks terbaca tanpa pergeseran ukuran.
- Ketika container atau ukuran teks berubah, tombol tetap perlu reflow. Nilai
  gap dan styling secondary pada preview tidak ikut menjadi token resmi.

### Outline and Ghost Visual Decision — 2026-09-21

- Owner menerima preview default, hover, pressed, dan ukuran outline/ghost pada
  surface putih. DS-DEC-003-SECONDARY-VISUAL dicatat pada YAML dan narasi.
- Warna dan ukuran yang tercakup menjadi APPROVED; state lainnya, motion, dan
  konteks gelap tetap dipisahkan pada keputusan berikutnya.
- Source UI tidak diubah; parent DS-DEC-003 tetap parsial.

### Outline and Ghost Additional States — 2026-09-21

- Owner menyetujui preview focus, loading, dan disabled untuk outline/ghost
  pada surface putih. DS-DEC-003-SECONDARY-STATES mencatat scope visual saja.
- YAML, spesifikasi komponen, dan register diselaraskan. Catatan lama bahwa
  ketiga state belum dipilih merupakan riwayat sebelum keputusan ini.
- Timing, behavior, on-dark, padding vertikal, hit target dan reflow belum ikut
  disetujui pada saat keputusan ini; keputusan berikutnya menutup sebagian
  scope tersebut tanpa mengubah source UI.

### Outline and Ghost Interaction Decision — 2026-09-21

- Owner menyetujui timing dan perilaku pada preview interaktif outline/ghost.
  DS-DEC-003-SECONDARY-BEHAVIOR dicatat di YAML, Buttons, dan register.
- Catatan lama mengenai timing/behavior terbuka adalah riwayat sebelum approval.
  Pengujian preview lokal tidak menjadi acceptance runtime aplikasi.
- On-dark, pengumuman kontekstual, pengujian screen reader, dan runtime aplikasi
  tetap terpisah; source UI tidak diubah.

### Outline and Ghost Responsive Decision — 2026-09-21

- Owner menyetujui `DS-DEC-006-SECONDARY-REFLOW` setelah melihat preview label
  satu baris, dua baris, dan susunan tombol pada layar sempit.
- Outline/ghost berlabel memiliki minimum 44px, padding vertikal 12px dan
  horizontal 16px per sisi, hit area mengikuti batas visual, serta wrapping pada
  batas kata tanpa truncation atau pengecilan font.
- Lebar mengikuti isi dalam batas container. Pasangan action menjadi vertikal
  dan full-width ketika lebar natural plus gap tidak muat; urutan tetap. Loading
  mempertahankan ruang label normal/loading sehingga tidak ada size shift pada
  container yang sama.
- Preview mencakup 27 kasus pada lebar 220px, 320px, dan 620px serta skala
  teks 100%, 150%, dan 200%. Nilai gap 12px hanya alat preview, bukan token.
- On-dark, redaksi announcement per konteks, assistive technology, application
  runtime, dan control selain labelled outline/ghost tetap `historical unresolved`; source UI tidak
  diubah.

### Apple-specific Exclusion Decision — 2026-09-21

- Owner menetapkan batas referensi: scope keputusan final adalah Niuva MVP dan
  AUiS styleguide saat ini. Treatment Apple yang tidak dibutuhkan Niuva dicatat
  sebagai `NOT APPLICABLE` dan tidak dibahas ulang kecuali scope dibuka kembali.
- `DS-DEC-014` mencakup frosted sub-navigation, pearl/capsule button, Apple
  dark product-tile micro-variants, decorative gradient/blur, product-image
  shadow khas Apple, serta tile rhythm/ratio Apple yang tidak diperlukan Niuva.
- Keputusan ini tidak menutup kebutuhan sub-navigation Niuva, tidak mengubah
  rasio/crop media nyata yang masih `NOT DOCUMENTED`, dan tidak mengubah
  `DS-DEC-013-GRADIENT-GATE`: functional gradient tetap kondisional dan
  memerlukan named need serta proof.
- Ini adalah keputusan scope referensi, bukan izin implementasi atau propagasi ke
  product screens. Source UI tidak diubah.

### Batch A MVP Scope Closure — 2026-09-22

- Owner menyetujui `DS-DEC-015-MVP-DESIGN-SCOPE`: keputusan desain final untuk
  fase ini dibatasi pada **Niuva MVP dan AUiS styleguide saat ini**. Referensi
  Apple dipakai untuk membandingkan kelengkapan struktur; ia bukan otoritas
  visual dan tidak membuka kewajiban implementasi.
- Treatment Apple yang tidak diperlukan Niuva tetap `NOT APPLICABLE` dan tidak
  dibahas ulang: frosted sub-navigation, pearl/capsule button, dark utility dan
  store-hero variant terpisah, Apple dark product-tile micro-variants,
  decorative gradient/blur, product-image shadow khas Apple, serta tile
  rhythm/ratio Apple yang tidak dibutuhkan Niuva.
- Primary navigation tetap memakai wrapped row untuk link set kecil karena
  label tetap terlihat dan dapat dipindai tanpa horizontal scroll. Separate
  sub-navigation untuk scope MVP/styleguide saat ini `NOT APPLICABLE`; ia hanya
  dapat dibuka kembali bila ada named route atau link set yang membutuhkannya,
  lalu dibuktikan melalui proof responsive/keyboard.
- Functional gradient `NOT APPLICABLE` untuk scope saat ini. Ia hanya dapat
  dibuka kembali untuk kebutuhan fungsional bernama, misalnya visualisasi data
  atau media mask, setelah proof dan keputusan terpisah. Tidak ada gradient
  token atau candidate yang dibuat sekarang.
- Media role policy Niuva tetap berlaku: product/CAD `contain`, workshop/process
  photo `cover`, dan ratio/crop mengikuti evidence nyata. Penutupan Batch A tidak
  mengubah gate media, runtime, provider, production, atau izin propagasi ke
  product screens.
- Alasan UX: keputusan ini mencegah hierarki dan token yang tidak diperlukan,
  mempertahankan discoverability pada navigasi utama, menghindari dekorasi yang
  tidak membawa makna status/evidence, dan menjaga Apple sebagai referensi
  struktur tanpa menggantikan vocabulary Niuva.

### Batch B Component Contract Baseline — 2026-09-22

- Owner menyetujui `DS-DEC-016-COMPONENT-CONTRACT-BASELINE` sebagai policy
  baseline untuk controls, badge, navigation, card/patterns, footer, dan links.
  Keputusan ini menyatukan aturan yang sebelumnya tersebar tanpa mengubahnya
  menjadi izin implementasi atau product-screen propagation.
- **Controls:** semua target actionable minimum 44px; icon-only 44×44px; input
  rectangular dan full-width dalam containing surface; search hanya untuk named
  route atau use case dan mewarisi input contract. Loading/result status ringkas
  dan tidak duplikatif; spinner dekoratif; on-dark tidak memiliki inverse variant
  otomatis.
- **Badge:** compact dan noninteractive secara default. Status umum memakai
  sentence case, technical label uppercase 1–3 kata. Label membungkus pada batas
  kata dan tinggi bertambah; truncation, ellipsis, font shrinking, dan spill
  dilarang. Padding, max-width, container, dan semantic variants tetap menunggu
  narrow proof.
- **Navigation:** primary link set kecil tetap memakai wrapped row yang terlihat
  dan mempertahankan source order. Horizontal scroll bukan default; disclosure
  hanya muncul bila link set yang lebih besar membuat wrapping sulit dipindai.
  Active route, exact geometry, sticky behavior, dan runtime tetap memerlukan
  named navigation proof.
- **Card dan patterns:** card static secara default; card actionable memiliki satu
  action boundary atau satu whole-card link; nested interactive controls dilarang.
  Action queue, product discovery, checkout summary, dan editorial patterns
  dimiliki route yang memakainya. Sticky summary/action bukan default dan harus
  membuktikan manfaat serta tidak bertabrakan dengan viewport, keyboard, atau
  footer.
- **Footer dan links:** footer memakai grouped columns ketika ruang mendukung,
  lalu stack dalam reading order pada compact, dengan legal/support row terpisah.
  Footer tidak sticky dan tidak memakai frosted/parchment treatment. Links tetap
  native; light memakai `brand-action`, dark memakai `paper-white`, dan cue
  inline harus tetap terlihat tanpa bergantung pada warna.
- Alasan UX: baseline ini menjaga target sentuh dan keyboard tetap dapat
  diprediksi, mencegah status metadata terbaca sebagai control, mempertahankan
  scanability saat reflow, dan menghindari token/variant yang hanya meniru Apple.
  Exact values, route-specific composition, announcement mechanism, runtime/AT,
  dan implementation acceptance tetap `historical unresolved` sampai proof masing-masing tersedia.

### Batch C Evidence Boundary — 2026-09-22

- Owner menyetujui `DS-DEC-017-EVIDENCE-BOUNDARY` untuk memisahkan enam jenis
  klaim: dokumentasi, bukti teknis lokal, named visual acceptance, runtime/
  assistive technology, product-route acceptance, dan provider/production gate.
- Evidence teknis lokal boleh mencakup test, DOM semantics, Chromium
  Accessibility Tree, browser smoke, dan no-overflow check. Bukti itu dicatat
  sebagai `PARTIAL` bila belum mencakup screen-reader speech, interoperabilitas
  browser/AT, device touch, atau product runtime.
- OptionChip memiliki visual acceptance `APPROVED` dan scoped Chromium/browser
  acceptance `VERIFIED` hanya pada `/auis/styleguide#option-chip-proof`;
  cross-browser/physical screen-reader interoperability, touch-device behavior,
  product-route runtime, dan product propagation tetap gate terpisah.
- Layout dan media memerlukan named route proof dengan representative licensed
  assets pada minimum satu compact frame (320px atau 390px), standard 768px,
  dan wide 1280px. Proof harus memeriksa reading/action order, overflow, target
  separation, focus, zoom/text scaling bila relevan, media role/crop, loading,
  dan recovery. Policy `contain` untuk product/CAD dan `cover` untuk
  workshop/process photo tidak berubah.
- Product-route acceptance untuk homepage, project brief, checkout, dan admin
  tetap `historical unresolved` sampai masing-masing memiliki named route evidence. Proof itu
  tidak otomatis memberi izin propagation, provider activation, deployment, atau
  production readiness.
- Alasan UX: pemisahan ini mencegah hasil test lokal dianggap sudah dapat
  dipakai pengguna nyata, memastikan media dan layout dibaca dalam konteks
  route sebenarnya, serta menjaga keputusan propagasi tetap dapat diaudit.

### Mobile Navigation Decision — 2026-09-21

- Owner menyetujui `DS-DEC-004`: primary navigation pada layar kecil memakai
  wrapped row untuk jumlah link yang kecil, dengan label tetap terlihat dan
  urutan link dipertahankan.
- Rekomendasi ini dipilih karena menjaga discoverability, lebih mudah dipindai,
  dan memiliki model keyboard/focus yang lebih langsung tanpa gesture horizontal
  atau state disclosure tambahan.
- Horizontal scroll tidak menjadi default. Disclosure tetap menjadi kandidat
  kondisional bila jumlah link bertambah sehingga wrapped row mengganggu
  scanability.
- Keputusan ini hanya menutup model responsive primary navigation. Geometry,
  threshold, focus/keyboard detail, active route, sticky behavior, footer,
  runtime proof, dan izin implementasi tetap `historical unresolved`; sub-navigation
  `NOT APPLICABLE` untuk scope MVP/styleguide dan hanya dapat dibuka kembali
  melalui named route/link set.

### Layout Container and Reflow Decision — 2026-09-21

- Owner menyetujui `DS-DEC-005`: token container `72rem / 48rem / 90rem`,
  gutter `1.25rem / 2rem`, dan wide 12-column composition tetap menjadi
  foundation layout.
- Pada compact, content memakai readable stack. Two-column hanya digunakan bila
  kedua kolom tetap terbaca dan tidak memaksa overflow; keputusan mengikuti
  kebutuhan content, bukan breakpoint tambahan dari referensi Apple.
- Rekomendasi ini menjaga reading order dan action order, mencegah kolom sempit
  yang sulit dipindai, serta membedakan density public dan admin tanpa membuat
  token baru.
- Exact spans, minimum card width, inter-column gutter, sticky summary/collision,
  density detail, visual/runtime proof, dan izin implementasi tetap `historical unresolved`.

### Control Hit Target Decision — 2026-09-21

- Owner menyetujui `DS-DEC-006-CONTROLS`: input, search, dan file-upload memiliki
  target interaktif minimum 44px; icon-only control memiliki area 44×44px.
- Badge tetap compact karena berfungsi sebagai label/summary noninteractive.
  Badge yang kelak menjadi option chip atau button memerlukan contract interaktif
  tersendiri dan tidak mewarisi keputusan badge statis secara otomatis.
- Batas ini menjaga aksesibilitas sentuh tanpa memperbesar status metadata yang
  tidak dapat diaktifkan dan tanpa menciptakan aturan 44px global untuk semua
  elemen.
- Visual field height/padding, visual icon size/shape, actionable chip geometry,
  spacing antar-target, keyboard/assistive-technology proof, device/runtime
  proof, dan izin implementasi tetap `historical unresolved`.

### Media Geometry Policy Decision — 2026-09-21

- Owner menyetujui `DS-DEC-007-MEDIA-POLICY`: product/CAD render memakai
  `contain` agar detail tidak terpotong; foto workshop/process memakai `cover`
  dengan focal point yang tetap dapat dikendalikan.
- Tidak ada satu rasio global. Hero dan card ratio ditentukan melalui proof
  sesuai jenis evidence, sehingga media tidak dipaksa mengikuti rasio Apple.
- Policy ini menjaga bentuk product tetap terbaca dan mempertahankan fokus
  dokumenter pada foto process tanpa mengunci token ratio yang belum terbukti.
- Exact aspect ratio, crop per breakpoint, focal-point implementation, loading,
  `srcset`/`sizes`, full-bleed behavior, visual/runtime proof, dan izin
  implementasi tetap `historical unresolved`.

### Card Interaction Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-CARD-INTERACTION`: card bersifat static secara
  default. Bila card actionable, gunakan satu action boundary yang eksplisit
  atau jadikan seluruh card satu link.
- Nested button, link, atau chip interaktif dalam action boundary yang sama
  dilarang agar fokus keyboard, activation target, dan reading order tetap
  dapat diprediksi.
- Keputusan ini menjaga card tetap mudah dipindai dan mencegah konflik klik
  tanpa memaksa seluruh card menjadi control interaktif.
- Anatomy, visual state, selected behavior, focus/keyboard proof, nested-content
  proof, runtime, dan izin implementasi tetap `historical unresolved`.

### Option Chip Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP`: option chip adalah control
  interaktif terpisah dari badge, memakai native button semantics, dan memiliki
  target minimum 44px melalui `DS-DEC-006-CONTROLS`.
- State selected dan unavailable harus terlihat jelas agar pilihan tidak
  bergantung pada warna saja; exact visual treatment dan announcement belum
  ditetapkan.
- Pemisahan ini mencegah status metadata tampil seolah dapat dipilih serta
  menjaga keyboard interaction tetap dapat diprediksi.
- Visual anatomy, selected/unavailable treatment, thumbnail/price anatomy, group
  reflow, state announcement, keyboard/assistive-technology proof, runtime, dan
  izin implementasi tetap `historical unresolved`.

### Footer Policy Decision — 2026-09-21

- Owner menyetujui `DS-DEC-009-FOOTER-POLICY`: footer memakai grouped content
  dalam beberapa kolom ketika ruang lebar mendukung, lalu stack pada compact
  dengan reading order yang tetap.
- Legal/support row dipisahkan agar akses ke informasi legal tidak bercampur
  dengan kelompok navigasi utama. Footer tidak sticky secara default dan tidak
  memakai frosted atau parchment treatment.
- Policy ini menjaga footer tetap menjadi endpoint global yang mudah dipindai
  tanpa menambah dekorasi atau mengambil ruang dari content utama.
- Exact surface, column count, typography, spacing, link/focus states, legal
  content, visual/runtime proof, dan izin implementasi tetap `historical unresolved`.

### Text Link Policy Decision — 2026-09-21

- Owner menyetujui `DS-DEC-010-LINK-POLICY`: light surface memakai
  `{colors.brand-action}`, dark surface memakai `{colors.paper-white}`, dan
  link tetap menggunakan native link semantics.
- Inline link harus memiliki cue persisten yang tidak bergantung pada warna
  saja, seperti underline. Link tidak diubah menjadi pill atau button.
- Focus-visible harus tetap jelas. Disabled bukan state default untuk navigasi;
  destination yang tidak tersedia dihilangkan atau diberi explanation.
- Visited state, exact cue/underline treatment, dedicated dark-link token,
  long-label behavior, focus composition, runtime proof, dan izin implementasi
  tetap `historical unresolved`.

### Typography Fallback Decision — 2026-09-21

- Owner menyetujui `DS-DEC-011-FALLBACK-POLICY`: primary stack tetap
  `Space Grotesk → Arial → Helvetica → sans-serif`.
- Saat fallback aktif, size, weight, line-height, letter-spacing, dan spacing
  dipertahankan sejauh metric fallback memungkinkan agar hierarchy dan wrapping
  tetap dapat dipindai.
- Metric adjustment atau `font-size-adjust` hanya menjadi kandidat setelah
  scoped proof menunjukkan drift pada wrapping atau readability. Tidak ada
  penyesuaian implisit.
- Fraunces tetap turun ke Georgia lalu generic serif. Inter dan SF Pro bukan
  substitute resmi Niuva.
- Exact adjustment values, threshold pemicu, fallback-specific tracking, proof
  scope, runtime font-loading verification, dan izin implementasi tetap `historical unresolved`.

### Focus and Motion Baseline Decision — 2026-09-21

- Owner menyetujui `DS-DEC-012-FOCUS-MOTION-BASELINE`: setiap interactive
  control wajib mengekspos `focus-visible` yang jelas dan dapat dibedakan dari
  surface aktif.
- Ring 3px menjadi baseline shared, tetapi exact compositing, separator, offset,
  dan focus recovery dapat menyesuaikan context melalui proof komponen.
- Timing tetap component-specific. Approval timing primary pada
  `DS-DEC-012-PRIMARY` tidak berubah menjadi global duration token.
- Pada reduced motion, translasi, rotasi, dan gerakan non-esensial dihilangkan;
  perubahan state dan informasi status tetap tersedia secara langsung.
- Exact focus composition, timing di luar approval existing, runtime motion
  engine, assistive-technology proof, dan izin implementasi tetap `historical unresolved`.

### Functional Gradient Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-013-GRADIENT-GATE`: Niuva MVP dan AUiS styleguide
  tidak membuat gradient token atau kandidat tanpa kebutuhan fungsional yang
  nyata.
- Functional gradient hanya dapat dibahas setelah ada named need, misalnya
  data visualization atau media mask, lalu melalui proof dan keputusan
  terpisah. Decorative gradient tetap `NOT APPLICABLE` melalui `DS-DEC-014`.
- Gate ini menutup pembahasan gradient tanpa use case, tetapi tidak memilih
  visual treatment, token, runtime behavior, atau izin implementasi.
- Use case, visual proof, token, runtime, dan izin implementasi tetap `historical unresolved`
  sampai kebutuhan nyata muncul.

### Media Geometry Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-007-MEDIA-GEOMETRY-GATE`: product/CAD tetap memakai
  `contain`, foto workshop/process memakai `cover` dengan focal point yang dapat
  dikendalikan, dan tidak ada rasio global.
- Exact ratio dan crop hanya dipilih melalui proof dengan aset representatif yang
  nyata dan berizin. Rasio Apple, 21:9, 16:9, atau 1:1 tidak menjadi default.
- Gate ini menjaga detail product/CAD tetap terbaca dan mencegah foto evidence
  terpotong hanya karena mengikuti rasio referensi.
- Canonical hero/card ratio, crop per breakpoint, internal padding, loading,
  source selection, runtime, visual proof, dan izin implementasi tetap `historical unresolved`.

### Navigation Geometry Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-004-NAVIGATION-GEOMETRY-GATE`: wrapped row menjadi
  default untuk primary link set kecil pada layar sempit, label tetap terlihat,
  urutan dipertahankan, dan horizontal scroll bukan default.
- Threshold, height, padding, active route, sticky behavior, dan disclosure hanya
  dipilih melalui proof dengan daftar link nyata pada desktop, mobile, dan
  keyboard.
- Disclosure tetap kondisional bila jumlah link bertambah dan wrapped row mulai
  mengganggu scanability. Gate ini tidak menetapkan hamburger sebagai default.
- Exact tokens, threshold value, runtime, accessibility proof, dan izin
  implementasi tetap `historical unresolved` sampai named navigation proof tersedia.

### Layout Geometry Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-005-LAYOUT-GEOMETRY-GATE`: container `72rem / 48rem /
  90rem`, gutter `1.25rem / 2rem`, compact readable stack, dan wide
  12-column composition tetap menjadi foundation.
- Two-column hanya dipakai bila kedua kolom tetap terbaca tanpa overflow. Exact
  spans, minimum card width, inter-column gutter, sticky collision, dan density
  detail harus melalui named layout proof.
- Gate ini menjaga reading order dan action order tanpa menambah breakpoint atau
  token grid yang belum dibuktikan.
- Runtime, visual proof, exact composition, dan izin implementasi tetap `historical unresolved`.

### Control Geometry Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-006-CONTROL-GEOMETRY-GATE`: minimum 44px tetap
  menjadi baseline untuk input/search/file-upload dan icon-only controls.
- Field height, padding, icon size/shape, actionable chip geometry, dan spacing
  final hanya dipilih melalui proof touch, keyboard, zoom, dan layar sempit.
- Nilai warisan input 2rem/0.625rem bukan token final; gate ini menjaga agar
  geometry visual tidak dipilih dari angka warisan atau diperluas diam-diam di
  luar batas visual control.
- Exact field tokens, chip anatomy/reflow, assistive-technology proof,
  device/runtime proof, dan izin implementasi tetap `historical unresolved`.

### Option Chip Visual Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-VISUAL-GATE`: state `selected` dan
  `unavailable` wajib terbaca dengan cue persisten yang tidak bergantung pada
  warna saja, dan option chip tetap terpisah dari badge noninteractive.
- Gate visual dibuktikan melalui keyboard focus, grayscale/contrast,
  representative content, dan narrow-screen reflow. Tujuannya menjaga pilihan
  tetap dapat dipindai serta mencegah status metadata terbaca sebagai control.
- Gate ini tidak memilih warna, border/icon treatment, thumbnail/price anatomy,
  atau mekanisme announcement tertentu. Exact visual treatment, state
  announcement, assistive-technology proof, runtime, dan implementation
  acceptance tetap `historical unresolved` sampai proof komponen tersedia; implementation permission dicatat
  terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Interaction Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-INTERACTION-GATE`: option chip tetap
  memakai native button keyboard behavior; Tab masuk ke control dan Enter/Space
  mengaktifkan pilihan.
- Fokus tetap berada pada chip yang dipilih setelah activation. State
  `selected`/`unavailable` harus tersedia melalui semantic state atau status yang
  dapat dipahami assistive technology; state `unavailable` tidak dapat diaktifkan.
- Gate ini menjaga selection tetap dapat diprediksi, mencegah fokus hilang, dan
  membuat perubahan state tidak bergantung pada visual saja.
- Exact state mapping, announcement copy/mechanism, assistive-technology proof,
  dan runtime tetap `historical unresolved` sampai proof komponen tersedia; implementation
  permission dicatat terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Visual Decision — 2026-09-21

- Owner memilih **Candidate B** melalui preview A/B dan menyetujui
  `DS-DEC-008-OPTION-CHIP-VISUAL`.
- State default memakai surface putih dengan quiet outline. State `selected`
  memakai outline `brand-action` yang lebih tegas, marker centang, dan underline
  inset. State `unavailable` memakai quiet surface, muted text, dan label
  eksplisit bahwa pilihan tidak tersedia.
- Candidate B dipilih karena selected tetap jelas tanpa bergantung pada warna,
  sementara unavailable menjelaskan status secara langsung. Ini lebih mudah
  dipindai daripada coretan label dan tetap dapat dibungkus pada ruang sempit.
- Keputusan ini menutup arah visual state, bukan exact anatomy. Dimensions,
  token mapping detail, label copy final, announcement mechanism,
  assistive-technology proof, runtime, dan implementation acceptance tetap
  `historical unresolved`; implementation permission dicatat terpisah melalui
  `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Visual Acceptance — 2026-09-22

- Owner menerima preview aktual pada `/auis/styleguide#option-chip-proof` untuk
  state selected, unavailable, label panjang, dan reflow frame 320px.
- Visual acceptance ini berlaku untuk proof styleguide yang dinamai. Ia tidak
  mempromosikan `OptionChip` ke product screen atau `Official`.
- Screen-reader output, runtime/assistive-technology interoperability, dan
  product propagation tetap `historical unresolved` dan mengikuti gate masing-masing.

### Option Chip Anatomy Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-ANATOMY-GATE` untuk Candidate B:
  radius 8px, minimum height 44px, padding vertikal 8px dan horizontal 12px,
  serta marker centang 18px.
- Label wrap pada batas kata tanpa truncation, ellipsis, atau font shrinking.
  Lebar mengikuti isi dalam batas container; pada reflow, source order tetap.
- Keputusan ini menjaga target sentuh tetap konsisten sekaligus mencegah label
  konfigurasi terpotong atau mengubah urutan pilihan pada layar sempit.
- Marker gap, token mapping detail, label copy, thumbnail/price anatomy, group
  reflow proof, announcement, dan runtime tetap `historical unresolved`; implementation
  permission dicatat terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Reflow Gate Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-REFLOW-GATE`: group chip membungkus
  dalam source order, tanpa horizontal scroll, truncation, atau font shrinking.
- Label unavailable boleh membungkus tetapi harus tetap eksplisit. Minimum 44px,
  focus order, dan reading order dipertahankan saat reflow.
- Proof menggunakan label Niuva nyata dan kombinasi selected/unavailable pada
  frame sempit 220px, 280px, dan 320px sebelum runtime implementation.
- Exact group gap, container threshold, collision proof, assistive-technology
  proof, runtime, dan implementation acceptance tetap `historical unresolved`; implementation
  permission dicatat terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Announcement Decision — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-ANNOUNCEMENT`: state selected dan
  unavailable tersedia melalui semantic state pada control yang sama.
- Announcement harus ringkas, berupa label dan state, tanpa live announcement
  duplikatif untuk informasi yang sudah diekspos control. Unavailable tidak dapat
  diaktifkan; alasan hanya diumumkan bila memberi konteks recovery yang berarti.
- Perubahan downstream yang material boleh memakai satu adjacent status.
  Announcement tidak boleh memindahkan fokus dari chip yang diaktifkan.
- Exact native/ARIA mapping, copy, mechanism announcement,
  assistive-technology proof, dan runtime tetap `historical unresolved`; implementation
  permission dicatat terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Assistive Technology Proof — 2026-09-21

- Local Playwright headless preview dicatat sebagai `PARTIAL` evidence pada
  `DS-DEC-008-OPTION-CHIP-AT-PROOF`.
- Proof lulus untuk native button elements, activation dengan `Space`, perubahan
  selected/status, focus tetap pada chip aktif, unavailable tidak activate,
  status region tersedia, tanpa horizontal overflow pada 220px/280px/320px,
  dan tanpa console errors.
- Browser smoke pada `/auis/styleguide` juga lulus untuk ABS selected,
  unavailable label Resin, Space activation ke PLA, focus retention, status
  harga fixture, serta no-horizontal-overflow pada viewport 390px.
- Chromium Accessibility tree mengonfirmasi control sebagai role `button` dengan
  state `pressed` dan `disabled` yang sesuai. Ini belum menggantikan pengujian
  output screen reader atau interoperabilitas browser/assistive technology.
- Evidence ini memverifikasi struktur dan interaksi lokal. Output screen reader,
  interoperabilitas browser/assistive technology, runtime acceptance, dan
  product propagation belum terbukti. Visual acceptance result untuk proof
  styleguide yang dinamai sudah disetujui Owner melalui
  `DS-DEC-008-OPTION-CHIP-VISUAL-ACCEPTANCE`.

### Option Chip Runtime and Assistive Technology Acceptance Gate — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-RUNTIME-AT-GATE`: sebelum
  implementation acceptance, proof harus memakai actual screen-reader/browser
  pair dalam runtime yang disetujui atau scoped acceptance preview.
- Cases wajib: keyboard entry/activation, selected, unavailable, focus
  retention, concise announcement, material downstream status, dan narrow-screen
  reflow.
- Gate ini menutup kriteria acceptance, bukan mengklaim screen-reader/runtime
  lulus. Exact native/ARIA mapping, runtime environment, tooling, actual output,
  acceptance result, dan implementation acceptance tetap `historical unresolved`; implementation
  permission dicatat terpisah melalui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`.

### Option Chip Runtime Inventory Check — 2026-09-21

- Audit awal terhadap registry dan source AUiS menemukan belum ada implementation
  `option-chip` khusus yang terdaftar atau dirender.
- `VariantSelector` yang ada memakai `RadioGroup`/`RadioGroupItem`; ia adalah
  contract radio untuk pemilihan varian dan tidak dianggap sebagai pengganti
  native-button option chip.
- Owner kemudian menyetujui implementation slice styleguide-only melalui
  `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION`; bukti current implementation dicatat
  di `DS-DEC-008-OPTION-CHIP-AT-PROOF` dan belum menutup screen-reader/runtime
  acceptance.

### Option Chip Implementation Authorization — 2026-09-21

- Owner menyetujui `DS-DEC-008-OPTION-CHIP-IMPLEMENTATION` untuk implementation
  proof yang hanya dirender pada `/auis/styleguide#option-chip-proof`.
- Slice memakai native `button`, `aria-pressed` untuk selected, native
  `disabled` plus label eksplisit untuk unavailable, Candidate B, target minimum
  44px, dan source-order reflow.
- Izin ini tidak mempromosikan component ke product screen atau `Official`.
  Actual screen-reader/runtime acceptance, exact token/copy mapping, visual
  acceptance result, product propagation, dan official promotion tetap `historical unresolved`.
