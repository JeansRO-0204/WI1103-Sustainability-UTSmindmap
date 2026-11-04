# Lead-authored cross-module links + cross-cutting theme hubs -> knowledge/crosslinks.json
import json
E = []
def e(s, t, typ, label): E.append({"source": s, "target": t, "type": typ, "label": label})

# M1
e("m1.history.brundtland","m5.sd-definition","builds-on","Brundtland definition underpins SD positioning in the SDGs")
e("m1.dimensions","m5.sd-dimensions-diagram","builds-on","Three dimensions → SDGs mapped to economy/society/biosphere")
e("m1.history","m3.malthus","related","Malthus is an early milestone in limits-to-growth thinking")
e("m1.environment.ecosystem","m4.ecosystem-services","builds-on","Ecosystems deliver ecosystem services")
e("m1.human-centred.utilitarianism","m4.es-valuation","related","Utilitarian logic behind putting money values on nature")
e("m1.laws-of-ecology","m7.recycling","related","'Everything must go somewhere' → recycling & reuse")
e("m1.dam-dilemma","m7.interlinkages.synergy-tradeoff","related","Energy vs ecosystem = a classic SDG trade-off")
e("m7.responsible-innovation","m1.role-of-ethics","related","Responsible innovation applies ethics to technology")
# M3
e("m3.env-justice","m4.why-south","related","Impacts and benefits are unequally shared North vs South")
e("m3.consumption-co2","m4.ns-definition","related","Consumption emissions concentrated in the Global North")
e("m3.tech-dual-role","m5.sti-definition","related","T in IPAT ↔ STI as SDG enabler")
e("m3.tech-dual-role","m7.tech-sdg12","related","Technology can raise or cut material footprint")
e("m3.env-justice","m7.spillover","related","Offshored impacts appear as cross-border spillovers")
e("m3.env-justice","m6.paris.cbdr","related","Unequal responsibility → CBDR-RC")
e("m3.agri-tech","m7.few","related","Green Revolution intensifies food-energy-water links")
e("m3.overconsumption","m7.tech-sdg12","related","Overconsumption ↔ SDG 12 responsible consumption")
e("m3.biocapacity","m6.ghg","related","Carbon footprint is the largest share of overshoot")
e("m3.offshoring","m7.spillover.cotton","related","Production abroad, consumption at home")
e("m3.jevons","m6.ac-adaptation","example-of","More efficient AC → more AC use (rebound)")
# M4
e("m4.why-south","m3.ipat","builds-on","Global South's P and A growth drives future I")
e("m4.south-data","m3.how-many-earths","related","Footprint per person differs sharply North vs South")
e("m4.tech-progress","m3.tech-dual-role","related","Technology changes how commons are used")
e("m4.ns-definition","m6.paris.cbdr","related","North/South divide is the basis of CBDR-RC")
e("m4.ns-definition","m7.boar","related","Synergies differ for Global North vs South")
e("m4.ecosystem-services","m5.nbs","builds-on","NbS work by restoring ecosystem services")
e("m4.ecosystem-services","m5.biodiversity-sdgs","related","Biodiversity underpins services and all SDGs")
e("m4.tropical-commons","m6.peatland","related","Tropical commons incl. peat & mangroves store carbon")
e("m4.rio20","m5.sdgs","builds-on","Rio+20 launched the SDG process")
e("m4.tech-progress","m5.tfm","related","Technology access via the TFM")
e("m4.montreal","m6.ghg.gwp","related","Kigali phases down HFCs — potent GHGs")
e("m4.es-regulating","m6.natural-sinks","related","Climate regulation service = natural carbon sinks")
e("m4.cidanau","m5.nbs","example-of","PES to protect a watershed is a nature-based solution")
# M5
e("m5.sdg14-15-indonesia","m6.afolu","related","Land & forest SDG15 ↔ AFOLU emissions")
e("m5.nbs","m6.carbon-sequestration","related","Forests/peat/mangroves sequester carbon")
e("m5.reality-2026","m6.mid-critical-2025","related","Mid-decade stocktake: SDGs & climate both off-track")
e("m5.discussion","m4.why-south","related","Equity of SDG progress for the Global South")
e("m5.sti-aaaa","m7.boar","related","Technology transfer & North–South cooperation")
e("m5.reality-2023","m7.rankings","related","SDG Index / rankings measure progress")
e("m5.goals-targets-indicators","m7.interlinkages","builds-on","Targets interact → interlinkage analysis")
e("m5.indonesia-commitment","m6.indonesia-commitment","related","Indonesia's SDG (TPB) and climate commitments")
e("m5.vnr","m6.paris.gst","contrasts","VNR (SDGs) vs Global Stocktake (Paris) — both review progress")
# M6
e("m6.paris.cbdr","m5.tfm","related","Capable countries support others with technology")
e("m6.others-to-sdg13","m7.interlinkages","builds-on","SDG13 links are interlinkages in practice")
e("m6.sdg13-to-others","m7.interlinkages.synergy-tradeoff","related","Climate action creates synergies & trade-offs")
e("m6.ghg-sources","m3.consumption-co2","related","Richest households emit a disproportionate share")
e("m6.sustainable-cooling","m7.few","related","Cooling is energy-water intensive")
e("m6.cooling-emissions","m4.montreal","related","Refrigerants (HFCs) regulated by Kigali")
e("m6.peat.fires","m7.spillover","example-of","Haze crosses borders — a negative spillover")
# M7
e("m7.spillover.types","m6.ghg","related","CO₂ embodied in imports is a spillover indicator")
e("m7.boar","m6.paris.cbdr","related","Differentiated capacities North vs South")
e("m7.nexus","m4.arrangement","related","Integrated governance of shared resources")

