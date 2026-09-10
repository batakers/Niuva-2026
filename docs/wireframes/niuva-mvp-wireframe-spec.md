# Niuva MVP Wireframe Specification

Status: MVP architecture approved, owner acceptance recorded 2026-09-03

Fidelity: Annotated low-fi wireframe

Date: 2026-09-03

Primary sources: docs/PRD-Niuva-MVP.md and docs/TechDesign-Niuva-MVP.md

Live visual board: retired on 2026-09-10 during repository complexity cleanup.
This document remains the approved wireframe architecture record.

Approval scope: 20-surface inventory, MVP/deferred boundary, journeys, screen
responsibilities, required states, responsive order, and accessibility
constraints. This approval does not approve final visual treatment or product
screen propagation.

## 1. Purpose

Dokumen ini mengubah requirement PRD menjadi satu paket wireframe yang dapat
direview sebagai sistem. Fokusnya adalah struktur informasi, tanggung jawab
setiap layar, alur utama, state, responsive behavior, dan accessibility.

Dokumen ini bukan visual design final. Warna, font, motion, decorative effects,
photography treatment, dan Creative Components tidak dikunci di sini.

Dokumen ini juga bukan approval untuk homepage atau project brief yang
sebelumnya dibuat. Kedua halaman tersebut tetap berada pada status proof
authorized tetapi menunggu visual acceptance owner.

## 2. Scope correction

PRD mendefinisikan 18 key screens. Untuk kebutuhan autentikasi, paket ini
menambahkan Admin Sign-in sebagai layar MVP. Customer Login/Register ditampilkan
sebagai surface deferred agar keputusan produk terlihat, tetapi tidak menjadi
fitur MVP.

Ringkasan scope:

| Kelompok | Jumlah | Status |
| --- | ---: | --- |
| PRD key screens | 18 | MVP |
| Admin Sign-in | 1 | MVP |
| Customer Account Access | 1 | Deferred, bukan MVP |
| Total surface yang dipetakan | 20 | Wireframe review |

Customer tetap dapat menyelesaikan checkout sebagai guest. Customer account
tidak boleh ditambahkan hanya karena layar login/register muncul di board.

Route detail seperti Admin Inquiry detail, Admin Custom Print detail, Admin
Product detail, dan Admin Pricing adalah subview dari screen owner-nya. Route
tersebut tidak dihitung sebagai key screen tambahan.

## 3. Wireframe conventions

### 3.1 Fidelity

Board menggunakan annotated low-fi:

- grayscale only;
- layout box dan garis untuk hierarchy;
- X-box untuk image atau media yang belum dipilih;
- label nyata untuk CTA, field, status, dan navigation;
- catatan behavior di bawah frame;
- tidak ada gradient, texture, glow, illustration, atau decorative animation;
- tidak ada fake customer data yang seolah-olah sudah authoritative.

### 3.2 Shared shell

Public screens menggunakan:

- header dengan logo source resmi, primary navigation, dan satu primary CTA;
- main content dengan skip link dan landmark yang jelas;
- footer dengan contact, service navigation, dan legal/privacy entry;
- responsive navigation yang berubah menjadi menu yang dapat diakses keyboard.

Commerce screens menggunakan:

- header yang mempertahankan akses ke Shop, Cart, dan jalur Custom 3D Print;
- cart indicator yang tidak menjadi satu-satunya cara mengetahui isi cart;
- summary yang tetap terbaca saat viewport sempit.

Admin screens menggunakan:

- authenticated admin shell;
- sidebar atau navigation rail untuk Action Queue, Orders, Custom Print,
  Products, Portfolio;
- page title, queue context, operator action, dan audit/status area;
- density yang lebih tinggi dari public screens tanpa mengorbankan focus state.

Auth screen menggunakan:

- satu tugas utama per surface;
- error yang dekat dengan field atau credential issue;
- no public admin registration;
- customer account surface tidak aktif di MVP.

### 3.3 Behavior annotation

Setiap screen harus menjawab:

1. Siapa pengguna dan apa tujuan utamanya?
2. Informasi apa yang harus terlihat sebelum action?
3. Apa primary action dan apa next state setelah action?
4. Apa yang terlihat ketika loading, empty, error, unauthorized, atau success?
5. Apa perubahan layout dan interaction ketika mobile?
6. Bagaimana keyboard, focus, label, error, dan reduced motion bekerja?

