# Quiz 2 vs graph reconciliation

Quiz answer keys in `quiz2.raw.json` are never changed. Where slides and quiz differ, the graph was edited so the quiz phrasing is the headline fact and the slide wording is kept as an explicit side note. Result: 45 questions tagged (40 given, 4 disputed, 1 inferred, 2 duplicates), 31 existing nodes edited, 6 nodes added. `build/merge.py` and `build/validate.py` pass (261 nodes, 0 errors, 0 warnings).

## Questions where slide and quiz disagree, or the slide is silent

| Q | Quiz answer | What the slides say | What I changed / how it is flagged |
|---|---|---|---|
| 2 | No key (quiz says no option fits) | M5 s19: IBSAP mission = protection, sustainable use, enrichment of science and technology, strengthening resources and governance; function list includes "Indonesia's diplomatic tool in global forums". No option matches verbatim. | Tagged `inferred`, answer option 0 "Strengthening diplomacy in global forums." (closest to s19). **Low confidence**: option 2 ("Define quizzes that show calculations and precision...") looks like a garbled "science and technology" item but nothing on the slides supports it. `m5.ibsap` details/examTips now spell out the mission elements and this caveat. Extra fields `answer` and `answerText` added in the tags entry for Q2 only. |
| 3, 10, 33 | 31.89% independent / 43.2% with international support ("Enhanced NDC 2022", by 2030) | M6 s19 lists **29% / 41% for 2030** (first NDC). The 31.89% / 43.20% pair appears only on M6 s20 as the Second NDC's absolute **2035** target. So the numbers are on the slides but with a different label and year. | Tagged `disputed` (answers kept; 29% is not offered as an option in these questions, so a slide-based student still gets them right). `m6.indonesia-commitment` rewritten with the Enhanced NDC 2022 figures first and slide 19's 29/41 as the earlier NDC; new node `m6.indonesia-endc`; notes added to `m6.indonesia-sndc`, `m6.paris.sovereignty`, `m6.part2` and the `m6` module text. Q33 is a duplicate of Q10; Q3 overlaps both. Uncertain: whether the lecturer's slide 19 is simply outdated (it probably is; the quiz figures match Indonesia's published Enhanced NDC) or whether she considers 29/41 a different, older NDC. |
| 44 | B: National & regional guidelines for biodiversity management | M5 s19 lists three IBSAP functions: national & regional guidelines, diplomatic tool in global forums, evaluated every 5 years. Options A and (loosely) C are also slide content, so D "All of the above" is arguably correct by the slides. | Tagged `disputed`, key kept. `m5.ibsap` examTips says to answer "national & regional guidelines" when a single answer is asked. |
| 18 | SDG 6, 7, 11, 13, 14, 15 | No slide text says these goals are hampered by climate change in the water and energy sectors. M5 s29 is a bar chart per goal; M6 s10 notes list SDG 7, 11, 12, 14, 15, 2 as mitigation contributors. | Kept `given` (not contradicted), with a note that it is a quiz-only fact. Added to `m6.sdg-challenges` and `m5.reality-2023` details as an explicitly labelled quiz fact. |
| 38 | 192 member states, 2015-2030 | M5 s4 says 192 (graph previously said "slide says 192; commonly 193"). | Graph now says 192 as on slide/quiz, 193 only as an aside, examTips: answer 192. Not disputed. |
| 25 | NH3 is not a GHG | NH3 is not mentioned on any slide; the answer follows from the slide's GHG list (M6 s4, s6). Slide 4 also says "four important greenhouse gases" but lists five. | New node `m6.ghg.list` (which gases are GHGs, NH3/N2/O2 are not); `m6.ghg` details and tips extended. |
| 4 | Land clearing using burning methods | M6 s38 lists the valid AFOLU strategies (afforestation, reforestation, restoration, agroforestry, soil carbon management, bioenergy in agriculture). "Burning" is never named; the answer is by elimination. | `m6.afolu`: summary rewritten, exam-trap paragraph added, importance raised to 3. |

## Questions where the graph already matched but was made more exact

