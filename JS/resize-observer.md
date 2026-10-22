# ResizeObserver

> 元素尺寸变了就通知你，不用再监听 `window.resize`。

## 为什么不用 window.resize

`window.resize` 只在**视口**尺寸变化时触发。但元素尺寸变化的原因太多了：

- 侧边栏折叠，主内容区变宽
- 内容变多，把容器撑开
- flex / grid 重新分配空间
- 字体加载完成，文字重新排版

这些都不会触发 `window.resize`。ResizeObserver 观察的是元素本身，不管尺寸是被谁改的。

## 基本用法

```js
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    console.log(width, height);
  }
});

ro.observe(document.querySelector(".chart"));
```

`entry.contentRect` 是**内容盒**，不含 padding 和 border。需要边框盒就用 `borderBoxSize`：

```js
const ro = new ResizeObserver((entries) => {
  const box = entries[0].borderBoxSize[0];
  console.log(box.inlineSize, box.blockSize);
});

ro.observe(document.querySelector(".chart"));
```

`borderBoxSize` 是数组——一个目标元素在某些布局下可能对应多个盒（比如分列），取 `[0]` 就行。

## 场景：canvas 自适应

```js
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const ro = new ResizeObserver(() => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // 物理像素尺寸
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  // CSS 尺寸
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  // 改完 width/height 画布会被重置，重新设置缩放
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
});

ro.observe(canvas);
```

不处理 DPR 的话，canvas 在高分屏上会糊。这里的顺序不能反：先设物理像素，再设 CSS 尺寸，最后重置 transform。

## 场景：textarea 自增高

```js
const ro = new ResizeObserver(() => {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
});

ro.observe(textarea);
```

这段代码有个隐患：回调里改的正是被观察元素的尺寸，会再次触发回调。高度最终会稳定下来，但如果 CSS 里有 `min-height`、`box-sizing` 之类的干扰，就可能来回震荡，控制台报 `ResizeObserver loop completed with undelivered notifications`。更稳妥的写法是把写操作放进 `requestAnimationFrame`，或者只在高度真的变化时才写。

## 坑

- **别在回调里改被观察元素的尺寸**，容易触发上面的 loop 错误。必须改就延到 `requestAnimationFrame`，或者用标记位避免重复。
- **`contentRect` 和 `getBoundingClientRect()` 不是一回事**。前者是内容盒、整数；后者包含 padding 和 border，是小数。
- **观察 `documentElement` 要小心**。滚动条出现/消失会改变它的尺寸，可能递归触发。监听视口用 `window.resize` 或 `visualViewport.resize` 更直接。
- **组件卸载时 `disconnect()`**，和 IntersectionObserver 一样，否则回调闭包里引用的状态释放不掉。
- **能用 CSS 就别用 JS**。容器查询（container queries）已经能处理大部分「根据父容器宽度切换样式」的需求，纯 CSS 更省事。ResizeObserver 适合确实需要拿到具体数值的场景：canvas、图表、虚拟列表。

## 参考

- [MDN - ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
- [MDN - ResizeObserverEntry](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserverEntry)
