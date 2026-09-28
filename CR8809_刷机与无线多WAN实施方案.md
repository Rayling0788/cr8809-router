# CR8809：刷机与可调无线多 WAN 实施方案

版本：v1.2 Windows 与校园网条件确认版｜初始日期：2026-09-27（北京时间）｜本机证据更新：2026-09-28｜适用阶段：备份、核验、实施设计

**本机证据更新（2026-09-28）：** 已归档 2026-09-27 采集的原厂分区数据，见 `firmware/original-device/`。采集时系统报告 `Linux XiaoQiang 4.4.60`，兼容标识为 `qcom,ipq5018-mp02.1`；这与本文初始按“CR8809 A”整理的板型假设存在差异。本文后续涉及 A 版的刷写步骤仍未因此得到验证；先核实实物板型、分区布局和对应固件，不要照旧假设执行 Flash 写入。

本文主体记录 2026-09-27 编写时的方案和初始交接状态。“已查到”指来源文档或代码证据，“待确认”指仍需要本机输出、文件校验或实测。分区归档是逐分区备份，不是可直接上传到 U-Boot Web 或通过 `sysupgrade` 安装的整机镜像。

## 0. 桌面端 Codex 从这里接手

### 0.1 初始交接状态（2026-09-27）

| 事项 | 交接时的真实状态 |
|---|---|
| 需求、路线比较、命令骨架、下载来源 | 已整理在本文 |
| 操作电脑 | 用户已确认 Windows；网卡、网线直连及本地执行环境由桌面端检查 |
| 机身标签照片 | 已收到；标注 CR8809、中国电信定制、管理地址 router.ctc / 192.168.2.1；不能单靠标签确认 A/B 板型 |
| 校园接入及带宽条件 | 用户确认：有线输入账号密码拨号；2.4 GHz 与 5 GHz 校园 Wi-Fi 均经网页账号密码认证；三路分别获得带宽。尚未在本机实测 |
| 本机 SSH 是否开启 | 尚未收到成功日志，不能假定已开启 |
| 原厂全分区备份 | 尚未收到文件或清单，不能假定已完成 |
| 硬件/MTD/启动信息 | 尚未收到本机输出 |
| 系统候选 | kmiit 2026-07-16 14:58:15 UTC 预发布构建，尚未验收 |
| U-Boot 文件与版本 | 尚未取得并核验原作者附件 |
| 固件本地下载与 SHA256 实算 | 尚未完成；正文只列公布值 |
| 实际刷写或路由配置 | 本会话没有执行 |
| 双无线客户端、吞吐、校园认证 | 尚未实测；双频硬件是设计基础，不能当作驱动并发测试已通过 |
| LuCI 自定义页面 | 规格已定，代码尚未开发 |

### 0.2 接手时的工作环境

把本文下载到电脑的一个项目目录，例如 `CR8809-project`，让桌面端 Codex 打开该目录；以后把固件、备份清单、日志和核验结论保存在这个项目中。建议子目录：`downloads/`、`backups/`、`evidence/`、`reports/`、`luci/`。第二份原厂备份仍要放在不同存储位置。

用户已确认使用 Windows。电脑用网线连接 CR8809 LAN，连接状态由桌面端检查。桌面端必须实际运行在能够访问该路由器的本地环境；聊天记录同步不等于云端已经取得本地网络访问能力。检查网卡、实际路由器地址和 SSH 状态，不能把本文里的示例 IP 当成探测结果。

从原生 PowerShell 及 OpenSSH 开始。若使用 WSL，要额外确认 WSL 到路由器的路由和文件所在路径，不默认与 Windows 环境完全相同。

本机标签的原厂管理地址是 `router.ctc` / `192.168.2.1`；先通过直连 LAN 的网卡配置、默认网关和原厂页面确认当前地址。原教程的 `192.168.10.1` 不能直接替代本机原厂地址，也不能把原厂标签地址当作将来 U-Boot Web 或新固件的默认地址。标签上的 2.4G/5G 热点名属于本机出厂 AP，不是校园网的 SSID。照片内凭据、MAC、序列号不转录进方案或代码。

用户明确把 SSH 开启、完整备份、只读硬件与分区采集交给桌面端 Codex 执行，不再要求用户先手工完成后才能接手。管理密码、校园账号密码由用户在本机必要步骤输入。原厂固件版本也由桌面端从实际后台或只读信息采集。

### 0.3 桌面端第一轮任务

1. 阅读全文，概括已确认需求、当前缺口和禁止事项；不重新把所有路线当成未讨论过。
2. 在本地项目中记录系统与网络环境。只检查用户指定的路由器地址，不扫描整个校园网。
3. 检查 SSH；若尚未开启，按第 5 节协助用户运行 xmir-patcher。管理密码由用户在本机输入，不写进日志、方案或代码。
4. 完成第 6 节的全分区备份、逐项核对和第二份副本，再采集第 7 节的只读信息。
5. 下载第 4 节候选系统资料，实际计算校验值；获取原作者 U-Boot 附件。来源、版本、文件大小、公布哈希和实算哈希分栏记录。
6. 产出设备核验报告、原厂/目标布局对照、具体文件清单与恢复方案。任何缺口未解决，就停在这个报告阶段。
7. 只有用户明确批准核验后的具体刷写步骤，才能进入第 9 节及之后的写 Flash 阶段。

可直接发送给桌面端 Codex 的交接指令：

```text
请完整阅读项目里的《CR8809_A_刷机与无线多WAN实施方案.md》，按第 0 节接手。
目标：CR8809 A 做主路由，有线 WAN 始终启用，LuCI 可选 0/1/2 路无线 WAN，腾达保持原厂 AP。
电脑为 Windows。本机标签标注原厂管理地址 router.ctc / 192.168.2.1，先核实当前 LAN 地址，不套用教程的 192.168.10.1。
有线通过账号密码拨号，具体协议从实际配置确认；无线是网页 Portal 输入账号密码。两路校园无线分别用 2.4 GHz 和 5 GHz，用户确认两路各自获得带宽，有线与无线也分别限速。
双 STA 并发、每路独立认证和实际合计吞吐尚未在这台设备实测，需要后续验收；不要再次把独立带宽写成用户未提供的信息。
SSH 开启、备份和只读信息采集由你在本地执行；不要先要求用户手工采集。需要用户输入凭据或按实体按键时再说明具体操作。
目前没有验证过本机 SSH、备份和分区；不要把方案文字当成已执行结果。
现在先完成本地环境检查、SSH 开启、完整备份与副本校验、只读硬件/MTD采集、候选文件下载和哈希核验。
禁止猜测 MTD 编号；禁止现在执行 mtd write、mtd erase、ubiformat、安装固件或 Bootloader。
请把日志与核验报告存入项目，先给我设备/文件/恢复核验结果；实际写 Flash 前提交具体命令和目标分区，等我明确确认。
```

## 1. 用户需求与成功标准

### 1.1 已明确的设备和网络条件

