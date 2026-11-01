# suda.nvim：告别 suda.vim，优雅透明的 Neovim 提权插件

日常在 Linux 下使用 Neovim 时，编辑受 root 权限保护的系统文件（如 `/etc/hosts`、`/etc/fstab`、nginx 或 systemd 配置）是高频场景。然而，传统的处理方式往往体验很差，甚至直接影响现代 Neovim 的开发流。

为了彻底解决这一痛点，我开发了 [suda.nvim](https://github.com/LongYinStudio/suda.nvim)。

---

## 传统方案的核心痛点

在 Neovim 里以普通用户打开受保护文件时，通常有以下几种传统做法，但都存在明显缺陷：

### 1. 经典管道：`w !sudo tee %`
- 需要手动输入冗长且容易拼错的命令。
- 保存后缓冲区仍然处于修改状态（`[+]` 标记不消除）。
- 切屏或下次保存时，Neovim 容易频繁弹出 `W12: Warning: File has changed since reading it!` 冲突警告。

### 2. 老牌插件：`suda.vim`
- **虚拟 URI 破坏生态**：`suda.vim` 将文件路径强行劫持为 `suda:///etc/hosts` 这类虚拟协议。导致 LSP 语言服务器无法定位项目根目录直接罢工，Treesitter 语法树解析异常，格式化与诊断工具也全部瘫痪。
- **肌肉记忆割裂**：必须记忆特殊的 `:SudaWrite` 命令或前缀，无法自然使用原生 `:w`。
- **覆盖写入风险**：老旧脚本通过临时文件替换覆盖，容易破坏原始文件的软链接目标、inode 与权限属性。

---

## suda.nvim 的设计哲学

`suda.nvim` 采用纯 Lua 编写，基于 Neovim 0.10+ 的现代系统 API，旨在实现**零心智负担、零协议侵入**的原生提权体验。

![suda.nvim 演示](/suda.gif)

### 1. Zero-URI 架构，全生态兼容
编辑 `/etc/hosts` 时，缓冲区路径始终保持真实的 `/etc/hosts`。
- LSP、Treesitter、Linter、代码格式化插件（如 conform.nvim、null-ls）100% 正常运行。
- Telescope、Harpoon 等文件检索工具记录的原生路径绝不混乱。

### 2. 契合原生肌肉记忆
无需记忆任何新命令：
- 打开只读文件正常修改后，直接按下熟悉的 `:w`、`:wq`、`:x` 或快捷键 `<C-s>`。
- 插件会在底层自动接管并完成提权写入，保存完毕即刻清除修改状态与警告。

### 3. 同步绝对锁焦
抛弃了悬浮窗在 Ex 命令周期中容易失焦、按键误敲到背景代码的缺陷，改用 Neovim 底层同步安全的命令行密码捕获。输入过程完全屏蔽明文回显，回车即刻完成提权验证并自动清空残留提示符。

### 4. 内核级凭据秒存
优先复用系统原生的 `sudo -n true` 凭据缓存：
- 首次输入密码验证通过后，系统内核会在一段时间内（通常 15 分钟）缓存凭据。
- 在此期间继续编辑保存，**仅需 2 毫秒即可静默秒存**，不再频繁弹窗索要密码。

### 5. 原生流式写入，保护文件元数据
底层通过标准 `sudo tee` 直接流式写入目标文件描述符，原样保留原始文件的权限模式（Mode）、所有者（UID/GID）、软链接目标以及 Inode 属性。

---

## 安装

以 `lazy.nvim` 为例，在插件配置中添加：

```lua
{
  "LongYinStudio/suda.nvim",
  event = { "BufReadPre", "BufNewFile" },
  cmd = { "SudaWrite", "SudaRead", "SudaEdit", "SudoWrite", "SudoRead", "SudoEdit" },
  opts = {
    -- 默认配置即可开箱即用
  },
}
```

---

## 常用命令

日常使用时只需像平时一样按 `:w` 保存即可，插件也提供以下显式命令：

- `:SudaWrite [file]`（别名 `:SudoWrite`）：以 sudo 保存当前缓冲区或选区范围。
- `:SudaRead [file]`（别名 `:SudoRead`）：以 sudo 重新读取指定文件内容。
- `:SudaEdit <file>`（别名 `:SudoEdit`）：以 sudo 权限打开并编辑文件。

支持可视模式行范围保存：
```vim
:'<,'>SudaWrite
```

---

## 项目地址

欢迎前往 GitHub Star 支持或提出建议：

- 仓库地址：[https://github.com/LongYinStudio/suda.nvim](https://github.com/LongYinStudio/suda.nvim)
- 开源协议：MIT
