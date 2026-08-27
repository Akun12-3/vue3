import { isObject, hasChanged } from "@vue/shared";
import { track, trigger } from "./dep.ts";
import { isRef } from "./ref.ts";

export function reactive(target) {
  return createReactiveObject(target);
}

/**
 * 保存 target 和 响应式对象之间的关联关系
 * target => proxy
 */
const reactiveMap = new WeakMap();
/**
 * 保存所有使用 reactive 创建出来的响应式对象
 */
const reactiveSet = new WeakSet();

function createReactiveObject(target) {
  if (!isObject(target)) {
    return;
  }
  if (reactiveSet.has(target)) {
    return target;
  }

  /**
   * 获取到之前这个 target 创建的代理对象
   */
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) {
    /**
     * 如果这个 target 之前使用 reactive 创建过响应式对象，那就直接返回这个响应式对象
     */
    return existingProxy;
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      track(target, key);
      const res = Reflect.get(target, key, receiver);
      if (isRef(res)) {
        return res.value;
      }
      if (res && isObject(res)) {
        return reactive(res);
      }

      /**
       * receiver 用来保证 访问器里面的 this 指向代理对象
       */
      return res;
    },
    set(target, key, newValue, receiver) {
      const oldValue = target[key];
      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue;
        return true;
      }
      const res = Reflect.set(target, key, newValue, receiver);
      if (hasChanged(newValue, oldValue)) {
        /**
         * 如果新值和老值不一样，触发更新
         * 先 set 再通知 sub 重新执行
         */
        trigger(target, key);
      }
      return res;
    },
  });
  /**
   * 保存 target 和 proxy 之间的关联关系
   * target => proxy
   */
  reactiveMap.set(target, proxy);
  // 保存响应式对象到 reactiveSet
  reactiveSet.add(proxy);
  return proxy;
}
export function isReactive(target) {
  return reactiveSet.has(target);
}
