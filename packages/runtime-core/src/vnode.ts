import { ShapeFlags, isString, isObject, isNumber, isArray } from "@vue/shared";
/**
 * 判断是不是一个虚拟节点，根据 __v_isVNode 属性
 * @param value
 */
export function isVNode(value) {
  return value?.__v_isVNode;
}
/**
 * 文本节点标记
 */
export const Text = Symbol("v-txt");
export function normalizeVNode(vnode) {
  if (isString(vnode) || isNumber(vnode)) {
    // 如果是 string 或者 number 转换成文本节点

    return createVNode(Text, null, String(vnode));
  }

  return vnode;
}
export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
export function createVNode(type, props?, children?) {
  let shapeFlag = 0;
  //region 处理 type 的 shapeFlag
  if (isString(type)) {
    // div span p h1
    shapeFlag = ShapeFlags.ELEMENT;
  } else if (isObject(type)) {
    // 有状态的组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
  }
  if (isArray(children)) {
    /**
     * children = [h('p','hello'),h('p','world')]
     */
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (isNumber(children) || isString(children)) {
    // 如果 children 是 number 给它转换成字符串
    children = String(children);
    shapeFlag |= ShapeFlags.TEXT_CHILDREN;
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
    shapeFlag,
  };

  return vnode;
}
