---
name: Pocket
description: A quiet household ledger with the warmth of a neighborhood credit-union booklet.
colors:
  bg: "#f5f4ef"
  surface: "#fff"
  ink: "#202e29"
  muted: "#647168"
  green: "#244e3f"
  green-hover: "#183a2e"
  line: "#e3e6de"
  sage: "#b8c8ad"
  peach: "#e5ae8e"
  danger: "#aa3f38"
  capture: "#f0e4d6"
  focus: "#60875b"
  assistant-question: "#eaf0e1"
  assistant-composer: "#f9faf6"
  assistant-composer-line: "#cdd7c6"
  assistant-context: "#e9eedf"
  assistant-context-ink: "#4c6047"
  assistant-bar: "#9eaf8c"
  assistant-bar-track: "#edf0e7"
  assistant-increase: "#9d5738"
  assistant-decrease: "#3f704b"
  assistant-fallback: "#f7eddf"
  assistant-fallback-ink: "#7b592e"
typography:
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.035em"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 750
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "12px"
  metric:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.2
  assistant-welcome:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-.035em"
  assistant-answer:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.85
  assistant-metadata:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "11px"
  assistant-number:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.25
  assistant-context-title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-.035em"
  assistant-composer:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "13px"
    lineHeight: 1.65
rounded:
  tag: "5px"
  icon: "7px"
  control: "8px"
  navigation: "9px"
  utility: "10px"
  dropzone: "12px"
  panel: "14px"
  dialog: "18px"
  assistant-composer: "11px"
  assistant-emblem: "16px"
spacing:
  compact: "8px"
  control: "12px"
  column-gap: "20px"
  panel-inset: "22px"
  desktop-gutter: "38px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.green}"
    rounded: "{rounded.control}"
    padding: "10px 4px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation:
    rounded: "{rounded.navigation}"
    padding: "13px 15px"
  category-tag:
    rounded: "{rounded.tag}"
    padding: "3px 7px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "22px"
  capture-panel:
    backgroundColor: "{colors.capture}"
    rounded: "{rounded.panel}"
    padding: "22px"
  assistant-thread:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  assistant-composer:
    backgroundColor: "{colors.assistant-composer}"
    textColor: "{colors.ink}"
    rounded: "{rounded.assistant-composer}"
    padding: "9px 10px 8px 15px"
    typography: "{typography.assistant-composer}"
  assistant-question:
    backgroundColor: "{colors.assistant-question}"
    rounded: "{rounded.dropzone}"
    padding: "12px 16px"
  assistant-scope:
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
    typography: "{typography.assistant-metadata}"
  assistant-context:
    backgroundColor: "{colors.assistant-context}"
    textColor: "{colors.assistant-context-ink}"
    rounded: "{rounded.dropzone}"
    padding: "19px"
  assistant-evidence:
    textColor: "{colors.green}"
    padding: "13px 0"
---

# Design System: Pocket

## Overview

**Creative North Star: "Neighborhood credit-union booklet"**

Pocket is a quiet contemporary household ledger for frequent short visits. Cream paper, forest identity, peach annotations, generous margins, and precise tabular amounts make everyday money feel orderly and approachable. The selected design seed was the fifth direction: neighborhood credit-union booklet.

Operate mode uses familiar application controls and a warm capture area. The implemented system expresses that selected direction through type, tonal surfaces, and spacing rather than a literal paper texture.

**Key Characteristics:**
- Cream ledger canvas with a forest navigation rail.
- Self-hosted Manrope and tabular monetary figures.
- Warm capture surface and restrained sage context panels.
- Familiar controls, compact information, and responsive bottom navigation.

## Colors

The palette combines forest and cream with muted botanical and warm stationery accents. Frontmatter records the normative values extracted from styles.css and assistant.css.

### Primary
- **Forest green:** identity rail, primary actions, income chart bars, and selected labels. Deep forest is the primary button hover state.

### Secondary
- **Sage:** botanical accent alongside pale green contextual surfaces.
- **Peach:** brand dot and warm identity accent. Capture uses its own pale warm-paper token.
- **Danger:** form errors and destructive actions.

### Neutral
- **Cream paper:** application canvas.
- **White surface:** panels and controls.
- **Dark green ink:** reading text and amounts.
- **Muted botanical ink:** supporting labels, legends, and metadata.
- **Paper edge:** thin borders and separators.
- **Focus green:** visible keyboard outlines.

Ask Pocket extends these tones with pale sage question bubbles, a near-white composer, and muted green answer bars. Its context callout uses the assistant-context surface and assistant-context-ink text tokens; the explanatory paragraph uses this darker ink for contrast. Warm increase and green decrease indicators accompany signed amounts and text. Fallback notices pair pale warm paper with brown text.

## Typography

