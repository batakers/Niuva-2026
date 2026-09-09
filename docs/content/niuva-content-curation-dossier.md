# Niuva Content Curation Dossier

Status: **INTERNAL DRAFT — NOT CONNECTED TO PUBLIC ROUTES**

Decision date: **2026-09-09**
Purpose: turn the supplied Niuva business sources into a reviewable content
inventory without publishing them, seeding production data, or replacing the
development-only frontend fixtures.

## 1. Editorial contract

### Evidence labels

| Label | Meaning | Allowed use in this dossier |
| --- | --- | --- |
| `CONFIRMED` | Stated in a supplied source or explicitly confirmed by the Owner | May be used as a factual input, subject to final copy review |
| `CANDIDATE` | Conservative editorial framing derived from confirmed material | Must be approved before public integration |
| `OPEN_FACT` | Missing, ambiguous, time-sensitive, or not evidenced | Must not be invented or silently resolved |

### Owner decisions recorded on 2026-09-09

- `CONFIRMED` — All works in the three supplied PDFs may be claimed as
  portfolio work of **PT Niuva Inovasi Utama**.
- `CONFIRMED` — Public use may include the client or partner name, client or
  partner logo, people shown in the documentation, and the supplied project
  photographs.
- `CONFIRMED` — Visible outputs and documented process may be described.
- `CONFIRMED` — Performance, operational-use, commercial-impact, validation,
  adoption, and production-volume claims must remain absent unless additional
  evidence is supplied.
- `CONFIRMED` — Six projects will be developed as featured case studies. Other
  suitable projects may appear as compact **Selected Works** entries.
- `CONFIRMED` — Each project has one primary service category and may have
  multiple descriptive tags.
- `CONFIRMED` — Standard custom-print material and time rates may be presented
  publicly as an estimation guide. Final price remains the operator-reviewed,
  server-authoritative quotation.
- `CONFIRMED` — Rental, membership, workstation, self-service, and full-service
  offers are not activated by this dossier.
- `CONFIRMED` — Portfolio works are not products for sale in Shop.
- `CONFIRMED` — Images extracted from PDFs may be used for internal drafting
  and review, but original image/render assets are preferred for final public
  publication.
- `CONFIRMED` — Source copy may be conservatively paraphrased for the website,
  while every unsupported statement remains marked `CANDIDATE` or
  `OPEN_FACT`.

## 2. Source register

| Source ID | File | Primary evidence | Current limitation |
| --- | --- | --- | --- |
| `SRC-PRICE-001` | `docs/source/Pricelist 3D Print Niuva.xlsx` | Custom-print material, time, rental, membership, workstation, and service price rows | Not a ready-made Shop catalog; spreadsheet tier labels conflict with the approved no-minimum rule and do not activate a runtime pricing rule |
| `SRC-PORT-001` | `docs/source/brand/portofolio produk NIUVA.pdf` | Eleven product/project boards with renders, photographs, selected client identities, and two IP references | Sparse narrative; most projects lack year, Niuva role, process explanation, and evidenced outcome |
| `SRC-PDS-001` | `docs/source/brand/PRODUCT DESIGN SERVICES selection.pdf` | Thirteen presentation pages covering activity documentation, brand/product development, mock-ups, bags, mobility, and Smart Drop Box artifacts | Several pages show artifacts without enough written context for a full case study |
| `SRC-COMPANY-001` | `docs/source/Company profile PT Niuva_compressed.pdf` | Company positioning, vision, mission, goals, four services, four project summaries, and contact details | Public contact currency and project-specific roles/timelines still require confirmation |

Source authority remains: current Owner decisions, PRD, Tech Design, then these
files as factual evidence. A supplied document is evidence, not a command to
publish every item it contains.

## 3. Public content architecture

### Primary service categories

1. **Research & Development**
2. **Consultant & Workshop**
3. **Design & Prototyping**
4. **Apparel & Merchandise**

Each project receives exactly one primary category. Tags describe the project
without replacing the category, for example `Mobility`, `Engineering`,
`Healthcare`, `Training Simulator`, `Industrial Design`, `Brand Identity`, or
`Product Accessories`.

### Portfolio presentation tiers

