# Global/Catalog Manifest Split

能力分为两个 tier：`global`（通过全局同步自动推送到 `~/.pi/agent/`）和 `catalog`（其他仓库通过 `install-from-pi-config` 按需安装）。这个拆分使得 pi-config 既能管理自己使用的全局能力，又能作为能力目录服务其他仓库，而不需要将所有能力都塞进全局同步。
