# Client TELOS: Henderson Services

**Last Updated:** 2026-02-05
**GitHub Repository:** eeeschwartz/aaa-henderson-pm-email-agent
**Engagement Start:** September 2025 (ongoing, rolling monthly)

---

## Document Purpose

This document captures the strategic context, goals, priorities, and constraints for Henderson Services' automation initiatives. It serves as the persistent state that guides task prioritization and decision-making for Erik's consulting engagement.

This TELOS file follows the SPQA (State, Policy, Quality, Activity) pattern:
- **State**: Current context, goals, KPIs
- **Policy**: How we work, what we prioritize
- **Quality**: How we measure success
- **Activity**: Streaming log of updates and changes

---

## Client Overview

**Company:** Henderson Services (106-year-old electrical contractor)

**Industry:** Commercial electrical/construction services

**Size:**
- Revenue: ~$30-50M annually
- Workforce: ~150 field electricians (100 core, 50 project-based)
- Offices: Lexington (operations base), Louisville

**Primary Revenue:** Toyota shutdowns ($1M+ events), T&M service work, preventive maintenance

**Operating Model:** EOS (Entrepreneurial Operating System) for ~3 years

**Your Role:** AI/Automation Consultant

**Engagement Scope:**
- Job Master Automation: Eliminate 30-60 min manual job setup per job
- Manpower Board: Real-time visibility into workforce allocation (DEPLOYED)
- WIP Reports: Financial visibility for PMs (NEXT PRIORITY)
- Free up project managers to focus on customer-facing work and revenue generation

**History:**
Started with Josh Sapp (Lexington Service PM) as pilot user for Job Master automation. Currently expanding to Louisville office (Daniel Anderson, Lisa Miller) while managing critical business continuity risk: Lisa Miller retiring in 2.5 years with 30+ years institutional knowledge.

---

## Client Mission

**Henderson Services' Big Picture:**
Project managers are the growth engine of the company. The mission is to eliminate high-toil administrative work so PMs can spend more time selling work and serving customers face-to-face.

**Project Mission:**
Automate operational workflows (Job Master, WIP reporting, workforce scheduling) to reclaim 70-80% of administrative time, enabling PMs to focus on revenue-generating activities.

---

## Strategic Goals

**Priority Weighting:** Each goal is half as important as the one before it.

