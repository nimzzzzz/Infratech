/**
 * SEO landing-page intro copy for stage and capability pages.
 *
 * These get inserted into stages.intro_md and capabilities.intro_md by the
 * seed script. Admins can edit either at any time via Drizzle Studio (or
 * the admin panel in Stage 5) — this file is just the seed text.
 *
 * Tone: independent reference, not vendor-pitched. Each paragraph should
 * help a project director / digital lead orient quickly: what the
 * stage/capability is, when in the lifecycle it bites, what kinds of
 * tools live here, why filtering matters.
 *
 * Stage 7 marketing pass should rewrite these for keyword density once
 * Search Console data lands. For Stage 2 they're "good enough to
 * outrank a directory page that's blank".
 */

export const stageIntros: Record<string, string> = {
  feasibility: `The earliest go/no-go window of a project — the months before anyone breaks ground, when the question is still "should we build this at all, and if so, in what shape?". Tools that live in this stage support business-case analysis, options appraisal, capital planning, transaction advisory, and the early modelling that decides whether a programme proceeds. Filter here for the platforms that help feasibility teams stress-test scope, cost, and risk before commitment is locked in.`,

  definition: `Scope is set, contracts are negotiated, design progresses through concept and detailed phases. This is the stage where the largest single body of project documentation is produced — drawings, specifications, BIM models, schedules of works, contract terms — and where the choices made compound for everything that follows. The tools listed here cover BIM authoring and review, cost estimation, scheduling, procurement, contract management, and the design-coordination platforms that hold the team aligned through the longest paper-heavy stretch of any programme.`,

  delivery: `The build phase — the longest, most software-intensive part of any project lifecycle. Schedules become real, sites become live, money flows weekly, and the tooling decision made here ends up running the operation for years. This is where field management, schedule control, document control, change management, quality and safety platforms, AI-assisted progress capture, and the wider construction PM stack all converge. Filter to find the products construction directors and digital leads actually run programmes on.`,

  operations: `The asset is commissioned, handed over, and running — and a different category of software takes over: asset management, condition monitoring, predictive maintenance, performance analytics, integration with operational technology systems. The horizon shifts from project completion to multi-decade asset life. Tools listed here serve owners and operators rather than contractors. Filter the list for platforms that turn the as-built record into ongoing operational intelligence.`,

  "post-delivery": `Closeout, lessons learned, warranty management, decommissioning. The stage most projects under-invest in and most owners later regret skipping. Tools here help capture and structure the knowledge produced by the programme — final cost reconciliation, document handover, claims, snag tracking through to defects-period closeout, and the chronology platforms that make later disputes survivable. A small but high-leverage corner of the directory.`,

  general: `Cross-stage platforms — products that don't sit cleanly in any single phase because they support workflows running from feasibility through to operations. Includes integration platforms, knowledge bases, AI agents that span the lifecycle, reporting and analytics layers built on top of stage-specific tools. Filter here for the connective tissue rather than the stage-specific point solutions.`,
};

