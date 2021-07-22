
// 判断render是首次还是非首次触发
let isMount = true
// workInProgressHook 保存了当前组件所有hook，并用链表的形式保证按顺序调用
let workInProgressHook = null

const fiber = {
    // 保存节点
    stateNode: App,
    // 每个fiber节点上保存的信息，这里是hook信息
    memoizedState: null
}

// 模拟简单的调度过程
function schedule() {
    // 重置workInProgress为fiber保存的第一个hook
    workInProgressHook = fiber.memoizedState
    // 触发组件render
    const app = fiber.stateNode()
    //组件首次render是mount，之后触发更新为update
    isMount = false
    return app
}

function useState(initState) {
    // 保存当前useState使用的hook
    let hook;

    // 1. 处理保存hook
    if (isMount) {
        // mount时需要生成hook对象
        hook = { //hook是链表
            // 初始值
            memoizedState: initState,
            // 极简版本没用到hook.next
            next: null,
            //保存多个update，例如onclick中调用三次updateNum方法
            queue: {
                pending: null
            }
        }

        // 将hook插入fiber.memoizedState的末尾
        if (!fiber.memoizedState) {
            fiber.memoizedState = hook
        } else {
            // 同时调用 多个useState 时进入else 
            // workInProgressHook 保存了当前组件所有hook，并用链表的形式保证按顺序调用
            workInProgressHook.next = hook
        }
        // 移动workInProgress指针
        workInProgressHook = hook
    } else {
        // update时需要从workInProgress中取出该useState对应的hook 
        hook = workInProgressHook
        // 链表操作，获取下一个hook
        workInProgressHook = workInProgressHook.next
    }

    //2. 处理更新-破开update环状单向链表
    // update前初始值
    let baseState = hook.memoizedState

    if (hook.queue.pending) {
        // 获取update链表中第一个update
        let firstUpdate = hook.queue.pending.next

        do {
            // 执行update action
            const action = firstUpdate.action
            // 获取action后baseState
            baseState = action(baseState)
            firstUpdate = firstUpdate.next
            //执行完最后一个update 跳出循环
        } while (firstUpdate !== hook.queue.pending.next)

        //清空hook.queue.pending
        hook.queue.pending = null
    }

    hook.memoizedState = baseState
    return [baseState, dispatchAction.bind(null, hook.queue)]
}

// 实际调用的函数
function dispatchAction(queue, action) {
    // 创建update,action保存实际需要回掉函数
    const update = {
        action,
        next: null
    }

    // 环状单向链表-> 为了优先级优化
    if (queue.pending === null) {
        // 第一次进入更新 u0->u0->u0 
        update.next = update
    } else {
        // u1->u0->u1
        update.next = queue.pending.next
        queue.pending.next = update

    }
    queue.pending = update

    // 模拟调度更新
    schedule()
}




// 实际调用组件
function App() {
    const [num, updateNum] = useState(0)
    const [num1, updateNum1] = useState(0)

    console.log('isMount,', isMount, num, num1)

    return {
        click() {
            updateNum(num => num + 1)
            updateNum(num => num + 5)
        },
        focus() {
            updateNum1(num1 => num1 + 10)
        }
    }
}

window.app = schedule()