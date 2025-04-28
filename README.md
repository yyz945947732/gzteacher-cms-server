# @gzteacher/cms-server

<p>
  <a href="https://www.npmjs.com/package/@gzteacher/cms-server">
    <img src="https://img.shields.io/npm/v/@gzteacher/cms-server.svg" alt="Version" />
  </a>
  <a href="https://github.com/yyz945947732/gzteacher-cms-server/pulls">
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs Welcome"
    />
  </a>
  <a href="/LICENSE.md">
    <img
      src="https://img.shields.io/badge/license-MIT-blue.svg"
      alt="GitHub license"
    />
  </a>
</p>

<h2>⚠️ 大部分 cms 语法并不支持，仅以调试静态文件为主 ⚠️</h2>

🚀 本地运行 cms 文件的服务

- 支持热更新
- 运行时忽略 cms 语法
- 运行时支持 include 嵌套
- 自动打开浏览器

## Quick start

### 本地安装

```sh
npm install -D @gzteacher/cms-server
```

`package.json` 文件添加以下命令:

```json
"scripts": {
  "start": "cms-run"
}
```

执行命令运行服务：

```bash
npm run start
```

<img src="./assets/example.png" />

### 全局安装

```sh
npm install -g @gzteacher/cms-server
```

通过 `npx` 直接运行：

```sh
npx cms-run
```

## LICENSE

[MIT](https://github.com/yyz945947732/@gzteacher/cms-server/blob/master/LICENSE)

---

This project is created using [generator-stupid-cli](https://github.com/yyz945947732/generator-stupid-cli).
