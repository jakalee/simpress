from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
BRAND = "pre" + "zi"


class PublicationSafetyTests(unittest.TestCase):
    def test_current_project_files_do_not_reference_competing_brand(self):
        for name in ("index.html", "README.md", "README.ko.md"):
            text = (ROOT / name).read_text(encoding="utf-8").lower()
            self.assertNotIn(BRAND, text, name)

    def test_youtube_export_uses_project_player(self):
        text = INDEX.read_text(encoding="utf-8")
        self.assertIn("https://jakalee.github.io/simpress/player.html?v=${esc(o.yt)}", text)
        self.assertNotIn("player.html?v=${esc(o.yt)}", text.replace("simpress/player.html?v=${esc(o.yt)}", ""))

    def test_project_player_uses_privacy_enhanced_youtube_embed(self):
        text = (ROOT / "player.html").read_text(encoding="utf-8")
        self.assertIn("https://www.youtube-nocookie.com/embed/", text)
        self.assertIn("URLSearchParams", text)


if __name__ == "__main__":
    unittest.main()