- 主路由：CR8809，用户确认 A 版，目前完全原厂。真正写 Flash 前仍需结合板型信息、启动日志、分区布局核实，不只看 CPU 字符串。
- 已收到机身标签照片，确认标注型号 CR8809，原厂管理地址 `router.ctc` / `192.168.2.1`。照片不构成 M79 A/M81 或非 B 版的充分证据；当前固件版本、实际管理地址仍由桌面端采集确认。
- 操作电脑为 Windows。SSH、备份和只读硬件采集由桌面端 Codex 处理。
- 第二台：腾达 AX3000，保持原厂，后续使用 AP 模式，通过网线连接 CR8809 LAN，给手机、电脑提供 Wi-Fi。腾达的完整型号尚待补充。
- 校园有线和校园无线分别限速；用户进一步确认 2.4 GHz 和 5 GHz 两路无线也各自获得带宽。方案据此按三路独立带宽规划，不反复要求用户确认同一条件；实际吞吐和稳定性仍属部署验收。
- 校园有线通过输入账号密码拨号；按 PPPoE 作为待核实配置方向，具体协议和附加参数从现有连接/原厂后台确认。
- 校园无线连接后弹出网页，输入账号密码完成 Portal 认证。两路分别使用学校的 2.4 GHz 和 5 GHz Wi-Fi；SSID/BSSID、无线链路加密方式、真实 Portal 地址与认证实现由本地接入时采集，不猜测为某一厂商协议。
- 本次明确：可调的是“无线 WAN 的数量”，有线 WAN 始终保留、始终启用。

### 1.2 三种工作模式

| 页面按钮 | 无线 WAN 数量 | 参与线路 | 故障时的预期行为 |
|---|---:|---|---|
| 仅有线 | 0 | WAN1 有线 | WAN1 故障则无外网；不擅自开启无线 |
| 有线 + 1 路无线 | 1 | WAN1 + WAN2 | 健康线路承担新连接；故障线路恢复后重新加入 |
| 有线 + 2 路无线 | 2 | WAN1 + WAN2 + WAN3 | 在已启用且健康的线路间分配新连接 |

“有线始终连接”在实现中表示：页面不能删除或关闭 WAN1，系统保留自动拨号和重连；物理断线、学校侧故障时无法保证它仍在线。mwan3 可以暂时不向失效的 WAN1 分配连接，但不能把 WAN1 配置关闭。

### 1.3 LuCI 页面必须提供

- 三个明显的模式按钮；可选择单无线模式优先使用哪一路已配置无线，默认优先经测试更稳定的一路。
- 每路显示：启用/停用、关联或链路状态、认证状态（可识别时）、健康状态、IPv4、实时上传/下载、参与调度情况。
- 无线额外显示：SSID、BSSID、频段、信号强度、重连状态；不回显密码。
- 显示当前目标模式、实际健康线路数、mwan3 服务状态、当前策略、主路由表默认出口。
- 可调各路权重；“已配置负载均衡”与“确有多路流量”分别显示。
- 保存模式，重启后按保存的模式恢复；首次部署默认仅有线。
- 网络接口、成员、策略提前配置，不以删除/重建接口切换模式。
- 当第二路无线尚未通过验证时，“+2”禁用并说明原因，不能显示虚假的成功。

### 1.4 边界

mwan3 按连接/流调度，不能把单个普通 TCP 连接变成跨线路 Bonding。双路总吞吐能否接近两路带宽之和，需要多连接、多设备测试，并受信号、CPU 和上游共享瓶颈影响。[S10]

用户已确认有线、2.4 GHz 无线、5 GHz 无线分别获得带宽，作为本方案的网络条件。**三路独立带宽不等于这台路由器已经通过三路并发验收**；实际总吞吐仍需多连接测试，不承诺一定达到标称速率之和。

## 2. 推荐路线与其他路线的取舍

| 路线 | 与本项目的关系 | 决定 |
|---|---|---|
| 改 Redmi AX3000 官方固件 | 难以满足自定义 LuCI 和 mwan3 扩展目标 | 不选作主路线 |
| 集客 AP | 适合 AP 用途，CR8809 需要做主路由 | 不选；腾达负责 AP |
| 保持原厂布局直接写另一系统分区 | 对 Bootloader 改动较少，但教程报告剩余空间有限 | 保留为替代路线，需按实际镜像评估空间 |
| 大分区 U-Boot + 专用 OpenWrt | 可满足路由与扩展需求 | 备选，不因名称而排除 |
| 大分区 U-Boot + 专用 ImmortalWrt | 符合扩展目标，存在对应设备构建 | 优先核验路线，文件尚未批准刷入 |

大分区解决的是可用 Flash 空间，不增加 RAM，不自动提高处理器或 NAT 性能。mwan3 和一个简单页面本身不一定需要大量空间；选择大分区主要是为额外软件与后续维护留余量。必须把它与改分区、改 Bootloader 带来的恢复成本一起权衡。

系统首选候选：kmiit 的 `redmi_ax3000-24.10`，构建 `ci-redmi_ax3000-24.10-20260716-145815-UTC`。该构建为 **Pre-release**，属于候选，不标为已实测稳定版。[S3]

后续版本的选择依据包括：无线功放类型对应板级参数修复、RSSI 读取修复；旧版存在软件源失效报告。代码修复不等于本机验证完成。该仓库已归档，需要保存配套构建资料和软件包，不能假设它会继续维护。[S3–S7]

U-Boot 独立选型，不能因系统选了新版本就自动替换更新的 Bootloader。

## 3. 两路无线 WAN：必须先承认的硬件限制

**对“这台 CR8809 能否同时连接多个 Wi-Fi”的当前回答：有线 + 一路无线是第一阶段实施目标；有线 + 两路无线具有双频分别做 STA 的设计基础，但没有本机或该固定构建的双 STA 实测证据，不能写成已经确认支持。** 两路扩展必须在同一台设备上验证，不能用“2.4 GHz 单独可用、5 GHz 单独可用”代替并发测试。2×2 MIMO 或天线数量也不等于独立无线 WAN 数量。

优先验证的分配方式：

| 名称 | Linux 逻辑接口规划 | 接入方式 | 默认用途 |
|---|---|---|---|
| WAN1 | `wan`（优先保留系统已有名称） | 有线拨号 | 始终启用 |
| WAN2 | `wwan2` | 5 GHz STA 接校园 Wi-Fi，独立 Portal 认证 | 第一路无线；+1 模式可改选另一路 |
| WAN3 | `wwan3` | 2.4 GHz STA 接校园 Wi-Fi，独立 Portal 认证 | 第二路无线 |
| LAN | `lan` / 实际 LAN 桥 | 网线至腾达 AP、管理电脑 | DHCP 与管理 |

STA 就是路由器像手机一样连接上游 Wi-Fi。“无线 WAN 口”是逻辑接口，不是多出来的物理网口。