- **G1:** Eliminate manual job setup time (30-60 min → <5 min = 70-80% reduction)
- **G2:** Capture Lisa Miller's institutional knowledge before retirement (2.5 years)
- **G3:** Enable WIP visibility for better cash flow management (Luke's next priority)
- **G4:** Standardize processes across Lexington and Louisville offices

---

## Projects

### 1. Manpower Board ✅ DEPLOYED (Maintenance Mode)

**Status:** Live, in maintenance mode

**Impact:** Real-time visibility into 150+ electrician allocation across jobs

**Users:** Luke Templin, project managers (both offices)

**Win:** "Life changing" per Brad (manpower coordinator) - eliminates last-minute Toyota shutdown staffing firefights

**Technical:** Microsoft login integration, distance-from-home feature, map pins for job locations

---

### 2. Job Master Automation 🔥 TOP PRIORITY

**Status:** In progress - Lexington functional (Josh Sapp), Louisville expansion underway

**Impact:** ALL project managers, daily workflow, business continuity

**Critical Risk:** Lisa Miller (Louisville) retiring in 2.5 years - if she leaves unexpectedly, company operations severely impacted

**Timeline:** Complete Louisville expansion urgently (before Lisa retirement)

#### Current State
- **Lexington (Josh Sapp):** 75% functional, email-to-job working for 25-40% of jobs
  - AI inbox triage flags job emails for one-click review
  - Auto-populated Job Master with billing info, site details, NTE amounts
  - One-click email to Lynn + Mike Boland
  - SharePoint folder creation automated
- **Louisville (Daniel Anderson + Lisa Miller):** Migration in progress
  - Lisa resistant ("I'm old school")
  - ComputerEase-centric workflow (vs Lexington's Excel-first)
  - SharePoint migration incomplete (Daniel's folders pending)

#### Critical Path
- [ ] Lisa Miller face-to-face meeting (Louisville) - relationship building, knowledge capture
- [ ] ComputerEase customer data integration (system of record)
- [ ] Daniel Anderson SharePoint migration complete
- [ ] Process documentation capturing Lisa's workflows
- [ ] Phone-based job creation (75% of jobs via phone, not email)
- [ ] Standard templates for recurring customers

#### Success Metrics
- Job setup time: 30-60 min → <5 min
- All PMs using system across both offices
- Lisa's workflows documented and transferable
- No single-point-of-failure dependency

---

### 3. WIP Reports 📊 NEXT PRIORITY

**Status:** Not started - priority after Job Master stable

**Stakeholder:** Luke Templin requested this

**Impact:** Better cash flow visibility, billing discipline

#### To Be Defined
- Current WIP process pain points
- Desired output format
- Frequency (weekly? monthly?)
- Integration with Computer Ease data
- PM engagement model

---

## Current Priorities (Time-Bound)

**Current Period:** February 2026

**Focus Areas:**
- **P1:** Lisa Miller engagement - face-to-face Louisville visit, knowledge capture urgency
- **P2:** Louisville Job Master expansion - Daniel + Lisa workflows operational
- **P3:** ComputerEase customer data integration (system of record vs Excel templates)

---

## Technical Constraints

### Architecture Decisions
- **SharePoint integration** for automated job folder creation (migrating from legacy network drive)
- **AI inbox triage** flags job emails for one-click review and setup (live with Josh)
- **Job Master agent** handles customer lookup and creation across all project types/PMs

### Tech Debt to Avoid
- Network drive dependencies (legacy system, not automation-friendly)
- Manual data entry across multiple systems (ComputerEase, FieldEase, Excel)
- Fragmented customer billing/site detail tables across PM-specific Excel templates

### Patterns and Conventions
- **Job numbering:** PM-specific format (e.g., Josh uses JS### sequential, Daniel uses DA###)
- **Folder naming:** "Customer – Location/Store – Short description – JobNumber"
- **Subfolders:** Billing, Comms, Photos, POs/Work Orders (standardized structure)

### Integrations Required
- **ComputerEase:** Financial system of record (~60 second load time, manual payroll batch processing)
- **FieldEase:** Time tracking system (all Josh's jobs under "Josh Sapp" for team access)
- **SharePoint:** Job folder storage (replacing network drive)

### Security and Compliance
- Customer billing information must be handled securely
- Job site details and PO information are sensitive
- Admin access patterns (Lynn, Lisa) must be maintained

---

## Impact Scoring Model

**How to measure task value for Henderson Services:**

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Strategic Alignment | 40% | Does this serve G1-G4? Especially time savings (G1) and Lisa continuity (G2) |
| User Value | 30% | Direct benefit to PMs (Josh, Daniel) and admins (Lynn, Lisa) |
| Revenue Impact | 15% | Frees PM time for selling = direct revenue impact |
| Risk Reduction | 10% | Reduces manual errors, single-point-of-failure dependencies |
| Current Priority | 5% | Addresses P1 (Lisa), P2 (Louisville), P3 (ComputerEase) |

---

## Key Performance Indicators (KPIs)

**How we measure success:**

- **K1:** Job setup time - Current: 30-60 min (large jobs) | Target: <5 min (70-80% reduction)
- **K2:** PM time freed for customer-facing work - Current: Baseline TBD | Target: +8-12 hours/week per PM
- **K3:** Business continuity - Current: Lisa single point of failure | Target: Workflows documented, transferable
- **K4:** PMs successfully onboarded - Current: 1 (Josh) | Target: 3+ (Daniel, Troy operational)

---

## Risk Register

**Current risks and concerns (priority order):**

- **R1 (CRITICAL):** Lisa Miller retirement (2.5 years) - 30+ years Louisville institutional knowledge, no backup. If she leaves unexpectedly, company operations severely impacted.
- **R2:** Process fragmentation between Lexington (Excel-first, PM-led) and Louisville (ComputerEase-centric, admin-led) may reveal incompatible workflows
- **R3:** Phone-based job creation (75% of volume) harder to automate than email-based workflows
- **R4:** ComputerEase customer data integration gap (Josh's templates have partial data; ComputerEase is system of record)
- **R5:** SharePoint migration from network drive may reveal hidden dependencies

---

## Team Context

### Key Stakeholders

**Josh Sapp** - Lexington Service PM (Primary User, Pilot Success)
- 50+ jobs/week during busy periods
- Manages T&M service and large construction projects (up to $3M)
- Core pain point: Email volume prevents customer face time
- Foreman: Mike Boland (coordinates field assignments)
- Status: Job Master automation 75% functional

**Mike Boland** - Lead Technician / Foreman
- Josh's "right hand," coordinates field assignments
- Occasionally sets up jobs independently (e.g., Cleansweep)
- Needs parallel app access with auto-email to Josh & Lynn
- Communication: Talks with Josh multiple times daily

**Daniel Anderson** - Louisville PM (Next to Onboard, Innovation Champion)
- "Most tech-savvy PM, heavy AI user" (Notebook LM since May)
- Manages direct customer work with NTE budgets (e.g., $25K over multiple jobs)
- Big-picture thinker, wants scalability and standardization
- Works with Lisa Miller (admin)
- Status: SharePoint migration in progress

**Lisa Miller** - Louisville Admin (CRITICAL - Retiring in 2.5 years)
- 30+ years institutional knowledge
- "I'm old school" - resistant to change, needs face-to-face engagement
- Sets up jobs for Daniel, Troy (vs Lexington where PMs self-serve)
- ComputerEase expert, knows all customer quirks
- **URGENCY:** If she leaves unexpectedly, major operational disruption

**Lynn** - Lexington Admin
- Receives Job Masters via email from Josh
- Creates FieldEase jobs (time tracking)
- Creates ComputerEase jobs (financial tracking)
- Process enforcer - requires specific fields checked
- Critical link between job setup and billing

**Troy Van Diver** - Louisville PM (Future Onboarding)
- High volume service work (Josh's Louisville counterpart)
- Works with Lisa Miller for job setup

**Luke Templin** - Operations Manager (Primary Decision Maker)
- Identified Job Master as "highest ROI opportunity"
- AI sponsor internally, strategic thinker
- Requested WIP reports as next priority after Job Master
- Target: Reduce manual entries by 70-80%
- Manpower Board champion

**Jimmy** - CFO (Louisville, Engage Q2)
- Financial gatekeeper, trust-building needed
- Wait until after tax season (Q2) for engagement
- Will be key for WIP reports initiative

**Jennifer Corbett** - Louisville Accounting
- Handles invoicing after FieldEase tickets submitted
- Stores personnel data and certifications in FieldEase
- ComputerEase expert

### Decision Makers
- **Luke Templin** - Operations Manager, drives priorities
- **Josh Sapp** - Primary user feedback, workflow validation
- **Jimmy** - CFO, financial decisions (engage Q2)

### Technical Team
- **Erik Schwartz** - AI/Automation Consultant (primary developer)
- **Josh Sapp** - Domain expert, pilot user
- **Lynn, Lisa Miller** - Admin users, workflow testers

---

## Job Type Variations (Critical Context)

### Service/T&M Jobs
- Quick turnaround, minimal estimate detail
- High volume, standardized workflow
- Example: Emergency service calls, small repairs
- Pricing: Hourly rates + materials + equipment

### NTE (Not-To-Exceed) Jobs
- Require estimate breakdown in Job Master for field reference
- Josh uses Job Master estimate calculator: labor hours + materials + equipment (bucket truck, lift)
- Field techs use this to track progress against budget
- Example: "4 hours @ $105/hr + $200 materials = stay under $620 NTE"
- Common for third-party dispatch (Stones River, Speedway)

### Contract Jobs
- Always require detailed breakdown: hours, materials, equipment costs
- Breakdown flows to Lynn for WIP (Work in Progress) reporting
- Josh adjusts labor rates based on cost (not service rate) for margin tracking
- Example: Large UK campus project with $1M+ contract value

---

## Key Metrics (From L10 Meetings)

**Operational:**
- Prospecting: 318 YTD (target pace: 333)
- Bid hit ratio: 49% (unusually high)
- 13-week backlog: $209K average (goal: $267K)
- Manpower: 150 current (100 core, 50 Louisville project)

**Financial:**
- Past due invoices (Lexington): $492K (first time under $500K target)
- Past due (company): $2.5M (known locations)
- Service margin (Benny): ~$5M at 30% margin
- Preventive maintenance (Wes): ~$1.5M at 45% margin (highest margin business)

---

## Current State (Technical Progress)

### ✅ Current Capabilities (Live with Josh Sapp)
- AI inbox triage flags job emails for one-click review and setup
- Auto-populated Job Master with billing instructions, site info, NTE amounts
- One-click email delivery to Lynn (Louisville) and Mike Boland
- SharePoint folder creation & naming automated
- Job numbering auto-generation (PM-specific prefixes)
- Customer lookup from templates (partial data)

### ⏳ In Development (Feb 2026)
- Louisville expansion (Daniel Anderson + Lisa Miller workflows)
- ComputerEase customer data integration (system of record)
- Phone-based job creation capability (75% of volume)
- Mike Boland foreman parallel access

### 📊 Deployed & Maintained
- **Manpower Board:** Real-time 150+ electrician allocation, distance-from-home, map pins
- Weekly L10 visibility, eliminates Toyota shutdown staffing firefights

---

## Open Questions

### For Process Mapping
1. **WIP Reports:** What does Luke need? Current pain points? Format? Frequency?
2. **Lisa's workflows:** What knowledge must be captured before retirement?
3. **Louisville vs Lexington differences:** Which variations are necessary vs unnecessary?

### For Technical Implementation
1. **ComputerEase integration:** ETL batch process or live-lookup API?
2. **Phone job creation:** Voice transcription? SMS? Manual form on phone?
3. **Customer data validation:** How to sync Josh's templates with ComputerEase system of record?

---

## Activity Log

**Streaming updates (newest first). These updates modify the core context above.**

### 2026-02-05
- **Major TELOS update:** Comprehensive transcript analysis completed
- **Added:** Manpower Board (deployed, maintenance mode)
- **Added:** WIP Reports (next priority after Job Master)
- **Elevated:** Lisa Miller retirement risk to R1 (critical)
- **Updated:** Strategic goals simplified to G1-G4 focus
- **Updated:** Current priorities focused on Lisa engagement + Louisville expansion
- **Added:** Key metrics from L10 meetings, company context (106 years, $30-50M, 150 workers)
- **Context:** Analyzed 13,444 lines of Henderson transcripts via 6 parallel agents
- **Insights:** Job Master automation is company-wide priority, Lisa is single point of failure

### 2026-02-05 (Earlier)
- Client TELOS initialized with Job Master project context
- Key goals established: G1 (time savings), G2 (PM enablement)
- Risk register captured: variation discovery, data integration, foreman workflow

---

## Notes

**Josh Sapp Volume Metrics:**
- 50+ jobs/week during busy periods
- ~5 job masters/week per PM typical
- Stones River (key customer): 60% NTE contracts, 40% T&M work
- 75% of jobs come via phone, 25% via email (automation challenge)

**Current Automation Status:**
- 1 PM fully operational (Josh Sapp - Lexington)
- 1 PM in expansion (Daniel Anderson - Louisville)
- 1 major system deployed (Manpower Board)
- 1 next priority identified (WIP Reports)

**Critical Timeline:**
- Lisa Miller retirement: 2.5 years
- Louisville expansion: February 2026 target
- WIP Reports: After Job Master stable

**AI Adoption Culture:**
- "Very welcomed" vs typical software rollout pushback (Luke)
- Daniel: "Laps ahead," power user (Notebook LM)
- Wes: Report automation champion (Copilot for data analysis)
- Josh: Dictation learner, pragmatic adopter

---

**This TELOS file is living documentation. Update it frequently as context changes, especially after client calls and when priorities shift.**
