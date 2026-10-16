# 扫码跳转小程序

## 背景

在开发中遇到这样的需求：生成一个二维码或小程序码，用户扫码后直接打开小程序的某个详情页，并携带一个业务 ID。例如商品详情、文章详情、订单详情等。微信官方提供了两种常见方案：

1. 调用 `getwxacodeunlimit` 生成微信小程序码；
2. 调用 `generate_urllink` 生成 URL Link，再用二维码库转成普通二维码。

## 方案一：getwxacodeunlimit 生成小程序码

### 服务端实现

```js
const axios = require("axios");

async function generateMiniProgramCode(accessToken, id) {
  const page = "pages/detail/index";
  const scene = `id=${id}`;

  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

  const requestBody = {
    scene,
    page,
    width: 430,
    is_hyaline: false,
    auto_color: false,
    line_color: { r: 0, g: 0, b: 0 },
    check_path: false,
    env_version: "release"
  };

  const response = await axios.post(url, requestBody, {
    responseType: "arraybuffer",
    headers: { "Content-Type": "application/json" },
  });

  const contentType = response.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    const errorData = JSON.parse(Buffer.from(response.data).toString("utf-8"));
    throw new Error(`微信接口错误: ${errorData.errcode} - ${errorData.errmsg}`);
  }

  return Buffer.from(response.data);
}
```

`scene` 最大 32 个可见字符，只支持数字、大小写英文以及部分特殊字符。`page` 只填纯路径，不能带参数，不能以 `/` 开头。

### 前端改造：解析 scene 参数

用户扫码进入小程序后，参数不会出现在 `options` 的顶层，而是藏在 `options.query.scene` 里。同一个页面可能通过正常导航进入（没有 scene），也可能通过扫码进入（有 scene），前端必须做兼容判断。

下面是一个健壮的 `scene` 解析函数，推荐放到工具库中：

```js
/**
 * 解析 scene 字符串，例如 "id=123&type=1"
 * @param {string} str scene原始字符串
 * @returns {Object}
 */
function parseScene(str) {
  const res = {}
  if (!str) return res
  const raw = decodeURIComponent(str)
  const arr = raw.split('&')
  arr.forEach(item => {
    const eqIndex = item.indexOf('=')
    if (eqIndex > 0) {
      const k = item.slice(0, eqIndex).trim()
      const v = item.slice(eqIndex + 1).trim()
      res[k] = v
    }
  })
  return res
}
```

这个函数使用 `indexOf('=')` 避免值本身包含等号时被错误分割，`trim()` 去掉首尾空格，`decodeURIComponent` 处理微信对 scene 的 URL 编码。注意 `decodeURIComponent` 在传入非法编码字符串时可能抛出 `URIError`，建议在调用处用 `try/catch` 包裹。

在页面 `onLoad` 中的典型用法：

```js
const { parseScene } = require('../../utils/scene')

Page({
  onLoad(options) {
    let id;

    // 情况一：扫码进入，参数在 options.query.scene 中
    if (options.query && options.query.scene) {
      try {
        const params = parseScene(options.query.scene);
        id = params.id;
      } catch (e) {
        console.warn('scene 解析失败:', e);
      }
    }

    // 情况二：正常导航进入，参数直接在 options 中
    if (!id && options.id) {
      id = options.id;
    }

    if (id) {
      this.fetchDetail(id);
    } else {
      // 无参数时的降级逻辑
    }
  }
});
```

容易踩的坑：

- **`options.query.scene` 和 `options.scene` 不是一回事。** 小程序码的参数在 `options.query.scene` 里，而普通链接二维码的参数在 `options.q` 里。
- **`decodeURIComponent` 必须容错。** 真机扫码时 scene 一定是编码过的，但开发者工具模拟时可能没编码，不做兜底可能导致页面白屏。
- **调试时使用自定义编译条件。** 微信开发者工具可以模拟 scene 参数，参数值需要进行 `encodeURIComponent` 处理。
- **scene 有长度限制。** 32 个可见字符意味着不能把完整业务参数塞进去。如果参数较多，需要先在服务端把参数压缩成短 ID，前端拿到短 ID 后再调接口换完整数据。

