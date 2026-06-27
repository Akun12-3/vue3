import {endTrack, Link, startTrack} from './system'

export let activeSub;

export function setActiveSub(sub) {
    activeSub = sub
}

export function effect(fn, options) {
    const e = new ReactiveEffect(fn);
    Object.assign(e, options);
    e.run();
    const runner = () => e.run()
    runner.effect = e
    return runner
}

class ReactiveEffect {
    deps: Link;
    depsTail: Link;
    tracking = false;

    constructor(public fn) {
    }

    run() {
        // 先将当前的 effect 保存起来，用来处理嵌套的逻辑
        const prevSub = activeSub
        setActiveSub(this)
        startTrack(this)
        try {
            return this.fn()
        } finally {
            endTrack(this)
            setActiveSub(prevSub)
        }
    }

    /**
     * 默认调用 run，如果用户传了，那以用户的为主，实例属性的优先级，由于原型属性
     */
    scheduler() {
        this.run()
    }

    /**
     * 通知更新的方法，如果依赖的数据发生了变化，会调用这个函数
     */
    notify() {
        this.scheduler()
    }
}

