import assert from 'node:assert/strict';
import { join } from 'node:path';

/** Files navigation stays readable beside wide Markdown code blocks and source files. */
export async function checkFilesLayout(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
    await page.evaluate(() =>
      localStorage.setItem(
        'galley:settings',
        JSON.stringify({ theme: 'ocean', appearance: 'dark', font: 'sans', size: 4, layout: 'files', codeFiles: true, scope: 'all' }),
      ),
    );
    await page.goto(demoUrl, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => {
      const s = document.querySelector('#galley-reader')?.shadowRoot;
      return s?.querySelectorAll('.mr-file-link').length === 5 && s.querySelectorAll('.mr-code-file').length === 2;
    });
    await page.evaluate(() => document.fonts.ready);
    for (const size of [24, 17]) {
      if (size === 17)
        await page.evaluate(() => {
          const s = document.querySelector('#galley-reader').shadowRoot;
          for (let i = 0; i < 4; i++) s.querySelector('[data-act="smaller"]').click();
        });
      for (const width of [1280, 1440, 1920]) {
        await page.setViewport({ width, height: 1000 });
        await page.evaluate(() => {
          const s = document.querySelector('#galley-reader').shadowRoot;
          s.querySelector('.mr-root').scrollTop += s.querySelector('.mr-content > pre').getBoundingClientRect().top - 180;
        });
        const geometry = await page.evaluate(() => {
          const s = document.querySelector('#galley-reader').shadowRoot;
          const rail = s.querySelector('.mr-toc');
          const article = s.querySelector('.mr-article').getBoundingClientRect();
          return {
            rail: rail.getBoundingClientRect().right,
            visible: getComputedStyle(rail).visibility,
            page: s.querySelector('.mr-root').scrollWidth,
            blocks: [...s.querySelectorAll('.mr-content > pre, .mr-document.is-code')]
              .filter((el) => !el.closest('[hidden]'))
              .map((el) => {
                const box = el.getBoundingClientRect();
                return { left: box.left, right: box.right, markdown: el.tagName === 'PRE', articleRight: article.right };
              }),
          };
        });
        if (size === 24 && width === 1440) await page.screenshot({ path: join(screenshots, 'galley-files-code-desktop.png') });
        assert.ok(
          geometry.blocks.some((block) => block.markdown),
          'Exercise the real Markdown code blocks',
        );
        assert.ok(
          geometry.blocks.some((block) => !block.markdown),
          'Exercise source files beside the same navigation',
        );
        assert.equal(geometry.visible, 'visible');
        assert.ok(geometry.page <= width, JSON.stringify({ size, width, geometry }));
        for (const block of geometry.blocks) {
          assert.ok(block.left >= geometry.rail + 16, JSON.stringify({ size, width, geometry, block }));
          assert.ok(block.right <= (block.markdown ? block.articleRight : width) + 1, JSON.stringify({ size, width, block }));
        }
      }
    }
  } finally {
    await page.close();
  }
}
