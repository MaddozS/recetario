<template>
  <div class="animate-pulse space-y-8">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card v-for="index in 3" :key="`stat-${index}`" padding="sm" class="bg-card/60 h-20">
        <div class="bg-muted h-4 w-28 rounded"></div>
        <div class="bg-muted mt-3 h-6 w-16 rounded"></div>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card v-for="index in 3" :key="`info-${index}`" padding="sm" class="bg-card/60 h-20">
        <div class="bg-muted h-3 w-32 rounded"></div>
        <div class="bg-muted mt-3 h-5 w-24 rounded"></div>
      </Card>
    </div>

    <div class="space-y-3">
      <div class="bg-muted h-4 w-20 rounded"></div>
      <div class="flex items-center gap-2">
        <div class="bg-muted h-10 flex-1 rounded-xl"></div>
        <div class="bg-muted h-10 w-28 rounded-xl"></div>
      </div>
      <div class="flex items-center gap-2 overflow-hidden py-1">
        <div class="bg-muted h-8 w-20 shrink-0 rounded-full"></div>
        <div class="bg-muted h-8 w-24 shrink-0 rounded-full"></div>
        <div class="bg-muted h-8 w-16 shrink-0 rounded-full"></div>
        <div class="bg-muted h-8 w-28 shrink-0 rounded-full"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="index in 6"
        :key="`card-${index}`"
        padding="md"
        class="bg-card/60 h-28 space-y-3"
      >
        <div class="bg-muted h-5 w-3/4 rounded"></div>
        <div class="flex items-center gap-2 pt-2">
          <div class="bg-muted h-5 w-16 rounded-full"></div>
          <div class="bg-muted h-4 w-24 rounded"></div>
        </div>
      </Card>
    </div>
  </div>
</template>
