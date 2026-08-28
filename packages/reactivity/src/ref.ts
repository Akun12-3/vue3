import { activeSub } from "./effect";
import { Link, link, propagate } from "./system";
import { hasChanged } from "@vue/shared";

export function ref(value: any) {
  return new RefImpl(value);
}

export enum ReactiveFlags {
  IS_REF = "__v_isRef",
}

class RefImpl {
  subs: Link;
  subsTail: Link;
  // ref 标记，证明是一个 ref
  [ReactiveFlags.IS_REF] = true;

  constructor(value: any) {
    this._value = value;
  }

  _value: any;
  get value() {
    if (activeSub) {
      trackRef(this);
    }
    return this._value;
  }

  set value(newVal) {
    // 值没有变化时不触发更新
    if (hasChanged(newVal, this._value)) {
      this._value = newVal;
      triggerRef(this);
    }
  }
}

/**
 * 收集依赖，建立 ref 和 effect 之间的链表关系
 * @param dep
 */
export function trackRef(dep) {
  if (activeSub) {
    link(dep, activeSub);
  }
}

/**
 * 触发 ref 关联的 effect 重新执行
 * @param dep
 */
export function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}

export function isRef(target) {
  return target && target[ReactiveFlags.IS_REF];
}
class ObjectRefImpl {
  [ReactiveFlags.IS_REF] = true;
  constructor(
    public _object,
    public _key,
  ) {}

  get value() {
    return this._object[this._key];
  }

  set value(newVal) {
    this._object[this._key] = newVal;
  }
}
export function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
export function unRef(target) {
  /**
   * 自动解包 ref
   * 如果这个 target[key] 是一个 ref，那就返回 ref.value，否则返回 target[key]
   */
  return isRef(target) ? target.value : target;
}
export function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      return unRef(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      /**
       * 如果更新了 state.a 它之前是个 ref，那么会修改原始的 ref.value 的值 等于 newValue
       * 如果 newValue 是一个 ref，那就算了
       */
      if (isRef(oldValue) && !isRef(value)) {
        /**
         * const a = ref(0)
         * target = { a }
         * 更新 target.a = 1 ，它就等于更新了 a.value
         * a.value = 1
         */
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}