- `radio0` 不一定是 2.4 GHz，`radio1` 不一定是 5 GHz；通过 `iw list`、`iw dev` 和 LuCI 确认后填写映射。
- 能创建多个虚拟接口，不代表能同时连接任意多个 AP。驱动对接口类型、数量和并发信道数都有约束。[S11]
- 如果只有一颗 5 GHz 无线电，不承诺同时连接两个不同信道的 5 GHz 校园 AP。
- 两颗无线电各用一个 STA，是本项目优先验证的方法；仍需测试该固件同时运行两个客户端是否稳定。
- 两路无线若获取相同或重叠子网，甚至相同地址/网关，不能仅靠修改 metric 宣称解决。先记录结果，再处理路由隔离；严重冲突时暂不开启第二路。
- 同名 SSID 可能对应不同频段/BSSID。可提供选择频段和可选固定 BSSID，固定后会牺牲部分漫游能力。
- CR8809 尽量专用于无线接入学校，终端无线由腾达承担，减少同一无线电同时做 STA/AP 的复杂度。
- 如果双 STA 不成立，保留“有线 + 一路无线”；第三路需要另加能独立做客户端的设备，经网线接入隔离接口。腾达继续保持 AP 角色，不擅自占用它。

## 4. 下载清单、来源与校验

### 4.1 必需和候选下载

| 项目 | 链接 | 状态与用途 |
|---|---|---|
| 原教程 | https://www.right.com.cn/forum/thread-8444159-1-1.html | 流程参考，原文及公开回复已研究 |
| 大分区 U-Boot 原帖 | https://www.right.com.cn/forum/thread-8275543-1-1.html | 从原作者附件获取；不能用不明镜像替代 |
| xmir-patcher 项目 | https://github.com/openwrt-xiaomi/xmir-patcher | SSH 开启和全分区备份 |
| xmir-patcher 当前源码 ZIP | https://github.com/openwrt-xiaomi/xmir-patcher/archive/refs/heads/main.zip | main 会变化，下载后记录日期、版本/提交和 SHA256 |
| 候选固件发布页 | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/tag/ci-redmi_ax3000-24.10-20260716-145815-UTC | 2026-07-16 后一个构建，预发布 |
| 候选 factory UBI | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/immortalwrt-qualcommax-ipq50xx-redmi_ax3000-squashfs-factory.ubi | 初次经匹配的 U-Boot Web 安装候选 |
| 同版本 sha256sums | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/sha256sums | 对照发布页和本地计算值 |
| 同版本软件包清单 | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/immortalwrt-qualcommax-ipq50xx-redmi_ax3000.manifest | 检查镜像自带哪些软件 |
| 同版本构建配置 | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/config.buildinfo | 记录构建配置 |
| 同版本 feeds 记录 | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/feeds.buildinfo | 记录包仓库提交 |
| 同版本设备资料 | https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/profiles.json | 核查设备定义与镜像资料 |

发布页提供上述构建的镜像及资料名称。直链按该固定 Release 的附件路径列出；本次没有验证每个附件的实际下载字节。直链打不开时回到同一 Release 的 Assets，不能转而下载一个名字相近的其他设备镜像。

**U-Boot 下载还存在明确缺口：**当前没有经过验证的附件直链、归档文件和权威校验值。必须从原帖取得明确适配 CR8809 A / 对应 M79 A 或 M81 的附件，检查其说明。不能编造 `MIBIB.bin`、`APPSBL.bin`、`APPSBL1.bin` 的 SHA256，也不能把同名文件视为同版本。用户提供附件后才进入文件级核验。

Windows 优先使用系统自带 OpenSSH、PowerShell，无需额外下载 SSH 工具。若系统没有 SSH 客户端，可在 Windows“可选功能”安装 OpenSSH 客户端。

### 4.2 候选 factory 镜像的公布 SHA256

文件名：`immortalwrt-qualcommax-ipq50xx-redmi_ax3000-squashfs-factory.ubi`

构建：`ci-redmi_ax3000-24.10-20260716-145815-UTC`

```text
897fd05dd6584e820aeb99905191dd8532564758c12db486e8041625d00797e7
```

这是发布页公布值，不是本次下载后实算值。SHA256 相符说明与该发布物一致，不能单独证明发布者可信或硬件适配。[S3]

### 4.3 可选归档，不作为初次刷机文件

- 同版本 sysupgrade：
  https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/immortalwrt-qualcommax-ipq50xx-redmi_ax3000-squashfs-sysupgrade.bin
- 同版本 SDK（后续打包插件按需下载）：
  https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/immortalwrt-sdk-qualcommax-ipq50xx_gcc-13.3.0_musl.Linux-x86_64.tar.zst
- 同版本 ImageBuilder（只有确认可取得配套包时才可用于定制）：
  https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC/immortalwrt-imagebuilder-qualcommax-ipq50xx.Linux-x86_64.tar.zst
- 教程旧版本发布页，仅作对照：
  https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/tag/ci-redmi_ax3000-24.10-20250228-140825-UTC
- OpenWrt 专用构建备选项目：
  https://github.com/hzyitc/openwrt-redmi-ax3000

不要把 factory UBI、sysupgrade、initramfs 和 U-Boot 文件混用。不要依靠 LuCI 的“镜像检查通过”就断言跨布局升级可行。

## 5. 阶段 A：准备电脑、开启 SSH

1. 电脑用网线接 CR8809 LAN，使用稳定电源；记录现在的原厂管理地址和固件版本。
2. 刷机维护时断开校园网侧连接；只留必要管理连接，避免管理网段冲突。
3. 下载并完整解压 xmir-patcher，运行 `run.bat`。[S8]
4. 根据菜单文字选择设置地址。教程菜单为 `1`，填本机实际地址；本机标签为 `192.168.2.1`，先核实可访问的原厂后台。教程示例 `192.168.10.1` 不直接套用。
5. 返回菜单选连接设备/开启 SSH。教程和当前菜单为 `2`，按提示输入原厂管理密码。
6. 等待成功提示。教程给出的 SSH 用户名/密码为 `root` / `root`，但实际凭据以工具输出为准，不反复猜密码。
7. 本阶段不选择安装固件、安装 Bootloader、永久 SSH 或其他与当前备份无关的菜单。工具版本变动时看菜单文字，不能只记数字。

在 Windows PowerShell 中测试登录（仅当实际后台地址已确认为标签的 `192.168.2.1`；否则替换为核实值）：

```powershell
ssh root@192.168.2.1
```

SSH 开启本身可能改变系统设置/NVRAM；这里的“只检查”是指不执行 Flash 刷写或分区改造，不应把开启 SSH 描述成绝对无修改操作。

## 6. 阶段 B：完整备份并校验

返回 xmir-patcher，选择 `4 - Create full backup`。目录应在解压目录下的 `backups/` 或其设备子目录中，按实际输出定位。[S8]

不能只看最后的 Completed：当前备份代码逐个处理分区，某个分区失败后仍可能继续并显示完成。要核对每个分区对应文件、大小和日志。[S9]

在电脑 PowerShell 中进入实际备份目录后，生成文件清单和哈希（只写电脑上的 CSV）：

```powershell
$backupRoot = (Get-Location).Path
$rows = Get-ChildItem -LiteralPath $backupRoot -Recurse -File -Filter *.bin |
    ForEach-Object {
        [pscustomobject]@{
            File = $_.FullName.Substring($backupRoot.Length).TrimStart('\')
            Bytes = $_.Length
            SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
$rows | Export-Csv -LiteralPath .\backup_manifest.csv -NoTypeInformation -Encoding UTF8
$rows | Format-Table -AutoSize
```

