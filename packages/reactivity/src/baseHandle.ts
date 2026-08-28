import { track, trigger } from "./dep";
import { isRef } from "./ref";
import { hasChanged, isObject } from "@vue/shared";
import { reactive } from "./reactive";
export const mutableHandlers = {
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
    const targetIsArray = Array.isArray(target);
    const oldLength = targetIsArray ? target.length : 0;
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
    //region 处理隐式更新数组的 length
    const newLength = targetIsArray ? target.length : 0;
    if (targetIsArray && newLength !== oldLength && key !== "length") {
      /**
       * 隐式更新 length
       * 更新前：length = 4 => ['a', 'b', 'c', 'd']
       * 更新后：length = 5 => ['a', 'b', 'c', 'd', 'e']
       * 更新动作，以 push 为例，追加了一个 e
       * 隐式更新 length 的方法：push pop shift unshift
       *
       * 如何知道 隐式更新了 length
       */
      trigger(target, "length");
    }
    return res;
  },
};