Manrope is self-hosted as a variable font with Arial and sans-serif fallbacks. Its compact rounded forms carry headings and working controls without a second display family. Monetary figures use tabular numerals and tight tracking.

Frontmatter headline and title roles describe desktop page and section headings. Body text is 14px; most controls, tables, and supporting copy use 12px. The final cascade also uses 11px for status, footer, and compact metadata. There is no universal 12px minimum: the sidebar strapline is 9px; mobile breadcrumbs become 10px, while top status becomes 9px. The final mobile-navigation override keeps labels at 12px with -.02em tracking, including the narrowest breakpoint. Mobile editable controls generally rise to 16px to avoid browser zoom, with the month selector explicitly kept at 12px.

The final metric amount is 28px on desktop, 24px at the intermediate breakpoint, 27px on mobile, and 23px at the narrowest breakpoint. Later overrides take precedence over the earlier large-screen metric declaration. Page headings become 25px on compact desktop and 27px on mobile.

Ask Pocket keeps Manrope throughout. Its welcome heading is 26px, falling to 23px at 1180px and 22px on mobile. Answer prose is 13px with 1.85 line height; questions are 13px. Final overrides set scope chips, answer metadata, composer notes, and session notes to 11px. Answer totals use 23px desktop and 22px mobile; comparison totals use 24px desktop and 22px mobile. The context heading uses 22px, then 20px and 19px at the intermediate breakpoints. Composer text is 13px desktop and 16px mobile.

## Layout

Desktop uses a fixed 218px forest sidebar and matching content offset. The top bar is 76px high. Main content has a 1536px maximum width and padding of 34px 38px 24px. Four metrics precede a two-column dashboard with a 1.7fr main column and a right column of at least 280px, separated by 20px. Panel padding normally uses 22px. These are observed measurements, not a uniform invented spacing scale.

At 1500px and wider, charts and panel interiors gain room. At 1180px and below, the rail contracts to 184px and gutters tighten. At 980px and below, navigation becomes a 76px icon rail and budget cards use two columns. At 760px and below, the rail disappears, metrics use two columns, the dashboard stacks, capture moves first, and fixed bottom navigation includes safe-area padding. Accounts and settings become single-column; dialogs become bottom sheets. At 370px and below, budgets become single-column and the allocation chart moves above its legend. Narrow tables hide secondary columns while preserving merchant and amount information.

Ask Pocket uses a flexible thread beside a 253px context sidebar with a 26px gap. The sidebar becomes 215px with a 21px gap at 1180px, then 200px with a 19px gap at 980px. Desktop thread height is `calc(100dvh - 270px)`, bounded by 570px and 920px; a three-row grid keeps its header and composer outside the scrolling history.

On mobile, the context sidebar hides. The assistant shell uses `calc(100dvh - 70px - env(safe-area-inset-bottom))`; flex layout lets the thread fill the remaining viewport with no minimum height, overriding its earlier mobile size declaration. The footer hides, history scrolls internally, and the composer remains in the thread above bottom navigation. Optional AI understanding appears in a compact separate control beneath the thread. On mobile screens no taller than 650px, headings compress, the top bar drops to 48px, explanatory copy and the composer note hide, and vertical padding shrinks.

## Elevation & Depth

Panels stay flat, separated by pale borders and surface tone. Depth is reserved for overlays and selected controls: dialogs use `0 18px 80px #14231a30`, toasts use `0 8px 30px #142b2425`, and mobile navigation uses `0 -4px 20px #24352406`. Selected chart tabs and segments use small `0 1px 3px` shadows. Modal backdrops use translucent forest with a 3px blur.

## Shapes

Gently rounded rectangular panels define the ledger. Frontmatter records the radius vocabulary: panels, controls, tags, and dialogs have distinct scales. Borders are generally 1px. Circles belong to avatars, allocation charts, voice capture, and selected goal icons. Bars have rounded upper corners; progress tracks are shallow rounded lines.

## Components

### Sign-in page

The sign-in page pairs a forest identity panel with a white form panel on the cream canvas.
It reuses Manrope, the Pocket mark, peach brand dot, green primary action, 8px input corners, and the existing focus treatment.
The username is prefilled as `pocket`, followed by one password field with a Show/Hide control and an **Open my Pocket** action.
Wrong credentials produce a nearby text error; loading disables duplicate submits and keeps the page stable.
On mobile, the identity panel becomes a short header and the form stacks beneath it, with 16px inputs and touch targets of at least 44px.
Successful sign-in opens the workspace directly without a tour or additional setup steps.

### Buttons
Forest primary buttons use white type, a 40px minimum height, and a 12px label at weight 750. Hover deepens the forest; pressing shifts the control down 1px. Secondary buttons are white with a paper-edge border; ghost buttons use transparent green labels; destructive buttons use danger red. Keyboard focus receives a 3px outline with 4px offset. Disabled buttons use reduced opacity and a wait cursor.

