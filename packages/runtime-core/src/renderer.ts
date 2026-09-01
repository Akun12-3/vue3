import {ShapeFlags} from "@vue/shared";
import {normalizeVNode, Text, isSameVNodeType} from "./vnode";
import {createAppAPI} from "./apiCreateApp";

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
        const {el, children, shapeFlag} = vnode;
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
        const {type, props, children, shapeFlag} = vnode;
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
    const patchElement = (n1, n2) => {
        const el = (n2.el = n1.el);
        const oldProps = n1.props
        const newProps = n2.props
        patchProps(el, oldProps, newProps)
        patchChildren(n1, n2, el)
    };
    const patchChildren = (n1, n2) => {
        const el = n2.el
        /**
         * 1. 新节点它的子节点是 文本
         *   1.1 老的是数组
         *   1.2 老的也是文本
         * 2. 新节点的子节点是 数组 或者 null
         *   2.1 老的是文本
         *   2.2 老的也是数组
         *   2.3 老的可能是 null
         */
        const prevShapeFlag = n1.shapeFlag
        const shapeFlag = n2.shapeFlag
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unmountChildren(n1.children)
            }
            if (n1.children !== n2.children) {
                // 设置文本，如果n1和n2的children不一样
                hostSetElementText(el, n2.children)
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(el, '')
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 挂载新的节点
                    mountChildren(n2.children, el)
                }
            } else {
                if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        patchKeyedChildren(n1.children, n2.children, el)
                    } else {
                        unmountChildren(n1.children)
                    }
                } else {
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        mountChildren(n2.children, el)
                    }
                }
            }
        }
    };
    const patchKeyedChildren = (c1, c2, container) => {
        /**
         * 全量 diff
         *
         * 1. 双端 diff
         *
         * 1.1 头部对比
         * c1 => [a, b]
         * c2 => [a, b, c, d]
         *
         * 开始时：i = 0, e1 = 1, e2 = 3
         * 结束时：i = 2, e1 = 1, e2 = 3
         *
         * 1.2 尾部对比
         * c1 => [a, b]
         * c2 => [c, d, a, b]
         * 开始时：i = 0, e1 = 1, e2 = 3
         * 结束时：i = 0，e1 = -1, e2 = 1
         *
         * 根据双端对比，得出结论：
         * i > e1 表示老的少，新的多，要挂载新的，挂载的范围是 i - e2
         * i > e2 的情况下，表示老的多，新的少，要把老的里面多余的卸载掉，卸载的范围是 i - e1
         *
         * 2. 乱序
         * c1 => [a, (b, c, d), e]
         * c2 => [a, (c, d, b), e]
         * 开始时：i = 0, e1 = 4, e2 = 4
         * 双端对比完结果：i = 1, e1 = 3, e2 = 3
         *
         */
            // 开始对比的下标
        let i = 0

        // 老的子节点的最后一个元素的下标
        let e1 = c1.length - 1

        // 新的子节点的最后一个元素的下标
        let e2 = c2.length - 1
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = (c2[i] = normalizeVNode(c2[i]))

            if (isSameVNodeType(n1, n2)) {
                // 如果 n1 和 n2 是同一个类型的子节点，那就可以更新，更新完了，对比下一个
                patch(n1, n2, container, null)
            } else {
                break
            }

            i++
        }
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = (c2[e2] = normalizeVNode(c2[e2]))

            if (isSameVNodeType(n1, n2)) {
                // 如果 n1 和 n2 是同一个类型的子节点，那就可以更新，更新完了之后，对比上一个
                patch(n1, n2, container, null)
            } else {
                break
            }
            // 更新尾指针
            e1--
            e2--
        }
        if (i > e1) {
            /**
             * 根据双端对比，得出结论：
             * i > e1 表示老的少，新的多，要挂载新的，挂载的范围是 i - e2
             */

            const nextPos = e2 + 1

            const anchor = nextPos < c2.length ? c2[nextPos].el : null

            while (i <= e2) {
                patch(
                    null,
                    (c2[i] = normalizeVNode(c2[i])),
                    container,
                    anchor,
                )
                i++
            }
        } else if (i > e2) {
            /**
             * 根据双端对比，得出结果：
             * i > e2 的情况下，表示老的多，新的少，要把老的里面多余的卸载掉，卸载的范围是 i - e1
             */
            while (i <= e1) {
                unmount(c1[i])
                i++
            }
        } else {
            /**
             * 2. 乱序
             * c1 => [a, (b, c, d), e]
             * c2 => [a, (c, d, b), e]
             * 开始时：i = 0, e1 = 4, e2 = 4
             * 双端对比完结果：i = 1, e1 = 3, e2 = 3
             *
             * 找到 key 相同的 虚拟节点，让它们 patch 一下
             */

                // 老的子节点开始查找的位置 s1 - e1
            let s1 = i
            // 新的子节点开始查找的位置 s2 - e2
            let s2 = i

            /**
             * 做一份新的子节点的key和index之间的映射关系
             * map = {
             *   c:1,
             *   d:2,
             *   b:3
             * }
             */
            const keyToNewIndexMap = new Map()

            const newIndexToOldIndexMap = new Array(e2 - s2 + 1)
            // -1 代表不需要计算的
            newIndexToOldIndexMap.fill(-1)

            /**
             * 遍历新的 s2 - e2 之间，这些是还没更新的，做一份 key => index map
             */
            for (let j = s2; j <= e2; j++) {
                const n2 = (c2[j] = normalizeVNode(c2[j]))
                keyToNewIndexMap.set(n2.key, j)
            }

            let pos = -1
            // 是否需要移动
            let moved = false

            /**
             * 遍历老的子节点
             */
            for (let j = s1; j <= e1; j++) {
                const n1 = c1[j]
                // 看一下这个key在新的里面有没有
                const newIndex = keyToNewIndexMap.get(n1.key)
                if (newIndex != null) {
                    if (newIndex > pos) {
                        // 如果每一次都是比上一次的大，表示就是连续递增的，不需要算
                        pos = newIndex
                    } else {
                        // 如果突然有一天比上一次的小了，表示需要移动了
                        moved = true
                    }
                    newIndexToOldIndexMap[newIndex] = j
                    // 如果有，就怕patch
                    patch(n1, c2[newIndex], container, null)
                } else {
                    // 如果没有，表示老的有，新的没有，需要卸载
                    unmount(n1)
                }
            }
            // 如果 moved 为 false，表示不需要移动，就别算了
            const newIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            // 换成 Set 性能好一点
            const sequenceSet = new Set(newIndexSequence)

            /**
             * 1. 遍历新的子元素，调整顺序，倒序插入
             * 2. 新的有，老的没有的，我们需要重新挂载
             */
            for (let j = e2; j >= s2; j--) {
                /**
                 * 倒序插入
                 */
                const n2 = c2[j]
                // 拿到它的下一个子元素
                const anchor = c2[j + 1]?.el || null
                if (n2.el) {
                    if (moved) {
                        // 如果需要移动，再进去
                        // 如果 j 不在最长递增子序列中，表示需要移动
                        if (!sequenceSet.has(j)) {
                            // 依次进行倒序插入，保证顺序的一致性
                            hostInsert(n2.el, container, anchor)
                        }
                    }
                } else {
                    // 新的有，老的没有，重新挂载
                    patch(null, n2, container, anchor)
                }
            }
        }
    };
    const patchProps = (el, oldProps, newProps) => {
        if (newProps) {
            for (const key in newProps) {
                if (newProps[key] !== oldProps?.[key]) {
                    hostPatchProp(el, key, oldProps[key], newProps[key]);
                }
            }
        }
        if (oldProps) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    };

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

        const {shapeFlag, type} = n2;
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