| Q | Change |
|---|---|
| 6 | `m5.sti-features`: third feature renamed "Place-based Priority" (slide says "place-based priorities"); contrasted with Universality/Indivisibility/Transformative/RI from M7. Importance raised to 3. |
| 28 | `m5.sti-aaaa`: "seven key action areas" reworded to "Seven Key Actions" (quiz phrasing); importance 3. |
| 16, 23, 24, 29 | `m6.sustainable-cooling` kept as the five-principle framework; four new importance-3 children added with the quiz's wording and distractor traps: `.energy-passive` (ventilation, insulation, shading), `.refrigerants` (zero ODP and low GWP; CFC/HCFC/HFC), `.renewables` (solar-powered cooling), `.circular` (used refrigerants not vented, recycle units). |
| 27, 35, 40, 43 | `m6.ac-adaptation`, `m6.cooling-emissions` examTips now state: AC = life-saving tool (not "sustainable by default"); indirect emissions = energy/electricity; mitigation conflict = high energy use + HFC release; high-GWP gas group = CFCs, HCFCs, HFCs. Importance 3. |
| 1, 5, 17, 21, 26, 36, 41, 42 | examTips added on `m6.climate-change` (human activity; atmosphere, biosphere, cryosphere, oceans), `m6.ghg.concentration` (Industrial Revolution ~1760), `m6.ghg.gwp` (enhanced effect; GWP), `m6.ghg-sources` (Energy largest in 2019). Importance 3. |
| 7, 12 | `m6.urban-heat` (impact list) and `m6.sdg-challenges` (ecosystem disruption as third impact) tips added; importance 3. |
| 8, 13, 14, 37, 39 | examTips on `m7.nexus`, `m7.tech-sdg12`, `m7.activities.mixed`, `m7.few.why` with the exact answers; `m7.activities.mixed` importance 3. |
| 9, 15, 11, 20, 22, 31, 32, 34, 45 | examTips on `m6.carbon-sequestration`, `m5.mdgs` (importance 3), `m5.sti-definition` (importance 3), `m5.tfm`, `m5.indonesia-commitment`, `m5.goals-targets-indicators`, `m5.sdgs`. 231 global vs 289 Indonesian indicators was already correct on the slide and in the graph. |

## Other honest caveats

- Q19 (Brundtland and the three dimensions) needed no graph change; it is tagged to `m1.dimensions` and `m5.sd-definition`.
- Importance was raised from 2 to 3 on 13 nodes (m5.mdgs, m5.sti-aaaa, m5.sti-features, m6.climate-change, m6.ghg.concentration, m6.ghg.gwp, m6.sdg-challenges, m6.urban-heat, m6.ac-adaptation, m6.cooling-emissions, m6.ghg-sources, m6.afolu, m7.activities.mixed) that the quiz tests; this is a judgement that quiz coverage signals exam weight.
- Duplicates: Q33 dupOf Q10, Q42 dupOf Q5. Q3 (asks both NDC numbers) and Q15 (sequestration definition vs. types in Q9) overlap but are not marked as duplicates.
- Topics: every importance-3 non-root, non-module node belongs to at least one topic in `topics.json` (26 topics). `core.themes` sits under "Sustainability basics & dimensions" as a catch-all.


# Quiz 1 vs graph reconciliation

Source: the bilingual Quiz 1 PDF (Indonesian pages 1-6, 35 questions; English pages 7-13, 37 questions). `quiz1.raw.json` holds 41 unique items: 31 paired (same question in both languages), 6 English-only, 4 Indonesian-only (English translated, `enTranslated:true`). Ids are `q1-NN` by English number; the Indonesian-only items are q1-38..q1-41. Keys follow the English half; the Indonesian key is stored as `idKey`. Result: 40 `given`, 1 `disputed` (q1-10), plus the key notes below. `build/merge.py` and `build/validate.py` pass (270 nodes, 0 errors, 0 warnings).

## Pairing and key problems

- Pairs where the Indonesian and English **keys differ** (both items kept with the English key, since slides agree with it): **q1-20** (technology worsens impact: Indonesian B "Pollution Monitoring" vs English D "Expansion of Natural Resource Exploitation") and **q1-37** (technology and the commons: Indonesian D "backfire" vs English B "strengthening collective capacity"). Both Indonesian keys look like typos.
- **q1-29** (Global South ~88% of population): the English half has no key; 88% is taken from the Indonesian key and slide 5. The Indonesian option C is 80% (the middle-class stat), English C is 75%.
- Questions with the same stem and answer but different distractors are paired (flag `distractorsDiffer`): 24 of the 31 pairs. Same stem *but different ask and options* are separate items: ID Q5 (law linked to thermodynamics, q1-38) vs EN Q5 (repeats the law), ID Q18 vs EN Q18 (P+20% A x2.5 vs P+35% A x4) and ID Q26 (AC) vs EN Q26 (LED).
- Typos noted in the PDF ("jAwab", "Clifford Pinchot" for Gifford, "Indoensian") are kept verbatim; the quiz's date of Malthus (~1850) follows the slide.

