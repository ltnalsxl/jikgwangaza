import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import watch_games as wg  # noqa: E402


def at(hh, mm):
    return datetime(2026, 9, 27, hh, mm, tzinfo=wg.KST)


class DayStateTests(unittest.TestCase):
    day = "2026-09-27"

    def test_no_games(self):
        self.assertEqual(wg.day_state([], self.day, at(18, 0))[0], "none")

    def test_all_final_or_cancelled(self):
        games = [{"game_status": "종료", "game_time": "18:30"}, {"game_status": "경기취소", "game_time": "18:30"}]
        self.assertEqual(wg.day_state(games, self.day, at(21, 40))[0], "done")

    def test_waits_slowly_before_games_can_end(self):
        games = [{"game_status": "경기전", "game_time": "18:30"}]
        state, wait = wg.day_state(games, self.day, at(13, 0))
        self.assertEqual(state, "live")
        self.assertEqual(wait, wg.SLOW_INTERVAL)
        state, wait = wg.day_state(games, self.day, at(20, 55))
        self.assertEqual(wait, wg.FAST_INTERVAL)

    def test_polls_fast_once_games_may_end(self):
        games = [{"game_status": "종료", "game_time": "14:00"}, {"game_status": "7회말", "game_time": "18:30"}]
        state, wait = wg.day_state(games, self.day, at(21, 0))
        self.assertEqual((state, wait), ("live", wg.FAST_INTERVAL))

    def test_missing_time_defaults_to_evening(self):
        self.assertEqual(wg.start_time({"game_time": ""}, self.day), at(18, 30))
        self.assertEqual(wg.start_time({"game_time": "경기 시간 14:00"}, self.day), at(14, 0))


if __name__ == "__main__":
    unittest.main()
