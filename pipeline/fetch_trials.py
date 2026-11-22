#!/usr/bin/env python3
"""ClinicalTrials.gov: yeni kayit veya yeni sonuc yuklemesi (torasik cerrahi)."""
import json, os, urllib.parse, urllib.request

START = os.environ.get("WINDOW_START", "2026-11-15")
END = os.environ.get("WINDOW_END", "2026-11-22")
TERMS = ('thoracoscopic OR lobectomy OR segmentectomy OR pneumonectomy OR esophagectomy '
         'OR thymectomy OR "lung transplant" OR empyema OR decortication OR "chest wall" '
         'OR "rib fracture" OR "thoracic surgery" OR "tracheal resection" OR "diaphragmatic hernia"')
FIELDS = ("NCTId,BriefTitle,OfficialTitle,Phase,OverallStatus,StudyFirstPostDate,ResultsFirstPostDate,"
          "LastUpdatePostDate,EnrollmentCount,PrimaryOutcomeMeasure,LeadSponsorName,LocationCountry,StudyType")

out = []
for advanced in (f"AREA[StudyFirstPostDate]RANGE[{START},{END}]",
                 f"AREA[ResultsFirstPostDate]RANGE[{START},{END}]"):
    params = {"query.term": TERMS, "filter.advanced": advanced, "pageSize": "200", "fields": FIELDS}
    url = "https://clinicaltrials.gov/api/v2/studies?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=120) as r:
        data = json.load(r)
    for st in data.get("studies", []):
        p = st.get("protocolSection", {})
        ident = p.get("identificationModule", {})
        status = p.get("statusModule", {})
        design = p.get("designModule", {})
        outc = p.get("outcomesModule", {}).get("primaryOutcomes", [])
        locs = p.get("contactsLocationsModule", {}).get("locations", [])
        countries = []
        for l in locs:
            c = l.get("country")
            if c and c not in countries:
                countries.append(c)
        out.append({
            "nct": ident.get("nctId"),
            "title": ident.get("briefTitle") or ident.get("officialTitle"),
            "phase": ", ".join(design.get("phases", []) or []) or "belirtilmemiş",
            "status": status.get("overallStatus", ""),
            "firstPost": status.get("studyFirstPostDateStruct", {}).get("date", ""),
            "resultsPost": status.get("resultsFirstPostDateStruct", {}).get("date", ""),
            "enrollment": str(design.get("enrollmentInfo", {}).get("count", "")),
            "primary": outc[0].get("measure", "") if outc else "",
            "sponsor": p.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {}).get("name", ""),
            "countries": countries[:3],
            "type": design.get("studyType", ""),
            "trigger": "results" if "ResultsFirst" in advanced else "new",
        })

seen = {}
for r in out:
    if r["nct"] and r["nct"] not in seen:
        seen[r["nct"]] = r

json.dump(list(seen.values()), open("/home/ubuntu/torakslit/pipeline/.work/trials_raw.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("kayit:", len(seen))
for r in list(seen.values())[:12]:
    print(" ", r["nct"], r["firstPost"], r["resultsPost"], r["title"][:70])
