"""Kural katmanı birim testleri: python3 -m unittest discover -s pipeline/tests"""
from __future__ import annotations

import shutil
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import fetch  # noqa: E402
import issue  # noqa: E402
import journals  # noqa: E402
import memo_seed  # noqa: E402
import net  # noqa: E402
import report  # noqa: E402
import rolling
import rules  # noqa: E402
import taxonomy  # noqa: E402


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

    def test_ci_marker_is_not_a_source_number(self):
        card = {"mainResult": "OR 9,04; %95 GA 1,2-3,4; p < 0,001."}
        self.assertEqual(rules.numbers_missing(card, "OR 9.04 (1.2 to 3.4), p < 0.001"), [])

    def test_spelled_out_number_accepted(self):
        card = {"sample": "13 çalışmada 55 çocuk."}
        self.assertEqual(rules.numbers_missing(card, "Thirteen studies comprising 55 children"), [])

    def test_spelled_hundreds_accepted(self):
        card = {"sample": "453 olgu değerlendirildi."}
        abstract = "Four hundred fifty-three cases were assessed."
        self.assertEqual(rules.numbers_missing(card, abstract), [])
        self.assertEqual(rules.numbers_missing(card, "Four hundred and fifty-three cases."), [])


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


class TestTaxonomy(unittest.TestCase):
    """Beş eksenli taksonomi kuralları."""
    def test_video_in_title_is_not_video_article(self):
        rec = {"title": "Single-level versus two-level block after video-assisted thoracoscopic resection",
               "pubtypes": ["Randomized Controlled Trial"]}
        self.assertEqual(taxonomy.pub_type(rec, {"design": "rct"}), "rct")
    def test_editorial_moves_to_indirect(self):
        rec = {"title": "Comment on lung cancer surgery", "pubtypes": ["Editorial"]}
        tax = taxonomy.describe(rec, {"interest": "dogrudan", "cardiac": False})
        self.assertEqual(tax["interest"], "dolayli")
    def test_case_label_sets_type(self):
        rec = {"title": "Rare thoracic tumour", "pubtypes": []}
        self.assertEqual(taxonomy.pub_type(rec, {"design": "other"}, "Olgu sunumu"), "olgu")
    def test_areas_limited_when_tagged(self):
        rec = {"title": "Thymectomy in myasthenia with pleural effusion", "abstract": ""}
        codes = taxonomy.areas(rec, {"tags": ["Mediasten"]})
        self.assertEqual(codes[0], "mediasten")
        self.assertLessEqual(len(codes), 2)
if __name__ == "__main__":
    unittest.main()


class TestListCheck(unittest.TestCase):
    """Sayı montajındaki dağıtım değişmezleri."""

    def _lists(self, **overrides):
        base = {key: [] for key in ("direct", "indirect", "videoCase", "offTopic", "cardiac", "unavailable")}
        base.update(overrides)
        return base

    def test_balanced_split_passes(self):
        records = [{"pmid": "1"}, {"pmid": "2"}]
        cls = {"1": {"interest": "dogrudan"}, "2": {"interest": "dolayli"}}
        lists = self._lists(direct=[{"pmid": "1"}], indirect=[{"pmid": "2"}])
        self.assertEqual(issue.check_lists(lists, records, cls), [])

    def test_missing_record_is_reported(self):
        records = [{"pmid": "1"}, {"pmid": "2"}]
        cls = {"1": {"interest": "dogrudan"}, "2": {"interest": "dolayli"}}
        lists = self._lists(direct=[{"pmid": "1"}])
        problems = issue.check_lists(lists, records, cls)
        self.assertTrue(problems)
        self.assertIn("liste toplamı 1", problems[0])

    def test_duplicate_record_is_reported(self):
        records = [{"pmid": "1"}]
        cls = {"1": {"interest": "dogrudan"}}
        lists = self._lists(direct=[{"pmid": "1"}], offTopic=[{"pmid": "1"}])
        problems = issue.check_lists(lists, records, cls)
        self.assertTrue(any("hem" in p for p in problems))