## 4. Information architecture

| # | Screen | Route proposal | Audience | Scope |
| ---: | --- | --- | --- | --- |
| 01 | Homepage | / | Public, B2B, retail | MVP |
| 02 | Services | /services | Public, B2B | MVP |
| 03 | Projects / Case Studies | /projects | Public, B2B | MVP |
| 04 | Project Detail | /projects/:slug | Public, B2B | MVP |
| 05 | Project Brief / Request Quote | /project-brief | B2B | MVP |
| 06 | Shop | /shop | Retail/B2C | MVP |
| 07 | Product Detail | /shop/:slug | Retail/B2C | MVP |
| 08 | Cart | /cart | Retail/B2C | MVP |
| 09 | Checkout | /checkout | Retail/B2C | MVP |
| 10 | Custom 3D Print Landing | /custom-print | Retail/B2C, B2B | MVP |
| 11 | Custom Print Request | /custom-print/request | Retail/B2C, B2B | MVP |
| 12 | Quote Review | /quote/:token | Customer | MVP |
| 13 | Order Status | /orders/:token | Customer | MVP |
| 14 | Admin Action Queue | /admin | Owner/Admin | MVP |
| 15 | Admin Orders | /admin/orders | Owner/Admin | MVP |
| 16 | Admin Custom Print Review | /admin/custom-print | Owner/Admin | MVP |
| 17 | Admin Products & Stock | /admin/products | Owner/Admin | MVP |
| 18 | Admin Portfolio | /admin/portfolio | Owner/Admin | MVP |
| 19 | Admin Sign-in | /admin/sign-in | Owner/Admin | MVP |
| 20 | Customer Account Access | /account | Customer | Deferred |

## 5. Journey map

### 5.1 Public and B2B

Homepage
  -> Services
  -> Projects / Case Studies
  -> Project Detail
  -> Project Brief / Request Quote
  -> reference ID and human follow-up

Homepage
  -> Custom 3D Print Landing
  -> Custom Print Request
  -> operator review
  -> Quote Review

### 5.2 Retail

Shop
  -> Product Detail
  -> Cart
  -> Checkout as guest
  -> shipping rate
  -> payment
  -> Order Status

### 5.3 Custom print

Custom 3D Print Landing
  -> Custom Print Request
  -> private upload and configuration
  -> operator review and slicing
  -> Quote Review
  -> approval
  -> payment and production
  -> final package measurement
  -> shipping payment
  -> Order Status

### 5.4 Operations

Admin Sign-in
  -> Admin Action Queue
  -> Admin Orders
  -> Admin Custom Print Review
  -> Admin Products & Stock
  -> Admin Portfolio

## 6. Screen specifications

The following sheets are the contract that the visual board renders. A frame
can be promoted to a higher fidelity only after the owner approves this
structure and its states. The owner approved this architecture on 2026-09-03.

### 01. Homepage

Purpose: menjelaskan positioning Niuva dan mengarahkan pengunjung ke tiga entry
paths tanpa mencampur kebutuhan B2B, retail, dan custom print.

Content priority:

1. positioning: Idea -> Design -> Prototype -> Finished Product;
2. proof or real project evidence;
3. three entry paths: Diskusikan Proyek, Custom 3D Print, Shop;
4. services/capabilities;
5. process and trust signals;
6. next step with a human contact route.

Desktop composition:

- header and primary CTA;
- hero split: concise positioning copy on the left, real evidence placeholder
  on the right;
- entry path row with one emphasized B2B path and two distinct alternatives;
- services overview linked to Services;
- selected project proof linked to Projects;
- process strip linked to the relevant flow;
- closing CTA with contact expectation.

Do not make the entry paths three equal decorative cards. Their hierarchy must
reflect the three different jobs and audiences.

States: published content, loading content, no published project, missing media,
CTA submission/navigation failure.

Mobile: stack hero copy before evidence; stack entry paths with explicit labels;
keep one primary CTA visible without requiring a desktop hover.

Accessibility: one H1, descriptive image alternatives when media exists,
keyboard-visible focus, skip link, no information conveyed by color alone.

