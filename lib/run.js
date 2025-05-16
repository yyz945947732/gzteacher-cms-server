import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { watch } from 'chokidar';
import fg from 'fast-glob';
import { copySync, mkdirsSync, removeSync } from 'fs-extra/esm';
import open from 'open';
import handler from 'serve-handler';
import { WebSocketServer } from 'ws';

const DEFAULT_PORT = 3009;
const SRC_DIR = path.resolve(process.cwd());
const OUT_DIR = path.resolve(SRC_DIR, 'dist');
const PUBLIC_FOLDERS = ['js', 'css', 'img'];

const includeRegex = /<\s*#include\s+"([^"]+)"\s*\/>/g;
const cmsGlobalStyleRegex = /\/\{ms:global\.style\/\}/g;
const cmsKeywords = [
  /\{\/?ms:[^\}]+\/?\}/g, // {ms:xxx} {/ms:xxx}
  /\$\{[^}]+\}/g, // ${xxx}
  /<\#assign\s+[^>]+>/g, // <#assign xxx>
  /\{@ms:[^}]+\/\}/g, // {@ms:xxx/}
  /<#[/a-zA-Z]+\s*[^>]*>/g, // <#if xxx> <#else> </#if>
];

function runTasks(options) {
  const { port = DEFAULT_PORT } = options;

  let wss;

  async function getAllHtmlFiles() {
    return await fg(['**/*.html', '**/*.htm'], {
      cwd: SRC_DIR,
      absolute: true,
      ignore: ['dist/**', 'node_modules'],
    });
  }

  function transformHtml(filePath) {
    let content = readFileSync(filePath, 'utf-8');

    // 替换 /{ms:global.style/}
    content = content.replace(cmsGlobalStyleRegex, '.');

    // 处理 include 递归
    content = replaceIncludes(content, path.dirname(filePath));

    // 替换 cms 特殊语法为 undefined
    for (const keyword of cmsKeywords) {
      content = content.replace(keyword, undefined);
    }

    content = injectReloadScript(content);

    return content;
  }

  function injectReloadScript(html) {
    const reloadScript = `
  <script>
    const ws = new WebSocket('ws://localhost:${port}');
    ws.onmessage = (event) => {
      if (event.data === 'reload') {
        location.reload();
      }
    };
  </script>
  `;

    if (html.includes('</body>')) {
      return html.replace('</body>', `${reloadScript}\n</body>`);
    }
    return html + reloadScript;
  }

  function triggerReload() {
    if (wss?.clients) {
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send('reload');
        }
      }
    }
  }

  function replaceIncludes(content, baseDir) {
    return content.replace(includeRegex, (_match, includePath) => {
      const absolutePath = path.resolve(baseDir, includePath);
      try {
        const includedContent = readFileSync(absolutePath, 'utf-8');
        return replaceIncludes(includedContent, path.dirname(absolutePath));
      } catch (_err) {
        console.warn(`⚠️ Failed to include: ${includePath}`);
        return '';
      }
    });
  }

  function writeOutput(srcPath) {
    const relativePath = path.relative(SRC_DIR, srcPath);
    const destPath = path.join(OUT_DIR, relativePath);

    const content = transformHtml(srcPath);
    mkdirsSync(path.dirname(destPath));
    writeFileSync(destPath, content, 'utf-8');
    triggerReload();
  }

  function removeOutput(srcPath) {
    const relativePath = path.relative(SRC_DIR, srcPath);
    const destPath = path.join(OUT_DIR, relativePath);

    removeSync(destPath, { force: true });
    triggerReload();
  }

  async function copyStaticAssets() {
    for (const folder of PUBLIC_FOLDERS) {
      const src = path.resolve(folder);
      const dest = path.join(OUT_DIR, folder);
      if (!existsSync(src)) {
        continue;
      }
      try {
        await copySync(src, dest);
      } catch (err) {
        console.error(`Failed to copy ${folder}:`, err);
      }
    }
  }

  async function startWatcher() {
    await copyStaticAssets();
    const files = await getAllHtmlFiles();
    const watcher = watch(files, {
      ignored: ['dist/**'],
    });

    watcher.on('add', writeOutput);
    watcher.on('change', writeOutput);
    watcher.on('unlink', removeOutput);

    console.log('Watching for changes...');
  }

  async function startServer() {
    const server = http.createServer((request, response) => {
      return handler(request, response, { public: OUT_DIR });
    });

    server.listen(port, async () => {
      const url = `http://localhost:${port}`;
      await open(url);
      console.log(`Server running at: ${url}`);
    });

    wss = new WebSocketServer({ server });
  }

  (async function main() {
    try {
      await startWatcher();
      await startServer();
    } catch (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  })();
}

export default runTasks;
