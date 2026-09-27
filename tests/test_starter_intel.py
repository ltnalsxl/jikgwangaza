import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import crawl_kbo_register as reg  # noqa: E402
import crawl_starter_news as news  # noqa: E402

KST = news.KST


class StarterNewsSignalTests(unittest.TestCase):
    def test_out_signal_for_injury_removal(self):
        title = "천만다행! 최원태 고관절 불편감으로 1군 말소…“큰 부상 아니다, 한 턴 거른다” 삼성, 25일 SSG전 불펜 데이"
        self.assertEqual(news.pitcher_signals(title, ["최원태"]), {"최원태": "out"})

    def test_season_shutdown_is_out(self):
        title = "'한화 파격 결단' 류현진 추가 등판 없다, 시즌 조기 마감…김경문 감독"
        self.assertEqual(news.pitcher_signals(title, ["류현진"])["류현진"], "out")

    def test_signal_uses_only_clause_with_name(self):
        # '돌아왔다'는 문성주 이야기라 임찬규의 복귀 신호가 아니다
        title = "'문성주가 돌아왔다' 53일 만에 선발 출격…3위 LG, 3G 차 KIA와 운명의 2연전→임찬규, 15승+개인 최다승 신기록 잡을까"
        self.assertNotEqual(news.pitcher_signals(title, ["임찬규"])["임찬규"], "return")

    def test_game_review_is_mention(self):
        title = "나성범 선제포＋네일 6이닝 호투 KIA, 3위 LG에 2경기 차 추격"
        self.assertEqual(news.pitcher_signals(title, ["네일"])["네일"], "mention")

    def test_preview_is_start_not_review(self):
        title = "[25일 프리뷰] '선두 추격' 삼성 3연승 도전, 김백산 두 달 만에 선발 중책"
        self.assertEqual(news.pitcher_signals(title, ["김백산"])["김백산"], "start")

    def test_planned_date_from_headline(self):
        title = "\"선발 로테이션 밀리지 않습니다\" 25일 롯데-두산전 우천 취소…당일 선발 등판 예정 나균안 27일 한화전 나온다"
        signals = news.pitcher_signals(title, ["나균안"])
        published = datetime(2026, 9, 25, 16, 9, tzinfo=KST)
        self.assertEqual(news.planned_dates(title, signals, published), {"나균안": "2026-09-27"})

    def test_rest_days_are_not_dates(self):
        title = "로건-대니엘 4일 휴식 등판, 다음 주 KIA전까지 겨냥"
        signals = news.pitcher_signals(title, ["로건", "대니엘"])
        published = datetime(2026, 9, 23, 7, 0, tzinfo=KST)
        self.assertEqual(news.planned_dates(title, signals, published), {})

    def test_resolve_day_across_month_boundary(self):
        published = datetime(2026, 9, 29, 20, 0, tzinfo=KST)
        self.assertEqual(news.resolve_day(1, published), "2026-10-01")
        self.assertIsNone(news.resolve_day(20, published))

    def test_national_team_articles_are_skipped(self):
        self.assertIsNotNone(news.NATIONAL_RE.search("소형준 AG 일본전 선발 확정"))
        self.assertIsNone(news.NATIONAL_RE.search("KT 로테이션 재편, 소형준 복귀"))

    def test_two_letter_names_need_word_boundary(self):
        self.assertTrue(news.mentions("KIA 네일 선발 예고", "네일"))
        self.assertTrue(news.mentions("'3위 싸움' 네일이 해냈다!", "네일"))
        self.assertFalse(news.mentions("오늘의 네일아트", "네일"))


class RegisterRemovedTests(unittest.TestCase):
    def test_removed_and_reregistered(self):
        days = {
            "2026-09-20": {"KIA": ["네일", "올러", "황동하"]},
            "2026-09-21": {"KIA": ["네일", "올러"]},
            "2026-09-22": {"KIA": ["네일"]},
            "2026-09-23": {"KIA": ["네일", "올러"]},
        }
        self.assertEqual(reg.compute_removed(days), {"KIA": {"황동하": "2026-09-21"}})


if __name__ == "__main__":
    unittest.main()
