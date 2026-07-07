(function () {
  var TOKEN = (document.currentScript && document.currentScript.dataset && document.currentScript.dataset.extensionToken) || "";
  if (!TOKEN) throw new Error("Missing extension activation token");

  window.registerExtension(function (api) {
    var R = api.React;
    var useState = R.useState, useEffect = R.useEffect, useCallback = R.useCallback;
    var el = R.createElement;

    var CU = api.ChakraUI;
    var Box = CU.Box, Flex = CU.Flex, HStack = CU.HStack, VStack = CU.VStack;
    var Text = CU.Text, Heading = CU.Heading, Badge = CU.Badge;
    var Button = CU.Button, Divider = CU.Divider;
    var Input = CU.Input, Select = CU.Select, Tag = CU.Tag, TagLabel = CU.TagLabel;
    var Image = CU.Image, CloseButton = CU.CloseButton;
    var Alert = CU.Alert, AlertIcon = CU.AlertIcon, AlertTitle = CU.AlertTitle, AlertDescription = CU.AlertDescription;
    var Progress = CU.Progress, Tooltip = CU.Tooltip;

    function motdToClean(raw) {
      if (!raw || !raw.join) return "";
      return raw.join(" ").replace(/\u00a7[0-9a-fklmnor]/gi, "");
    }

    function pingServer(address) {
      var start = Date.now();
      return fetch("https://api.mcsrvstat.us/3/" + encodeURIComponent(address))
        .then(function (r) { return r.json().then(function (d) { if (d) d.latency = Date.now() - start; return d; }); })
        .catch(function () { return null; });
    }

    function fetchTPS(endpointUrl) {
      if (!endpointUrl) return Promise.resolve(null);
      return fetch(endpointUrl, { signal: AbortSignal.timeout(5000) })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var tps = null, mspt = null;
          if (data && data.profiler && data.profiler.tps && Array.isArray(data.profiler.tps)) {
            tps = data.profiler.tps[0];
            if (typeof tps === "number") tps = parseFloat(tps.toFixed(2));
          }
          if (tps === null && data && typeof data.tps === "number") {
            tps = parseFloat(data.tps.toFixed(2));
          }
          if (data && typeof data.mspt === "number") {
            mspt = parseFloat(data.mspt.toFixed(1));
          }
          if (mspt === null && data && data.lastTick && typeof data.lastTick.mean === "number") {
            mspt = parseFloat(data.lastTick.mean.toFixed(1));
          }
          if (tps === null && mspt !== null && mspt > 0) {
            tps = parseFloat(Math.min(20, 1000 / mspt).toFixed(2));
          }
          if (mspt === null && tps !== null && tps > 0) {
            mspt = parseFloat(Math.min(1000, 1000 / tps).toFixed(1));
          }
          return { tps: tps, mspt: mspt };
        })
        .catch(function () { return null; });
    }

    function tpsColor(tps) {
      if (tps === null || tps === undefined) return "gray";
      if (tps >= 19.0) return "green";
      if (tps >= 15.0) return "yellow";
      return "red";
    }

    function tpsLabel(tps) {
      if (tps === null || tps === undefined) return "N/A";
      return tps.toFixed(1);
    }

    function pingColor(ms) {
      if (ms === null || ms === undefined) return "gray";
      if (ms < 50) return "green";
      if (ms < 150) return "yellow";
      if (ms < 300) return "orange";
      return "red";
    }

    function storageGet(key, def) {
      try { var v = localStorage.getItem("sjmcl-" + key); return v ? JSON.parse(v) : def; } catch(e) { return def; }
    }
    function storageSet(key, val) {
      try { localStorage.setItem("sjmcl-" + key, JSON.stringify(val)); } catch(e) {}
    }

    function HomeWidget() {
      var host = api.getHostContext();
      var extState = host.state.useExtensionState;
      var serverList = extState("servers", []);
      var servers = serverList[0];
      var statusData = extState("statusData", {});
      var status = statusData[0];
      var tpsData = extState("tpsData", {});
      var tps = tpsData[0];
      var homeInterval = extState("refreshInterval", 30);

      useEffect(function () {
        if (servers.length === 0) {
          var saved = storageGet("servers", []);
          if (saved.length > 0) serverList[1](saved);
          var savedInt = storageGet("interval", 30);
          if (savedInt !== 30) homeInterval[1](savedInt);
        }
      }, []);

      useEffect(function () {
        servers.forEach(function (s) {
          var addr = s.address + (s.port !== 25565 ? ":" + s.port : "");
          pingServer(addr).then(function (d) {
            if (d) statusData[1](function (prev) {
              var n = Object.assign({}, prev);
              n[s.address] = d;
              return n;
            });
          });
          if (s.tpsSource === "custom" && s.tpsEndpoint) {
            fetchTPS(s.tpsEndpoint).then(function (d) {
              if (d) tpsData[1](function (prev) {
                var n = Object.assign({}, prev);
                n[s.address] = Object.assign({}, n[s.address], d);
                return n;
              });
            });
          }
        });
      }, []);

      var onlineCount = 0, totalPlayers = 0;
      servers.forEach(function (s) {
        var d = status[s.address];
        if (d && d.online) { onlineCount++; totalPlayers += d.players.online; }
      });

      return el(VStack, { align: "stretch", spacing: 3 },
        el(HStack, { justify: "space-between", align: "center" },
          el(Text, { fontSize: "sm", fontWeight: "bold" }, "服务器监控"),
          el(Badge, { colorScheme: onlineCount > 0 ? "green" : "gray", variant: "subtle" }, onlineCount + "/" + servers.length + " 在线")
        ),
        el(HStack, { spacing: 3 },
          el(Box, { bg: "blue.50", _dark: { bg: "blue.900" }, p: 2, borderRadius: "md", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "2xl", fontWeight: "bold", color: "blue.500" }, "" + onlineCount),
            el(Text, { fontSize: "xs", color: "gray.500" }, "在线")
          ),
          el(Box, { bg: "green.50", _dark: { bg: "green.900" }, p: 2, borderRadius: "md", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "2xl", fontWeight: "bold", color: "green.500" }, "" + totalPlayers),
            el(Text, { fontSize: "xs", color: "gray.500" }, "玩家")
          ),
          el(Box, { bg: "purple.50", _dark: { bg: "purple.900" }, p: 2, borderRadius: "md", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "2xl", fontWeight: "bold", color: "purple.500" }, "" + servers.length),
            el(Text, { fontSize: "xs", color: "gray.500" }, "服务器")
          )
        ),
        servers.length > 0
          ? el(Box, { maxH: "200px", overflowY: "auto" },
              servers.slice(0, 5).map(function (s) {
                var d = status[s.address];
                var td = tps[s.address];
                return el(HStack, { key: s.address, spacing: 2, py: 1.5 },
                  el(Box, { w: 2, h: 2, borderRadius: "full", bg: d && d.online ? "green.400" : "red.400" }),
                  el(Text, { fontSize: "sm", flex: 1, noOfLines: 1 }, s.label || s.address),
                  el(HStack, { spacing: 2, fontSize: "xs" },
                    d && d.online ? el(Text, { color: pingColor(d.latency) + ".500", fontWeight: "bold", fontSize: "xs" }, (d.latency || 0) + "ms") : null,
                    td && td.tps !== null
                      ? el(Text, { color: tpsColor(td.tps) + ".500", fontWeight: "bold" }, tpsLabel(td.tps))
                      : null,
                    el(Text, { color: "gray.500" }, d && d.online ? d.players.online + "/" + d.players.max : "-")
                  )
                );
              })
            )
          : el(Text, { fontSize: "sm", color: "gray.500", fontStyle: "italic" }, "暂无可监控的服务器"),
        el(Text, { fontSize: "xs", color: "gray.500", textAlign: "center" }, "前往扩展设置管理服务器")
      );
    }
    function SettingsPage() {
      var host = api.getHostContext();
      var extState = host.state.useExtensionState;
      var serverList = extState("servers", []);
      var servers = serverList[0];
      var refreshInterval = extState("refreshInterval", 30);
      var interval = refreshInterval[0];
      var srvStatus = extState("statusData", {});
      var statusDataVal = srvStatus[0];
      var srvTps = extState("tpsData", {});
      var tpsDataVal = srvTps[0];
      var [newAddr, setNewAddr] = useState("");
      var [newLabel, setNewLabel] = useState("");
      var [newPort, setNewPort] = useState("25565");
      var [newTpsSource, setNewTpsSource] = useState("none");
      var [newTpsEndpoint, setNewTpsEndpoint] = useState("");
      var [detailModal, setDetailModal] = useState(null);
      var [tabIdx, setTabIdx] = useState(0);
      var [tpsHistory, setTpsHistory] = useState(storageGet("tpsHistory", {}));
      var TPS_GUIDE = [
        ["必要前提", "你的 Minecraft 服务器需要安装一个支持 HTTP API 的插件来暴露 TPS 数据。推荐使用 Spark（https://spark.lucko.me/），它自带 HTTP 服务器和 TPS API。"],
        ["第一步: 安装 Spark", "将 Spark 插件放入服务器的 mods 或 plugins 文件夹，重启服务器。Spark 支持 Bukkit/Spigot/Paper、Fabric、Forge、BungeeCord 等几乎所有服务端类型。"],
        ["第二步: 开启 HTTP 服务", "在服务器控制台执行 /spark health 确认 Spark 运行正常，然后执行 /spark enablehttp 开启 HTTP API。默认端口为 25578。"],
        ["第三步: 配置 TPS 端点", "在本扩展的设置页 → 「管理」标签页，点击「添加服务器」或编辑已有服务器，将 TPS 数据源选为「自定义 HTTP 端点」。URL 格式如 http://你的服务器IP:25578/api/v2/profiler，保存即可。"],
        ["其他方案", "如果你使用其他面板（如 PufferPanel、AMP、MCSManager 等），它们通常也提供 REST API。只需配置对应的 TPS API URL 即可。插件支持简单格式 {\"tps\": 19.8}、Spark 格式和纯 MSPT 格式。"],
        ["注意事项", "TPS API URL 必须能被 SJMCL 所在电脑访问。如果服务器在局域网内，请使用内网 IP；如果在公网，确保端口已放行。建议将刷新间隔设为 10-30 秒以获得平滑的趋势图。"]
      ];
      var [showTpsGuide, setShowTpsGuide] = useState(false);

      function updateTpsHistory(addr, td) {
        if (!td || td.tps === null) return;
        setTpsHistory(function (prev) {
          var hist = Object.assign({}, prev);
          var arr = hist[addr] || [];
          arr = arr.concat([{ tps: td.tps, mspt: td.mspt, time: Date.now() }]);
          if (arr.length > 30) arr = arr.slice(-30);
          hist[addr] = arr;
          storageSet("tpsHistory", hist);
          return hist;
        });
      }

      function addServer() {
        if (!newAddr.trim()) return;
        var port = parseInt(newPort) || 25565;
        var srv = {
          address: newAddr.trim(),
          label: newLabel.trim() || newAddr.trim(),
          port: port,
          tpsSource: newTpsSource || "none",
          tpsEndpoint: newTpsEndpoint.trim() || ""
        };
        var exists = servers.some(function (s) { return s.address === srv.address && s.port === srv.port; });
        if (exists) return;
        var newList = servers.concat([srv]);
        serverList[1](newList);
        storageSet("servers", newList);
        setNewAddr(""); setNewLabel(""); setNewPort("25565");
        setNewTpsSource("none"); setNewTpsEndpoint("");
      }

      function removeServer(addr) {
        var newList = servers.filter(function (s) { return s.address !== addr; });
        serverList[1](newList);
        storageSet("servers", newList);
        srvStatus[1](function (p) { var n = Object.assign({}, p); delete n[addr]; return n; });
        srvTps[1](function (p) { var n = Object.assign({}, p); delete n[addr]; return n; });
      }

      function updateServer(addr, updates) {
        var newList = servers.map(function (s) {
          if (s.address === addr) return Object.assign({}, s, updates);
          return s;
        });
        serverList[1](newList);
        storageSet("servers", newList);
      }

      var fetchAll = useCallback(function () {
        servers.forEach(function (s) {
          var addr = s.address + (s.port !== 25565 ? ":" + s.port : "");
          pingServer(addr).then(function (d) {
            if (d) srvStatus[1](function (prev) {
              var n = Object.assign({}, prev); n[s.address] = d; return n;
            });
          });
          if (s.tpsSource === "custom" && s.tpsEndpoint) {
            fetchTPS(s.tpsEndpoint).then(function (d) {
              if (d) {
                srvTps[1](function (prev) {
                  var n = Object.assign({}, prev);
                  n[s.address] = Object.assign({}, n[s.address] || {}, d);
                  return n;
                });
                updateTpsHistory(s.address, d);
              }
            });
          }
        });
      }, [servers]);

      function refreshServer(s) {
        var addr = s.address + (s.port !== 25565 ? ":" + s.port : "");
        pingServer(addr).then(function (d) {
          if (d) srvStatus[1](function (prev) { var n = Object.assign({}, prev); n[s.address] = d; return n; });
        });
        if (s.tpsSource === "custom" && s.tpsEndpoint) {
          fetchTPS(s.tpsEndpoint).then(function (d) {
            if (d) {
              srvTps[1](function (prev) { var n = Object.assign({}, prev); n[s.address] = Object.assign({}, n[s.address] || {}, d); return n; });
              updateTpsHistory(s.address, d);
            }
          });
        }
      }

      useEffect(function () {
        if (servers.length === 0) {
          var saved = storageGet("servers", []);
          if (saved.length > 0) serverList[1](saved);
          var savedInt = storageGet("interval", 30);
          if (savedInt !== 30) refreshInterval[1](savedInt);
        }
      }, []);

      useEffect(function () { if (servers.length > 0) fetchAll(); }, []);

      useEffect(function () {
        if (interval <= 0 || servers.length === 0) return;
        var timer = setInterval(fetchAll, interval * 1000);
        return function () { clearInterval(timer); };
      }, [interval, fetchAll, servers]);

      var onlineCount = 0, totalPlayers = 0, totalMax = 0;
      servers.forEach(function (s) {
        var d = statusDataVal[s.address];
        if (d && d.online) { onlineCount++; totalPlayers += d.players.online; totalMax += d.players.max; }
      });

      function TpsSparkline(props) {
        var points = props.points || [];
        var width = props.width || 120;
        var height = props.height || 28;
        if (points.length < 2) return el(Text, { fontSize: "xs", color: "gray.500" }, "等待数据中...");
        var maxVal = 20, minVal = 0;
        var pts = points.map(function (p, i) {
          var x = (i / (points.length - 1)) * width;
          var y = height - ((Math.min(p.tps, maxVal) - minVal) / (maxVal - minVal)) * height;
          return x + "," + y;
        });
        var pathD = "M" + pts.join(" L");
        var last = points[points.length - 1];
        var colorVal = tpsColor(last.tps) === "green" ? "#48BB78" : tpsColor(last.tps) === "yellow" ? "#ECC94B" : "#F56565";
        return el(Box, { position: "relative", w: width + "px", h: height + "px" },
          el("svg", { viewBox: "0 0 " + width + " " + height, width: width, height: height },
            el("line", { x1: 0, y1: 0, x2: width, y2: 0, stroke: "gray", strokeWidth: 0.5, opacity: 0.3 }),
            el("line", { x1: 0, y1: height / 2, x2: width, y2: height / 2, stroke: "gray", strokeWidth: 0.5, opacity: 0.2 }),
            el("path", { d: pathD, fill: "none", stroke: colorVal, strokeWidth: 1.5, strokeLinejoin: "round", strokeLinecap: "round" })
          ),
          el(Text, { position: "absolute", bottom: 0, right: 0, fontSize: "10px", lineHeight: "10px", color: tpsColor(last.tps) + ".500", fontWeight: "bold" }, last.tps.toFixed(1))
        );
      }
      var panelView = el(VStack, { spacing: 4, align: "stretch" },
        el(HStack, { justify: "space-between" },
          el(Heading, { size: "md" }, "服务器面板"),
          el(HStack, { spacing: 2 },
            el(Text, { fontSize: "sm", color: "gray.500" }, "自动: " + interval + "s"),
            el(Button, { size: "sm", colorScheme: "blue", onClick: fetchAll }, "刷新")
          )
        ),
        el(HStack, { spacing: 4 },
          el(Box, { bg: "blue.50", _dark: { bg: "blue.900" }, p: 4, borderRadius: "lg", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "3xl", fontWeight: "bold", color: "blue.500" }, "" + onlineCount),
            el(Text, { fontSize: "sm", color: "gray.500" }, "在线")
          ),
          el(Box, { bg: "green.50", _dark: { bg: "green.900" }, p: 4, borderRadius: "lg", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "3xl", fontWeight: "bold", color: "green.500" }, "" + totalPlayers),
            el(Text, { fontSize: "sm", color: "gray.500" }, "玩家")
          ),
          el(Box, { bg: "orange.50", _dark: { bg: "orange.900" }, p: 4, borderRadius: "lg", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "3xl", fontWeight: "bold", color: "orange.500" }, "" + totalMax),
            el(Text, { fontSize: "sm", color: "gray.500" }, "最大")
          ),
          el(Box, { bg: "purple.50", _dark: { bg: "purple.900" }, p: 4, borderRadius: "lg", flex: 1, textAlign: "center" },
            el(Text, { fontSize: "3xl", fontWeight: "bold", color: "purple.500" }, "" + servers.length),
            el(Text, { fontSize: "sm", color: "gray.500" }, "监控")
          )
        ),
        servers.length === 0
          ? el(Alert, { status: "info", borderRadius: "md" },
              el(AlertIcon, null), el(AlertTitle, null, "暂无服务器"), el(AlertDescription, null, "请切换到「管理」标签页添加服务器。")
            )
          : el(VStack, { spacing: 3 },
              servers.map(function (s) {
                var d = statusDataVal[s.address];
                var td = tpsDataVal[s.address];
                return el(Box, {
                  key: s.address, p: 4, borderWidth: 1, borderRadius: "md",
                  borderColor: d && d.online ? "green.200" : "gray.600",
                  cursor: "pointer",
                  onClick: function () { if (d) setDetailModal({ server: s, data: d, tps: td, tpsHistory: tpsHistory[s.address] || [] }); }
                },
                  !d
                    ? el(Box, null, el(HStack, { justify: "space-between" },
                        el(Text, { fontSize: "sm", fontWeight: "bold" }, s.label || s.address),
                        el(Badge, { colorScheme: "gray", variant: "solid", fontSize: "xs" }, "等待中")
                      ), el(Text, { fontSize: "xs", color: "gray.500", mt: 1 }, s.address))
                    : !d.online
                      ? el(Box, null, el(HStack, { justify: "space-between" },
                          el(Text, { fontSize: "sm", fontWeight: "bold" }, s.label || s.address),
                          el(Badge, { colorScheme: "red", variant: "solid", fontSize: "xs" }, "离线")
                        ), el(Text, { fontSize: "xs", color: "gray.500", mt: 1 }, s.address))
                      : el(VStack, { spacing: 2, align: "stretch" },
                          el(HStack, { justify: "space-between" },
                            el(VStack, { spacing: 0 },
                              d.motd && d.motd.clean
                                ? el(Text, { fontSize: "sm", fontWeight: "bold" }, motdToClean(d.motd.clean))
                                : el(Text, { fontSize: "sm", fontWeight: "bold" }, s.label || s.address),
                              el(Text, { fontSize: "xs", color: "gray.500" }, s.address + (s.port !== 25565 ? ":" + s.port : ""))
                            ),
                            el(Badge, { colorScheme: "green", variant: "solid", fontSize: "xs" }, "在线")
                          ),
                          el(HStack, { spacing: 4, fontSize: "sm", align: "center" },
                            el(Text, null, "玩家: " + d.players.online + "/" + d.players.max),
                            el(Button, { size: "xs", variant: "ghost", colorScheme: "blue", onClick: function (e) { e.stopPropagation(); refreshServer(s); }, title: "刷新此服务器" }, "↻"),
                            d.latency != null
                              ? el(Tooltip, { label: "延迟: " + d.latency + "ms" },
                                  el(Text, { color: pingColor(d.latency) + ".500", fontWeight: "bold", fontSize: "sm" },
                                    "延迟: " + d.latency + "ms"
                                  )
                                )
                              : el(Text, { fontSize: "xs", color: "gray.500", fontStyle: "italic" }, "延迟: N/A"),
                            td && td.tps !== null
                              ? el(Tooltip, { label: "MSPT: " + (td.mspt !== null ? td.mspt.toFixed(1) : "N/A") + "ms" },
                                  el(Text, { color: tpsColor(td.tps) + ".500", fontWeight: "bold" },
                                    "TPS: " + tpsLabel(td.tps)
                                  )
                                )
                              : s.tpsSource === "custom" && s.tpsEndpoint
                                ? el(Text, { fontSize: "xs", color: "gray.500", fontStyle: "italic" }, "等待TPS...")
                                : null,
                            d.version ? el(Text, { noOfLines: 1, color: "gray.500" }, d.version.name) : null
                          ),
                          el(Progress, {
                            value: d.players.max > 0 ? (d.players.online / d.players.max) * 100 : 0,
                            size: "xs", borderRadius: "full",
                            colorScheme: d.players.max === 0 ? "green" : d.players.online / d.players.max < 0.3 ? "green" : d.players.online / d.players.max < 0.6 ? "yellow" : d.players.online / d.players.max < 0.85 ? "orange" : "red"
                          })
                        )
                );
              })
            )
      );
      var settingsView = el(VStack, { spacing: 4, align: "stretch" },
        el(HStack, { justify: "space-between" },
          el(Heading, { size: "md" }, "服务器管理"),
          el(Button, { size: "sm", variant: "outline", colorScheme: "blue", onClick: function () { setShowTpsGuide(true); } }, "TPS 设置教程")
        ),
        el(Box, { p: 4, borderWidth: 1, borderRadius: "md" },
          el(Text, { fontWeight: "bold", mb: 2 }, "添加服务器"),
          el(VStack, { spacing: 2 },
            el(Input, { placeholder: "服务器地址 (如 mc.hypixel.net)", value: newAddr, onChange: function (e) { setNewAddr(e.target.value); } }),
            el(HStack, { spacing: 2 },
              el(Input, { placeholder: "显示名称（可选）", value: newLabel, onChange: function (e) { setNewLabel(e.target.value); }, flex: 1 }),
              el(Input, { placeholder: "端口", value: newPort, onChange: function (e) { setNewPort(e.target.value); }, w: "100px", type: "number" })
            ),
            el(HStack, { spacing: 2, align: "center" },
              el(Select, { value: newTpsSource, onChange: function (e) { setNewTpsSource(e.target.value); }, flex: 1 },
                el("option", { value: "none" }, "TPS: 不使用"),
                el("option", { value: "custom" }, "TPS: 自定义HTTP端点")
              ),
              newTpsSource === "custom"
                ? el(Input, {
                    placeholder: "TPS API URL (如 http://服务器:25566/tps)",
                    value: newTpsEndpoint,
                    onChange: function (e) { setNewTpsEndpoint(e.target.value); },
                    flex: 2
                  })
                : null
            ),
            el(Button, { colorScheme: "blue", onClick: addServer, isDisabled: !newAddr.trim() }, "添加")
          )
        ),
        el(Box, { p: 4, borderWidth: 1, borderRadius: "md" },
          el(Text, { fontWeight: "bold", mb: 2 }, "自动刷新间隔"),
          el(Select, { value: interval, onChange: function (e) { refreshInterval[1](parseInt(e.target.value)); storageSet("interval", parseInt(e.target.value)); } },
            el("option", { value: 10 }, "10 秒"), el("option", { value: 30 }, "30 秒"),
            el("option", { value: 60 }, "1 分钟"), el("option", { value: 120 }, "2 分钟"),
            el("option", { value: 300 }, "5 分钟"), el("option", { value: 0 }, "仅手动刷新")
          )
        ),
        el(Box, { p: 4, borderWidth: 1, borderRadius: "md" },
          el(Text, { fontWeight: "bold", mb: 2 }, "监控的服务器 (" + servers.length + ")"),
          servers.length === 0
            ? el(Text, { fontSize: "sm", color: "gray.500", fontStyle: "italic" }, "暂无服务器，请在上面添加。")
            : el(VStack, { spacing: 3 },
                servers.map(function (s) {
                  var d = statusDataVal[s.address];
                  var td = tpsDataVal[s.address];
                  return el(Box, { key: s.address, p: 3, borderWidth: 1, borderRadius: "md" },
                    el(HStack, { justify: "space-between", mb: 2 },
                      el(HStack, { spacing: 2 },
                        el(Box, { w: 2, h: 2, borderRadius: "full", bg: d && d.online ? "green.400" : "red.400" }),
                        el(Box, null,
                          el(Text, { fontSize: "sm", fontWeight: "bold" }, s.label || s.address),
                          el(Text, { fontSize: "xs", color: "gray.500" }, s.address + (s.port !== 25565 ? ":" + s.port : ""))
                        )
                      ),
                      el(HStack, { spacing: 2 },
                        d && d.online ? el(Text, { fontSize: "xs", color: "green.500" }, d.players.online + "/" + d.players.max) : null,
                        el(Button, { size: "xs", colorScheme: "red", variant: "ghost", onClick: function (e) { e.stopPropagation(); removeServer(s.address); } }, "删除")
                      )
                    ),
                    el(HStack, { spacing: 2, align: "center" },
                      el(Select, {
                        size: "sm",
                        value: s.tpsSource || "none",
                        onChange: function (e) { updateServer(s.address, { tpsSource: e.target.value }); },
                        flex: 1
                      },
                        el("option", { value: "none" }, "TPS: 不使用"),
                        el("option", { value: "custom" }, "TPS: 自定义HTTP端点")
                      ),
                      s.tpsSource === "custom"
                        ? el(Input, {
                            size: "sm",
                            placeholder: "TPS API URL",
                            value: s.tpsEndpoint || "",
                            onChange: function (e) { updateServer(s.address, { tpsEndpoint: e.target.value }); },
                            flex: 2
                          })
                        : null,
                      td && td.tps !== null
                        ? el(Badge, { colorScheme: tpsColor(td.tps), fontSize: "xs" }, tpsLabel(td.tps))
                        : s.tpsSource === "custom"
                          ? el(Badge, { colorScheme: "gray", fontSize: "xs" }, "?")
                          : null
                    )
                  );
                })
              )
        )
      );
      function renderDetailModal() {
        if (!detailModal) return null;
        var s = detailModal.server;
        var d = detailModal.data;
        var td = detailModal.tps;
        var hist = detailModal.tpsHistory || [];
        return el(Box, {
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          bg: "blackAlpha.600", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          onClick: function () { setDetailModal(null); }
        },
          el(Box, {
            bg: "white", _dark: { bg: "gray.800" },
            borderRadius: "xl", maxW: "650px", w: "90%", maxH: "85vh", overflowY: "auto",
            p: 6, onClick: function (e) { e.stopPropagation(); }
          },
            el(HStack, { justify: "space-between", mb: 4 },
              el(Heading, { size: "md" }, s.label || s.address),
              el(CloseButton, { onClick: function () { setDetailModal(null); } })
            ),
            d && d.online
              ? el(VStack, { spacing: 3, align: "stretch" },
                  d.icon ? el(Image, { src: d.icon, boxSize: "64px", borderRadius: "md", alignSelf: "center" }) : null,
                  d.motd && d.motd.clean
                    ? el(Box, { textAlign: "center", p: 2, bg: "blackAlpha.100", borderRadius: "md" },
                        d.motd.clean.map(function (line, i) {
                          return el(Text, { key: i, fontSize: "md", fontFamily: "monospace" }, motdToClean([line]));
                        })
                      )
                    : null,
                  el(Divider, null),
                  el(HStack, { spacing: 4, wrap: "wrap" },
                    el(Box, null, el(Text, { fontSize: "xs", color: "gray.500" }, "状态"), el(Badge, { colorScheme: "green" }, "在线")),
                    el(Box, null, el(Text, { fontSize: "xs", color: "gray.500" }, "玩家"), el(Text, { fontWeight: "bold" }, d.players.online + " / " + d.players.max)),
                    d.latency != null
                      ? el(Box, null,
                          el(Text, { fontSize: "xs", color: "gray.500" }, "延迟"),
                          el(Text, { fontWeight: "bold", color: pingColor(d.latency) + ".500" }, d.latency + "ms")
                        )
                      : null,
                    d.version ? el(Box, null, el(Text, { fontSize: "xs", color: "gray.500" }, "版本"), el(Text, { fontSize: "sm" }, d.version.name)) : null
                  ),
                  td && (td.tps !== null || td.mspt !== null)
                    ? el(Box, { p: 3, borderWidth: 1, borderRadius: "md", bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.50" } },
                        el(Text, { fontWeight: "bold", fontSize: "sm", mb: 2 }, "服务器性能"),
                        el(HStack, { spacing: 6 },
                          el(Box, null,
                            el(Text, { fontSize: "xs", color: "gray.500" }, "TPS"),
                            el(Text, { fontSize: "xl", fontWeight: "bold", color: tpsColor(td.tps) + ".500" }, td.tps !== null ? td.tps.toFixed(2) : "N/A")
                          ),
                          td.mspt !== null
                            ? el(Box, null,
                                el(Text, { fontSize: "xs", color: "gray.500" }, "MSPT"),
                                el(Text, { fontSize: "xl", fontWeight: "bold" }, td.mspt.toFixed(1) + "ms")
                              )
                            : null,
                          td.tps !== null
                            ? el(Box, null,
                                el(Text, { fontSize: "xs", color: "gray.500" }, "状态"),
                                el(Badge, {
                                  colorScheme: td.tps >= 19.0 ? "green" : td.tps >= 15.0 ? "yellow" : "red",
                                  fontSize: "sm", p: 1
                                }, td.tps >= 19.0 ? "流畅" : td.tps >= 15.0 ? "卡顿" : "严重滞后")
                              )
                            : null
                        ),
                        hist.length >= 2
                          ? el(Box, { mt: 3 },
                              el(Text, { fontSize: "xs", color: "gray.500", mb: 1 }, "TPS 趋势（最近 " + hist.length + " 次采样）"),
                              el(TpsSparkline, { points: hist, width: 160, height: 32 })
                            )
                          : null
                      )
                    : s.tpsSource === "custom" && s.tpsEndpoint
                      ? el(Alert, { status: "info", borderRadius: "md", fontSize: "sm" },
                          el(AlertIcon, null), "TPS: 等待数据，请确保API端点可访问")
                      : null,
                  d.players && d.players.list && d.players.list.length > 0
                    ? el(Box, null,
                        el(Text, { fontSize: "xs", color: "gray.500", mb: 1 }, "在线玩家 (" + d.players.list.length + ")"),
                        el(Flex, { wrap: "wrap", gap: 1 },
                          d.players.list.map(function (p) {
                            return el(Tag, { key: p.name, size: "sm", colorScheme: "blue", variant: "subtle", m: 0.5 },
                              el(TagLabel, null, p.name)
                            );
                          })
                        )
                      )
                    : null
                )
              : el(Alert, { status: "warning", borderRadius: "md" },
                  el(AlertIcon, null), el(AlertTitle, null, "服务器离线"),
                  el(AlertDescription, null, d && d.debug ? d.debug.ping : "服务器未响应")
                ),
            el(Button, { mt: 4, w: "100%", variant: "ghost", onClick: function () { setDetailModal(null); } }, "关闭")
          )
        );
      }
            function renderTpsGuideModal() {
        if (!showTpsGuide) return null;
        return el(Box, {
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          bg: "blackAlpha.600", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          onClick: function () { setShowTpsGuide(false); }
        },
          el(Box, {
            bg: "white", _dark: { bg: "gray.800" },
            borderRadius: "xl", maxW: "600px", w: "90%", maxH: "85vh", overflowY: "auto",
            p: 6, onClick: function (e) { e.stopPropagation(); }
          },
            el(HStack, { justify: "space-between", mb: 4 },
              el(Heading, { size: "md" }, "TPS 监控设置指南"),
              el(CloseButton, { onClick: function () { setShowTpsGuide(false); } })
            ),
            el(VStack, { spacing: 4, align: "stretch" },
              TPS_GUIDE.map(function (item, i) {
                return el(Box, { key: i, p: 3, borderWidth: 1, borderRadius: "md", borderColor: "blue.200" },
                  el(HStack, { spacing: 2, mb: 1 },
                    el(Badge, { colorScheme: "blue", variant: "solid", borderRadius: "full", fontSize: "sm", minW: "24px", textAlign: "center" }, "" + (i + 1)),
                    el(Text, { fontWeight: "bold", fontSize: "sm" }, item[0])
                  ),
                  el(Text, { fontSize: "sm", color: "gray.600", _dark: { color: "gray.300" }, lineHeight: "tall" }, item[1])
                );
              }),
              el(Alert, { status: "info", borderRadius: "md", fontSize: "sm" },
                el(AlertIcon, null),
                "提示: 修改 TPS 配置后，请等待下一次自动刷新（或点击「刷新」按钮）即可看到 TPS 数据。"
              )
            ),
            el(Button, { mt: 4, w: "100%", variant: "ghost", colorScheme: "blue", onClick: function () { setShowTpsGuide(false); } }, "知道了")
          )
        );
      }
      
      var tabButtons = el(Flex, { mb: 4 },
        el(Button, {
          size: "sm", variant: tabIdx === 0 ? "solid" : "ghost", colorScheme: "blue",
          onClick: function () { setTabIdx(0); }, mr: 2
        }, "面板"),
        el(Button, {
          size: "sm", variant: tabIdx === 1 ? "solid" : "ghost", colorScheme: "blue",
          onClick: function () { setTabIdx(1); }
        }, "管理")
      );

      return el(Box, { p: 2 },
        tabButtons,
        el(Divider, { mb: 4 }),
        tabIdx === 0 ? panelView : settingsView,
        renderDetailModal(),
        renderTpsGuideModal()
      );
    }

    return {
      homeWidget: {
        title: "服务器监控",
        defaultWidth: 380,
        minWidth: 300,
        Component: HomeWidget
      },
      settingsPage: {
        Component: SettingsPage
      }
    };
  }, TOKEN);
})();
