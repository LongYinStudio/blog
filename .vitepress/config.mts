import { defineConfig } from "vitepress";
import HTML from "./catalogue/HTML";
import IDE from "./catalogue/IDE";
import JS from "./catalogue/JS";
import VUE from "./catalogue/VUE";
import CSS from "./catalogue/CSS";
import LINUX from "./catalogue/LINUX";
import BOARD from "./catalogue/BOARD";
import OTHERS from "./catalogue/OTHERS";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: "zh-CN",
  title: "龙吟博客",
  description: "个人技术博客",
  head: [["link", { rel: "icon", href: "/head.webp" }]],
  lastUpdated: false,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/head.webp",
    lastUpdatedText: "📑 最后更新",
    search: {
      provider: "local",
    },
    nav: [
      {
        text: "首页",
        link: "/",
      },
      {
        text: "HTML",
        items: HTML,
      },
      {
        text: "CSS",
        items: CSS,
      },
      {
        text: "JavaScript",
        items: JS,
      },
      {
        text: "Vue",
        items: VUE,
      },
      {
        text: "IDE",
        items: IDE,
      },
      {
        text: "Linux",
        items: LINUX,
      },
      {
        text: "开发板",
        items: BOARD,
      },
      {
        text: "其他",
        items: OTHERS,
      },
      {
        text: "龙吟工作室",
        link: "https://longyinstudio.cn/",
      },
    ],

    sidebar: {
      "/HTML/": [
        {
          text: "HTML",
          collapsed: true,
          items: HTML,
        },
      ],
      "/CSS/": [
        {
          text: "CSS",
          collapsed: true,
          items: CSS,
        },
      ],
      "/JS/": [
        {
          text: "JavaScript",
          collapsed: true,
          items: JS,
        },
      ],
      "/VUE/": [
        {
          text: "Vue",
          collapsed: true,
          items: VUE,
        },
      ],
      "/IDE/": [
        {
          text: "IDE",
          collapsed: true,
          items: IDE,
        },
      ],
      "/LINUX/": [
        {
          text: "Linux",
          collapsed: true,
          items: LINUX,
        },
      ],
      "/BOARD/": [
        {
          text: "开发板",
          collapsed: true,
          items: BOARD,
        },
      ],
      "/OTHERS/": [
        {
          text: "其他",
          collapsed: true,
          items: OTHERS,
        },
      ],
    },

    outline: {
      label: "文章摘要",
    },

    socialLinks: [{ icon: "github", link: "https://github.com/LongYinStudio" }],

    footer: {
      // message: "蜀ICP备2023003243号",
      copyright: "Powered by VitePress | Copyright © 2025 LongYinStudio",
    },
  },
});
