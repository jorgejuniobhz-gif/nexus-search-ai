"""Only fictitious bytes/text; integration fixtures, never production files."""
import json
import sys
from pathlib import Path
from nexus_content.store import connect, sync
from nexus_content.extract import PageText

root = Path(sys.argv[1])
db = connect(root / 'content.sqlite')
for name in ('Alpha', 'Beta', 'Alpha-other'):
    folder = root / name
    folder.mkdir(exist_ok=True)
    p = folder / ('teste_nexus.pdf' if name == 'Alpha' else 'privado_ficticio.pdf')
    p.write_text('vistoria ' + name, encoding='utf-8')
    sync(db, folder, [p], lambda p: [PageText(1, p.read_text(encoding='utf-8'), 'fixture')])
db.close()
