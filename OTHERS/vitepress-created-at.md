# 用 git 提交历史给 VitePress 文章自动生成发布时间

> 每篇文章手动写 `createdAt` 太麻烦？用文件在 git 里的「首次添加时间」自动补上，提交之后日期就固定了。

## 思路

VitePress 构建页面时，会给每个页面准备一份 `pageData`，其中的 `frontmatter` 会原样传给主题组件。只要在构建阶段给每篇文章补一个 `createdAt`，文章页底部就能显示发布时间，正文里完全不用写。

日期从哪来？常见的几个选择：

| 来源 | 问题 |
| --- | --- |
| 手写 frontmatter | 每篇都要写，容易忘、容易写错 |
| 文件修改时间 `mtime` | `git clone`、`rsync`、Docker COPY 之后全部变成检出时间 |
| git 首次提交时间 | 跟着仓库走，clone 后依然准确，还能跟随重命名 |
| GitHub API | 每次构建都要发请求，还要处理限流和私有仓库鉴权 |

选第三个。仓库本身就是最可靠的时间记录。

## 实现

在 `.vitepress/config.mts` 里用 `transformPageData` 钩子。它在构建时对每个页面执行一次（开发模式下也会跑），跑在 Node 环境里，所以可以直接调用 `git`。

下面的代码只保留和日期相关的部分，其他配置省略。

```ts
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig } from "vitepress";

export default defineConfig({
  transformPageData(pageData, ctx) {
    // 首页这类没有对应文件的页面直接跳过
    if (!pageData.filePath || pageData.frontmatter.showCreatedAt === false) {
      return;
    }

    // 已经手写日期的文章，不覆盖
    if (pageData.frontmatter.createdAt) {
      return;
    }

    const filePath = resolve(ctx.siteConfig.srcDir, pageData.filePath);

    try {
      const createdAt = execFileSync(
        "git",
        [
          "log",
          "--diff-filter=A", // 只看「新增文件」的提交
          "--follow", // 跟随重命名
          "--format=%aI", // 作者时间，ISO 8601
          "-1", // 只取最近一条
          "--",
          filePath, // -- 后面才是路径
        ],
        {
          cwd: ctx.siteConfig.root,
          encoding: "utf-8",
        }
      ).trim();

      // 文件还没提交过（比如刚写的新文章），没有日期可用
      if (!createdAt) {
        return;
      }

      return {
        frontmatter: {
          ...pageData.frontmatter,
          createdAt,
        },
      };
    } catch {
      // 不在 git 仓库里（比如 Docker 构建），静默跳过
      return;
    }
  },
});
```

几个参数值得单独说：

- `--diff-filter=A`：只保留「新增文件」的提交。不加的话，`git log -1 -- file` 拿到的是**最后一次修改**，不是创建时间。
- `--follow`：文件改过名也能追到最初的那次提交。不加的话，历史会在重命名处断掉。
- `--format=%aI`：作者时间，严格的 ISO 8601 格式（带时区偏移），`new Date()` 能直接解析。用作者时间而不是提交时间，是因为 rebase、cherry-pick 会改写提交时间，作者时间才更接近「这篇是什么时候写的」。
- `--`：把版本号和路径分开，避免文件名碰巧和分支名一样时被误解析。
- `execFileSync` 而不是 `execSync`：不经过 shell，路径里有空格或特殊字符也不会出问题。

返回值里只写了 `frontmatter`，所以必须把原来的 frontmatter 展开进去——VitePress 对返回值的合并是**浅合并**（`{ ...pageData, ...dataToMerge }`），直接返回 `{ frontmatter: { createdAt } }` 会把 `title`、`description` 等其他字段整个冲掉。

然后在主题里把日期读出来。文章底部那个「发布于」是自定义组件，挂在 `doc-footer-before` 插槽上：

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { frontmatter } = useData();

const createdAt = computed(() => frontmatter.value.createdAt);

const formattedCreatedAt = computed(() => {
  const value = createdAt.value;

  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
});
</script>

<template>
  <div v-if="formattedCreatedAt" class="article-meta">
    <span class="article-meta__label">发布于</span>
    <time :datetime="String(createdAt)">{{ formattedCreatedAt }}</time>
  </div>
</template>
```

`v-if` 很重要：首页、没有日期的草稿不会渲染出一个空的「发布于」。

## 几个容易踩的坑

**1. 新文章提交前没有日期。** `git log` 只能看到已经提交的历史，刚写完还没 commit 的文件查不到，页面就不显示「发布于」。提交后刷新即可，属于预期行为，不是代码坏了。

**2. CI 上必须关掉浅克隆。** GitHub Actions 的 `actions/checkout` 默认 `fetch-depth: 1`，只拉最后一个提交，`git log` 几乎查不到历史，所有文章的日期都会变成同一天，或者干脆没有。改成：

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

Docker 构建也一样，要么把 `.git` 一起 COPY 进去，要么接受没有日期。

**3. 时区。** `%aI` 会保留作者提交时的时区偏移，`new Date()` 再按**访客浏览器**的时区格式化。读者都在国内的话问题不大；想严格统一，可以给 `Intl.DateTimeFormat` 加 `timeZone: "Asia/Shanghai"`。另外 23:30 提交的文章，在东八区显示当天，在 UTC-8 可能显示前一天——只显示日期时，这点差异通常可以接受。

**4. 每页一次 `git` 进程。** 目前二十来个页面，构建时间可以忽略。页面多了可以优化成一次查询：在模块作用域里执行一次 `git log --diff-filter=A --name-only --format=...`，把结果解析成 `Map<路径, 日期>` 缓存起来，后面每页只查表。

## 和手写 frontmatter 怎么共存

代码里留了判断：`frontmatter.createdAt` 有值就直接返回，不覆盖。从旧博客迁移、或者想保留文章的原始发布日期时，手写一个日期即可，其余文章继续走 git。

反过来，某些页面不想显示日期，加一行：

```yaml
---
showCreatedAt: false
---
```

## 参考

- [VitePress - transformPageData](https://vitepress.dev/reference/site-config#transformpagedata)
- [git log 文档](https://git-scm.com/docs/git-log)