核验要求：

- 逐项与 `/proc/mtd` 对照，不因文件名去掉标点就误认为少分区。
- `/proc/mtd` 的 size 是十六进制；例如 PowerShell `[Convert]::ToInt64('00800000', 16)` 可换算字节数。
- 文件不能为空，常规分区导出应与分区容量对应；有大小差异、报错、ECC/坏块异常时先调查。
- 保存 xmir 日志、硬件信息、原始 `/proc/mtd`、启动参数和偏移信息。
- 备份里包含本机 MAC、无线校准、配置等；不要用别人机器的校准分区替代。
- 再复制一份到另一块存储，核对副本哈希相同；保留备份原件，不用刷机文件覆盖。
- 正在运行的系统分区可能变化；重要配置和校准分区优先核实。全分区导出通常不等于包含 OOB/ECC 的编程器原始 NAND 镜像，不能承诺凭它就能直接编程器全片回写。

## 7. 阶段 C：原厂 SSH 只读信息采集

以下命令在路由器 SSH 中逐条执行，保留完整输出；缺文件或缺命令时记录错误，不安装工具、不改设置来“凑输出”。

```sh
cat /proc/cpuinfo
cat /proc/device-tree/model
cat /proc/mtd
cat /proc/cmdline
cat /proc/meminfo
uname -a
dmesg
nvram get wl_pa_type
nvram get flag_boot_rootfs
nvram get flag_last_success
```

可选，只读补充：

```sh
cat /etc/xiaoqiang_version
cat /etc/openwrt_release
mount
df -h
command -v mtd
command -v sha256sum
command -v md5sum
```

读取 sysfs 中 MTD 元数据；`offset` 若不存在，就用 dmesg 中的地址区间补充：

```sh
for part in /sys/class/mtd/mtd[0-9]*; do
    [ -d "$part" ] || continue
    printf '\n%s\n' "$part"
    for key in name size erasesize writesize offset; do
        if [ -r "$part/$key" ]; then
            printf '%s=' "$key"
            cat "$part/$key"
        fi
    done
done
```

不得只用 `flag_boot_rootfs` 或 CPU 字符串判断；以启动参数中的 `ubi.mtd`、挂载信息和日志相互校验。`ubi.mtd` 可能是名称或编号，不强行按一种形式解析。

应形成以下核验表，未填齐不写 Flash：

| 需要确认的对象 | 原始分区名 | 原厂 mtd 编号 | 起始偏移/大小 | 证据 | 备份文件与 SHA256 |
|---|---|---|---|---|---|
| MIBIB | 待实测 | 待实测 | 待实测 | /proc/mtd + 日志/元数据 | 待填 |
| 主 APPSBL | 待实测 | 待实测 | 待实测 | 同上 | 待填 |
| 备用引导 | 待实测，不能先认定名叫 APPSBL1 | 待实测 | 待实测 | 同上 | 待填 |
| rootfs | 待实测 | 待实测 | 待实测 | 加 cmdline/挂载信息 | 待填 |
| rootfs_1 | 待实测，可能布局不同 | 待实测 | 待实测 | 同上 | 待填 |
| 无线校准/工厂信息 | 按本机实际列出全部相关分区 | 待实测 | 待实测 | 日志和板型资料 | 待填 |

如果无法从软件信息唯一识别 M79 A / M81，需要补充可靠板号/主板资料；不为了继续而套用教程的编号。

## 8. 阶段 D：下载、文件校验和刷写前确认单

### 8.1 在电脑下载候选镜像并核对公布值

在存放固件的目录打开 PowerShell。以下只下载到电脑，不操作路由器：

```powershell
$releaseBase = 'https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/download/ci-redmi_ax3000-24.10-20260716-145815-UTC'
$firmwareName = 'immortalwrt-qualcommax-ipq50xx-redmi_ax3000-squashfs-factory.ubi'
Invoke-WebRequest -Uri "$releaseBase/$firmwareName" -OutFile $firmwareName
Invoke-WebRequest -Uri "$releaseBase/sha256sums" -OutFile 'sha256sums'
$expected = '897fd05dd6584e820aeb99905191dd8532564758c12db486e8041625d00797e7'
$actual = (Get-FileHash -LiteralPath $firmwareName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw '固件 SHA256 不一致，停止使用该文件。' }
Get-Item -LiteralPath $firmwareName | Select-Object Name,Length
Write-Output $actual
```

如果 sha256sums 获取失败，先回发布页核对，不忽略异常。不要把 GitHub 网页另存为 `.zip` 或 `.ubi`。

### 8.2 U-Boot 文件

