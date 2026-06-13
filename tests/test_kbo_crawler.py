import unittest

from public.kbo_crawler import NaverKBOAllLineupCrawler


class KboCrawlerParserTests(unittest.TestCase):
    def setUp(self):
        self.crawler = NaverKBOAllLineupCrawler(save_dir="/tmp/kbo_crawler_tests")

    def tearDown(self):
        self.crawler.close()

    def test_parse_preview_lineup_players_uses_batorder(self):
        players = [
            {
                "positionName": "선발투수",
                "playerCode": "100",
                "playerName": "선발투수A",
                "batsThrows": "우투",
                "position": "1",
            },
            {
                "positionName": "중견수",
                "playerCode": "200",
                "playerName": "1번타자",
                "batsThrows": "좌타",
                "position": "8",
                "batorder": 1,
            },
            {
                "positionName": "유격수",
                "playerCode": "201",
                "playerName": "9번타자",
                "batsThrows": "우타",
                "position": "6",
                "batorder": 9,
            },
        ]

        pitcher, batters = self.crawler._parse_preview_lineup_players(players)

        self.assertEqual("선발투수A", pitcher["name"])
        self.assertEqual([1, 9], [b["batting_order"] for b in batters])
        self.assertEqual(["중견수", "유격수"], [b["position"] for b in batters])

    def test_parse_record_starting_batters_prefers_non_substitutes(self):
        batters = [
            {
                "batOrder": 1,
                "playerCode": "301",
                "name": "대타선수",
                "pos": "타",
                "substituteIn": True,
            },
            {
                "batOrder": 1,
                "playerCode": "300",
                "name": "선발1번",
                "pos": "중",
            },
            {
                "batOrder": 2,
                "playerCode": "302",
                "name": "선발2번",
                "pos": "유",
            },
        ]

        starters = self.crawler._parse_record_starting_batters(batters)

        self.assertEqual("선발1번", starters[0]["name"])
        self.assertEqual("중", starters[0]["position"])
        self.assertEqual([1, 2], [b["batting_order"] for b in starters])

    def test_build_team_lineup_from_record_uses_fallback_pitcher_name(self):
        lineup = self.crawler._build_team_lineup_from_record(
            {"name": "키움", "code": "WO"},
            batters=[
                {
                    "batOrder": index,
                    "playerCode": str(400 + index),
                    "name": f"{index}번타자",
                    "pos": "내야",
                }
                for index in range(1, 10)
            ],
            pitchers=[],
            fallback_pitcher_id="999",
            fallback_pitcher_name="선발투수B",
        )

        self.assertEqual("선발투수B", lineup["starting_pitcher"]["name"])
        self.assertEqual("999", lineup["starting_pitcher"]["player_id"])
        self.assertEqual(9, len(lineup["starting_batters"]))


if __name__ == "__main__":
    unittest.main()
