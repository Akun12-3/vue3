import { endTrack, Link, startTrack } from "./system";

export let activeSub;

export function setActiveSub(sub) {
  activeSub = sub;
}

export function effect(fn, options) {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = () => e.run();
  runner.effect = e;
  return runner;
}

export class ReactiveEffect {
  // 表示这个 effect 是否激活
  active = true;
  deps: Link;
  depsTail: Link;
  tracking = false;
  dirty = false;

  constructor(public fn) {}

  run() {
    if (!this.active) {
      return this.fn();
    }
    // 先将当前的 effect 保存起来，用来处理嵌套的逻辑
    const prevSub = activeSub;
    setActiveSub(this);
    startTrack(this);
    try {
      return this.fn();
    } finally {
      endTrack(this);
      setActiveSub(prevSub);
    }
  }

  /**
   * 默认调用 run，如果用户传了，那以用户的为主，实例属性的优先级，由于原型属性
   */
  scheduler() {
    this.run();
  }

  /**
   * 通知更新的方法，如果依赖的数据发生了变化，会调用这个函数
   */
  notify() {
    this.scheduler();
  }
  stop() {
    startTrack(this);
    endTrack(this);
    this.active = false;
  }
}