## Where slide and quiz differ

| Q | Quiz key | Slides | Handling |
|---|---|---|---|
| q1-10 | 6 of 9 planetary boundaries breached | M2 s7 (2025 update) says 7 of 9; s6 (2009) says 3. 7 is not among the options (3/5/6/9). | Tagged `disputed`, key kept. `m2.pb-status-2025` relabelled "Boundaries breached: 6 (quiz) vs 7 (2025 slide)", summary/details/examTips lead with the quiz figure and explain the 7. The key matches the 2023 update (ocean acidification not yet crossed); the slide has been updated to 2025. |
| q1-38 / q1-05 | "Everything must go somewhere" is tied to thermodynamics | M1 s18 lists thermodynamics as a separate law (4). | Key `given`; note in `m1.laws-of-ecology` details/tips. |
| q1-20, q1-37 | see above | Slides agree with the English keys. | English key kept; Indonesian typo flagged on the items. |

## Calculation questions

| id | EN/ID no. | Formula type | Result |
|---|---|---|---|
| q1-18 | EN 18 | IPAT decoupling factor: P multiplier x A multiplier | 1.35 x 4 = 5.4, answer "Five" |
| q1-40 | ID 18 | IPAT decoupling factor | 1.2 x 2.5 = 3, answer 3.0 |
| q1-25 | EN 25 / ID 23 | density difference | 860 - 141 = 719 /km2 |
| q1-26 | EN 26 | electricity cost: kW x h/day x days x price | 0.3 kW x 10 x 30 x 1,000 = 90,000 |
| q1-41 | ID 26 | electricity cost | 0.75 x 12 x 30 x 1,500 = Rp 405,000 |

The ecological footprint items (q1-23, q1-24) are conceptual (unit gha, footprint vs biocapacity); no numeric "Earths" question appeared.

## Graph changes

- New Week 3 branch: `m3.calc` (topic, importance 3) with `m3.calc.ipat`, `m3.calc.density`, `m3.calc.electricity`, `m3.calc.footprint` (importance 3, each with formula, quiz worked example and slide data) and `m3.calc.slide-ratios` (importance 2; EV battery GWP and data-centre TWh ratios from M3 s25-27). New topic "Calculations (IPAT, footprint, energy cost)" under M3 in `topics.json`.
- Worked-calculation nodes only where slides support one: `m6.ghg.gwp.calc` (CO2e = mass x GWP, using the N2O 298 / HCFC-22 ~1,800 / CFC ~12,500 values from the M6 s6 notes), `m6.ghg-sources.calc` (sector shares of ~59 GtCO2-eq, M6 s32) and `m6.cooling-emissions.calc` (cooling = 50-60% of building energy, M6 s28), all importance 2. M4, M5 and M7 hold no numeric calculations beyond reading percentages (the M5 progress shares were left as they are).
- 37 existing nodes got a "Quiz 1:" examTip stating the exact tested fact and its distractors (M1: open-ended-definition, history, dimensions, ecosystem, laws-of-ecology, anthropocentrism, dominion-thesis, ecocentrism, Muir, Hetch Hetchy; M2: pb-framework, pb-status-2025, open-access-resources, tragedy-not-commons, land-system-change, biogeochemical-flows; M3: carrying-capacity, kerala, ipat, ipat.2050, tech-dual-role, jevons, overconsumption, overconsumption-examples, hyperconsumption, footprint-measurement, eco-footprint; M4: ns-definition, south-data, commons-types, commons-culture, ecosystem-services, es-cultural, es-payment, montreal, dieselgate, tech-progress). `m1.open-ended-definition`, `m1.laws-of-ecology` and `m2.pb-status-2025` also got details changes.
- Importance raised 1/2 to 3 on 13 nodes that Quiz 1 tests: m1.environment.ecosystem, m1.conserve-vs-preserve.muir, m1.conserve-vs-preserve.hetch-hetchy, m2.open-access-resources, m2.pb.land-system-change, m2.pb.biogeochemical-flows, m3.ipat.2050, m3.overconsumption-examples, m3.footprint-measurement, m4.south-data, m4.commons-culture, m4.es-cultural, m4.tech-progress. All were added to their topics in `topics.json` (27 topics now).
- Every Quiz 1 concept already had a node apart from the calculation material; no other concept nodes were needed.
