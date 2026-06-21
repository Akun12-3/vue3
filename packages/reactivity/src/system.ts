// 保存已经被清理掉的节点，留着复用
let linkPool: Link
/**
 * 依赖项
 */
export interface Dependency {
    // 订阅者链表的头节点
    subs: Link | undefined
    // 订阅者链表的尾节点
    subsTail: Link | undefined
}

/**
 * 订阅者
 */
export interface Sub {
    // 依赖项链表的头节点
    deps: Link | undefined
    // 依赖项链表的尾节点
    depsTail: Link | undefined

    tracking: boolean
}

/**
 * 链表节点
 */
export interface Link {
    // 订阅者
    sub: Sub
    // 下一个订阅者节点
    nextSub: Link | undefined
    // 上一个订阅者节点
    prevSub: Link | undefined
    // 依赖项
    dep: Dependency

    // 下一个依赖项节点
    nextDep: Link | undefined
}
export function link (dep, sub){
    const currentDep = sub.depsTail
    /**
     * 分两种情况：
     * 1. 如果头节点有，尾节点没有，那么尝试着复用头节点
     * 2. 如果尾节点还有 nextDep，尝试复用尾节点的 nextDep
     */
    const nextDep = currentDep === undefined ? sub.deps : currentDep.nextDep
    if (nextDep && nextDep.dep === dep) {
        sub.depsTail = nextDep
        return
    }
    // 如果 activeSub 有，那就保存起来，等我更新的时候，触发
    let newLink: Link;
    /**
     * 看一下 linkPool 有没有，如果有，就复用
     */
    if (linkPool) {
        newLink = linkPool
        linkPool = linkPool.nextDep
        newLink.nextDep = nextDep
        newLink.nextSub = undefined   // +
        newLink.prevSub = undefined   // +
        newLink.dep = dep
        newLink.sub = sub
    } else {
        // 如果没有，就创建新的
        newLink = {
            sub,
            dep,
            nextDep,
            nextSub: undefined,
            prevSub: undefined,
        }
    }
    //region 将链表节点和 dep 建立关联关系
    /**
     * 关联链表关系，分两种情况
     * 1. 尾节点有，那就往尾节点后面加
     * 2. 如果尾节点没有，则表示第一次关联，那就往头节点加，头尾相同
     */
    if (dep.subsTail) {
        dep.subsTail.nextSub = newLink
        newLink.prevSub = dep.subsTail
        dep.subsTail = newLink
    } else {
        dep.subs = newLink
        dep.subsTail = newLink
    }
    //endregion

    //region 将链表节点和 sub 建立关联关系
    /**
     * 关联链表关系，分两种情况
     * 1. 尾节点有，那就往尾节点后面加
     * 2. 如果尾节点没有，则表示第一次关联，那就往头节点加，头尾相同
     */
    if (sub.depsTail) {
        sub.depsTail.nextDep = newLink
        sub.depsTail = newLink
    } else {
        sub.deps = newLink
        sub.depsTail = newLink
    }
    //endregion
}

export function propagate(subs:Link) {

    let link = subs
    let queuedEffect = []
    while (link) {
        const sub = link.sub
      if(!sub.tracking){
          queuedEffect.push(sub)
      }
        link = link.nextSub
    }
    queuedEffect.forEach(effect => effect.notify())
}


export function endTrack(sub){
    sub.tracking = false
    /**
     * depsTail 有，并且 depsTail 还有 nextDep ，我们应该把它们的依赖关系清理掉
     * depsTail 没有，并且头节点有，那就把所有的都清理掉
     */
    const depsTail = sub.depsTail
    if (depsTail) {
       if(depsTail.nextDep){
           clearTracking(depsTail.nextDep)
           depsTail.nextDep = undefined
       }
    } else if (sub.deps) {
        clearTracking(sub.deps)
        sub.deps = undefined
    }
}

function clearTracking(link:Link){
    while(link){
        const { prevSub, nextSub, nextDep, dep } = link
        /**
         * 如果 prevSub 有，那就把 prevSub 的下一个节点，指向当前节点的下一个
         * 如果没有，那就是头节点，那就把 dep.subs 指向当前节点的下一个
         */
        if(prevSub){
            prevSub.nextSub = nextSub
            link.nextSub = undefined
        }else{
            dep.subs = nextSub
        }
        /**
         * 如果下一个有，那就把 nextSub 的上一个节点，指向当前节点的上一个节点
         * 如果下一个没有，那它就是尾节点，把 dep.depsTail 只想上一个节点
         */
        if(nextSub){
            nextSub.prevSub = prevSub
            link.prevSub = undefined
        }else{
            dep.subsTail = prevSub
        }

        /**
         * 把不要的节点给 linkPool，让它去复用吧
         */
        link.dep = link.sub = undefined
        link.nextDep = linkPool
        linkPool = link
        link = nextDep
    }
}