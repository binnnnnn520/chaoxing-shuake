# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目目标

学习通(Chaoxing)浏览器自动刷课插件。目录名 `学习通浏览器刷课插件` 即代表项目意图。

## 当前仓库状态

仓库**几乎是空的**:除 `.gitignore` 外没有源码、没有 `package.json`、没有 `README.md`、没有 `manifest.json`,`src/`、`tests/`、`public/` 都是空目录。任何构建、测试、运行命令都尚未确立——不要凭空假设 `npm run build` 之类的脚本存在。

## 已有文档与重要偏差

`docs/superpowers/` 下存在两份历史文档:
- `specs/2026-04-23-b-multivideo-edge-extension-design.md`
- `plans/2026-04-23-b-multivideo-edge-extension.md`

它们描述的是一个**通用的 Edge MV3「多视频侧边栏扩展」**(代号 `b`,粘贴多链接、最多 6 路并发、直链小窗 + 网页后台兜底),**与本项目「学习通刷课」目标方向不一致**。阅读时请把它们当作早期草稿/参考,而不是当前项目的实施真值;在与用户对齐目标前不要按其计划直接落地代码。

## 工作流与忽略规则

`.gitignore` 忽略 `.worktrees/` 和 `.omx/`,这是 superpowers / 子代理驱动开发流程使用的工作树与临时输出目录。在仓库内进行探索或文件检索时,可以默认跳过这两个目录。