## 方案二：URL Link + 二维码

### 服务端实现

```js
const axios = require("axios");
const QRCode = require("qrcode");

async function generateUrlLink(accessToken, id) {
  const url = `https://api.weixin.qq.com/wxa/generate_urllink?access_token=${accessToken}`;

  const requestBody = {
    path: "pages/detail/index",
    query: `id=${id}`,
    is_expire: false, // 注意：当前微信政策下最长 30 天，实际需设置过期时间
    env_version: "release",
  };

  const response = await axios.post(url, requestBody, {
    headers: { "Content-Type": "application/json" },
  });

  const data = response.data;
  if (data.errcode) {
    throw new Error(`生成 URL Link 失败: ${data.errcode} - ${data.errmsg}`);
  }
  return data.url_link;
}

// 生成二维码
await QRCode.toFile(`./qrcode_${id}.png`, urlLink, {
  width: 430,
  margin: 2,
});
```

### 前端改造：直接读取 options

这是方案二最大的优势。`query` 参数会通过正常的页面参数传递，前端 `onLoad(options)` 直接就能拿到 `id`，不需要 `decodeURIComponent`，不需要判断 scene，不需要写兼容逻辑：

```js
Page({
  onLoad(options) {
    const id = options.id; // 直接拿到
    if (id) {
      this.fetchDetail(id);
    }
  }
});
```

### 中间页跳转问题

在微信内或者安卓手机打开 URL Link 时，会先跳转官方的 H5 中间页，用户需要点击才能进入小程序。这个中间页是微信官方的公共跳转页，主要任务是请求用户授权允许打开。如果想要定制这个 H5 页面的内容，需要使用云开发静态网站托管来搭建自定义中间页。

用户扫码后的路径是：**扫码 → 打开 H5 中间页 → 点击“打开小程序” → 进入小程序页面**。多了一步操作，在转化率敏感的场景下需要权衡。

## 方案选择参考

| 维度 | getwxacodeunlimit | URL Link + 二维码 |
| --- | --- | --- |
| 码类型 | 微信小程序码 | 普通二维码 |
| 扫码工具 | 仅微信 | 任意扫码工具 |
| 前端改造量 | 大，需判断 scene 并兼容解码 | 小，直接读 options |
| 参数长度 | scene ≤ 32 可见字符 | query ≤ 1024 字符 |
| 参数获取位置 | `options.query.scene` | `options` 直接获取 |
| 用户跳转路径 | 扫码直接进入 | 扫码 → H5 中间页 → 小程序 |
| 有效期 | 永久有效 | 最长 30 天 |
| 适用场景 | 微信内分发、参数简单 | 跨平台分发、参数较多、短链接 |

URL Link 自 2022 年 4 月起有效期最长 30 天，不再支持永久有效。如果业务需要永久有效的码，这一点必须纳入考量。

## 总结

两种方案的核心取舍在于：**方案一让前端承担参数解析的复杂度，换来用户扫码即达的体验；方案二让前端代码保持简洁，代价是用户多一步中间页跳转。**

选择建议：

- 如果主要在微信生态内分发，且参数简单（单个 ID），选 `getwxacodeunlimit`，体验更原生。
- 如果需要跨平台分发（短信、邮件、浏览器），或参数较多，选 URL Link，前端改造量最小。
- 如果需要永久有效的码，只有 `getwxacodeunlimit` 满足。

无论哪种方案，`access_token` 都必须在服务端管理，不要在前端调用微信接口。

## 参考

- [微信官方文档 - getwxacodeunlimit](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html)
- [微信官方文档 - URL Link](https://developers.weixin.qq.com/minigame/dev/guide/open-ability/url-link.html)
- [场景值解析与参数校验的容错实践](https://developer.aliyun.com/article/1764313)
