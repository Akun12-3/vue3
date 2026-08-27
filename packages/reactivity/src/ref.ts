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
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
