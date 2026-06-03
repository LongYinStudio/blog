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