export const capabilityIntros: Record<string, string> = {
  scheduling: `Scheduling tools build, baseline, and maintain the programme — the time-cost-resource model that everything else on a project hangs off. The category spans single-project planners (Microsoft Project, Primavera P6) through to AI-assisted scheduling engines that explore millions of build sequences against time and cost objectives. Filter here for the engines schedulers, planners, and project controls leads actually use.`,

  "building-information-modelling": `BIM platforms author, federate, and coordinate the 3D and information model that increasingly serves as the project's source of truth. Tools listed here cover model authoring, model review, clash detection, model federation, and the 4D/5D extensions that link the geometric model to the schedule and cost plan. Essential for any vertical building or large infrastructure programme run on BIM principles.`,

  "ai-agents": `Products built around large language models or autonomous agents that take on tasks previously requiring a human-in-the-loop — RFP analysis, document review, schedule optimisation, contract redlining, permit lookup. A new and rapidly expanding category. Filter here for the products that genuinely use AI as the core capability rather than a marketing layer.`,

  "design-review": `Tools that support design coordination across disciplines — typically visual review of models, mark-up, comment threading, and the workflow around design queries (RFIs / TQs). Sit between BIM authoring (where geometry is created) and document control (where formal records live). Filter here when the question is "how does the design team actually agree on what's on the page".`,

  "cost-estimation": `Estimating platforms — early-stage parametric estimating through to detailed quantity-takeoff and bills of quantities. Often integrate with BIM for model-based takeoff and with scheduling for cash-flow projection. Filter here for the cost engineering and pre-construction tools that decide whether a project goes to bid in the first place.`,

  procurement: `Procurement platforms cover the buying side of a project — supplier discovery, pre-qualification, tender management, contract award, and the supplier performance tracking that follows. Sit alongside cost estimation and contract management. Filter here when the question is "how do we run the buying process across hundreds of trade packages without losing the audit trail".`,

  "project-portfolio-management": `Portfolio platforms aggregate the data of many concurrent projects into a single decision-support view — capital allocation, programme prioritisation, cross-project resource planning, executive dashboards. Used by owner-organisations running multiple programmes simultaneously. Filter here when the question is "what's the state of every project in our pipeline, in one place".`,

  "asset-management": `Asset and facilities management tools that take over once a project is operational — register of assets, condition tracking, maintenance scheduling, work order management. The handover artefact from the project team becomes the steady-state operating record. Filter here for the EAM and CMMS platforms that owner-operators run.`,

  closeout: `Closeout tools support the final-stage push to demobilise a project cleanly — final account reconciliation, document handover, defects management, warranty tracking, lessons-learned capture. Where the project team's last useful work lives. Filter here for the tools that turn "site is finished" into "the asset is properly handed over".`,

  "contract-management": `Contract management platforms handle the lifecycle of construction contracts — drafting, redlining, execution, variation tracking, claims, dispute support. Sit between procurement (where contracts are awarded) and cost control (where contract performance is measured). Filter here for the platforms commercial managers and contracts engineers run their workload on.`,

  "cost-control": `Cost control tools track committed cost, actual cost, forecast at completion, variance against budget. Updated weekly through the life of a project. Distinct from estimating (which sets the budget) and accounting (which records the spend) — cost control is the live management layer in between. Filter here for the platforms project controls teams run.`,

  "data-integration": `Integration platforms move data between the disparate systems a project runs on — schedules, cost, BIM, document control, field, ERP. Sometimes called "common data environments", sometimes "project data lakes", sometimes just integration layers. Filter here when the question is "how do we stop maintaining the same data in five places".`,

  "document-control": `Document control platforms manage the formal record of a project — drawings, specs, transmittals, RFIs, submittals, the whole paperwork trail. The category includes both the construction-tuned products (Aconex, Procore document control) and the more general DMS systems used across infrastructure. Filter here for the platforms that survive litigation.`,

  "field-management": `Field management tools live on the phone and tablet of the people doing the work — daily reports, time tracking, install rate capture, RFIs from the field, photo logs, snag and punch lists. Distinct from office-based PM tools by their phone-first design. Filter here for the products foremen and superintendents actually use on site.`,

  forecasting: `Forecasting tools project where a programme is heading — schedule, cost, risk-adjusted EAC. Often layer on top of base scheduling and cost control engines, sometimes powered by AI/ML against historical project data. Filter here when the question is "how confident are we in our completion date and final cost?".`,

  hseq: `HSEQ — health, safety, environment, and quality. Permits-to-work, hazard reporting, incident management, audits, inspections, training records, environmental monitoring. The compliance backbone of any infrastructure programme. Filter here for the platforms safety and quality leads run on.`,

  monitoring: `Monitoring platforms continuously capture data from a project or asset — sensor data, drone-captured progress, computer-vision processing of site photos, IoT feeds during operations. Distinct from manual reporting tools by being passive and continuous. Filter here for the products that watch what's happening rather than asking someone to report it.`,

  quality: `Quality management tools — inspection-and-test plans, snag tracking, NCRs (non-conformance reports), defects management through to closeout. Sit alongside HSEQ but focused specifically on construction quality. Filter here for the platforms quality engineers and clerks of works run their inspection regime on.`,

  reporting: `Reporting tools take data from across the project stack and produce the visual artefacts decision-makers actually look at — programme dashboards, board-pack outputs, owner-facing reports, BI dashboards. Sometimes built into PM tools, sometimes standalone BI products tuned for construction data. Filter here for the products that take a "lots of data, hard to read" problem and turn it into "one chart that explains it".`,

  "resource-planning": `Resource planning tools manage labour, plant, and material allocation across a project or portfolio — who's available when, what plant is on which job, what the procurement pipeline looks like. Sits between scheduling (which assumes resources) and HR/procurement (which provides them). Filter here for the platforms resource managers and operations directors run on.`,

  "risk-management": `Risk management platforms capture, score, and track risks through a project — qualitative risk registers through to quantitative Monte Carlo schedule and cost risk analysis. The category includes both the spreadsheet-replacement risk register tools and the heavier QSRA / QCRA engines. Filter here for the products risk managers and project controls leads use to defend their forecasts.`,

  tendering: `Tendering platforms run the bid process — bid invitation, bid documents, bid response collection, bid evaluation, award. Sit between procurement (the wider buying function) and contract management (what happens after award). Filter here for the platforms estimators and bid managers run their work on.`,
};
