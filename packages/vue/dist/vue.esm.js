// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  // 插入节点
  insert(el, parent, anchor) {
    parent.insertBefore(el, anchor || null);
  },
  // 创建元素
  createElement(type) {
    return document.createElement(type);
  },
  // 移除元素
  remove(el) {
    const parentNode = el.parentNode;
    if (parentNode) {
      parentNode.removeChild(el);
    }
  },
  // 设置元素的 text
  setElementText(el, text) {
    el.textContent = text;
  },
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text);
  },
  // 设置 nodeValue
  setText(node, text) {
    return node.nodeValue = text;
  },
  // 获取到父节点
  parentNode(el) {
    return el.parentNode;
  },
  // 获取到下一个兄弟节点
  nextSibling(el) {
    return el.nextSibling;
  },
  // dom 查询
  querySelector(selector) {
    return document.querySelector(selector);
  }
};

// packages/runtime-dom/src/modules/patchClass.ts
function patchClass(el, value) {
  if (value == void 0) {
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/shared/src/utils.ts
function isObject(val) {
  return typeof val === "object" && val !== null;
}
function hasChanged(newVal, oldVal) {
  return !Object.is(newVal, oldVal);
}
function isFunction(val) {
  return typeof val === "function";
}
function isArray(val) {
  return Array.isArray(val);
}
function isString(val) {
  return typeof val === "string";
}
function isNumber(val) {
  return typeof val === "number";
}

// packages/runtime-dom/src/modules/patchStyle.ts
function patchStyle(el, prevValue, nextValue) {
  const style = el.style;
  if (nextValue) {
    if (isString(nextValue)) {
      el.setAttribute("style", nextValue);
    } else {
      for (const key in nextValue) {
        style[key] = nextValue[key];
      }
    }
  }
  if (prevValue) {
    for (const key in prevValue) {
      if (nextValue?.[key] == null) {
        style[key] = null;
      }
    }
  }
}

// packages/runtime-dom/src/modules/event.ts
function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e);
  };
  invoker.value = value;
  return invoker;
}
var veiKey = /* @__PURE__ */ Symbol("_vei");
function patchEvent(el, rawName, nextValue) {
  const name = rawName.slice(2).toLowerCase();
  const invokers = el[veiKey] ??= {};
  const existingInvoker = invokers[rawName];
  if (nextValue) {
    if (existingInvoker) {
      existingInvoker.value = nextValue;
      return;
    }
    const invoker = createInvoker(nextValue);
    invokers[rawName] = invoker;
    el.addEventListener(name, invoker);
  } else {
    if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[rawName] = void 0;
    }
  }
}

// packages/runtime-dom/src/modules/patchAttr.ts
function patchAttr(el, key, value) {
  if (value == void 0) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/patchProp.ts
function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  }
  if (key === "style") {
    return patchStyle(el, prevValue, nextValue);
  }
  if (/^on[A-Z]/.test(key)) {
    return patchEvent(el, key, nextValue);
  }
  patchAttr(el, key, nextValue);
}

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
var _a2;
_a2 = "__v_isRef" /* IS_REF */;
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this[_a2] = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newVal) {
    this._object[this._key] = newVal;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function unRef(target) {
  return isRef(target) ? target.value : target;
}
function proxyRefs(target) {
  return new Proxy(target, {
    get(target2, key, receiver) {
      return unRef(Reflect.get(target2, key, receiver));
    },
    set(target2, key, value, receiver) {
      const oldValue = target2[key];
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target2, key, value, receiver);
    }
  });
}

