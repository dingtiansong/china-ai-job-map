# 中国职业 AI 影响全景图

静态单页应用：矩形树图 + 筛选 + 榜单 + 职业对比。数据见 `data/jobs.json`。

**计划托管仓库：** [`dingtiansong/china-ai-job-map`](https://github.com/dingtiansong/china-ai-job-map)  
**上线后访问（开启 Pages 后）：** <https://dingtiansong.github.io/china-ai-job-map/>

---

## 新建仓库并推送（一次做完）

### 1. 在 GitHub 上创建空仓库

1. 打开：<https://github.com/new>
2. **Repository name** 填：`china-ai-job-map`
3. 选 **Public**（免费 GitHub Pages 常用）
4. **不要**勾选 *Add a README* / *.gitignore* / *license*（避免与本地冲突）
5. 点 **Create repository**

### 2. 本地初始化并推送

在**本项目根目录**执行（路径按你本机调整）：

```bash
cd "/Users/tiansong/Downloads/china-ai-job-map-live-local-openable"

git init
git add .
git commit -m "chore: initial commit — 中国职业 AI 影响全景图"
git branch -M main
git remote add origin https://github.com/dingtiansong/china-ai-job-map.git
git push -u origin main
```

若提示远程已有内容，可先：`git pull origin main --allow-unrelated-histories`，解决冲突后再 `git push`。

### 3. 开启 GitHub Pages

1. 打开：<https://github.com/dingtiansong/china-ai-job-map/settings/pages>
2. **Source**：**Deploy from a branch**
3. **Branch**：`main` / **/**(root)** → Save**
4. 等待 1～3 分钟，访问：**<https://dingtiansong.github.io/china-ai-job-map/>**

---

## 注意事项

| 项目 | 说明 |
|------|------|
| **D3.js** | 从 CDN 加载，需能访问外网 |
| **大文件** | `data/jobs.json` 较大，首次 push 可能较慢；单文件须 &lt; 100MB |
| **`.nojekyll`** | 已包含在仓库根目录，避免 Jekyll 干扰静态站 |

## 后续更新

```bash
git add .
git commit -m "你的说明"
git push
```

---

## 本地预览

```bash
python3 -m http.server 8080
```

浏览器打开 <http://localhost:8080>。

若 `index.html` 内嵌了 `window.__JOB_DATA__`，也可直接本地打开 `index.html` 使用。
