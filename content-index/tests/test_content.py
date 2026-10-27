import os
from pathlib import Path
import subprocess
import sys
import json
import tempfile
import unittest
from unittest.mock import patch
from nexus_content.store import connect, sync, search, scan, no_links, key
from nexus_content.extract import PageText, Extractor, PaddleEngine


class ContentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='.nexus-test-', dir=Path.cwd())
        self.root = Path(self.tmp.name)
        self.a, self.b = self.root / 'Alpha', self.root / 'Beta'
        self.a.mkdir(); self.b.mkdir()
        self.dbfile = self.root / 'index.sqlite'
        self.db = connect(self.dbfile)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def put(self, parent, name, text):
        p = parent / name
        p.write_text(text, encoding='utf-8')
        return p

    def extractor(self, p):
        return [PageText(i, text, 'text') for i, text in enumerate(p.read_text(encoding='utf-8').split('|'), 1)]

    def query(self, **kwargs):
        return search(self.dbfile, dict(roots=[str(self.a)], q='vistoria', **kwargs))

    def test_incremental_update_failure_recovery_and_remove(self):
        p = self.put(self.a, 'teste_nexus.pdf', 'vistoria antiga|protocolo sintetico')
        self.assertEqual(sync(self.db, self.a, [p], self.extractor)['indexed'], 1)
        self.assertEqual(self.query()['items'][0]['page'], 1)
        self.assertEqual(sync(self.db, self.a, [p], lambda _: self.fail('unchanged must not extract'))['unchanged'], 1)
        p.write_text('vistoria nova|vistoria pagina dois', encoding='utf-8')
        self.assertEqual(self.query()['total'], 0)  # stale text hidden before sync
        sync(self.db, self.a, [p], self.extractor)
        self.assertEqual(self.query()['total'], 2)
        self.assertNotIn('antiga', str(self.query()))
        p.write_text('broken', encoding='utf-8')
        result = sync(self.db, self.a, [p], lambda _: (_ for _ in ()).throw(ValueError('private text')))
        self.assertEqual(result['errors'], 1)
        self.assertEqual(self.query()['total'], 0)
        self.assertEqual(self.db.execute('SELECT status,error FROM documents').fetchone(), ('error', 'extraction_failed'))
        p.write_text('vistoria recuperada', encoding='utf-8')
        sync(self.db, self.a, [p], self.extractor)
        p.unlink()
        self.assertEqual(self.query()['total'], 0)
        self.assertEqual(sync(self.db, self.a, scan(self.a), self.extractor, prune=True)['removed'], 1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM pages').fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT count(*) FROM page_fts WHERE page_fts MATCH 'vistoria'").fetchone()[0], 0)

    def test_authorized_totals_pages_filters_and_literal_query(self):
        p = self.put(self.a, 'teste_nexus.pdf', '|'.join('vistoria pública' for _ in range(30)))
        secret = self.put(self.b, 'ficticio_privado.pdf', 'vistoria segredo ficticio')
        sibling = self.root / 'Alpha-other'; sibling.mkdir()
        outside = self.put(sibling, 'outro.pdf', 'vistoria')
        for root, file in [(self.a, p), (self.b, secret), (sibling, outside)]:
            sync(self.db, root, [file], self.extractor)
        data = self.query(offset=25)
        self.assertEqual(data['total'], 30)
        self.assertEqual(len(data['items']), 5)
        self.assertEqual(data['items'][0]['page'], 26)
        self.assertNotIn('segredo', str(data)); self.assertNotIn('Beta', str(data))
        self.assertEqual(search(self.dbfile, dict(roots=[], q='vistoria'))['total'], 0)
        self.assertEqual(self.query(ext='png')['total'], 0)
        self.assertEqual(self.query(type='folder')['total'], 0)
        self.assertEqual(self.query(modifiedTo='2000-01-01')['total'], 0)
        self.assertEqual(search(self.dbfile, dict(roots=[str(self.a)], q='vistoria OR segredo'))['total'], 0)
        with self.assertRaises(ValueError): self.query(folder=str(self.b))
        with self.assertRaises(ValueError): self.query(count=10000)
        # A revoked grant affects a new search immediately, regardless of index state.
        self.assertEqual(search(self.dbfile, dict(roots=[str(self.b)], q='vistoria'))['total'], 1)

    def test_rename_prune_and_scan_failure(self):
        p = self.put(self.a, 'teste_nexus.pdf', 'vistoria')
        sync(self.db, self.a, [p], self.extractor)
        p.rename(self.a / 'renomeado.pdf')
        result = sync(self.db, self.a, scan(self.a), self.extractor, prune=True)
        self.assertEqual((result['indexed'], result['removed']), (1, 1))
        with patch('os.walk', side_effect=PermissionError('private')):
            with self.assertRaises(PermissionError): scan(self.a)
        self.assertEqual(self.query()['total'], 1)

    def test_link_rejection(self):
        target = self.put(self.b, 'outside.pdf', 'vistoria')
        link = self.a / 'link.pdf'
        try: link.symlink_to(target)
        except OSError: self.skipTest('symlink privileges unavailable')
        with self.assertRaises(ValueError): no_links(link)
        self.assertEqual(sync(self.db, self.a, [link], self.extractor)['errors'], 1)
        self.assertEqual(self.query()['total'], 0)

    def test_reparse_attribute_rejection_without_symlink_privileges(self):
        class Info:
            st_mode = 0
            st_file_attributes = 0x400
        with patch.object(Path, 'lstat', return_value=Info()):
            with self.assertRaises(ValueError): no_links(self.a)


class ExtractionTests(unittest.TestCase):
    def test_cli_text_pdf_update_force_remove_and_safe_defaults(self):
        import pymupdf
        package_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='.nexus-test-', dir=Path.cwd()) as directory:
            root = Path(directory)
            pdf = root / 'teste_nexus.pdf'
            doc = pymupdf.open(); doc.new_page().insert_text((72, 72), 'vistoria sintetica')
            doc.save(pdf); doc.close()
            db = root / 'new.sqlite'
            def cli(*args):
                return subprocess.run([sys.executable, '-m', 'nexus_content', *args], cwd=package_root,
                                      capture_output=True, text=True, encoding='utf-8', env=os.environ)
            args = ['index', '--db', str(db), '--root', str(root), '--file', str(pdf)]
            indexed = cli(*args); self.assertEqual(indexed.returncode, 0, indexed.stderr)
            self.assertEqual(json.loads(indexed.stdout)['indexed'], 1)
            self.assertEqual(json.loads(cli(*args).stdout)['unchanged'], 1)
            self.assertEqual(json.loads(cli(*args, '--force').stdout)['indexed'], 1)
            self.assertEqual(search(db, dict(roots=[str(root)], q='vistoria'))['total'], 1)
            denied = cli('index', '--db', str(db), '--root', str(root), '--scan')
            self.assertNotEqual(denied.returncode, 0)
            denied = cli('index', '--db', str(db), '--root', str(root), '--file', str(root / 'other.pdf'))
            self.assertNotEqual(denied.returncode, 0)
            removed = cli('remove', '--db', str(db), '--root', str(root), '--file', str(pdf))
            self.assertEqual(json.loads(removed.stdout)['removed'], 1)
            self.assertEqual(search(db, dict(roots=[str(root)], q='vistoria'))['total'], 0)

    def test_real_pdf_text_raster_mixed_and_image_with_injected_ocr(self):
        import pymupdf
        with tempfile.TemporaryDirectory(prefix='.nexus-test-', dir=Path.cwd()) as directory:
            root = Path(directory)
            filename = root / 'teste_nexus.pdf'
            doc = pymupdf.open()
            doc.new_page().insert_text((72, 72), 'NEXUS - vistoria sintetica URBEXA-2026-001')
            pix = doc[0].get_pixmap()
            image = root / 'teste_nexus.png'; pix.save(image)
            doc.new_page().insert_image(pymupdf.Rect(0, 0, 595, 842), stream=pix.tobytes('png'))
            mixed = doc.new_page(); mixed.insert_text((72, 72), 'cabecalho sintetico')
            mixed.insert_image(pymupdf.Rect(0, 100, 300, 500), stream=pix.tobytes('png'))
            doc.save(filename); doc.close()
            calls = []
            def fake_ocr(rgb):
                calls.append(rgb.shape)
                return 'vistoria raster ficticia'
            pages = list(Extractor(ocr=fake_ocr)(filename))
            self.assertEqual([p.page for p in pages], [1, 2, 3])
            self.assertEqual([p.method for p in pages], ['text', 'ocr', 'mixed'])
            self.assertIn('URBEXA-2026-001', pages[0].text)
            self.assertIn('cabecalho', pages[2].text)
            self.assertEqual(len(calls), 2)
            self.assertEqual(list(Extractor(ocr=fake_ocr)(image))[0].method, 'ocr')

    def test_paddle_v2_and_v3_result_adapters(self):
        model = PaddleEngine.__new__(PaddleEngine)
        model.v3 = False
        class V2:
            def ocr(self, rgb, cls): return [[[[0], ('vistoria', .99)]]]
        model.model = V2()
        self.assertEqual(model(None), 'vistoria')
        model.v3 = True
        class Result:
            json = {'res': {'rec_texts': ['vistoria', 'sintetica']}}
        class V3:
            def predict(self, rgb): return [Result()]
        model.model = V3()
        self.assertEqual(model(None), 'vistoria\nsintetica')


if __name__ == '__main__': unittest.main()
