# img loading

## 取值

> eager
> 默认行为， eager 告诉浏览器当处理 `<img>` 标签时立即加载图片。

> lazy
> 告诉用户代理推迟图片加载直到浏览器认为其需要立即加载时才去加载。例如，如果用户正在往下滚动页面，值为 lazy 会导致图片仅在马上要出现在 可视视口中时开始加载。

```html
<img src="/img/logo.png" alt="logo" loading="lazy" />
```

## 相关阅读

- [IntersectionObserver](/JS/intersection-observer)：需要提前预加载、加载失败重试，或者观察的不是图片时，用 JS 自己控制更灵活。
