# AbortController

> 一个「取消信号」，可以传给 `fetch`、事件监听、流，让正在进行的异步操作停下来。

## 基本用法

```js
const controller = new AbortController();

fetch("/api/list", { signal: controller.signal })
  .then((res) => res.json())
  .catch((err) => {
    if (err.name === "AbortError") {
      console.log("请求已取消");
      return;
    }
    throw err;
  });

// 需要取消时
controller.abort();
```

`abort()` 之后，`fetch` 返回的 Promise 会以 `AbortError` 拒绝，`signal.aborted` 变成 `true`。

**abort 是不可逆的**：同一个 controller 不能复用，下一次请求要新建一个。

## 超时

以前要自己 `setTimeout` 再调 `abort()`，现在有静态方法：

```js
const res = await fetch("/api/slow", {
  signal: AbortSignal.timeout(5000),
});
```

超时抛出的不是 `AbortError`，而是 `TimeoutError`，两者要分开处理：

```js
try {
  await fetch(url, { signal: AbortSignal.timeout(5000) });
} catch (err) {
  if (err.name === "TimeoutError") {
    // 超时
  } else if (err.name === "AbortError") {
    // 被主动取消
  }
}
```

`AbortSignal.timeout()` 是 2024 年才进入 Baseline 的，老浏览器可能没有。不支持的时候**调用这个方法本身**就会抛 `TypeError`，可以先判断：

```js
const signal =
  typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(5000)
    : undefined;

fetch(url, { signal });
```

不支持就没有超时兜底，这一点要心里有数，别让请求静默地挂着。

## 组合多个信号

「用户点取消」和「5 秒超时」同时生效：

```js
const controller = new AbortController();

const signal = AbortSignal.any([
  controller.signal,
  AbortSignal.timeout(5000),
]);

fetch(url, { signal });
```

任意一个触发，组合信号就 abort，`reason` 取第一个触发的那个。

注意 `AbortSignal.any()` 没有「退订」方法：返回的信号会一直和输入的信号关联。别在长生命周期对象上反复组合，否则旧信号会一直挂着。

## 给事件监听也装上

`addEventListener` 的第三个参数支持 `signal`：

```js
const controller = new AbortController();

window.addEventListener("scroll", onScroll, { signal: controller.signal });
window.addEventListener("resize", onResize, { signal: controller.signal });

// 一处取消，全部解绑
controller.abort();
```

比保存一堆 handler 再逐个 `removeEventListener` 干净得多，SPA 组件卸载时尤其好用。

## 常见坑

- **每次请求新建 controller**。复用一个已经 abort 的 controller，请求会立刻失败。
- **`signal.reason` 不一定是 `Error`**。`abort()` 可以传自定义原因，`abort("用户离开")` 之后 `reason` 就是那个字符串；不传时才是 `DOMException`（`AbortError`）。
- **取消不等于服务端停止**。请求可能已经发到后端，服务端还在继续执行；要真正中断需要业务层配合。
- **Axios 新版本也支持 `signal`**。老版本只有 `CancelToken`，升级后建议统一用 signal，少一套 API。
- **流式响应也会被中断**。`fetch` 的 `response.body` 读取过程中 abort，`reader.read()` 会以 `AbortError` 拒绝。
- **在 Vue / React 里**，卸载时 `abort()` 是防止「组件已经卸载还在 setState」最省事的写法，配合 `onUnmounted` / `useEffect` 的 cleanup 使用。

## 参考

- [MDN - AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)
- [MDN - AbortSignal](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal)