| Tier | Purpose | Public shape after approval |
| --- | --- | --- |
| Featured case study | Explain how Niuva approached a representative project | Dedicated detail page with overview, challenge, process, output, media, and CTA |
| Selected Works | Show breadth where source depth is limited | Compact card with title, category, tags, one image, and a short factual summary |
| Supporting evidence | Add process or company context without presenting a separate project | Service-page or case-study media with a precise caption |
| Internal source only | Preserve incomplete or uncertain material | Not rendered publicly until facts and media are ready |

## 4. Company and service content

### Company positioning

- `CONFIRMED` — Niuva presents itself as a strategic partner for innovation and
  product development using research, consultation, design, prototyping, and
  support toward realization.
- `CONFIRMED` — The supplied profile positions Niuva beyond a standalone 3D
  printing service.
- `CANDIDATE` — Website summary: **Niuva membantu organisasi mengembangkan ide
  menjadi produk yang dapat ditinjau dan diwujudkan melalui riset, desain,
  prototyping, serta dukungan manufaktur.**
- `OPEN_FACT` — Year founded, formal company-registration facts intended for
  public display, geographic service coverage, team size, production capacity,
  named equipment, and verified turnaround promises.

### Four service summaries

| Service | Confirmed source scope | Candidate website framing | Open facts |
| --- | --- | --- | --- |
| Research & Development | Systematic product and technology development intended to support company innovation | Explore needs, constraints, and technical direction before a product decision is finalized | Research methods, standard deliverables, typical duration, and named facilities |
| Consultant & Workshop | Design recommendations from vision toward manufacturing, plus interactive training for skills and collaboration | Structured consultation and practical workshops that help teams align decisions and build capability | Workshop formats, participant limits, modules, duration, and availability |
| Design & Prototyping | Visual-idea development through design and rapid prototyping for concept review and functional testing | Translate an idea into design artifacts and prototypes that can be reviewed and iterated | Exact deliverables, testing methods, supported fabrication processes, and lead time |
| Apparel & Merchandise | Product design intended to reflect brand identity and market relevance | Develop branded apparel, merchandise, and accessories from visual direction toward production preparation | Minimum order, materials, vendor/manufacturing role, sampling stages, and lead time |

### Company-profile supporting content

- `CONFIRMED` — The source contains a company introduction, vision, mission,
  goals, service descriptions, project summaries, and contact information.
- `CANDIDATE` — Use the introduction as source material rather than copying the
  long formal paragraph verbatim. Public copy should be shorter and route users
  to Services, Projects, Project Brief, Custom Print, or Shop.
- `OPEN_FACT` — Confirm that the phone number, email address, and Bandung
  Techno Park location in `SRC-COMPANY-001` page 13 are still current before
  replacing existing contact UI.

## 5. Featured case-study dossiers

### CS-01 — Smart Drop Box — Procter & Gamble Company (P&G)

| Field | Draft |
| --- | --- |
| Status | `CONFIRMED` owner-approved editorial draft v1 on 2026-09-09; remains non-public |
| Primary category | Design & Prototyping |
| Tags | Product Development; Industrial Design; Plastic Collection; Sustainability Program |
| Sources | `SRC-PORT-001` page 5; `SRC-PDS-001` page 13 |
| Confirmed public year | **2018**. The source basis is the **27 September 2018** date printed in both visible technical-drawing title blocks; public copy uses the year only and does not infer a project date range. |
| Confirmed Niuva role | Industrial/product design, technical detailing, and design support toward fabrication. Electronics, software, fabrication execution, and manufacturing are not included in the approved public claim. |
| Confirmed attribution | Attribute the work publicly to **the Niuva team** at company level. Do not identify people shown in the photograph or assign individual responsibilities without a confirmed team record. |
| Confirmed brief context | The Smart Drop Box was intended to support the collection of used plastic packaging or bottles in a P&G/Head & Shoulders sustainability program. |
| Approved context boundary | Public copy may identify the P&G sustainability-program context but must omit intended placement and target-user details until those facts are confirmed. |
| Confirmed evidence | The materials identify the work as Smart Drop Box for P&G and show concept sketches, dimensioned technical drawings, a component/material visualization, and a photograph of a fabricated P&G/Head & Shoulders-branded unit with four people. |
| Confirmed object details | The source labels a fiberglass body and lid, waste-entry cover, rubber entry component, user and operator indicators, LED, sensor, locking bolt, hook, and power supply. These are visible design-document labels, not evidence of tested performance. |
| Confirmed physical stage | At least one **physical prototype presented to stakeholders** is documented photographically. It must not be described as a pilot, deployed installation, or production unit. |
| Approved draft summary | In 2018, Niuva developed the industrial/product design of a P&G/Head & Shoulders Smart Drop Box intended to support plastic-packaging collection, from form exploration and technical detailing through visualization, design support toward fabrication, and a presented physical prototype. |
| Safe output statement | The documented outputs include concept sketches, dimensioned drawings, component/material callouts, product visualizations, and a presented physical prototype. |
| Prohibited inference | Do not claim deployment, manufacturing volume, technical performance, adoption, or business impact. |
| Open facts | Intended placement and users; individual team members and responsibilities; selection rationale; third-party electronics/software scope; third-party fabrication/manufacturing responsibility; any later pilot/deployment; validation; and verified outcome. Placement, target users, individual attribution, and a more precise project date range are intentionally omitted from public copy. |