从已确认的原作者附件解压出实际文件；名称可能与示例不同，必须依说明核验。电脑计算哈希示例：

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\MIBIB.bin, .\APPSBL.bin, .\APPSBL1.bin
Get-Item -LiteralPath .\MIBIB.bin, .\APPSBL.bin, .\APPSBL1.bin | Select-Object Name,Length
```

若附件没有公布哈希，自己算出的值只能固定本次文件身份，不能宣称已完成作者侧真实性验证。要保留来源、附件说明、大小和版本，并检查适用板型与目标分区容量。

### 8.3 每次写入前必须列出的内容

| 项目 | 必须填入的事实 |
|---|---|
| 输入文件 | 完整文件名、字节数、SHA256、下载来源及版本 |
| 目标 | 真实 `/dev/mtdN`、完整分区名、偏移、容量 |
| 对应依据 | 本机当次分区输出 + 对应 U-Boot 版本说明 |
| 预期改动 | 修改分区表或主/备用引导的具体作用 |
| 验证方法 | 写入返回结果和针对本机 NAND 的读回/验证方法 |
| 失败恢复 | 当前启动状态下能使用的恢复通道、原厂文件与步骤 |

需要用户看到填好的确认单后明确允许进入实际写入；本次要求“写一个方案”不视为已批准执行 Flash 写入。

## 9. 阶段 E：大分区和 U-Boot 刷写流程模板

本节所有 Flash 命令均被注释，不能整段复制后去掉注释执行。不得填入教程示例编号。命令只是对应原教程路线的语法骨架，须以最终下载的 Bootloader 说明确认顺序。

### 9.1 上传与再次核对

Windows OpenSSH 的 SCP 示例。`-O` 表示旧 SCP 协议，可兼容部分没有 SFTP 的原厂系统；若客户端不支持 `-O` 或协商报错，记录错误后处理，不全局关闭 SSH 安全检查。

```powershell
# 后续阶段：先核验文件，再将实际地址填入。
# scp -O .\MIBIB.bin root@实际原厂IP:/tmp/MIBIB.bin
```

上传后，路由器只读核对：

```sh
ls -l /tmp/MIBIB.bin
sha256sum /tmp/MIBIB.bin
cat /proc/mtd
cat /proc/cmdline
```

如果原厂没有 sha256sum，不要随意安装陌生可执行文件；用已有 md5sum 校验传输一致性，电脑也计算 MD5，同时保留电脑 SHA256 与来源对照。MD5 仅用于这里的传输核对。

### 9.2 第一写入点：MIBIB

```sh
# 仅当对应文件、目标分区及恢复方案都确认后，生成本机专用命令：
# mtd write /tmp/MIBIB.bin /dev/mtd<本机已确认的MIBIB编号>
```

执行人员必须检查返回码、错误输出和适用于本机的写后验证。不能因为终端出现某一行文字就继续；失败后不自动重启、不重复盲写。

教程路线在这之后重启，但只有核验过“新 MIBIB 与当前原厂系统能完成这个中间启动状态”后，才按选定版本说明执行：

```sh
# 仅属于通过核验的后续步骤：
# sync
# reboot
```

### 9.3 重启后的强制重新核验

1. 重新 SSH 连接并读 `/proc/mtd`、`/proc/cmdline`、dmesg、sysfs 元数据。
2. 建立“改分区后”的第二张分区表；不要沿用旧编号或旧偏移。
3. 如果与预期布局不同，停止，不写 APPSBL。
4. `/tmp` 是易失目录，重启后此前上传的文件通常不存在，必须重新上传并重新校验。

```powershell
# 仅后续阶段：地址按重启后实际地址替换。
# scp -O .\APPSBL.bin .\APPSBL1.bin root@实际管理IP:/tmp/
```

```sh
ls -l /tmp/APPSBL.bin /tmp/APPSBL1.bin
sha256sum /tmp/APPSBL.bin /tmp/APPSBL1.bin
cat /proc/mtd
```

### 9.4 第二、第三写入点：主引导与备用引导

必须先确认附件里两个文件各自对应哪个真实分区；不能只因为文件叫 APPSBL1 就认定本机备用分区也同名。

```sh
# 以下分别审核、分别执行、分别验证，不能拼成自动连续刷写脚本：
# mtd write /tmp/APPSBL.bin /dev/mtd<改分区后确认的主引导编号>
# mtd write /tmp/APPSBL1.bin /dev/mtd<改分区后确认的备用引导编号>
```

写第一个出错就停止，不接着写第二个。NAND 的坏块、ECC 和 mtd 工具处理方式会影响读回比较，未确认前不能把普通整分区哈希与一个短镜像哈希直接比较。

本路线不需要用户额外执行 `mtd erase`、`ubiformat`。不使用教程中硬编码 rootfs 编号的自动软刷脚本。

## 10. 阶段 F：通过 U-Boot Web 安装系统

以下地址和按键时长来自教程；以最终选定 U-Boot 的说明为准。

1. 写入和验证全部成功后，按该 U-Boot 文档进入恢复界面：通常断电、按住 Reset、通电、保持约 10 秒。
2. 电脑网线直连指定 LAN 口，断开其他网络；如 U-Boot 不提供 DHCP，电脑临时设 `192.168.10.2/24`，网关/DNS可留空。
3. 访问 http://192.168.10.1 。先确认页面身份、上传类型及设备说明。
4. 在固件上传入口选择已核验的 `...squashfs-factory.ubi`。不要选 sysupgrade、不要选 U-Boot 更新入口。
5. 等待写入完成及设备重启，不在写入中断电；以页面完成状态和后续启动为准，不用固定短倒计时猜测。
6. 电脑改回 DHCP；若镜像默认地址确为教程中的 `192.168.1.1`，访问 http://192.168.1.1 。否则根据该构建资料确认地址。
7. 教程给出的密码 `password` 不是所有构建的通用密码；按所选构建说明处理，第一次登录后设置自己的管理密码。

**能进 U-Boot Web 只能证明当前 Bootloader 可运行；尚不能证明恢复原厂流程完整。** 原厂恢复镜像、分区还原顺序和校准数据保护必须在第 8 节提前核对。

## 11. 阶段 G：新系统检查与软件包

先由网线管理电脑完成检查，不急着接校园网和腾达。

```sh
ubus call system board
cat /etc/openwrt_release
uname -r
cat /proc/mtd
cat /proc/cmdline
df -h
free -m
ip -br link
ip -4 addr
ip -4 route
ubus call network.interface dump
ubus call network.wireless status
iw dev
iw list
logread
```

若 `ip -br` 或 `free -m` 不支持，用 `ip link`、`cat /proc/meminfo` 代替，不因缺少显示选项判为硬件故障。

确认：系统版本与刷入版本一致；LAN/WAN 端口映射；overlay 可用空间；两频段驱动；校准数据读取；没有持续无线崩溃、异常重启或严重 NAND 错误。

检查软件源和已装组件：

```sh
cat /etc/opkg/distfeeds.conf
opkg print-architecture
opkg list-installed
command -v fw4
command -v fw3
iptables -V
```

这里按候选 24.10 的 opkg 设计；如果最终选了其他版本且包管理器不同，停下来重新生成安装指令，不能直接套用。

接通并完成有线认证后，核验包源：

```sh
opkg update
opkg info mwan3
opkg info luci-app-mwan3
```

有 404、签名错误、内核 ABI 不匹配就先解决；禁止 `--force-depends` 强装 kmod、禁止批量 `opkg upgrade`，禁止把某个官方新版本的软件源硬套到这个第三方构建。

仅在源和依赖确认后执行：

```sh
opkg install mwan3 luci-app-mwan3
```

传统 mwan3 与 firewall4/nftables 组合需要匹配的 iptables 兼容组件。安装前检查该分支的依赖和实际 `iptables -V`；若需要 `iptables-nft` / `ip6tables-nft` 等，应从同版本配套源取得，先解决已有后端冲突，不同时盲装多套。[S10]

本项目已确认网页 Portal 认证；先检查真实登录流程再选择认证程序，不因出现账号密码就假定为 WPA2/WPA3 Enterprise。无线链路本身是否开放或加密仍由扫描结果确认；只有实际存在 Enterprise/EAP 时才核对相应 wpad 变体。更换 wpad 可能中断无线，须保留有线管理。

软件源长期保存建议：归档镜像、校验文件、manifest、构建配置、所需 `.ipk` 及完整依赖、SDK/源码版本。ImageBuilder 和 SDK 本身不能代替全部配套软件包。

## 12. 阶段 H：网络接口与校园认证

### 12.1 有线先单独稳定

修改网络前，在已经安装好的目标系统保存一次配置快照（这不是原厂全分区备份）：

```sh
sysupgrade -b /tmp/cr8809-before-multiwan.tar.gz
ls -l /tmp/cr8809-before-multiwan.tar.gz
```

电脑下载到当前目录（替换为新系统实际 LAN 地址）：

```powershell
# scp -O root@实际新系统LAN地址:/tmp/cr8809-before-multiwan.tar.gz .\
```

配置包可能包含拨号和无线凭据，应私下保管。以后回滚只使用与当时固件兼容的配置包，不把原厂配置包灌入 ImmortalWrt，也不跨大版本强行恢复。

- 优先保留现有 `wan` 名称，只配置实际有线设备和学校拨号方式；`eth0`、`wan` 物理端口和 VLAN 不能凭空假设。
- 在 LuCI 输入账号密码，验证拨号、DNS、重连；不要把真实凭据贴进公开方案。
- 网络默认路由 metric 规划：`wan=10`、`wwan2=20`、`wwan3=30`；具体生效还受 mwan3 策略影响。
- 首期只做 IPv4 多 WAN。IPv6 要么明确固定走有线并单独验收，要么先不向 LAN 提供；不能任由它绕开页面所表达的模式。

### 12.2 分别建立两路无线客户端

在 LuCI“网络 → 无线”里，确认实际频段后扫描、加入校园网络，模式选择客户端（STA），分别绑定 `wwan2`、`wwan3`；不要桥接到 `lan`。

以下只是配置结构参考，不是覆盖整个配置文件的命令：

```uci
# /etc/config/network 中新增的逻辑接口；首次配置先不自动启动
config interface 'wwan2'
    option proto 'dhcp'
    option auto '0'
    option metric '20'

