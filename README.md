<div align=center>

# Server Sentinel

Minecraft 服务器监控面板 - 实时查看在线人数、延迟、TPS 与状态 📊

**[English](README.en.md) · 简体中文**

</div>

---

## 简介

Server Sentinel 是一款 SJMCL 扩展，在启动器内实时监控 Minecraft 服务器的运行状态，包括在线人数、延迟、TPS 等关键指标。

## 功能特色

- 📊 实时显示服务器在线人数与最大玩家数
- ⏱ 监控服务器延迟（ping），颜色分级显示（绿/黄/橙/红）
- 📈 实时 TPS 监控（通过自定义 HTTP API 端点）
- 🎯 支持 Spark API 格式与简单 JSON 格式
- 📉 TPS 趋势折线图（采样历史追踪）
- ➕ 支持添加多个服务器，每个服务器独立配置 TPS 数据源

## 使用方法

1. 在 Releases 下载 org.yoshino.server_sentinel.sjmclx
2. 打开 SJMCL → 设置 → 扩展管理 → 导入
3. 在扩展设置页添加要监控的服务器地址
4. （可选）如需 TPS 监控，在服务器配置中选择自定义 HTTP 端点并填入 API URL

> 需要在服务器上安装支持 HTTP API 的插件（如 Spark、自定义 TPS 查询插件等）以获取 TPS 数据。

## 兼容性

- 最低启动器版本: 1.1.3

## 许可

MIT
