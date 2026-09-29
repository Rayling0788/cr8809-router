# 校园 Wi-Fi 选择页面

本目录提供一个 LuCI 页面扩展，可扫描 2.4 GHz / 5 GHz 附近热点，分别选择两个频段的 SSID，并显示实际连接与启用状态。它使用现有 `campus.main.wifi_count`、`campus.main.single_wifi` 和 `campus-auth` 门户认证服务。

## 文件

- `files/www/luci-static/resources/view/campus/wifi-select-v4.js`：设置页面和扫描列表，使用新文件名避免浏览器加载旧缓存。
- `files/usr/libexec/rpcd/campus-wifi`：只允许设置两条预设 STA 接口之一的连接参数，并提供不含密码的状态查询。
- `files/usr/share/rpcd/acl.d/luci-app-campus-auth.json`：只开放热点扫描、只读连接状态和受限连接接口。
- `files/usr/share/luci/menu.d/luci-app-campus-auth.json`：LuCI 菜单入口。

路由器需提供 LuCI、rpcd 的 `iwinfo.scan` 方法、无线 STA 接口 `wwan2_radio1` / `wwan3_radio0`、`campus` 配置和现有 `campus-auth` 服务。只支持开放网络、WPA/WPA2-PSK、WPA3-SAE；企业认证网络不在此页面支持范围内。

## 安装

将 `files/` 内的路径按目录结构复制到路由器根目录，并执行 `chmod 0755 /usr/libexec/rpcd/campus-wifi`，然后刷新 rpcd/LuCI 菜单或重启路由器。原有页面升级前先备份。此源码不会自动连接路由器或更改运行中的配置。

在 LuCI 的“网络 → Wi-Fi 选择与校园认证”中扫描并选中热点。连接时会保存 SSID 和密码到 `/etc/config/wireless`，保持原有启用路数和频段开关，并重新加载无线网络和防火墙。无线重载期间管理 Wi-Fi 可能短暂中断；扫描也可能短暂影响对应频段。

两个频段分别显示“启用 / 未启用”、当前实际连接的 SSID、已保存的 SSID 和 IPv4 地址，每 5 秒刷新。未启用的频段可以预先保存热点；上方“启用的 Wi-Fi 数量”和单路频段选项仍负责开关，修改后需保存并应用。
