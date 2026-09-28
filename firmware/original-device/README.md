# CR8809 本机原厂分区备份

## 采集信息

- 采集日期：2026-09-27。
- 采集时系统：`Linux XiaoQiang 4.4.60`。
- 只读兼容标识：`qcom,ipq5018-mp02.1`。
- 归档：24 个非空 MTD 分区镜像，以及 2 个通过 UBI 卷读取的镜像，共 26 个二进制文件（约 190.70 MiB）。
- `partition-manifest.csv` 记录原始分区名、期望大小、实际来源和 SHA-256；`SHA256SUMS.txt` 可用于校验本目录中的二进制文件。

`mtd24_rwdata.bin` 和 `mtd25_dataignorreset.bin` 的直接 MTD 读取结果为 0 字节，不能作为备份使用。清单中对应的有效数据来源是 `ubi1_0_rw_data.bin` 和 `ubi2_0_data_ignor_reset.bin`，请按清单理解来源，不要把它们误认为直接读取的 MTD 镜像。

## 使用边界

这些文件来自这一台设备，包含启动、系统、无线校准及设备数据，也可能包含后台密码和 Wi-Fi 凭据。只用于同一台设备的受控恢复，绝不能写到另一台路由器；仓库必须保持私有。

这些是原始分区数据，不是 U-Boot Web 或 `sysupgrade` 可直接安装的镜像。只有在板型、当前分区映射、写入顺序和恢复通道均已核实后，才可按对应的设备恢复流程使用。不要依据文件名猜分区号，也不要把分区镜像拼成整机固件。

## 校验

在 Windows PowerShell 中可运行：

```powershell
Get-Content .\SHA256SUMS.txt | ForEach-Object {
    $expected, $name = $_ -split '\s+', 2
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath ".\$name").Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "SHA-256 mismatch: $name" }
}
```
