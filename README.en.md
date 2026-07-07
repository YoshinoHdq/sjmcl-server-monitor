<div align=center>

# Server Sentinel

Minecraft server monitoring panel with real-time online players, latency, and TPS 📊

**English · [简体中文](README.md)**

</div>

---

## 简介

Server Sentinel is a SJMCL extension that monitors Minecraft server status in real-time within the launcher, including online player count, latency, and TPS.

## Features

- 📊 Real-time display of online and max player counts
- ⏱ Color-coded ping monitoring (green/yellow/orange/red)
- 📈 Real-time TPS monitoring via custom HTTP API endpoint
- 🎯 Support Spark API format and simple JSON format
- 📉 TPS trend chart (sampling history tracking)
- ➕ Support multiple servers with independent TPS data source configuration

## Installation

1. Download org.yoshino.server_sentinel.sjmclx from Releases
2. Open SJMCL → Settings → Extension Management → Import
3. Add server addresses in the extension settings page
4. (Optional) For TPS monitoring, select "Custom HTTP Endpoint" in server config and enter an API URL

> Requires server-side plugins (e.g., Spark, custom TPS query plugin) that support HTTP API to retrieve TPS data.

## Compatibility

- Minimum launcher version: 1.1.3

## License

MIT
