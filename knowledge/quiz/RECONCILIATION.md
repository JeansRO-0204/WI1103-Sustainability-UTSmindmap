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