# M2
e("m2.hardin-tragedy","m4.commons-definition","builds-on","Hardin's tragedy → what the commons are in the Global South")
e("m2.tragedy-not-commons","m4.arrangement","builds-on","Ostrom: communities can govern commons with rules")
e("m2.tragedy-not-commons.barambang-katute","m4.subak","related","Indonesian customary commons that work")
e("m2.commons-solutions","m4.regulating","builds-on","Week 4 cases = solutions to the tragedy")
e("m2.pb.ozone","m4.montreal","related","Ozone is 'safe' because the Montreal Protocol worked")
e("m2.pb.climate-change","m6.ghg","related","Climate boundary is driven by GHG concentrations")
e("m2.pb.climate-change","m6.paris","related","Paris Agreement = response to crossed climate boundary")
e("m2.pb-framework","m3.carrying-capacity","related","Planet-scale version of carrying capacity")
e("m2.pb-framework","m3.take-home","related","Safe operating space for humanity")
e("m2.pb-transgressed","m3.overconsumption","related","Overconsumption pushes boundaries past limits")
e("m2.pb-transgressed","m3.biocapacity","related","Overshoot: footprint > biocapacity")
e("m2.pb.land-system-change","m6.peat.disturbance","example-of","Peatland drainage/conversion = land-system change")
e("m2.pb.land-system-change","m6.afolu","related","Land use is a major emission source")
e("m2.pb.biosphere-integrity","m5.biodiversity-threats","related","Biodiversity loss in Indonesia")
e("m2.pb.biosphere-integrity","m5.ibsap","related","IBSAP responds to biodiversity loss")
e("m2.pb.biogeochemical-flows","m7.few","related","Fertiliser use links food production to N/P flows")
e("m2.pb.freshwater-change","m7.few","related","Water is one pillar of the FEW nexus")
e("m2.discussion","m6.paris.cbdr","related","Who should act first? → CBDR-RC")
e("m2.doughnut-link","m1.doughnut","builds-on","Ecological ceiling of the doughnut = planetary boundaries")
e("m2.natural-capital-degradation","m4.es-valuation","related","Degraded natural capital = lost ecosystem-service value")
e("m2.hardin-tragedy","m1.human-centred.locke","related","Privatisation as Hardin's/Locke's answer")
e("m2.open-access-resources","m4.nonphysical","related","Open access in oceans/atmosphere/space")

# Cross-cutting theme hubs (children of root)
N = [{"id":"core.themes","label":"Cross-cutting themes","type":"topic","module":"core","parent":"root","importance":3,
      "summary":"Big ideas that run through several weeks — the best material for essay and comparison questions.",
      "details":"These hubs connect concepts from different weeks. Lecturers love questions that ask you to **connect** weeks, e.g. *'How does the tragedy of the commons relate to climate change and the Paris Agreement?'* Open a theme to see every concept that belongs to it, then follow the dashed cross-links.",
      "keyTerms":[],"sources":[]}]
THEMES = {
 "core.technology": ("Technology: problem or solution?", "IPAT's T, rebound effects, STI and responsible innovation — technology can raise or cut impact.",
   ["m3.ipat","m3.tech-dual-role","m3.jevons","m3.neo-malthus","m4.tech-progress","m5.sti-definition","m5.tfm","m6.ccus","m6.ac-adaptation","m7.tech-sdg12","m7.responsible-innovation"]),
 "core.equity": ("Equity: Global North vs South", "Who causes impacts, who suffers them, who pays: justice, CBDR-RC, spillovers.",
   ["m3.env-justice","m3.consumption-co2","m4.why-south","m4.ns-definition","m6.paris.cbdr","m7.spillover","m7.boar","m5.discussion"]),
 "core.commons": ("Commons & their governance", "Shared resources overused without rules — and the institutions (Ostrom, Montreal, Subak, PES) that manage them.",
   ["m2.hardin-tragedy","m2.commons-vs-open-access","m2.tragedy-not-commons","m4.commons-definition","m4.arrangement","m4.montreal","m4.subak","m4.es-payment","m4.nonphysical","m6.paris"]),
 "core.limits": ("Limits of the planet", "Carrying capacity, planetary boundaries, ecological footprint and overshoot.",
   ["m2.pb-framework","m2.pb-status-2025","m3.carrying-capacity","m3.malthus","m3.eco-footprint","m3.biocapacity","m1.doughnut","m1.laws-of-ecology","m6.ghg"]),
 "core.sdg-system": ("SDGs as a connected system", "Goals interact: synergies, trade-offs, SDG13 links, and the food-energy-water nexus.",
   ["m5.sdgs","m5.goals-targets-indicators","m6.sdg13-to-others","m6.others-to-sdg13","m7.interlinkages","m7.few","m1.dimensions"]),
}
for hid,(label,summary,members) in THEMES.items():
    N.append({"id":hid,"label":label,"type":"concept","module":"core","parent":"core.themes","importance":3,
              "summary":summary,"details":summary+"\n\nRelated concepts are linked by dashed edges — follow them across weeks.",
              "keyTerms":[],"sources":[]})
    for m in members: e(hid, m, "related", "")
import sys
json.dump({"nodes":N,"edges":E,"_themeMembers":{k:v[2] for k,v in THEMES.items()}}, open("knowledge/crosslinks.json","w"), indent=1, ensure_ascii=False)
print(len(N), "hub nodes,", len(E), "edges")
