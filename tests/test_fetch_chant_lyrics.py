import sys
import unittest
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import fetch_chant_lyrics as f  # noqa: E402

HTML = """
<div><div><h3>2.15. 하주석 (No. 30) [편집]</h3></div></div>
<div><table><tr><td>KIA 타이거즈</td></tr><tr><td>KIA 타이거즈 끝없는 설레임을 넘어</td></tr></table>
<table><tr><td>KIA 타이거즈</td></tr><tr><td>high 하주석 high 하주석<br>하!주!석![3]</td></tr></table></div>
<h3>2.16. No.24 손아섭 (2026~) [편집]</h3>
<table><tr><td>구단 자작곡 (2026~)</td></tr><tr><td>오! 안타 손아섭~</td></tr></table>
<h3>2.17. 홍창기 (No.51) [편집]</h3>
<ul><li>등장시 : Panic! At The Disco - Victorious</li></ul>
<blockquote>Tonight we are victorious (<span>날려버려 홍창기!</span>)</blockquote>
<ul><li>타격 시 : 자작곡</li></ul>
<blockquote>홍창기 안타 안타날려 홍창기~<br>×2</blockquote>
<h3>2.18. No.34 샘 힐리어드 [편집]</h3>
<h4>2.18.1. 응원가 1 [편집]</h4>
<table><tr><td>Frank Sinatra - Fly me to the moon</td></tr><tr><td>kt wiz 워어어어 샘 힐리어드</td></tr></table>
<h3>2.19. 다른선수 [편집]</h3>
<table><tr><td>다른선수 안타</td></tr></table>
"""


class FindPlayerLyricsTest(unittest.TestCase):
    def setUp(self):
        self.soup = BeautifulSoup(HTML, "html.parser")

    def test_skips_team_intro_and_strips_labels(self):
        self.assertEqual(
            f.find_player_lyrics(self.soup, "하주석"), "high 하주석 high 하주석\n하!주!석!"
        )

    def test_number_prefix_and_meta_lines(self):
        self.assertEqual(f.find_player_lyrics(self.soup, "손아섭"), "오! 안타 손아섭~")

    def test_prefers_batting_chant_over_walkup(self):
        self.assertEqual(
            f.find_player_lyrics(self.soup, "홍창기"), "홍창기 안타 안타날려 홍창기~\n×2"
        )

    def test_full_name_heading_nested_section_and_credit(self):
        self.assertEqual(
            f.find_player_lyrics(self.soup, "힐리어드"), "kt wiz 워어어어 샘 힐리어드"
        )

    def test_missing_player(self):
        self.assertIsNone(f.find_player_lyrics(self.soup, "없는선수"))


if __name__ == "__main__":
    unittest.main()