// packages/reactivity/src/computed.ts
var _a3;
_a3 = "__v_isRef" /* IS_REF */;
var ComputedRefImpl = class {
  constructor(fn, setter) {
    this.fn = fn;
    this.setter = setter;
    // computed 也是一个 ref，通过 isRef 也返回 true
    this[_a3] = true;
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
  if (isArray(target) && key === "length") {
    const length = target.length;
    depsMap.forEach((dep, depKey) => {
      if (depKey >= length || depKey === "length") {
        propagate(dep.subs);
      }
    });
  } else {
    const dep = depsMap.get(key);
    if (!dep) return;
    propagate(dep.subs);
  }
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

// packages/runtime-core/src/vnode.ts
function isVNode(value) {
  return value?.__v_isVNode;
}
var Text = /* @__PURE__ */ Symbol("v-txt");
function normalizeVNode(vnode) {
  if (isString(vnode) || isNumber(vnode)) {
    return createVNode(Text, null, String(vnode));
  }
  return vnode;
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children) {
  let shapeFlag = 0;
  if (isString(type)) {
    shapeFlag = 1 /* ELEMENT */;
  } else if (isObject(type)) {
    shapeFlag = 4 /* STATEFUL_COMPONENT */;
  }
  if (isArray(children)) {
    shapeFlag |= 16 /* ARRAY_CHILDREN */;
  } else if (isNumber(children) || isString(children)) {
    children = String(children);
    shapeFlag |= 8 /* TEXT_CHILDREN */;
  }
  const vnode = {
    // 证明我是一个虚拟节点
    __v_isVNode: true,
    type,
    props,
    children,
    // 做 diff 用的
    key: props?.key,
    // 虚拟节点要挂载的元素
    el: null,
    shapeFlag
  };
  return vnode;
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  let l = arguments.length;
  if (l === 2) {
    if (isArray(propsOrChildren)) {
      return createVNode(type, null, propsOrChildren);
    }
    if (isObject(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren, children);
    }
    return createVNode(type, null, propsOrChildren);
  } else {
    if (l > 3) {
      children = [...arguments].slice(2);
    } else if (isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-core/src/apiCreateApp.ts
function createAppAPI(render2) {
  return function createApp2(rootComponent, rootProps) {
    const app = {
      _container: null,
      mount(container) {
        const vnode = h(rootComponent, rootProps);
        render2(vnode, container);
        app._container = container;
      },
      unmount() {
        render2(null, app._container);
      }
    };
    return app;
  };
}

// packages/runtime-core/src/renderer.ts
function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = options;
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };
  const unmount = (vnode) => {
    const { el, children, shapeFlag } = vnode;
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      unmountChildren(children);
    }
    const remove = () => {
      vnode.el && hostRemove(vnode.el);
    };
    remove();
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      const el = hostCreateText(n2.children);
      n2.el = el;
      hostInsert(el, container, anchor);
    } else {
      n2.el = n1.el;
      if (n1.children != n2.children) {
        hostSetText(n2.el, n2.children);
      }
    }
  };
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i] = normalizeVNode(children[i]);
      patch(null, child, container, null);
    }
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    const el = hostCreateElement(type);
    vnode.el = el;
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };
  const patchElement = (n1, n2) => {
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2);
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = hostNextSibling(n1.el);
      unmount(n1);
      n1 = null;
    }
    const { shapeFlag, type } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        }
    }
  };
  const render2 = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render: render2,
    createApp: createAppAPI(render2)
  };
}

// packages/runtime-dom/src/index.ts
var renderOptions = { patchProp, ...nodeOps };
var renderer = createRenderer(renderOptions);
function render(vnode, container) {
  renderer.render(vnode, container);
}
function createApp(rootComponent, rootProps) {
  const app = renderer.createApp(rootComponent, rootProps);
  const _mount = app.mount.bind(app);
  function mount(selector) {
    let el = selector;
    if (isString(selector)) {
      el = document.querySelector(selector);
    }
    _mount(el);
  }
  app.mount = mount;
  return app;
}
export {
  ReactiveEffect,
  ReactiveFlags,
  Text,
  activeSub,
  computed,
  createApp,
  createRenderer,
  createVNode,
  effect,
  h,
  isReactive,
  isRef,
  isSameVNodeType,
  isVNode,
  normalizeVNode,
  proxyRefs,
  reactive,
  ref,
  render,
  setActiveSub,
  toRef,
  trackRef,
  triggerRef,
  unRef
};
//# sourceMappingURL=vue.esm.js.map
