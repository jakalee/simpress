#!/usr/bin/env python3
"""src/ 와 vendor/ 를 합쳐 설치 없이 열리는 editor.html 한 파일을 만듭니다."""
from pathlib import Path

root = Path(__file__).parent
src = root / "src"
html = (src / "index.html").read_text(encoding="utf-8")
html = html.replace("/*INLINE:css*/", (src / "editor.css").read_text(encoding="utf-8"))
scripts = "\n".join(
    (src / name).read_text(encoding="utf-8")
    for name in ("elements.js", "chart.js", "model3d.js", "embed.js", "layouts.js", "canvas.js", "export.js", "editor.js")
)
html = html.replace("/*INLINE:js*/", scripts)
impress = (root / "vendor" / "impress.js").read_text(encoding="utf-8")
impress = impress.replace("<!--", "<\\!--").replace("</script", "<\\/script")
html = html.replace("/*INLINE:impress*/", impress)
(root / "editor.html").write_text(html, encoding="utf-8")
(root / "index.html").write_text(html, encoding="utf-8")  # GitHub Pages 시작 페이지
print(f"editor.html {len(html.encode('utf-8')) / 1024:.0f} KB")
