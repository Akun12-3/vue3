import {activeSub} from "./effect";
import {Link, link, propagate} from './system'

export function ref(value: any) {
    return new RefImpl(value);
}

export enum ReactiveFlags {
    IS_REF = '__v_isRef',
}

class RefImpl {
    subs: Link;
    subsTail: Link;
    // ref 标记，证明是一个 ref
    [ReactiveFlags.IS_REF] = true

    constructor(value: any) {
        this._value = value;
    }

    _value: any;
    get value() {
        if (activeSub) {
            trackRef(this)
        }
        return this._value;
    }

    set value(newVal) {
        this._value = newVal;
        triggerRef(this)

    }
}

/**
 * 收集依赖，建立 ref 和 effect 之间的链表关系
 * @param dep
 */
export function trackRef(dep) {
    if (activeSub) {
        link(dep, activeSub)
    }
}

/**
 * 触发 ref 关联的 effect 重新执行
 * @param dep
 */
export function triggerRef(dep) {
    if (dep.subs) {
        propagate(dep.subs)
    }
}

export function isRef(target) {
    return target && target[ReactiveFlags.IS_REF]
}