### Inputs / Fields
White bordered fields use 10px 12px padding and a 42px minimum height. Quick-entry and search containers gain a 2px forest focus-within outline. Capture pairs a multiline sentence field with a compact submit button. Review dialogs use conventional labeled fields, validation text, and explicit save actions.

### Navigation
The forest sidebar uses pale labels, a lighter forest hover surface, and a cream active item with bold forest text. Desktop items are 13px. Compact navigation retains icons. Mobile navigation is a pale fixed bottom bar with stacked icons and labels, sage active surface, and top border. Its final labels are Overview, Activity, Budgets, Accounts, and Ask. Ask replaces Settings in the mobile bar; the top avatar opens Settings. Desktop navigation retains both Ask Pocket and Settings. Labels stay on one line at 12px with -.02em tracking; the bar uses 4px horizontal padding.

### Chips
Category tags are compact outlined labels. Status pills use pale green fill and botanical text. Both support classification without competing with the primary action.

### Cards / Containers
White panels and metrics use thin borders and the panel radius. The lead metric and contextual strips use pale sage. Account cards use quiet sage, warm paper, and cool gray variants. Tables have pale headers, horizontal separators, right-aligned tabular amounts, and pale hover rows.

### Warm capture box
The warm-paper capture panel is the signature utility surface. Its white sentence field sits above familiar capture controls. Supporting copy uses warm muted ink. The receipt dropzone is softly green with a dashed border; receipt review uses the shared dialog system.

### Ask Pocket thread and composer
The thread is a flat white panel with a thin border. A compact status header offers New conversation. Empty conversations introduce suggested questions as ruled rows, not large decorative cards. Right-aligned sage question bubbles precede open, left-aligned answers with the forest Pocket mark. Successive turns use subtle horizontal separators.

The near-white composer has a muted green border, an 11px radius, and a 2px forest focus-within outline. Voice and send controls sit beside the multiline field. Enter submits; Shift+Enter adds a line; composition events do not submit. Voice toggles dictation, places the transcript in the editable draft, and asks the person to review then send. Listening receives danger ink on a pale warm background and a live status message. While answering, entry controls disable and a visible Stop control remains available. The history is a labeled, keyboard-focusable region.

### Answer scope, figures, and evidence
Scope chips are noninteractive, wrapping outlined labels showing date range, transaction type, category, account, and applicable search or amount filters. Narrative answers sit beside tabular totals, shallow sage bars, comparison columns, and plain budget rows. Follow-up questions are outlined forest-text buttons with a pale hover fill and mobile minimum height of 42px.

Evidence uses a native expandable details element bounded by thin rules. Its summary has a 44px minimum height and a rotating disclosure icon. Matching transaction buttons show merchant, date metadata, and a right-aligned amount, with a pale hover row; opening a record enters the existing edit dialog. Textual counts and amounts remain available alongside bars and colored change indicators. Empty answers and fallback notices preserve explicit explanatory copy.

### Assistant context sidebar
The desktop context sidebar carries a restrained botanical introduction, source explanation, workspace details, and optional AI understanding control. The pale sage callout uses the darker assistant-context-ink paragraph color. A session note explains the temporary conversation. The mobile layout moves the available AI checkbox beneath the thread while keeping Settings accessible from the avatar.

### Motion and feedback
Button and navigation transitions last 180ms; toast opacity and movement take 200ms. Chart bars do not animate values. Processing uses an 800ms linear spinner. The declared easing custom property is not consumed by current transitions. Both reduced-motion media queries and the explicit no-motion class disable animations and transitions. Toasts sit above mobile navigation and can expose undo.

Routine chart and default-month changes update the affected controls while preserving drafts and keyboard focus. Capture tabs retain text/transcripts and support arrow-key navigation. Dialog cancellation returns focus to the opener; file-reading dialogs expose Cancel. Mobile month arrows, budget-edit controls, avatar, capture tabs and assistant compose controls have a 44px minimum target. Mobile scroll padding reserves 90px plus the safe area above bottom navigation. At widths up to 760px and heights up to 500px, the conversation uses a 400px thread in normal page flow so its composer remains reachable. Long headings, goals and account names wrap; sidebar names truncate within the rail.

## Do's and Don'ts

### Do:
- Do preserve the cream canvas, forest rail, and warm capture surface.
- Do use Manrope and tabular numerals for comparable monetary amounts.
- Do retain explicit keyboard focus and textual chart legends.
- Do honor bottom-navigation safe areas and reduced-motion preferences.
- Do preserve drafts and keyboard focus during targeted updates, use 44px mobile action targets, and keep the composer reachable on short screens.

### Don't:
- Don't replace familiar operate-mode controls with decorative interactions.
- Don't add decorative shadows to every ledger panel.
- Don't treat the initial seed measurements as authoritative over the finished CSS cascade.
- Don't use color alone to explain chart categories or validation errors.