### 02. Services

Purpose: memberi pemahaman capability dengan bahasa outcome, bukan daftar
software atau technology buzzwords.

Content priority:

1. capability overview;
2. four areas: product development, design and engineering, prototyping and
   manufacturing, custom 3D print;
3. what each area helps the user decide or produce;
4. evidence or linked project;
5. related next steps.

Desktop composition: intro block, four capability sections in a 2 by 2 rhythm,
then evidence and CTA. Each section has a distinct content role, not four
interchangeable tiles.

States: published, loading, empty capability content, unavailable linked proof.

Mobile: one capability section per row; keep outcome summary before detail; CTA
follows the relevant service rather than floating away from it.

Accessibility: heading hierarchy must expose the four capability areas; links
must remain descriptive when read out of context.

### 03. Projects / Case Studies

Purpose: menyediakan bukti B2B yang dapat dipindai berdasarkan konteks, bukan
gallery dekoratif.

Content priority:

1. project title and outcome;
2. context or industry;
3. project thumbnail and alt text;
4. project detail link;
5. lightweight category or service filter only if real data supports it.

Desktop composition: featured project with larger evidence area, followed by
projects with varied but repeatable rows. Use real project media only when
available.

States: published projects, loading, no published projects, missing media,
filter with no match, request failure.

Mobile: featured proof becomes a readable vertical opener; project metadata
precedes action; avoid a dense masonry grid that hides context.

Accessibility: filter controls have labels and announced result counts; each
project link names the project and outcome.

### 04. Project Detail

Purpose: membuat calon klien memahami konteks, challenge, process, dan result
sebelum meminta percakapan.

Content priority:

1. project title, role, and short outcome;
2. context and challenge;
3. process decisions;
4. result or current status;
5. evidence gallery with captions;
6. related service and Project Brief CTA.

Desktop composition: title and outcome opener, context panel, process timeline
or sequence, evidence gallery, result panel, related next step.

States: published, loading, not found, private client project, missing media,
permission-restricted asset.

Mobile: preserve narrative order; gallery must not interrupt the first context
and challenge explanation; captions remain adjacent to media.

Accessibility: gallery controls are keyboard operable; decorative media is
hidden from assistive technology; captions communicate why the image matters.

### 05. Project Brief / Request Quote

Purpose: menangkap brief B2B yang cukup untuk review operator tanpa menjanjikan
instant quote.

Required fields:

- Name;
- Email;
- WhatsApp;
- Project goal;
- Current stage: Idea, Sketch, CAD, Prototype, Existing Product;
- Description;
- Target quantity;
- Target deadline;
- File/reference upload or link;
- confidentiality acknowledgment.

Optional fields:

- Company;
- budget range;
- preferred service.

Desktop composition:

- context header explaining review and response expectation;
- form in grouped sections: contact, project context, scope, reference, consent;
- side summary of what happens next;
- submit action and privacy note.

States:

- default and focused field;
- field validation and upload validation;
- pending upload;
- server failure with values preserved;
- duplicate or already-submitted warning;
- submitting state;
- success with reference ID, saved brief confirmation, and WhatsApp follow-up
  route;
- unavailable submission endpoint.

Mobile: single column; keep consent before submit; summary becomes an ordered
next-steps section; do not hide required fields inside an unexplained accordion.

Accessibility: visible labels, field-level errors, aria-describedby for help
and errors, keyboard upload path, focus moves to the first invalid field, and
success is announced without losing the reference ID.

### 06. Shop

Purpose: membantu customer retail memilih ready-made product dengan informasi
stock dan price yang dapat dipercaya.

Content priority:

1. product name, image, price, stock signal;
2. category or collection;
3. product detail route;
4. cart entry;
5. explicit empty and unavailable states.

Desktop composition: shop header, category navigation, product listing with
clear product metadata, and a visible cart summary.

States: loading catalog, published catalog, empty catalog, no category match,
product unavailable, stock changed, catalog request failure.

Mobile: filter/category controls are reachable without blocking product
discovery; product cards expose name and price before image-only interaction.

Accessibility: product card is not nested interactive controls; image alt,
price, stock, and link target are readable as one coherent item.

### 07. Product Detail

