#!/usr/bin/env python3
"""Giris tarihi ([edat]) ayristirma testleri: python3 pipeline/test_dates.py"""
import importlib.util
import re
import unittest

spec = importlib.util.spec_from_file_location(
    "fetch_pubmed", "/home/ubuntu/torakslit/pipeline/fetch_pubmed.py")
fetch_pubmed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_pubmed)

ISO_DATE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def iso_or_empty(value):
    """prep.py ve build_issue.py'deki dogrulayicinin aynisi."""
    v = (value or "").strip()
    if ISO_DATE.match(v):
        return v
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T", v)
    return m.group(1) if m else ""


class IsoDateTest(unittest.TestCase):
    def test_full_date(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "11", "20"), "2026-11-20")

    def test_pads_single_digit(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "9", "5"), "2026-09-05")

    def test_month_name(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "Nov", "20"), "2026-11-20")

    def test_missing_day(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "11", ""), "2026-11")

    def test_missing_month_keeps_year(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "", "20"), "2026")

    def test_missing_year(self):
        self.assertEqual(fetch_pubmed.iso_date("", "11", "20"), "")

    def test_invalid_day_dropped(self):
        self.assertEqual(fetch_pubmed.iso_date("2026", "11", "xx"), "2026-11")

    def test_all_results_sortable(self):
        values = [fetch_pubmed.iso_date(*a) for a in
                  [("2026", "9", "5"), ("2026", "11", "20"), ("2026", "11", "")]]
        self.assertEqual(sorted(values), ["2026-09-05", "2026-11", "2026-11-20"])


class IsoOrEmptyTest(unittest.TestCase):
    def test_accepts_iso(self):
        self.assertEqual(iso_or_empty("2026-11-20"), "2026-11-20")
        self.assertEqual(iso_or_empty("2026-11"), "2026-11")
        self.assertEqual(iso_or_empty("2026"), "2026")

    def test_drops_malformed(self):
        for bad in ["", None, "2026--20", "2026-9-5", "2026-Nov-20", "20-11-2026"]:
            self.assertEqual(iso_or_empty(bad), "", bad)

    def test_trims_datetime(self):
        self.assertEqual(iso_or_empty("2026-11-20T03:51:00Z"), "2026-11-20")


if __name__ == "__main__":
    unittest.main(verbosity=2)
