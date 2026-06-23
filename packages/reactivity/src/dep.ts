import {Link, link, propagate} from './system'
import {activeSub} from './effect'

const targetMap = new WeakMap()

export function track(target, key) {
    if (!activeSub) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Dep()))
    }
    link(dep, activeSub)
}

export function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return
    /**
     * 找到 dep 的 subs 通知它们重新执行
     */
    propagate(dep.subs)
}

class Dep {
    subs: Link | undefined
    subsTail: Link | undefined

    constructor() {
    }
}