Purpose: memberi keputusan pembelian lengkap sebelum item masuk cart.

Content priority:

1. product title, price, stock;
2. gallery and material/context;
3. variant selection;
4. quantity;
5. add to cart;
6. shipping or purchase notes.

Desktop composition: gallery on the left, purchase decision panel on the
right, product information and related proof below.

States: loading, available, out of stock, variant unavailable, quantity limit,
cart mutation pending, cart success, cart failure, product not found.

Mobile: purchase controls follow title and price; gallery remains navigable by
keyboard and touch; sticky action may be used only if it does not cover errors.

Accessibility: every variant has a label and selected state; quantity input
has an accessible name and bounded error; add-to-cart result is announced.

### 08. Cart

Purpose: memungkinkan customer memeriksa item, quantity, stock, dan subtotal
sebelum guest checkout.

Content priority:

1. item identity, variant, quantity, price;
2. stock or availability warning;
3. subtotal;
4. checkout action;
5. continue shopping and remove/update actions.

Desktop composition: item list with independent row actions and a summary rail.

States: populated, empty, loading cart, item removed, quantity update pending,
stock conflict, price revalidation conflict, cart recovery failure.

Mobile: summary follows items and stays reachable; row actions have text or
accessible labels; checkout is disabled only when a clear blocking reason is
shown.

Accessibility: quantity changes announce the resulting quantity and subtotal;
remove action identifies the product; focus is restored after row mutation.

### 09. Checkout

Purpose: menyelesaikan pembelian retail sebagai guest dengan shipping dan
payment yang authoritative di server.

Content priority:

1. contact;
2. shipping address;
3. Biteship shipping options and rate;
4. order summary;
5. Midtrans payment transition;
6. confirmation and next status route.

Desktop composition: checkout form and shipping choices on the left, order
summary on the right, with payment action after totals are revalidated.

States: default, field validation, rates loading, rates unavailable, cart
expired, stock revalidation failure, payment pending, payment failed, payment
success, server retry.

Mobile: address and shipping precede payment; summary is expandable but totals
and selected rate remain visible; payment status must not depend on a modal
that is inaccessible to keyboard.

Accessibility: grouped address fields have clear labels; selected shipping
option is announced; payment pending state explains that the user should not
submit again until status changes.

### 10. Custom 3D Print Landing

Purpose: menjelaskan layanan custom print dan menetapkan ekspektasi bahwa quote
memerlukan review operator.

Content priority:

1. what custom print is for;
2. suitable input and file types;
3. review, slicing, pricing, and production sequence;
4. factors that affect price;
5. Custom Print Request CTA.

Desktop composition: explanation opener, process sequence, input checklist,
realistic expectation panel, CTA.

States: published explanation, loading content, upload service unavailable,
unsupported file guidance.

Mobile: sequence becomes numbered reading order only when numbers have labels;
CTA follows expectation-setting content.

Accessibility: process is understandable without icons or color; file guidance
is text; CTA says exactly what starts the flow.

### 11. Custom Print Request

Purpose: mengumpulkan file dan konfigurasi minimum untuk operator review.

Fields and inputs:

- private file upload;
- material;
- color;
- quantity;
- notes;
- unit scale or dimensions;
- contact details;
- optional reference.

Desktop composition: upload and file status, configuration form, customer notes,
expectation summary, submit action.

States: empty upload, upload pending, unsupported type, file too large,
private-upload failure, default configuration, validation error, submit pending,
request submitted, duplicate request, service unavailable.

Mobile: upload status remains above the fold; configuration fields are in one
logical sequence; file removal has confirmation only when needed.

Accessibility: upload accepts keyboard and clear file constraints; progress and
failure are announced; no file URL is exposed as a permanent public link.

### 12. Quote Review

Purpose: memperlihatkan immutable quote hasil review operator dan memberi
customer keputusan accept atau decline.

Content priority:

1. quote reference and expiry;
2. item or service scope;
3. weight, duration, material, shipping assumptions where applicable;
4. price breakdown;
5. accept or decline action;
6. contact route for clarification.

Desktop composition: quote header, scope and assumptions, breakdown, decision
panel, support contact.

States: loading, valid quote, expired quote, already accepted, declined,
payment pending, quote revoked, invalid token, access denied.

