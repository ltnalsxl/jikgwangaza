import json
import os
import shutil
import tempfile
import unittest

from public.kbo_crawler import NaverKBOAllLineupCrawler, normalize_game_status


class NormalizeGameStatusTests(unittest.TestCase):
    def test_result_code_wins_over_last_inning(self):
        self.assertEqual(normalize_game_status({"statusCode": "RESULT", "statusInfo": "9회초"}), "종료")

    def test_cancel_flag(self):
        self.assertEqual(normalize_game_status({"cancel": True, "statusInfo": "경기전"}), "경기취소")

    def test_before(self):
        self.assertEqual(normalize_game_status({"statusCode": "BEFORE", "statusInfo": ""}), "경기전")


class SaveGamePreservationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.crawler = NaverKBOAllLineupCrawler(save_dir=self.tmp)

    def tearDown(self):
        self.crawler.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _game(self, **kw):
        base = {
            "date": "2026-09-26",
            "game_code": "20260926LGHT02026",
            "teams": [{"name": "LG"}, {"name": "KIA"}],
            "crawl_time": "t1",
        }
        base.update(kw)
        return base

    def test_confirmed_lineup_is_not_overwritten_by_failed_crawl(self):
        confirmed = self._game(lineup_status="confirmed", starting_lineups={"LG": [1]})
        path = self.crawler.save_game_to_json(confirmed)
        self.crawler.save_game_to_json(self._game(lineup_status="not_confirmed", starting_lineups={}, crawl_time="t2"))
        with open(path, encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved["lineup_status"], "confirmed")
        self.assertEqual(saved["starting_lineups"], {"LG": [1]})

    def test_unchanged_game_is_not_rewritten(self):
        path = self.crawler.save_game_to_json(self._game(lineup_status="confirmed"))
        mtime = os.path.getmtime(path)
        os.utime(path, (mtime - 100, mtime - 100))
        self.crawler.save_game_to_json(self._game(lineup_status="confirmed", crawl_time="t2"))
        self.assertEqual(os.path.getmtime(path), mtime - 100)


if __name__ == "__main__":
    unittest.main()