config interface 'wwan3'
    option proto 'dhcp'
    option auto '0'
    option metric '30'
```

```uci
# /etc/config/wireless 结构模板：替换 radio 名、SSID、加密方式后才可应用
config wifi-iface 'sta_wwan2'
    option device 'REPLACE_WITH_ACTUAL_5G_RADIO'
    option mode 'sta'
    option network 'wwan2'
    option ssid 'REPLACE_WITH_CAMPUS_SSID'
    option encryption 'REPLACE_WITH_ACTUAL_SECURITY'
    option disabled '1'

config wifi-iface 'sta_wwan3'
    option device 'REPLACE_WITH_ACTUAL_2G_RADIO'
    option mode 'sta'
    option network 'wwan3'
    option ssid 'REPLACE_WITH_CAMPUS_SSID'
    option encryption 'REPLACE_WITH_ACTUAL_SECURITY'
    option disabled '1'
```

不要把这两个配置中的占位值直接保存为有效配置。开放网络的 `encryption` 通常为 `none`；需要密钥或 EAP 时按实际填入对应字段。无线电国家码使用实际所在地，不用伪造区域解锁功率/信道。

启用一路并验证后再启用另一路。先记录每路地址、掩码、网关、DNS、BSSID、频段，检查子网冲突，再进入多 WAN。

### 12.3 防火墙与认证

- `wwan2`、`wwan3` 放入合适的 WAN 防火墙区域，允许 LAN 向外转发，IPv4 按需要做 NAT；不加入 LAN 桥。
- 保持外网区域入站默认拒绝，保留必要 DHCP 等规则；不把 LuCI/SSH 放开给整个校园内网。
- DHCP 获取 IP 只证明接入成功，不代表校园认证成功。页面应把“未认证”和“离线”区分开（如果能可靠检测）。
- 每路认证进程绑定相应接口/源地址，必要时为认证服务器配置明确路由。路由器本机发出的认证、DNS、保活流量同样需要核对出口。
- Portal 登录地址从真实登录流程获取，不在方案里猜测协议、参数或凭据。
- 分别确认每路单独访问互联网，然后再测试并行登录是否互相影响。
- 同属私网地址段不证明校园终端可以访问路由器 WAN IP。后续单独测试 VLAN/ACL/客户端隔离；需要远程管理时仅允许可信来源或部署经过验证的 VPN 入口。

### 12.4 双 Portal 的实施要求

已知登录形式为网页输入账号密码，但尚未取得具体 Portal 协议。先在 Windows 正常接入校园 Wi-Fi，记录实际跳转地址、页面或认证程序所需参数；不得把页面外观当成某厂商协议的充分证据。用户在本机输入凭据，方案、日志和代码仓库不保存明文密码、会话令牌或未经清理的浏览器抓包。

两路认证应分别维护接口、源 IP、会话状态、Cookie/令牌与保活状态。即使使用同一账号，也不能把 WAN2 的成功状态直接赋给 WAN3。只有取得学校允许的客户端方式或核验真实登录流程后，才编写对应认证适配；当前不虚构通用登录脚本。

首次分别验证单路登录，再验证两路并存。认证请求和状态检测必须从对应无线接口出去；管理电脑能打开网页、或有线仍能访问互联网，不能代替无线已认证的证据。页面应显示每路“未关联 / 已取址待认证 / 已认证可用 / 故障”，只在认证与健康检测成功后把该路加入负载均衡。

掉认证时对对应线路重新认证并限制重试频率；关闭一路时停止其保活。若调用 Portal 注销接口，先确认它只影响该会话，避免把另一路也注销。涉及验证码或人工确认时保留明确的用户操作入口，不承诺全自动登录。后续新增或修改任何认证程序仍需在实机验证出口和会话隔离。

## 13. 阶段 I：mwan3 策略与诊断命令

### 13.1 配置原则

| 层级 | 规划 |
|---|---|
| network 接口 metric | 10、20、30，区分普通默认路由 |
| mwan3 member metric | 参与同一均衡策略的成员均设为 1 |
| member weight | 初始 1:1 或 1:1:1；按实际带宽调整 |
| 健康检测 | 每路多个经测试可达的目标，避免只检测校园网关 |
| 防抖 | 连续失败再判离线、连续成功再恢复，参数由学校网络实测调整 |
| 特殊业务 | 登录、校园资源及对出口敏感的业务使用明确规则或固定出口 |

下面是策略部分示例，前提是三个同名 mwan3 interface 段和健康检测已经配置好。实际使用前先检查默认配置里的其他规则顺序，避免旧规则提前匹配。

```uci
config member 'wan_m1_w1'
    option interface 'wan'
    option metric '1'
    option weight '1'

config member 'wwan2_m1_w1'
    option interface 'wwan2'
    option metric '1'
    option weight '1'

config member 'wwan3_m1_w1'
    option interface 'wwan3'
    option metric '1'
    option weight '1'

config policy 'only_wired'
    list use_member 'wan_m1_w1'
    option last_resort 'unreachable'

config policy 'wired_wifi2'
    list use_member 'wan_m1_w1'
    list use_member 'wwan2_m1_w1'
    option last_resort 'unreachable'

config policy 'wired_wifi3'
    list use_member 'wan_m1_w1'
    list use_member 'wwan3_m1_w1'
    option last_resort 'unreachable'

config policy 'wired_two_wifi'
    list use_member 'wan_m1_w1'
    list use_member 'wwan2_m1_w1'
    list use_member 'wwan3_m1_w1'
    option last_resort 'unreachable'

config rule 'default_rule_v4'
    option family 'ipv4'
    option dest_ip '0.0.0.0/0'
    option proto 'all'
    option use_policy 'only_wired'
