import { Link, link, propagate } from "./system";
import { activeSub } from "./effect";
import { isArray } from "@vue/shared";
const targetMap = new WeakMap();

export function track(target, key) {
  if (!activeSub) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Dep()));
  }
  link(dep, activeSub);
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  if (isArray(target) && key === "length") {
    /**
     * 更新数组的 length
     * 更新前：length = 4 => ['a', 'b', 'c', 'd']
     * 更新后：length = 2 => ['a', 'b']
     * 得出结论：要通知 访问了 c 和 d 的 effect 重新执行，就是访问了大于等于 length 的索引
     * depsMap = {
     *   0:Dep,
     *   1:Dep,
     *   2:Dep,
     *   3:Dep
     *   length:Dep
     * }
     */
    const length = target.length;
    depsMap.forEach((dep, depKey) => {
      if (depKey >= length || depKey === "length") {
        /**
         * 通知访问了大于等于 length 的 effect 重新执行
         * 和 访问了 length 的 effect 重新执行
         */
        propagate(dep.subs);
      }
    });
  } else {
    const dep = depsMap.get(key);
    if (!dep) return;
    /**
     * 找到 dep 的 subs 通知它们重新执行
     */
    propagate(dep.subs);
  }
}

class Dep {
  subs: Link | undefined;
  subsTail: Link | undefined;

  constructor() {}
}