Mobile: totals and decision action follow scope summary; assumptions remain
expandable but not hidden from assistive technology.

Accessibility: currency and totals have clear programmatic labels; status is
announced; destructive decline requires an explicit confirmation step.

### 13. Order Status

Purpose: memberi customer status order yang aman dan dapat dipahami tanpa
mengekspos catatan internal operator.

Content priority:

1. order reference;
2. current status;
3. public timeline;
4. items or custom-print scope;
5. shipping/payment next step;
6. contact route.

Desktop composition: status header, timeline, order summary, next action, help
contact.

States: loading, retail paid, production, ready to ship, shipped, completed,
custom quote pending, quote accepted, awaiting shipping payment, cancelled,
expired token, not found, temporary service failure.

Mobile: current status is first; timeline uses readable text order; next action
is separated from internal-only details.

Accessibility: timeline does not rely on color; current status is text and
programmatically marked; token error gives a recovery path.

### 14. Admin Action Queue

Purpose: menjadi homepage operasional yang mengarahkan Owner/Admin ke keputusan
berikutnya, bukan dashboard vanity.

Content priority:

1. urgent or aging actions;
2. queue type and count;
3. customer/project/order context;
4. primary operator action;
5. exception and failed-action visibility;
6. recent completion audit.

Desktop composition: authenticated shell, queue tabs or segments, prioritized
action rows, right-side exception panel, recent activity.

Queue examples: new project brief, custom print review, quote to send, paid
order to fulfill, final package measurement, stock exception.

States: loading, populated, empty queue, stale data, permission denied, request
failure, action pending, action conflict.

Mobile: queue rows become stacked; primary action is explicit; filters do not
hide urgent count; exception details can open as an accessible disclosure.

Accessibility: table-like data has headers or list semantics; status and age
are text; keyboard focus returns to the action row after completion.

### 15. Admin Orders

Purpose: mengelola order retail dan custom print sesuai state machine yang
valid.

Content priority:

1. order reference and customer;
2. type and current status;
3. payment/shipping state;
4. age or exception;
5. detail action;
6. allowed transition.

Desktop composition: filter/search bar, order table, selected order detail
drawer or route, transition action, audit history.

States: loading, populated, empty, no filter match, permission denied, stale
record, invalid transition, update pending, request failure.

Mobile: filters become a clear sequence; table rows become labeled summary
cards; transition action stays next to the current state and reason.

Accessibility: filter fields are labeled; table headers remain available at
wide view; mobile cards preserve label/value relationships.

### 16. Admin Custom Print Review

Purpose: membuat operator dapat memeriksa file private, memasukkan hasil
slicing, dan membuat quote yang dapat diaudit.

Content priority:

1. request and customer context;
2. private file access status;
3. geometry/material/configuration;
4. verified slicer weight and duration;
5. deterministic pricing inputs;
6. quote preview and send action;
7. audit and status transitions.

Desktop composition: request context rail, private file panel, review checklist,
pricing form, immutable quote preview, operator action bar.

States: loading, request new, file available, file unavailable, invalid file,
review in progress, missing slicer inputs, pricing validation error, quote
draft, quote sent, update conflict, permission denied.

Mobile: customer context and file status precede pricing; quote preview follows
all inputs; destructive or irreversible actions require explicit confirmation.

Accessibility: private-file state is textual; numeric fields have units and
labels; validation explains which input is missing; no authoritative result is
communicated by a color-only badge.

### 17. Admin Products & Stock

Purpose: mengelola catalog MVP, variant, price, stock, publish state, dan
minimum audit context.

Content priority:

1. product and SKU;
2. variant, price, and stock;
3. publish state;
4. edit or create action;
5. stock change reason;
6. audit timestamp/operator.

Desktop composition: product list, search/filter, editor subview, variant
table, stock adjustment form, publish action.

States: loading, populated, empty, no match, unsaved changes, validation error,
stock conflict, publish pending, permission denied, request failure.

Mobile: product identity and stock are visible before secondary metadata; edit
sections are ordered; unsaved-change warning is not color-only.

Accessibility: numeric inputs expose units; publish state has text; stock
adjustment reason is required where the business rule requires it.

### 18. Admin Portfolio