```

`last_resort` 使用不可达，避免某策略所有成员失效后意外走被页面关闭的出口。校园本地网段、认证服务器等例外路由要单独验证，不简单套所有流量规则。

### 13.2 只读诊断

```sh
mwan3 status
mwan3 interfaces
mwan3 policies
ip -4 rule show
ip -4 route show table all
ifstatus wan
ifstatus wwan2
ifstatus wwan3
ubus call network.interface.wan status
ubus call network.interface.wwan2 status
ubus call network.interface.wwan3 status
```

候选版本若某子命令/API不存在，按该版本帮助和接口列表适配，不盲装另一分支替代。

用于确认流量绑定出口的示例（仅在 mwan3 提供 `use` 子命令时）：

```sh
mwan3 use wan ping -4 -c 4 1.1.1.1
mwan3 use wwan2 ping -4 -c 4 1.1.1.1
mwan3 use wwan3 ping -4 -c 4 1.1.1.1
```

`1.1.1.1` 只是测试目标，不是预先确定的校园健康探测配置。目标不通不能直接断言线路故障；要结合学校是否允许 ICMP、DNS/HTTP 实际访问交叉判断。测速应由 LAN 电脑产生负载，避免路由器本机测速额外消耗 CPU。

### 13.3 紧急恢复到“仅有线”的调度

仅适用于本方案接口/策略已正确创建、且 SSH 仍可用的后续配置阶段。先备份配置，核对实际段名，再执行：

```sh
uci get mwan3.only_wired
uci get mwan3.default_rule_v4
uci get mwan3.wan
uci get mwan3.wwan2
uci get mwan3.wwan3
```

全部段名正确、无错误后才执行：

```sh
uci set mwan3.wan.enabled='1'
uci set mwan3.wwan2.enabled='0'
uci set mwan3.wwan3.enabled='0'
uci set mwan3.default_rule_v4.use_policy='only_wired'
uci commit mwan3
/etc/init.d/mwan3 restart
ifdown wwan2
ifdown wwan3
```

这组命令恢复调度并停止无线逻辑接口，不保证无线 STA 已完全断开关联，也不会更新未来自定义页面自己的“保存模式”。正式页面后端必须同时同步无线配置和模式状态，不能把这组应急命令当成完整控制程序。

## 14. 自定义 LuCI 控制页的实现规格

采用 LuCI JavaScript 页面 + 受限 RPC 后端 + UCI/netifd/mwan3，复用系统状态和调度能力，不另写 NAT 引擎。

### 14.1 后端接口设计

| 方法（规划名，不是现在就存在的命令） | 参数 | 作用 |
|---|---|---|
| `get_status` | 无 | 返回模式、每路状态、策略、流量计数 |
| `set_mode` | `extra_wifi=0/1/2`；单路时 `preferred=wwan2/wwan3` | 受控切换模式 |
| `set_weights` | 三路有限范围的正整数权重 | 修改已有 member 的权重 |
| `get_capabilities` | 无 | 返回实测可用无线数、配置是否完整、不可用原因 |

后端只接受白名单接口名和合法整数，不允许网页传任意 shell 命令；用登录会话和精确 RPC ACL 控制权限。

### 14.2 切换事务

1. 加锁，防止连续点击、重连事件和后台认证同时改配置。
2. 验证目标模式可用，保存当前配置与当前运行模式。
3. 增加无线时：只启用目标 STA/无线电，启动对应逻辑接口，完成 DHCP 与认证，健康检测成功后加入目标策略。
4. 关闭无线时：先把它从新连接策略中移除，再停止认证保活、关闭逻辑接口，最后禁用对应 STA；否则可能仍占用校园无线登录会话。
5. WAN1、LAN、DHCP 和腾达接入桥不随按钮切换重建。
6. 检查结果；成功才保存目标模式，失败回滚并报告失败发生在哪一步。

无线应用方式须按目标版本支持的 `wifi`/netifd 接口确定，优先只影响目标无线电。不能默认 `ifdown` 等于停用无线；也不能为了开一条无线就重启整个 network 服务。

要在页面提示：退出的无线线路上已有连接可能断开。只删除与被关闭线路有关的必要连接状态，不每次清空全部 conntrack，不承诺无缝迁移 TCP 会话。

模式保存应与接口 `auto`、STA `disabled`、mwan3 `enabled` 一致。首次默认仅有线；保存为双无线模式后，重启也必须先确保有线管理可用，再按顺序启用无线。

### 14.3 流量和状态显示

- 通过 netifd/ubus 读取接口 IP 与实际 `l3_device`。PPPoE 要避免误把共享物理设备流量重复计入每个 WAN。
- 读取设备 `rx_bytes`、`tx_bytes`，按时间差计算速率：Mbps = 字节差 × 8 ÷ 秒差 ÷ 1,000,000。
- 对 WAN 视角，RX 通常为下载，TX 通常为上传。每 2 秒刷新作为初始值；重连或计数清零时重置基线。
- 状态数据放内存，不每 2 秒写 Flash；流量显示是接口计数，不等于精确计费数据。
- 结合 mwan3 健康状态；拿到 IP 不能自动显示“互联网在线”。
- 目标版本支持 `mwan3` ubus 状态时优先使用结构化接口；旧版本另适配，不能假定上游最新版 API 一定存在。[S12]

## 15. 腾达 AX3000 的配置边界

1. 保留原厂固件，确认完整型号对应说明中的 AP 模式。
2. 使用其 AP 模式指定的上联口接 CR8809 LAN，不能在型号未知时断言必须接腾达 WAN 或 LAN。
3. DHCP、NAT、主防火墙、多 WAN 和校园认证由 CR8809 承担；检查 LAN 内只有预期的 DHCP 服务器。
4. 为腾达管理地址做 DHCP 保留或设置不冲突的固定地址。
5. CR8809 LAN 网段要避免与校园上游网段重叠。最终网段取值由实际路由表决定，不先硬设一个可能冲突的私网。
6. 腾达信道尽量减少与 CR8809 上联无线之间的干扰；不要为追求 160 MHz 牺牲稳定性。STA 的运行信道主要跟随上游 AP。

## 16. 原厂恢复和故障处置

| 故障层级 | 能使用的路径 | 本方案要求 |
|---|---|---|
| 仅网络配置出错、SSH/LAN仍在 | 还原已保存配置、切回仅有线 | 先修配置，不刷 Bootloader |
| 系统无法正常启动、U-Boot Web仍在 | 用与当前布局匹配的已验证镜像恢复 | 不能自动认为原厂镜像可以直接上传 |
| MIBIB/引导损坏、Web不在 | 取决于该板与 Bootloader 的串口/底层恢复能力，可能需要硬件维修 | 必须提前确认；不承诺普通小米修复工具可救 |

原 U-Boot 来源帖中有关于刷入版本不支持 TTL 命令的作者说明，需要对“本次具体附件”再次核对，不能把“有串口焊盘”视为可执行恢复命令的证明。[S2]

恢复原厂必须取得这台 CR8809 对应的原厂版本/备份及与新旧分区表一致的恢复顺序。原教程恢复段落涉及不同型号/镜像，不能在本机未核对前直接套用。本方案不提供猜测的还原分区编号，也不编造通用一键回原厂命令。

刷写一旦失败：保存日志，保持当前可用管理入口，不连续试写、不在状态不明时反复断电。由实际失败层级决定下一步。

## 17. 不足、优化与验收

| 已识别不足 | 本方案的处理/优化 |
|---|---|
| 候选固件仍是预发布，仓库已归档 | 固定版本和校验值，验证软件源；保留源码与离线软件包；不自动升级 |
| 没有本机 MTD、Bootloader 附件 | 只读核验先行，Flash 命令保留非执行占位符 |
| 改 MIBIB 后可能有危险中间状态 | 提前验证改分区后的启动兼容与失败恢复，不能只靠刷完最终系统的成功案例 |
| 两路无线不是任意两个 5 GHz | 优先两个物理无线电各一个 STA；以并发能力与实测为准 |
| 三路独立带宽已由用户确认，路由器并发吞吐未测 | 按三路规划；分别测试再并发测速，记录实际增益与瓶颈，不承诺固定三倍 |
| 私网地址/网关可能重叠 | 记录实际路由；必要时单独隔离设计，未解决不加入均衡 |
| 登录和 DNS 可能走错出口 | 按接口绑定认证，验证路由器本机流量和校园资源路由 |
| 无线禁用后可能仍保持关联 | 模式后端同时管理策略、逻辑接口、认证进程和 STA |
| 加速可能影响策略与流量统计 | 首先关闭加速测试，再逐项打开并验证；不预设 NSS 必须可用 |
| 单一 ping 不足以代表互联网可用 | 多目标探测，结合实际认证/访问状态，增加防抖 |
| 容易因切换失去管理 | 永久保留有线 LAN、事务回滚、避免全网络重启 |
| IPv6 可能形成另一套出口行为 | 明确首期 IPv4 多 WAN；IPv6单独配置与验收 |

按顺序验收，不把所有问题一次混在一起：

1. 原厂信息、全部备份和副本校验通过。
2. U-Boot 文件、分区映射、系统镜像和恢复方案核验通过，再取得执行写入的明确确认。
3. 新系统 LAN 管理、Flash 空间、端口和两频段基础功能正常。
4. WAN1 单独工作稳定；WAN2、WAN3 分别独立完成认证与重连。
5. 双无线同时关联、取址和认证，不互相踢下线；地址/路由没有未处理冲突。
6. 0/1/2 模式切换正确；有线配置始终保留；禁用无线后它不再参与流量、也不继续维持不必要登录。
7. 拔掉/恢复有线、断开/恢复无线、学校掉认证等情况下策略与页面一致；新连接能故障切换，已有连接中断行为符合说明。
8. 使用多连接测试两路/三路合计吞吐，同时记录 CPU、内存、丢包、延迟和无线错误；不要只看单次测速数字。
9. 经过覆盖日常使用和多次重连的观察期（建议至少 24–48 小时）后，再把 CR8809 正式作为唯一主路由。
10. 重启后恢复保存模式；通过腾达连接的终端地址、网关和 DNS 正确；校园侧不能任意访问管理服务。

## 18. 交给后续执行者的任务约束

可以把本节连同本文直接交给后续助手/执行者：

> 目标：CR8809 A 做主路由；WAN1 有线账号密码拨号，始终配置、启用并重连；可由 LuCI 选择 0、1、2 路无线 WAN，同时可调权重、看状态与实时流量。两路无线分别为校园 5 GHz 和 2.4 GHz，各自进行网页 Portal 认证；用户已确认三路分别获得带宽。腾达 AX3000 保持原厂 AP，只负责终端无线。双 STA 稳定性、每路认证与实际吞吐仍需本机验收。
>
> 用户电脑为 Windows；已提供机身标签，标注 CR8809、router.ctc / 192.168.2.1。实际原厂地址从直连网卡及后台核实，不能套用教程示例。标签不能单独确认 A/B。SSH 开启、备份、原厂固件版本和只读硬件采集已交给桌面端 Codex 处理，不要要求用户先手工收集。
>
> 优先核验大分区 U-Boot + CR880X 专用 ImmortalWrt，首个候选为 kmiit 的 2026-07-16 14:58:15 UTC 预发布构建。该选择没有取代硬件、布局、软件包和恢复核验。
>
> 当前只进行 SSH 开启、全部原厂 MTD 备份及只读采集。不得根据教程写死 MTD 编号。MIBIB 改写前后分别读取分区名、编号、大小与偏移。任何实际 Flash 写入前，要提交文件名、来源、哈希、目标分区、对应证据与具体恢复方案，并取得用户明确确认。
>
> 所有写 Flash 的占位模板都不能直接执行。不因赶进度绕过异常，不使用来源不明的 U-Boot，不跨版本强装 kmod。页面不能删除/重建网络接口，不能关闭有线或管理 LAN。双无线以真实无线电能力为准，不承诺一颗无线电随意连接多个不同信道。
>
> 刷机与基础网络稳定后才开发 LuCI 后端；区分已启用、已关联、已认证、健康和参与策略。失败回滚、有线管理保留、配置持久化和重启恢复必须验证。没有实机数据的项目明确标为待确认，不伪称实测通过。

## 19. 来源索引

以下为原作者、项目源码、维护者/贡献者提交或官方技术文档。问题报告只作为个案证据，不作为所有设备的结论。

- [S1] 原教程：https://www.right.com.cn/forum/thread-8444159-1-1.html
- [S2] U-Boot 来源帖：https://www.right.com.cn/forum/thread-8275543-1-1.html
- [S3] 固定候选发布页：https://github.com/kmiit/Redmi_AX3000_immortalwrt/releases/tag/ci-redmi_ax3000-24.10-20260716-145815-UTC
- [S4] 无线 PA/BDF 修复：https://github.com/kmiit/Redmi_AX3000_immortalwrt/pull/14
- [S5] RSSI 修复：https://github.com/kmiit/Redmi_AX3000_immortalwrt/pull/15
- [S6] nvmem/重启修复：https://github.com/kmiit/Redmi_AX3000_immortalwrt/pull/10
- [S7] 旧版软件源与升级个案：https://github.com/kmiit/Redmi_AX3000_immortalwrt/issues/13
- [S8] xmir 项目与菜单：https://github.com/openwrt-xiaomi/xmir-patcher ，https://github.com/openwrt-xiaomi/xmir-patcher/blob/main/menu.py
- [S9] 备份程序：https://github.com/openwrt-xiaomi/xmir-patcher/blob/main/create_backup.py
- [S10] mwan3 文档和配置源码：https://openwrt.org/docs/guide-user/network/wan/multiwan/mwan3 ，https://github.com/openwrt/packages/blob/master/net/mwan3/files/etc/config/mwan3
- [S11] 无线接口组合限制：https://www.kernel.org/doc/html/latest/driver-api/80211/cfg80211.html ，https://wireless.docs.kernel.org/en/latest/en/users/documentation/iw.html
- [S12] 系统状态和 LuCI 参考：https://openwrt.org/docs/techref/ubus ，https://github.com/openwrt/luci/blob/master/applications/luci-app-mwan3/htdocs/luci-static/resources/view/status/include/90_mwan3.js
- [S13] 专用镜像定义：https://github.com/kmiit/Redmi_AX3000_immortalwrt/blob/redmi_ax3000-24.10/target/linux/qualcommax/image/ipq50xx.mk

当前信息足够桌面端启动第一阶段。由桌面端完成 SSH 开启、备份清单与日志、原厂固件版本和只读硬件采集，并获取核验 U-Boot 原作者附件；如附件需要论坛账号访问，再向用户说明具体缺失文件。用户按需配合网线直连、在本机输入管理/校园凭据和实体按键操作。校园 SSID、频段、Portal 页面和参数后续现场采集；腾达完整型号可等配置 AP 时补充。无需在聊天中提供账号密码，也不要求用户重复确认三路带宽条件。
