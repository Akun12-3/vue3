export function reactive(target) {
    return createReactiveObject(target)
}

/**
 * 保存 target 和 响应式对象之间的关联关系
 * target => proxy
 */
const reactiveMap = new WeakMap()
/**
 * 保存所有使用 reactive 创建出来的响应式对象
 */
const reactiveSet = new WeakSet()