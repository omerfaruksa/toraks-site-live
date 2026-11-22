"""Kural katmanı birim testleri: python3 -m unittest discover -s pipeline/tests"""
from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import fetch  # noqa: E402
import journals  # noqa: E402
import report  # noqa: E402
import rules  # noqa: E402


class TestDates(unittest.TestCase):
    def test_window_is_seven_days(self):
        start, end = config.window(date(2026, 11, 22), 7)
        self.assertEqual((start, end), ("2026-11-15", "2026-11-22"))

    def test_issue_date_is_run_day(self):
        self.assertEqual(config.issue_date_for("weekly", date(2026, 11, 22)), date(2026, 11, 22))

    def test_period_label(self):
        self.assertEqual(config.period_label("2026-11-15", "2026-11-22"), "15–22 Kasım 2026")
        self.assertEqual(config.period_label("2026-10-30", "2026-11-22"), "30 Ekim – 22 Kasım 2026")

    def test_iso_or_empty(self):
        self.assertEqual(rules.iso_or_empty("2026-11-22T10:00:00"), "2026-11-22")
        self.assertEqual(rules.iso_or_empty("22.11.2026"), "")
        self.assertEqual(rules.iso_or_empty("2026-11"), "2026-11")


class TestTrialFilter(unittest.TestCase):
    def test_thoracic_trials_kept(self):
        for title in ("Cryoablation Versus Standard Nerve Block for Pain Control After Lung Surgery",
                      "INSPiRE - INtercostal Single Port Robot Evaluation",
                      "Thoracic Epidural Analgesia Versus Erector Spinae Plane Block After Median Sternotomy"):
            self.assertTrue(fetch.trial_relevant({"title": title}), title)

    def test_other_specialties_dropped(self):
        for title in ("PECS II Block Versus Intravenous Lidocaine for Analgesia in Breast Surgery",
                      "Discoid Excision Versus Segmental Resection for Rectal Endometriosis",
                      "Hypofractionated vs Standard Radiotherapy in Breast Cancer"):
            self.assertFalse(fetch.trial_relevant({"title": title}), title)


class TestNumbers(unittest.TestCase):
    def test_turkish_decimal_accepted(self):
        card = {"mainResult": "Risk 0,45 idi (p = 0,02)."}
        self.assertEqual(rules.numbers_missing(card, "risk was 0.45 (p = .02)"), [])

    def test_invented_number_flagged(self):
        card = {"sample": "Toplam 312 hasta."}
        self.assertEqual(rules.numbers_missing(card, "A total of 210 patients were included."),
                         ["sample:312"])

    def test_unspecified_is_ignored(self):
        card = {"followUp": "belirtilmemiş", "dataPeriod": "belirtilmemiş"}
        self.assertEqual(rules.numbers_missing(card, "no follow-up reported"), [])


class TestScope(unittest.TestCase):
    def test_multicentre(self):
        self.assertEqual(rules.scope_of({"summary": "Çok merkezli bir çalışma."}), "cok_merkezli")

    def test_single_centre(self):
        self.assertEqual(rules.scope_of({"designLabel": "Tek merkezli retrospektif kohort."}),
                         "tek_merkezli")

    def test_unknown(self):
        self.assertEqual(rules.scope_of({"summary": "Kohort çalışması."}), "")


class TestJournals(unittest.TestCase):
    def test_issn_mapping_and_group(self):
        record = {"issns": ["0003-4975"], "journal": "Ann Thorac Surg"}
        self.assertEqual(journals.name_of(record), "Annals of Thoracic Surgery")
        self.assertEqual(journals.group_of(record), "A")

    def test_unlisted_journal(self):
        record = {"issns": ["9999-9999"], "journal": "Bilinmeyen Dergi"}
        self.assertEqual(journals.name_of(record), "Bilinmeyen Dergi")
        self.assertEqual(journals.group_of(record), "")

    def test_every_group_has_rule(self):
        for row in journals.rows():
            self.assertTrue(journals.group_rule(row["group"]))


class TestWeeklyMerge(unittest.TestCase):
    def _issue(self, date, direct):
        return {"date": date, "windowStart": "2026-11-15", "windowEnd": date,
                "stats": {"scanned": 10, "journalsScanned": 58}, "direct": direct,
                "indirect": [], "trials": [], "videoCase": [], "offTopic": [],
                "cardiac": [], "unavailable": [], "external": []}

    def test_same_pmid_counted_once(self):
        merged = report.merge([
            self._issue("2026-11-22", [{"pmid": "1", "title": "A", "turkey": True}]),
            self._issue("2026-11-21", [{"pmid": "1", "title": "A"}, {"pmid": "2", "title": "B"}]),
        ])
        self.assertEqual([c["pmid"] for c in merged["direct"]], ["1", "2"])
        self.assertEqual(merged["turkey"], 1)

    def test_doi_used_when_pmid_missing(self):
        merged = report.merge([
            self._issue("2026-11-22", [{"doi": "10.1/x", "title": "A"}]),
            self._issue("2026-11-21", [{"doi": "10.1/x", "title": "A"}]),
        ])
        self.assertEqual(len(merged["direct"]), 1)

    def test_window_spans_all_issues(self):
        merged = report.merge([
            self._issue("2026-11-22", []), self._issue("2026-11-21", []),
        ])
        self.assertEqual(merged["issues"], ["2026-11-22", "2026-11-21"])
        self.assertEqual(merged["scannedSum"], 20)


if __name__ == "__main__":
    unittest.main()
