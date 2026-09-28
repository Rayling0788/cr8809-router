# IPv6 试测（2026-09-28）

有线 PPPoE 已取得公网 IPv6 地址，但未收到下发给 LAN 的前缀，电脑只有 ULA 地址。
现有 mwan3 的 IPv6 HTTPS/default 规则引用无可用 IPv6 成员的策略，将流量标记为 unreachable。
临时按路由器源地址设置 IPv6 主路由标记后，公网 IPv6 可达；阿里 DNS IPv6 ping 3/3，平均 20.102 ms。

同一 USTC 镜像文件、有线出口、路由器 curl 单连接、每次 18 秒，内容丢弃不落盘：
- IPv4 HTTP 200，146669568 字节，平均 8.148 MB/s（65.18 Mbps）。
- IPv6 HTTP 200，151732206 字节，平均 8.429 MB/s（67.43 Mbps）。
- 约 3.45% 差异，单轮结果不足以证明突破校园限速，也不代表线路最高速度；路由器 TLS/CPU、镜像路径和背景流量都会影响。
- curl 28 是设置的 18 秒测试截止，不是下载失败。
- Cloudflare 测速接口两种协议均返回 HTTP 403，已排除，不作为速度证据。

所有临时 IPv4/IPv6 mangle 测试规则已删除，network/firewall/mwan3/dhcp 与试测前备份逐项相同；未修改电脑、DNS 或持久配置。
Git 试测前检查点：23ce587。