class TestMemoSeed(unittest.TestCase):
    """Belleğin depoya yazılıp .work boşken geri gelmesi."""

    def test_persist_and_restore(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "work"
            seed = Path(tmp) / "seed"
            original = (memo_seed.WORK, memo_seed.SEED)
            memo_seed.WORK, memo_seed.SEED = work, seed
            try:
                work.mkdir()
                (work / "cls_memo.json").write_text('{"1": {}}', encoding="utf-8")
                self.assertEqual(memo_seed.persist(), ["cls_memo.json"])
                shutil.rmtree(work)
                work.mkdir()
                self.assertEqual(memo_seed.restore(), ["cls_memo.json"])
                self.assertTrue((work / "cls_memo.json").exists())
                # İkinci çağrı mevcut dosyayı ezmez.
                self.assertEqual(memo_seed.restore(), [])
            finally:
                memo_seed.WORK, memo_seed.SEED = original


class TestRolling(unittest.TestCase):
    def test_old_records_inside_window_kept(self):
        old = [{"pmid": "1", "entry_date": "2026-11-20"}, {"pmid": "2", "entry_date": "2026-11-10"}]
        new = [{"pmid": "3", "entry_date": "2026-11-23"}]
        merged = rolling.merge(old, new, "pmid", lambda r: r["entry_date"], "2026-11-16")
        self.assertEqual([r["pmid"] for r in merged], ["1", "3"])

    def test_new_record_wins_on_same_key(self):
        old = [{"pmid": "1", "entry_date": "2026-11-20", "title": "eski"}]
        new = [{"pmid": "1", "entry_date": "2026-11-20", "title": "yeni"}]
        merged = rolling.merge(old, new, "pmid", lambda r: r["entry_date"], "2026-11-16")
        self.assertEqual(merged[0]["title"], "yeni")

    def test_month_only_date_compared_as_first_day(self):
        self.assertEqual(rolling.norm_date("2026-11"), "2026-11-01")
        self.assertEqual(rolling.norm_date("2026"), "2026-01-01")
        old = [{"id": "x", "date": "2026-11"}]
        merged = rolling.merge(old, [], "id", lambda r: r["date"], "2026-11-16")
        self.assertEqual(merged, [])

class NumberBoundaryTests(unittest.TestCase):
    def test_substring_of_larger_number_is_not_evidence(self):
        card = {"sample": "15 hasta"}
        self.assertEqual(rules.numbers_missing(card, "Toplam 1500 hasta alındı."), ["sample:15"])

    def test_exact_number_and_decimal_match(self):
        card = {"sample": "15 hasta", "mainResult": "HR 0,45"}
        self.assertEqual(rules.numbers_missing(card, "n=15; HR 0.45 (95% CI 0.30-0.67)."), [])


class IssueDateTests(unittest.TestCase):
    def test_default_issue_date_uses_istanbul_calendar(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo
        self.assertEqual(config.issue_date_for(), datetime.now(ZoneInfo("Europe/Istanbul")).date())


class NodeBinaryTests(unittest.TestCase):
    def setUp(self):
        import os
        self.env = {k: os.environ.get(k) for k in ("LLM_PROVIDER", "LLM_NODE")}

    def tearDown(self):
        import os
        for k, v in self.env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_external_provider_uses_plain_node(self):
        import os
        import llm
        os.environ.pop("LLM_NODE", None)
        os.environ["LLM_PROVIDER"] = "gemini"
        self.assertNotIn("manus-node", llm.node_binary())

    def test_explicit_node_wins(self):
        import os
        import llm
        os.environ["LLM_NODE"] = "/opt/node"
        self.assertEqual(llm.node_binary(), "/opt/node")


class EfetchChunkTests(unittest.TestCase):
    """Tek istekte yüzlerce PMID göndermek 414 veriyordu; efetch parçalamalı."""

    def test_parcalara_boler_ve_birlestirir(self):
        calls = []
        original = net.get

        def fake_get(url, params=None, **kwargs):
            calls.append(len(params["id"].split(",")))
            ids = params["id"].split(",")
            body = "".join(f"<PubmedArticle><PMID>{i}</PMID></PubmedArticle>" for i in ids)
            return f"<PubmedArticleSet>{body}</PubmedArticleSet>"

        net.get = fake_get
        try:
            root = net.efetch([str(1000 + i) for i in range(450)])
        finally:
            net.get = original
        self.assertEqual(calls, [200, 200, 50])
        self.assertEqual(len(list(root)), 450)