/**
 * 求最长递增子序列
 */
function getSequence(arr) {
    const result = []
    // 记录前驱节点
    const map = new Map()

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        // -1 不在计算范围内
        if (item === -1 || item === undefined) continue

        if (result.length === 0) {
            // 如果 result 里面一个都没有，把当前的索引放进去
            result.push(i)
            continue
        }

        const lastIndex = result[result.length - 1]
        const lastItem = arr[lastIndex]

        if (item > lastItem) {
            // 如果当前这一项大于上一个，那么就直接把索引放到 result 中
            result.push(i)
            // 记录前驱节点
            map.set(i, lastIndex)
            continue
        }
        // item 小于 lastItem

        let left = 0
        let right = result.length - 1

        while (left < right) {
            const mid = Math.floor((left + right) / 2)
            // 拿到中间项
            const midItem = arr[result[mid]]
            if (midItem < item) {
                left = mid + 1
            } else {
                right = mid
            }
        }

        if (arr[result[left]] > item) {
            if (left > 0) {
                // 记录前驱节点
                map.set(i, result[left - 1])
            }
            // 找到最合适的，把索引替换进去
            result[left] = i
        }
    }

    // 反向追溯
    let l = result.length
    let last = result[l - 1]

    while (l > 0) {
        l--
        // 纠正顺序
        result[l] = last
        // 去前驱节点里面找
        last = map.get(last)
    }

    return result
}