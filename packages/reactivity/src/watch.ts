import { isRef } from "./ref";
import { isReactive } from "./reactive";
import { isFunction, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
export function watch(source, cb, options) {
  let { immediate, once, deep } = options || {};
  let getter;
  if (isRef(source)) {
    // Handle ref source
    getter = () => source.value;
  } else if (isReactive(source)) {
    // Handle reactive source
    getter = () => source;
    if (!deep) {
      deep = true;
    }
  } else if (isFunction(source)) {
    // 如果 source 是一个 函数，那 getter 就等于 source
    getter = source;
  }
  if (deep) {
    const baseGetter = getter;
    const depth = deep === true ? Infinity : deep;
    getter = () => traverse(baseGetter(), depth);
  }
  if (once) {
    const _cb = cb;
    cb = (...args) => {
      stop();
      _cb(...args);
    };
  }
  let cleanup;

  function onCleanup(cb) {
    cleanup = cb;
  }
  let oldvalue;
  function job() {
    if (cleanup) {
      cleanup();
    }
    let value = effect.run();
    cb(value, oldvalue, onCleanup);
    oldvalue = value;
  }

  const effect = new ReactiveEffect(getter);
  effect.scheduler = job;
  if (immediate) {
    // 如果 immediate 传了，直接执行一次 job
    job();
  } else {
    // 拿到 oldValue，并且收集依赖
    oldvalue = effect.run();
  }
  function stop() {
    effect.stop();
  }
  return stop;
}
function traverse(value, depth = Infinity, seen = new Set()) {
  // 如果不是一个对象，或者监听层级到了，直接返回 value
  if (!isObject(value) || depth <= 0) {
    return value;
  }

  // 如果之前访问过，那直接返回，防止循环引用栈溢出
  if (seen.has(value)) {
    return value;
  }

  // 层级 -1
  depth--;
  // 加到 seen 中
  seen.add(value);

  for (const key in value) {
    // 递归触发 getter
    traverse(value[key], depth, seen);
  }

  return value;
}
