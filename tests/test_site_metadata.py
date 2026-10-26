from datetime import date
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://antonyjclements.github.io'
PAGES = [ROOT / 'index.html', ROOT / 'experiments/index.html', *sorted((ROOT / 'posts').glob('*/index.html'))]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.meta = {}
        self.links = []
        self.anchors = []
        self.dates = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('property', attrs.get('name'))] = attrs.get('content')
        elif tag == 'link':
            self.links.append(attrs)
        elif tag == 'a':
            self.anchors.append(attrs.get('href', ''))
        elif tag == 'time':
            self.dates.append(attrs.get('datetime'))


class SiteMetadataTests(unittest.TestCase):
    def test_each_indexed_page_has_consistent_sharing_metadata(self):
        for path in PAGES:
            with self.subTest(page=path):
                page = Page(path)
                route = '/' if path.parent == ROOT else '/' + path.parent.relative_to(ROOT).as_posix() + '/'
                canonical = [link['href'] for link in page.links if link.get('rel') == 'canonical']
                self.assertEqual(canonical, [BASE + route])
                self.assertEqual(page.meta['og:url'], canonical[0])
                self.assertEqual(page.meta['og:description'], page.meta['description'])
                self.assertEqual(page.meta['twitter:title'], page.meta['og:title'])
                self.assertEqual(page.meta['twitter:description'], page.meta['description'])
                self.assertEqual(page.meta['twitter:card'], 'summary_large_image')
                self.assertEqual(page.meta['og:image'], BASE + '/assets/social-preview.png')
                self.assertEqual(page.meta['twitter:image'], page.meta['og:image'])
                self.assertTrue(page.meta['og:image:alt'])
                self.assertTrue((ROOT / 'assets/social-preview.png').is_file())
                self.assertFalse(any(href.startswith(BASE) for href in page.anchors))
                for href in page.anchors:
                    if href.startswith('/'):
                        target = ROOT / href.split('#')[0].lstrip('/')
                        self.assertTrue(target.exists(), href)

    def test_feed_dates_match_article_dates_and_home_listings(self):
        channel = ET.parse(ROOT / 'feed.xml').getroot().find('channel')
        home_dates = Page(ROOT / 'index.html').dates
        published = []
        for item in channel.findall('item'):
            url = item.findtext('link')
            path = ROOT / url.removeprefix(BASE).strip('/') / 'index.html'
            page = Page(path)
            publication = parsedate_to_datetime(item.findtext('pubDate'))
            published.append(publication)
            self.assertEqual(date.fromisoformat(page.dates[0]), publication.date())
            if url.startswith(BASE + "/posts/"):
                self.assertIn(page.dates[0], home_dates)
            self.assertEqual(page.meta['article:published_time'], page.dates[0])
        build_date = parsedate_to_datetime(channel.findtext('lastBuildDate'))
        self.assertGreaterEqual(build_date, max(published))
        self.assertEqual(channel.findtext('title'), 'Antony Clements — Notes on building software')
        self_link = channel.find('{http://www.w3.org/2005/Atom}link')
        self.assertEqual(self_link.attrib, {'href': BASE + '/feed.xml', 'rel': 'self', 'type': 'application/rss+xml'})

    def test_sitemap_covers_public_pages_and_excludes_error_page(self):
        urls = ET.parse(ROOT / 'sitemap.xml').getroot()
        locations = [node.text for node in urls.findall('{*}url/{*}loc')]
        expected = {BASE + ('/' if p.parent == ROOT else '/' + p.parent.relative_to(ROOT).as_posix() + '/') for p in PAGES}
        self.assertEqual(set(locations), expected)
        self.assertEqual(len(locations), len(expected))
        self.assertIn('Sitemap: ' + BASE + '/sitemap.xml', (ROOT / 'robots.txt').read_text())
        error_page = Page(ROOT / '404.html')
        self.assertEqual(error_page.meta['robots'], 'noindex')
        self.assertIn('/', error_page.anchors)


if __name__ == '__main__':
    unittest.main()
