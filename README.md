# 中国职业 AI 影响全景图

基于中国职业分类细类数据，可视化展示人工智能对各类职业的**替代指数、增强指数、现实依赖与综合影响**，并支持筛选、定位、榜单与职业对比。

## 在线体验

<https://dingtiansong.github.io/china-ai-job-map/>

源码仓库：<https://github.com/dingtiansong/china-ai-job-map>

## 功能概览

- 矩形树图：按任务量与综合影响估算块面积，支持切换着色指标（综合影响 / 替代 / 增强 / 现实依赖）
- 筛选：职业大类、数字化岗位、类型标签；搜索框在当前筛选范围内**定位职业并在图中高亮**（不改变图块分布）
- 统计与分布：左侧汇总、直方图、标签分布与简要洞察
- 职业详情：四项指数、类型标签、描述与任务、各维度说明文案
- 榜单：按当前指标排序，支持升序 / 降序
- 职业对比：雷达图对比两项职业；支持快捷键或「点图设 A/B」在图上指定对比对象
- 分享：下载当前职业的分享卡片图（PNG）

## 技术栈

- 静态页面：HTML5、CSS3
- 逻辑与可视化：原生 JavaScript、[D3.js v7](https://d3js.org/)（CDN 引入）

## 项目结构

```
├── index.html
├── css/style.css
├── js/app.js
├── data/jobs.json
├── assets/
└── .nojekyll
```

## 数据说明

`data/jobs.json` 为职业对象数组，单条记录通常包含（字段名以实际文件为准）：

| 用途 | 常见字段 |
|------|----------|
| 标识与分类 | `record_id`，`big_category`，`middle_category`，`small_category`，`detail_category` |
| 展示名称 | `occupation_name` |
| 描述与任务 | `detail_description`，`detail_tasks` |
| 指数（0–100） | `ai_impact_index`，`ai_replace_index`，`ai_augment_index`，`real_world_index` |
| 标签 | `label`（如高风险替代型、人机协同增强型等） |
| 岗位属性 | `is_digital`，`is_green`（多为「是」/「否」） |
| 说明文案 | `replace_rationale`，`augment_rationale`，`real_world_rationale`，`impact_rationale` 等 |

具体字段以仓库内 `data/jobs.json` 为准。

## 浏览器与网络

- 需能访问 CDN 以加载 D3.js  
- 推荐使用现代浏览器的最新稳定版
