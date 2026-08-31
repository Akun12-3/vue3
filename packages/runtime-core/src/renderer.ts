import { ShapeFlags } from "@vue/shared";
import { normalizeVNode, Text, isSameVNodeType } from "./vnode";
import { createAppAPI } from "./apiCreateApp";
export function createRenderer(options) {
  // 提供虚拟节点 渲染到页面上的功能

  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = options;
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };
  const unmount = (vnode) => {
    const { el, children, shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组

      unmountChildren(children);
    }
    const remove = () => {
      // 移除 dom 元素
      vnode.el && hostRemove(vnode.el);
    };
    remove();
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 挂载文本节点
      const el = hostCreateText(n2.children);
      n2.el = el;
      hostInsert(el, container, anchor);
    } else {
      n2.el = n1.el;
      if (n1.children != n2.children) {
        // 如果文本内容变了，就更新
        hostSetText(n2.el, n2.children);
      }
    }
  };
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]));
      patch(null, child, container, null);
    }
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    // 创建 dom 元素 type = div p span
    const el = hostCreateElement(type);
    vnode.el = el;
    // 把 el 插入到 container 中
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };
  const patchElement = (n1, n2) => {};
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 挂载
      mountElement(n2, container, anchor);
    } else {
      // 更新
      patchElement(n1, n2);
    }
  };

  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) {
      // 如果两次传递了同一个虚拟节点，啥都不干
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 卸载 n1 之前，拿到 n1 的下一个节点，挂载的时候，将 n2 挂载到 n1 之前的位置
      anchor = hostNextSibling(n1.el);
      // 比如说 n1 是 div ，n2 是 span，这俩就不一样，或者 n1 的 key 是1，n2 的 key 是 2，也不一样，都要卸载掉 n1
      // 如果两个节点不是同一个类型，那就卸载 n1 直接挂载 n2
      unmount(n1);
      n1 = null;
    }

    const { shapeFlag, type } = n2;
    switch (type) {
      case Text:
        // 处理文本节点
        processText(n1, n2, container, anchor);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理 dom 元素 div span p h1
          // 元素可能它的子节点是一个组件 <div> <Child/> </div>
          processElement(n1, n2, container, anchor);
        }
    }
  };
  const render = (vnode, container) => {
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
    render,
    createApp: createAppAPI(render),
  };
}
