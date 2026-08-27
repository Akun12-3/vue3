// packages/reactivity/src/system.ts
var linkPool;
function link(dep, sub) {
  const currentDep = sub.depsTail;
  const nextDep = currentDep === void 0 ? sub.deps : currentDep.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }
  let newLink;
  if (linkPool) {
    newLink = linkPool;
    linkPool = linkPool.nextDep;
    newLink.nextDep = nextDep;
    newLink.nextSub = void 0;
    newLink.prevSub = void 0;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      sub,
      dep,
      nextDep,
      nextSub: void 0,
      prevSub: void 0
    };
  }
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink;
    newLink.prevSub = dep.subsTail;
    dep.subsTail = newLink;
  } else {
    dep.subs = newLink;
    dep.subsTail = newLink;
  }
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink;
    sub.depsTail = newLink;
  } else {
    sub.deps = newLink;
    sub.depsTail = newLink;
  }
}
function processComputedUpdate(sub) {
  if (sub.subs && sub.update()) {
    propagate(sub.subs);
  }
}
function propagate(subs) {
  let link2 = subs;
  let queuedEffect = [];
  while (link2) {
    const sub = link2.sub;
    if (!sub.tracking && !sub.dirty) {
      sub.dirty = true;
      if ("update" in sub) {
        processComputedUpdate(sub);
      } else {
        queuedEffect.push(sub);
      }
    }
    link2 = link2.nextSub;
  }
  queuedEffect.forEach((effect2) => effect2.notify());
}
function startTrack(sub) {
  sub.tracking = true;
  sub.depsTail = void 0;
}
function endTrack(sub) {
  sub.tracking = false;
  sub.dirty = false;
  const depsTail = sub.depsTail;
  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = void 0;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = void 0;
  }
}
function clearTracking(link2) {
  while (link2) {
    const { prevSub, nextSub, nextDep, dep } = link2;
    if (prevSub) {
      prevSub.nextSub = nextSub;
      link2.nextSub = void 0;
    } else {
      dep.subs = nextSub;
    }
    if (nextSub) {
      nextSub.prevSub = prevSub;
      link2.prevSub = void 0;
    } else {
      dep.subsTail = prevSub;
    }
    link2.dep = link2.sub = void 0;
    link2.nextDep = linkPool;
    linkPool = link2;
    link2 = nextDep;
  }
}

// packages/reactivity/src/effect.ts
var activeSub;
function setActiveSub(sub) {
  activeSub = sub;
}
function effect(fn, options) {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = () => e.run();
  runner.effect = e;
  return runner;
}
var ReactiveEffect = class {
  constructor(fn) {
    this.fn = fn;
    // 表示这个 effect 是否激活
    this.active = true;
    this.tracking = false;
    this.dirty = false;
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
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
};

// packages/shared/src/index.ts
function isObject(val) {
  return typeof val === "object" && val !== null;
}
function hasChanged(newVal, oldVal) {
  return !Object.is(newVal, oldVal);
}
function isFunction(val) {
  return typeof val === "function";
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return new RefImpl(value);
}
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REF"] = "__v_isRef";
  return ReactiveFlags2;
})(ReactiveFlags || {});
var _a;
_a = "__v_isRef" /* IS_REF */;
var RefImpl = class {
  constructor(value) {
    // ref 标记，证明是一个 ref
    this[_a] = true;
    this._value = value;
  }
  get value() {
    if (activeSub) {
      trackRef(this);
    }
    return this._value;
  }
  set value(newVal) {
    if (hasChanged(newVal, this._value)) {
      this._value = newVal;
      triggerRef(this);
    }
  }
};
function trackRef(dep) {
  if (activeSub) {
    link(dep, activeSub);
  }
}
function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}
function isRef(target) {
  return target && target["__v_isRef" /* IS_REF */];
}

// packages/reactivity/src/computed.ts
var _a2;
_a2 = "__v_isRef" /* IS_REF */;
var ComputedRefImpl = class {
  constructor(fn, setter) {
    this.fn = fn;
    this.setter = setter;
    // computed 也是一个 ref，通过 isRef 也返回 true
    this[_a2] = true;
    //endregion
    this.tracking = false;
    //endregion
    // 计算属性，脏不脏，如果 dirty 为 true，表示计算属性是脏的，get value 的时候，需要执行 update
    this.dirty = true;
  }
  get value() {
    if (activeSub) {
      trackRef(this);
    }
    if (this.dirty) {
      this.update();
    }
    return this._value;
  }
  set value(newVal) {
    if (typeof this.setter === "function") {
      this.setter(newVal);
    } else {
      console.warn("\u6211\u662F\u53EA\u8BFB\u7684\uFF0C\u4F60\u522B\u778E\u73A9\u4E86");
    }
  }
  update() {
    const prevSub = activeSub;
    setActiveSub(this);
    startTrack(this);
    try {
      const oldValue = this._value;
      this._value = this.fn();
      return hasChanged(this._value, oldValue);
    } finally {
      endTrack(this);
      setActiveSub(prevSub);
    }
  }
};
function computed(getterOrOptions) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/reactivity/src/dep.ts
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeSub) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, dep = new Dep());
  }
  link(dep, activeSub);
}
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (!dep) return;
  propagate(dep.subs);
}
var Dep = class {
  constructor() {
  }
};

// packages/reactivity/src/reactive.ts
function reactive(target) {
  return createReactiveObject(target);
}
var reactiveMap = /* @__PURE__ */ new WeakMap();
var reactiveSet = /* @__PURE__ */ new WeakSet();
function createReactiveObject(target) {
  if (!isObject(target)) {
    return;
  }
  if (reactiveSet.has(target)) {
    return target;
  }
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const proxy = new Proxy(target, {
    get(target2, key, receiver) {
      track(target2, key);
      const res = Reflect.get(target2, key, receiver);
      if (isRef(res)) {
        return res.value;
      }
      if (res && isObject(res)) {
        return reactive(res);
      }
      return res;
    },
    set(target2, key, newValue, receiver) {
      const oldValue = target2[key];
      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue;
        return true;
      }
      const res = Reflect.set(target2, key, newValue, receiver);
      if (hasChanged(newValue, oldValue)) {
        trigger(target2, key);
      }
      return res;
    }
  });
  reactiveMap.set(target, proxy);
  reactiveSet.add(proxy);
  return proxy;
}
function isReactive(target) {
  return reactiveSet.has(target);
}
export {
  ReactiveEffect,
  ReactiveFlags,
  activeSub,
  computed,
  effect,
  isReactive,
  isRef,
  reactive,
  ref,
  setActiveSub,
  trackRef,
  triggerRef
};
//# sourceMappingURL=reactivity.esm.js.map