Purpose: mengelola project proof yang dapat dipublikasikan tanpa membocorkan
client material atau permission yang belum diberikan.

Content priority:

1. project title and outcome;
2. context, challenge, process, result;
3. media and alt text;
4. client/publication permission;
5. draft/published state;
6. preview and save action.

Desktop composition: project list, editor sections, media manager, permission
checklist, preview, publish action.

States: loading, populated, empty, draft, missing required content, media
upload pending, missing alt text, permission blocked, save conflict, publish
failure.

Mobile: editor sections follow narrative order; permission checklist appears
before publish; media controls keep file status visible.

Accessibility: alt text is required for meaningful media; preview is not the
only way to understand publish state; errors are associated with the relevant
section.

### 19. Admin Sign-in

Purpose: menyediakan akses Owner/Admin yang aman ke operations shell.

Content priority:

1. Clerk-backed sign-in;
2. identity and credential error;
3. support or recovery route;
4. redirect to Action Queue after success.

Desktop and mobile composition: centered sign-in surface with short context,
provider-managed fields/actions, and no customer-facing registration language.

States: default, credential/provider error, unauthorized role, inactive user,
network failure, successful redirect.

Accessibility: provider fields retain visible labels and focus; error is
announced; sign-in does not reveal whether a non-admin account exists.

MVP rule: Admin registration is controlled outside the public product surface.
Do not add an open admin register form.

### 20. Customer Account Access

Purpose: memetakan keputusan yang mungkin dibutuhkan setelah MVP tanpa
mengubah guest checkout requirement.

Status: deferred exploration, not implemented, not part of MVP acceptance.

Potential content:

- login;
- register;
- password or identity recovery;
- account order history.

Desktop and mobile composition: shown only as an annotated placeholder in this
board, with the deferred boundary visible.

States to define later: signed out, invalid credential, new account,
verification pending, account recovery, disabled account.

MVP rule: customer account is optional future scope. Shop, Cart, Checkout, Quote
Review, and Order Status must remain usable through guest or secure token flows
defined by the PRD.

## 7. Cross-screen state matrix

| State family | Public/B2B | Commerce | Custom print | Admin | Auth |
| --- | --- | --- | --- | --- | --- |
| Loading | content shell | catalog/cart/rates | file/request | queue/list/detail | provider |
| Empty | no project/proof | empty catalog/cart | no file | no queue/no result | not applicable |
| Validation | brief fields | address/quantity | file/config | pricing/product | provider error |
| Server failure | submit/content | revalidation/payment | upload/submit | action conflict | network |
| Permission | private project | token/order | private file/quote | role denial | unauthorized |
| Success | reference ID | cart/payment | request/quote | transition/audit | redirect |
| Recovery | retry/contact | restore/revalidate | replace file | retry/refresh | provider recovery |

The UI must not show a success state before the server confirms the operation.
Loading, error, and success content must preserve enough context for a user to
recover without starting over.

## 8. Responsive acceptance gate

Review the board at minimum at:

- 390 px mobile;
- 768 px tablet;
- 1280 px desktop.

At each width verify:

- no horizontal scroll from primary content;
- headings wrap without hiding the next action;
- forms preserve field order and error association;
- tables become labeled list/cards where needed;
- summary and status remain visible;
- focus indicator remains visible;
- touch targets are at least 44 by 44 CSS pixels;
- reduced-motion users receive the same information without required animation.

## 9. Wireframe approval gate

Decision recorded: approve wireframe architecture MVP on 2026-09-03.

The recorded owner approval covers:

- the 20-surface inventory is correct;
- MVP versus deferred scope is correct;
- each screen has one clear primary job;
- the journeys and next states are correct;
- required fields and operational states are not missing;
- responsive and accessibility constraints are acceptable.

Approval does not yet mean:

- homepage or project brief visual acceptance;
- product-screen propagation to every route;
- approval of Creative Components or Decorative Effects;
- approval of customer account implementation;
- approval of final photography, font scale application, color treatment, or
  motion choreography.

The next controlled step is to choose a small
vertical slice, likely Public B2B or Retail, and create a higher-fidelity
proof using only approved Foundation, Primitive, and Core Component contracts.
Each proof still requires visual acceptance before broader propagation.