Recommended media sequence after original assets are supplied:

1. hero product visualization;
2. early sketches;
3. dimensional/detail drawings;
4. alternative views;
5. documented presentation or handover photograph.

External corroboration was reviewed but is not yet used to expand Niuva's
claim. A [Solusi Hijau Indonesia/Smash portfolio
page](https://sites.google.com/view/solusihijauindonesia/portofolio/smash-id)
associates P&G Indonesia with a Smart Drop Box collaboration intended to
reduce plastic waste. Other Telkom University publications describe Smart Drop
Box projects for different programs and recipients. Those projects must not be
assumed to be this P&G engagement without Owner confirmation.

#### Owner-approved public-copy draft v1 — non-public

**Overview**

Pada 2018, tim Niuva mengembangkan industrial/product design Smart Drop Box
untuk P&G/Head & Shoulders dalam konteks program keberlanjutan yang mendukung
pengumpulan kemasan plastik bekas.

**Challenge**

Kebutuhan program diterjemahkan menjadi sebuah titik pengumpulan fisik yang
memadukan area masuk kemasan, identitas brand, serta ruang bagi indikator,
sensor, pencahayaan, dan komponen daya. Narasi ini menjelaskan kebutuhan desain
yang terlihat pada dokumen; ia tidak menyatakan performa komponen.

**Process**

Tim Niuva mengeksplorasi bentuk melalui sketsa, menyusun gambar teknik
berdimensi, memetakan komponen dan material, lalu menyiapkan visualisasi serta
dukungan desain menuju fabrikasi prototype.

**Output**

Dokumentasi memperlihatkan paket desain berupa sketsa konsep, gambar teknik,
callout komponen/material, visualisasi produk, dan sebuah prototype fisik yang
dipresentasikan kepada stakeholder.

**Evidence boundary**

Case study tidak menyatakan deployment, produksi massal, performa teknis,
jumlah sampah terkumpul, perubahan perilaku, atau dampak lingkungan/bisnis.

### CS-02 — Konsep dan Desain Eksterior Motor EV — PT Pindad

| Field | Draft |
| --- | --- |
| Status | `CANDIDATE` featured case study; conservative public narrative v1 approved on 2026-09-09; exact project identity, date, and physical-design realization remain unverified and omitted from public copy |
| Primary category | Design & Prototyping |
| Tags | Mobility; Electric Vehicle; Exterior Design; Concept Development |
| Sources | `SRC-COMPANY-001` page 10 |
| Approved identity/date boundary | Do not identify this engagement as the 2021 Mandalika MotoEV or publish **2021** as its project year without a later explicit confirmation. The public project year remains omitted. |
| Confirmed Niuva role | Product-concept development and exterior/body-form design. Do not attribute the electric motor, powertrain, battery, controller, vehicle engineering, fabrication, testing, or manufacturing to Niuva. |
| Approved media-attribution boundary | Treat the design visualization as evidence of Niuva's approved exterior/body-form scope. The physical-motorcycle photograph may be shown only as development context; do not describe it as the realized or final Niuva design unless later project evidence confirms that relationship. |
| Approved public context | Describe the project neutrally as work for adaptable, functional **operational mobility**. Keep the source's TNI context in the internal evidence record, but do not foreground military use or imply deployment, testing, or operational adoption in public copy. |
| Confirmed evidence | The company profile describes a collaboration on a tactical electric motorcycle intended for TNI operational needs and frames the project around adaptable, functional mobility. The page shows motorcycle photographs and a rendered design. |
| Approved public narrative v1 | Dalam konteks pengembangan motor listrik PT Pindad, Niuva berkontribusi pada pengembangan konsep produk dan desain bentuk bodi/eksterior untuk kebutuhan mobilitas operasional yang adaptif dan fungsional. Materi proyek menampilkan visualisasi desain serta konteks pengembangan motor fisik, tanpa menyatakan desain tersebut sebagai produk final atau telah digunakan secara operasional. |
| Safe output statement | The supplied material documents an exterior/body design visualization alongside physical-motorcycle development context, without asserting that the photographed body is the final realization of Niuva's design and while keeping Pindad's vehicle technology and engineering ownership separate. |
| Prohibited inference | Do not claim military deployment, field validation, performance specifications, certification, production status, or operational use. |
| Open facts | Year; detailed design brief and constraints; concept-selection rationale; whether the visualized body direction was realized on the photographed motorcycle; prototype stage; partner responsibilities; testing evidence; and final design deliverables. |

Recommended media sequence after original assets are supplied:

1. design visualization as the primary evidence of Niuva's approved scope;
2. strongest complete motorcycle image, captioned as development context;
3. alternate physical view, with the same attribution boundary;
4. process detail only if later supplied and attributed.

#### External primary-source conflict — clarification required

PT Pindad's official 2021 MotoEV publication describes a prototype introduced
at the World Superbike event in Mandalika on 19–21 November 2021. It attributes
the MotoEV to Pindad, states that its electric drive motor was made by Pindad,
and says the displayed prototype still used a universal frame and body while
future frame/body development and partner collaboration remained open. The
official page does not identify Niuva.

The motorcycle shown in `SRC-COMPANY-001` page 10 appears consistent with the
Pindad MotoEV imagery, but the dossier must not equate the two engagements or
adopt the 2021 date. The Owner approved this conservative boundary on
2026-09-09 without confirming that the two are the same engagement. If a later
confirmation establishes that identity, public copy must distinguish Pindad's
product ownership from Niuva's specific contribution.

Primary source reviewed:
[PT Pindad — Pindad Pamerkan Maung, MV2 dan Perkenalkan Prototipe MotoEV di
Mandalika](https://pindad.com/pindad-pamerkan-maung-mv2-dan-perkenalkan-prototipe-motoev-di-mandalika).

### CS-03 — Simulator Keselamatan Berkendara — Agate / PT DENSO

| Field | Draft |
| --- | --- |
| Status | `CANDIDATE` featured case study; conservative public narrative v1 approved on 2026-09-09; detailed technical responsibilities, delivery stage, and outcomes remain unverified and omitted from public copy |
| Primary category | Design & Prototyping |
| Tags | Training Simulator; Safety Riding; Interactive Product; Product Development |
| Sources | `SRC-COMPANY-001` page 12 |
| Approved relationship boundary | Describe this as a project involving Agate and PT DENSO/DMIA. Do not identify either party as the primary client, commissioning party, lead contractor, or integrator until project records confirm the relationship. |
| Approved Niuva role boundary | State only that Niuva was involved in developing a motorcycle-based riding simulator. Do not attribute industrial design, mechanical engineering, hardware, electronics, software, fabrication, integration, or testing to Niuva until supporting project evidence confirms the specific responsibility. |
| Confirmed evidence | The company profile describes development of a riding-safety training simulator for PT DENSO employees and identifies Agate in the project title. The page shows a motorcycle-based apparatus and internal/electronic documentation. |
| Approved public narrative v1 | Niuva terlibat dalam pengembangan simulator berkendara berbasis sepeda motor untuk mendukung pelatihan keselamatan berkendara bagi karyawan PT DENSO, dalam proyek yang melibatkan Agate. Dokumentasi yang tersedia memperlihatkan konfigurasi fisik simulator dan bagian internal perangkat, tanpa menetapkan pembagian tanggung jawab teknis atau mengklaim hasil penerapannya. |
| Safe output statement | The supplied source documents the physical simulator setup and an internal component view. |
| Prohibited inference | Do not claim deployment, learner outcomes, incident reduction, software ownership, validation, or usage scale. |
| Open facts | Relationship between Niuva, Agate, and DENSO; exact DENSO legal-entity naming; year; responsibilities beyond the approved conservative role boundary; hardware/software scope; interaction model; testing; delivery stage; verified outcome. |

Recommended media sequence after original assets are supplied:

1. complete simulator setup;
2. rider/interface context if supplied and accurately captioned;
3. source-documented internal component view with neutral ownership wording;
4. workshop or testing documentation if later supplied.

### CS-04 — BeVenTU — Konsep Sistem Ventilator Darurat

| Field | Draft |
| --- | --- |
| Status | `CANDIDATE` featured case study; conservative public narrative v1 approved on 2026-09-09; functional, clinical, regulatory, and production status remain unverified and omitted from public copy |
| Primary category | Design & Prototyping |
| Tags | Healthcare Product; Industrial Design; Concept Development; Form Exploration |
| Sources | `SRC-PORT-001` page 6 |
| Approved Niuva role boundary | Attribute only product-concept development, alternative-form exploration, system-layout visualization, and industrial-design presentation to Niuva. Do not attribute medical-device design, ventilation-function engineering, fabrication, testing, clinical validation, certification, production, or patient use without supporting evidence. |
| Confirmed evidence | The portfolio labels the work as BeVenTU emergency ventilator system, shows form alternatives and product visualizations, and prints text presented as an industrial-design certificate number plus a patent-registration number. The registry status and ownership of those references are not yet verified. |
| Approved public narrative v1 | BeVenTU mendokumentasikan pengembangan konsep sistem ventilator darurat melalui eksplorasi alternatif bentuk, visualisasi tata letak sistem, dan presentasi desain industri. Materi yang tersedia menunjukkan proses desain produk dan artefak visual, tanpa menyatakan bahwa perangkat telah dibuat, diuji, disertifikasi, diproduksi, atau digunakan secara klinis. |
| Safe output statement | The documented outputs include alternative designs, product views, a specification panel, and IP-reference text. |
| Prohibited inference | Do not make medical-efficacy, clinical, regulatory-approval, production, hospital-use, or patient-outcome claims. |
| Open facts | Project year; responsibilities beyond the approved design-output boundary; engineering partners; functional prototype status; testing context; intended use; official verification and ownership of `IDD0000059674` and `S00202010344`; public-safe specification text. |

Recommended media sequence after original assets are supplied:

1. primary product visualization;
2. alternative form studies;
3. internal/system view;
4. specification or IP detail only after verification.

### CS-05 — Bagit — Arei Smart Bag V2

| Field | Draft |
| --- | --- |
| Status | `CANDIDATE` featured case study; conservative public narrative v1 approved on 2026-09-09; feature, material, manufacturing, testing, and commercial status remain unverified and omitted from public copy |
| Primary category | Apparel & Merchandise |
| Tags | Bag Development; Product Iteration; Outdoor Equipment; Detail Development |
| Sources | `SRC-PORT-001` page 11; V1 comparison material on page 10 |
| Approved Niuva role boundary | Attribute only iterative bag-concept development from V1 to V2 and exploration of form and component details to Niuva. Do not attribute electronics or smart-feature engineering, material specification, fabrication, field testing, mass production, or retail launch without supporting evidence. |
| Confirmed evidence | The portfolio identifies “Bagit” as Arei Smart Bag V2 and shows the bag, outdoor-use photographs, a V1 predecessor on the previous page, and selected component/detail callouts. |
| Approved public narrative v1 | Bagit — Arei Smart Bag V2 menunjukkan proses pengembangan iteratif konsep tas dari V1 menuju V2. Dokumentasi proyek menampilkan eksplorasi bentuk, detail komponen, dan konteks penggunaan luar ruang, tanpa mengklaim fungsi pintar tertentu, spesifikasi material, status produksi, atau hasil pengujian. |
| Safe output statement | The source supports a visual V1-to-V2 development story and shows the V2 product in use. |
| Prohibited inference | Do not claim feature performance, production volume, retail launch, field-test results, durability, or sales impact. |
| Open facts | Year; responsibilities beyond the approved concept-and-detail boundary; Arei brief; confirmed feature list; V1 feedback; design decisions; prototype/manufacturing status; material specifications; verified outcome. |

Recommended media sequence after original assets are supplied:

1. V2 hero image;
2. outdoor-use image;
3. V1-to-V2 comparison;
4. component/detail views;
5. confirmed feature explanation.

### CS-06 — Savero — Identitas Visual dan Aksesori Produk

| Field | Draft |
| --- | --- |
| Status | `CANDIDATE` featured case study; conservative public narrative v1 approved on 2026-09-09; material, engineering, manufacturing, launch, and commercial status remain unverified and omitted from public copy |
| Primary category | Apparel & Merchandise |
| Tags | Brand Identity; Product Accessories; Industrial Design; Detail Development |
| Sources | `SRC-PORT-001` page 3; `SRC-PDS-001` pages 3–7 |
| Approved Niuva role boundary | Attribute only visual-identity applications, accessory concepts, component-detail design, dimensional drawings, and product visualization to Niuva. Do not attribute comprehensive brand strategy, material selection, production engineering, fabrication, manufacturing volume, market launch, or commercial performance without supporting evidence. |
| Confirmed evidence | The sources identify Savero Group and show a visual identity system, accessory concepts, logos, front-lid and back-system studies, zipper concepts, dimensional drawings, renders, and physical-looking product views. |
| Approved public narrative v1 | Untuk Savero, Niuva mengembangkan aplikasi identitas visual dan konsep aksesori produk melalui studi sistem penutup depan dan belakang, ritsleting, logo, detail komponen, gambar berdimensi, serta visualisasi produk. Dokumentasi ini memperlihatkan penerjemahan elemen identitas ke dalam detail produk, tanpa mengklaim material, proses manufaktur, status peluncuran, atau performa komersial. |
| Safe output statement | The documented outputs span identity applications, dimensional design studies, and accessory visualizations. |
| Prohibited inference | Do not claim manufacturing volume, market launch, sales, durability, or commercial performance. |
| Open facts | Project year; responsibilities beyond the approved design-output boundary; product range; design brief; selected directions; manufacturing involvement; materials; delivered assets; verified outcome. |

Recommended media sequence after original assets are supplied:

1. combined accessory hero;
2. brand-identity board;
3. front-lid/back-system development;
4. zipper alternatives;
5. logo/detail drawings;
6. selected source image, captioned precisely as a render or photographed
   artifact only after classification.

## 6. Selected Works inventory

These entries show breadth without pretending that a full narrative is already
available.

| Work | Source | Proposed category | Proposed tags | Evidence status and next need |
| --- | --- | --- | --- | --- |
| Waste-based Product | `SRC-PORT-001` p.1 | Research & Development | Circular Design; Material Exploration | `CONFIRMED` title and visual board; `OPEN_FACT` brief, material sources, Niuva role, process, output status, and result |
| Elips Tandem Bike | `SRC-PORT-001` p.2 | Design & Prototyping | Mobility; Family Product; Industrial Design | `CONFIRMED` title and child-parent tandem framing; `OPEN_FACT` year, brief, prototype status, decisions, and result |
| Screen Printing Workstation | `SRC-PORT-001` p.4 | Design & Prototyping | Workstation; Industrial Design; IP Documentation | `CONFIRMED` title, design views, and source-printed certificate number; official registry verification remains `OPEN_FACT` |
| Portable Handwash Station | `SRC-PORT-001` p.7 | Design & Prototyping | Public Hygiene; Portable Product; Prototype | `CONFIRMED` title and visual artifacts; `OPEN_FACT` use context, mechanism, production, and result |
| 3 Phase Sterilizer Tunnel | `SRC-PORT-001` p.8 | Design & Prototyping | Public Hygiene; System Design; Prototype | `CONFIRMED` title and visual documentation; `OPEN_FACT` scope, specification, validation, and deployment |
| 2 Phase Sterilizer Tunnel | `SRC-PORT-001` p.9 | Design & Prototyping | Public Hygiene; System Design; Prototype | `CONFIRMED` title and visual documentation; `OPEN_FACT` scope, specification, validation, and deployment |
| Arei Smart Bag V1 | `SRC-PORT-001` p.10 | Apparel & Merchandise | Bag Development; Prototype; Product Iteration | `CONFIRMED` title and prototype/detail photographs; use primarily as V2 process evidence unless a separate brief is supplied |
| Military Model Mock-up scale 1:10 — PT Pindad | `SRC-PDS-001` p.8 | Design & Prototyping | Scale Model; Mobility; Defense | `CONFIRMED` title, partner, scale, and photographs; `OPEN_FACT` project purpose, Niuva role, sensitivity review, deliverables, and result |
| Ganilla Field Kitchen Truck — PT Bhimasena R&D | `SRC-PDS-001` p.9 | Research & Development | Special Vehicle; Scale Model; Defense | `CONFIRMED` source title and visual artifacts; `OPEN_FACT` spelling, brief, Niuva role, confidentiality boundary, and result |
| Leather Bag Development — D.I. Yogyakarta industry/trade office | `SRC-PDS-001` pp.10–11 | Apparel & Merchandise | Leather Product; Workshop; Product Development | `CONFIRMED` institution text and product/event photographs; `OPEN_FACT` formal institution name, program scope, Niuva role, participants, and output |
| Electric Car — Telkom University | `SRC-PDS-001` p.12 | Design & Prototyping | Mobility; Electric Vehicle; Prototype | `CONFIRMED` title, institution, process photographs, and visualization; `OPEN_FACT` year, brief, Niuva role, vehicle stage, and outcome |
| Redesain Motor Xeon | `SRC-COMPANY-001` p.9 | Design & Prototyping | Mobility; Electric Conversion; Body Engineering | `CONFIRMED` source description and before/after visual context; `OPEN_FACT` year, Niuva scope, engineering detail, prototype state, and test results |
| Bicycle Arcade — Agate | `SRC-COMPANY-001` p.11 | Design & Prototyping | Interactive Product; Bicycle; Entertainment | `CONFIRMED` collaboration framing and Stranger Things release context; `OPEN_FACT` year, Niuva role, interaction design, delivery, and usage outcome |

### Supporting evidence rather than separate public projects

| Material | Source | Proposed use |
| --- | --- | --- |
| PDS initiation with PPM Telkom University, September–October 2018 | `SRC-PDS-001` p.1 | Company/process timeline or workshop context after the activity and Niuva role are clarified |
| PDS exhibition documentation | `SRC-PDS-001` p.2 | Supporting process/community media, not a standalone case study |

## 7. Media inventory and final-asset gate

No separate project photograph or render files are currently present under
`docs/source/`; only the PDFs and original Niuva logo assets are available.

| Source pages | Visible material | Draft use | Final gate |
| --- | --- | --- | --- |
| `SRC-PORT-001` pp.1–11 | Project boards combining renders, photographs, sketches, labels, logos, and selected certificate text | Select cover candidates and understand artifact sequence | Obtain original media when available; otherwise approve a deliberate PDF-derived crop after quality review |
| `SRC-PDS-001` pp.1–13 | Activity photos, identity boards, design drawings, renders, mock-ups, product photos, and partner identities | Build process sequences and cross-reference overlapping projects | Obtain original files, captions, chronological order, and confirmed alt-text facts |
| `SRC-COMPANY-001` pp.1–8 | Company identity, office image, positioning, vision/mission/goals, and service graphics | Company and service content direction | Confirm office-image ownership/context and current company/contact facts |
| `SRC-COMPANY-001` pp.9–12 | Four project summaries with photographs/renders | Candidate cover and detail media | Obtain originals and project-specific captions |
| `SRC-COMPANY-001` p.13 | Public-contact panel | Contact-source reference | Confirm current phone, email, and location before use |
| `SRC-COMPANY-001` pp.14–15 | Blank/end artwork | None | Do not publish as content |

Final media requirements:

- original or approved high-resolution export;
- project ID and source provenance;
- descriptive alt text based on what is actually visible;
- caption that distinguishes sketch, render, prototype, process, or final
  artifact;
- focal point/crop review for mobile and desktop;
- no unsupported “final product”, “deployed”, or “tested” label;
- no extraction of a person from context merely as decoration.

## 8. Custom-print pricing content

### Approved public estimation guide

| Component | Approved factual presentation |
| --- | --- |
| Standard PLA material | Progressive Rp1,000/g, Rp900/g, and Rp800/g tiers |
| Standard ABS material | Progressive Rp1,200/g, Rp1,100/g, and Rp1,000/g tiers |
| Print time | Rp5,000 per print hour |
| Minimum | No 50 g minimum; the first standard tier begins at the first billed gram |
| Final price | Set only after operator review and slicing; not calculated as an instant final price from browser geometry |
| Arithmetic authority | Active server-side Pricing v1 rule using Decimal arithmetic and final `HALF_UP` rounding |

`CANDIDATE` public explanation:

> Biaya custom print disusun dari material dan waktu cetak berdasarkan hasil
> slicing yang telah diperiksa operator. Tarif ini merupakan panduan estimasi;
> konfigurasi, jumlah, material, dan kebutuhan proyek dikunci dalam quotation
> sebelum pembayaran.

### Internal-only or deferred source rows

The spreadsheet also contains customer-owned filament, communal filament,
daily rental, membership, workstation, PC rental, self-service, and
full-service rows. Their presence in the source does not activate a public
offer, checkout path, SLA, availability claim, or admin pricing record.

The approved Pricing v1 contract remains authoritative where the spreadsheet
is ambiguous:

- standard Niuva-stock material is progressive and adds print time;
- communal PLA is Rp500/g and communal ABS is Rp700/g, material-only;
- customer-owned filament is material-only at PLA Rp500/g and ABS Rp700/g;
- quantity semantics must be explicitly provisioned as `PER_UNIT` or
  `AGGREGATE` in the active rule and may not be inferred by the browser;
- no production pricing rule is activated by this dossier.

## 9. Shop boundary

The source set contains portfolio projects and custom-print pricing, not a
ready-made commerce catalog. The Shop remains without launch products until a
separate approved dataset provides, per sellable variant:

- product and variant name;
- category and public description;
- SKU;
- Decimal selling price;
- initial stock and publication state;
- weight and package dimensions for shipping;
- variant options;
- product photographs and alt text;
- fulfillment and availability facts.

Portfolio images, project prototypes, or client products must never become
sellable items merely because they appear in a source PDF.

## 10. Readiness and open-fact register

| Area | Status | Next evidence or decision |
| --- | --- | --- |
| Portfolio ownership claim | `CONFIRMED` | None for draft curation |
| Client/partner name and logo permission | `CONFIRMED` | Preserve decision provenance during publication review |
| People/project-photo permission | `CONFIRMED` | Preserve context and write accurate captions |
| Six featured-project selection | `CONFIRMED` | Confirm final ordering and cover image during visual review |
| Featured summaries CS-01 through CS-06 | `CONFIRMED` | Owner-approved conservative copy v1 remains non-public; CS-02 through CS-06 need additional evidence before expansion into full challenge/process/output stories |
| Primary service categories | `CONFIRMED` | Preserve approved featured-project mappings; review Selected Works mappings separately |
| Outcome-claim policy | `CONFIRMED` | Supply evidence before any performance or impact statement |
| Original project media | `OPEN_FACT` | Not present in the repo; supply originals or approve reviewed PDF-derived exports later |
| Current contact information | `OPEN_FACT` | Verify the page-13 company-profile details before public use |
| Project years and timelines | `OPEN_FACT` | Confirm per project |
| Niuva's detailed role and team | `OPEN_FACT` | Project-specific responsibilities beyond the approved public boundaries still require evidence |
| Detailed challenge/process/output | `CANDIDATE` / `OPEN_FACT` | CS-01 has a fuller approved draft; expand CS-02 through CS-06 only when supporting evidence is supplied |
| Verified project results | `OPEN_FACT` | Provide documentary or Owner-confirmed factual evidence |
| Ready-made Shop catalog | `OPEN_FACT` | Separate commercial dataset required |
| Public content integration | **BLOCKED** | Requires Selected Works review, media approval, typed-dataset preview, and explicit integration approval |
| Production publication | **BLOCKED** | Requires final assets, current facts, server integration, and explicit publication approval |

## 11. Recommended remaining review order

The conservative copy review for CS-01 through CS-06 was completed on
2026-09-09. Remaining work should proceed in this order:

1. Review company positioning and current contact facts.
2. Approve which Selected Works entries receive compact public cards and
   review their proposed categories and tags.
3. Confirm final featured-case-study ordering and cover-image direction.
4. Supply original media or approve specific PDF-derived crops for a visual
   proof only.
5. Convert approved content into a typed, non-production dataset.
6. Review `/`, `/services`, `/projects`, and `/projects/[slug]` with the curated
   dataset in development preview.
7. Run accessibility, responsive, regression, and visual checks.
8. Request a separate explicit approval before connecting the content to
   production reads or marking anything published.

## 12. Non-public integration boundary

This dossier does **not**:

- change any current public route;
- replace synthetic fixtures;
- extract or commit PDF images;
- seed Prisma or another database;
- publish a client, project, logo, person, product, price, or contact detail;
- activate Shop products, pricing rules, providers, uploads, or payments;
- assert that frontend completion means content or production readiness.

Any subsequent implementation must keep source evidence, editorial candidates,
and open facts separate and must retain an explicit publication gate.
