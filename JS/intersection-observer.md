# IntersectionObserver

> 判断元素有没有进入视口，不用再监听 `scroll`、再算 `getBoundingClientRect()`。

## 为什么不用 scroll

最直觉的写法是监听 `scroll`，在回调里读元素位置。问题是：

- `scroll` 触发频率极高，滚动一下就是几十次
- 回调里读 `getBoundingClientRect()` 会强制浏览器同步布局
- 元素多了要全部遍历一遍

IntersectionObserver 把这件事交给浏览器：回调只在**交叉状态跨过阈值**时触发，滚动过程中几乎不占主线程。

## 基本用法

```js
const io = new IntersectionObserver(
  (entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      console.log(entry.target, entry.intersectionRatio);
      obs.unobserve(entry.target); // 只关心第一次进入
    }
  },
  {
    root: null, // 默认视口，也可以传某个滚动容器
    rootMargin: "0px", // 提前/延后触发，类似 margin
    threshold: 0.5, // 0~1，或数组 [0, 0.5, 1]
  }
);

io.observe(document.querySelector(".box"));
```

回调拿到的 `entries` 里，常用字段：

| 字段 | 含义 |
| --- | --- |
| `isIntersecting` | 是否与根区域相交 |
| `intersectionRatio` | 相交面积占目标元素的比例 |
| `intersectionRect` | 实际相交的区域 |
| `boundingClientRect` | 目标元素的矩形 |
| `rootBounds` | 根元素的矩形 |
| `target` | 被观察的元素 |

`root: null` 表示视口；如果要监听某个内部滚动容器，就把容器元素传进去。注意 `root` 必须是目标元素的祖先元素。

## 图片懒加载

```html
<img data-src="/img/a.jpg" alt="a" width="800" height="600" />
```

```js
const io = new IntersectionObserver(
  (entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
      obs.unobserve(img);
    }
  },
  { rootMargin: "200px 0px" } // 提前 200px 开始加载
);

document.querySelectorAll("img[data-src]").forEach((img) => io.observe(img));
```

`rootMargin: "200px 0px"` 让图片在进入视口前 200px 就开始加载，滚动时不容易看到空白。`width` / `height` 要写上，否则图片加载完高度突变，会把下面的内容顶下去（CLS）。

> 只是普通图片懒加载的话，优先用原生的 [`loading="lazy"`](/HTML/img-loading)：一个属性、零 JS。IntersectionObserver 更适合需要自定义逻辑的场景，比如提前预加载、加载失败重试、或者观察的不是 `<img>` 元素。

## 常见场景

- **无限滚动**：列表底部放一个哨兵元素，进入视口时请求下一页。请求中要加锁，否则会连续触发好几次
- **曝光埋点**：元素真正出现在视口里才上报，比页面加载时全量上报准确
- **进入动画**：元素进入视口时加一个 class，动画交给 CSS transition
- **目录高亮**：观察各个标题，取当前可见的那个
- **视频自动播放/暂停**：离开视口暂停，回来再播，省流量

## 坑

- **`observe()` 之后一定会回调一次**，即使元素根本不在视口里（此时 `isIntersecting` 为 `false`）。别假设第一次回调就是「进入」。
- **`threshold` 是数组时会回调多次**。只想触发一次就 `unobserve`，或者加个标记位。
- **`rootMargin` 不改变布局**，只影响判定区域。写 `"200px"` 等于四个方向都提前。
- **SPA 里记得 `disconnect()`**。组件卸载后 observer 还持有 DOM 引用，路由来回切几次就泄漏几个。
- **它不是逐帧的滚动监听**。滚动进度条、视差效果请用 `scroll` 事件或 CSS scroll-driven animations，别指望它给出连续位置。
- **动态插入的元素要重新 `observe()`**。框架里在列表更新后补一下，或者配合 MutationObserver。

## 参考

- [MDN - IntersectionObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver)
- [MDN - IntersectionObserverEntry](https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserverEntry)
