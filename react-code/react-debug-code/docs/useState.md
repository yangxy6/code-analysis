# useState

调用顺序：beginWork->renderWithHooks(workInProgress传入)->HooksDispatcherOnUpdateInDEV/HooksDispatcherOnMountInDEV

```js
// renderWithHooks
export function renderWithHooks<Props, SecondArg>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes; // 获取下次render优先级
  currentlyRenderingFiber = workInProgress; //workInProgress赋值最近Fiber对象

  // 清空workInProgress
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

 // 根据current确定调用哪个阶段，mount和update分开
  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate; // 确定是调用mount阶段hook还是update阶段hook

  return children;
}
```

# mount 阶段
```js
//ReactFiberHooks.old.js
// mount阶段useState 具体实现
function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  const hook = mountWorkInProgressHook(); //获取work hook
  if (typeof initialState === 'function') {
    // 惰性state初始化
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue = (hook.queue = {
    pending: null, // 保存一个多次调用update
    interleaved: null,// 优化相关
    lanes: NoLanes,// 优化相关，优先级
    dispatch: null, // useState中action
    lastRenderedReducer: basicStateReducer,// 优化相关
    lastRenderedState: (initialState: any), // 优化相关
  });
  const dispatch: Dispatch<
    BasicStateAction<S>,
    > = (queue.dispatch = (dispatchAction.bind(// 定义更新state的dispatch方法，环状更新
    null,
    currentlyRenderingFiber,
    queue,
  ): any));
  return [hook.memoizedState, dispatch];
}
// 此时hook结构
// hook={
//     initialState: 0,
//     baseQueue: null
//     baseState: 0
//     memoizedState: 0
//     next: null,
//     queue:{
//        dispatch: ƒ ()
//        interleaved: null
//        lanes: 0
//        lastRenderedReducer: ƒ basicStateReducer(state, action)
//        lastRenderedState: 0
//         pending: null
//     }
//   }
```

```js
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {// Hook 定义
    memoizedState: null,

    baseState: null,
    baseQueue: null,
    queue: null,

    next: null,// 链表操作，指向下一个hook
  };
  if (workInProgressHook === null) {
    // This is the first hook in the list  当前hook是第一个hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list 若不是第一个则插入workInProgressHook链表末尾
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

```js
// 更新操作时 Action
function dispatchAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
) {
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(fiber);

  const update: Update<S, A> = { //创建update数据
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: (null: any),
  };

  const alternate = fiber.alternate;
  // 环状单向链表更新
  if (pending === null) {
    // This is the first update. Create a circular list. 第一次更新，创建环状list u0->u0->u0
    update.next = update;
  } else {// u1->u0->u1
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  // 更新结束

  // 性能相关优化
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes === NoLanes)
  ) {
    const lastRenderedReducer = queue.lastRenderedReducer;
    if (lastRenderedReducer !== null) {
      let prevDispatcher;
      try {
        const currentState: S = (queue.lastRenderedState: any);
        const eagerState = lastRenderedReducer(currentState, action);
        update.eagerReducer = lastRenderedReducer;
        update.eagerState = eagerState;
        if (is(eagerState, currentState)) {
          return;
        }
      } catch (error) {
        // Suppress the error. It will throw again in the render phase.
      } finally {
        if (__DEV__) {
          ReactCurrentDispatcher.current = prevDispatcher;
        }
      }
    }
  }
    
    const root = scheduleUpdateOnFiber(fiber, lane, eventTime);// 调度更新

    // lane 车道 优先级相关
    if (isTransitionLane(lane) && root !== null) {
      let queueLanes = queue.lanes;
      queueLanes = intersectLanes(queueLanes, root.pendingLanes);
      const newQueueLanes = mergeLanes(queueLanes, lane);
      queue.lanes = newQueueLanes;
      markRootEntangled(root, newQueueLanes);
    }
  }

 

  if (enableSchedulingProfiler) {
    markStateUpdateScheduled(fiber, lane);
  }
}
```

# update阶段
```js
//HooksDispatcherOnUpdateInDEV 所有hook
 useState<S>(
      initialState: (() => S) | S,
    ): [S, Dispatch<BasicStateAction<S>>] {
      currentHookNameInDev = 'useState';
      updateHookTypesDev();
      const prevDispatcher = ReactCurrentDispatcher.current;
      ReactCurrentDispatcher.current = InvalidNestedHooksDispatcherOnUpdateInDEV;
      try {
        return updateState(initialState);
      } finally {
        ReactCurrentDispatcher.current = prevDispatcher;
      }
    },
```

```js
// updateState
function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, (initialState: any));
}
```

在updateState调用时，并不会传入reducer，默认传入basicStateReducer

```js
// update 时传入固定reducer，目的将action返回了
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}
```
updateReducer主要干的事：
1. 更新WorkInProgressHook
2. 处理未更新的pendingQueue->放到base队列中
3. 处理更新队列
4. 获取剩余车道
```js
// update更新时reducer
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  console.log('updateReducer')
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  queue.lastRenderedReducer = reducer;

  const current: Hook = (currentHook: any);

  let baseQueue = current.baseQueue;

  const pendingQueue = queue.pending;

  //2. 还没处理的更新（pending）更新到baseQueue  
   if (pendingQueue !== null) {
    if (baseQueue !== null) {
      // Merge the pending queue and the base queue. 交叉合并queue
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue; //将更新从pending放到basequeue
    queue.pending = null;//将未处理pending清空
  }
  // 3.处理更新queue，优先级低跳过，高的更新
  if (baseQueue !== null) {
    // We have a queue to process.
    const first = baseQueue.next;
    let newState = current.baseState;

    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    do {//先执行一次更新
      const updateLane = update.lane;
      if (!isSubsetOfLanes(renderLanes, updateLane)) {//优先级低，跳过更新
        // Priority is insufficient. Skip this update. If this is the first
        // skipped update, the previous update/state is the new base
        // update/state.
        const clone: Update<S, A> = {
          lane: updateLane,
          action: update.action,
          eagerReducer: update.eagerReducer,
          eagerState: update.eagerState,
          next: (null: any),
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        // Update the remaining priority in the queue. 更新剩余优先级，因为跳过一次了
        // TODO: Don't need to accumulate this. Instead, we can remove
        // renderLanes from the original lanes.
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane,
        );
        markSkippedUpdateLanes(updateLane);
      } else {
        // This update does have sufficient priority. 更新优先级高

        if (newBaseQueueLast !== null) {
          const clone: Update<S, A> = {
            // This update is going to be committed so we never want uncommit
            // it. Using NoLane works because 0 is a subset of all bitmasks, so
            // this will never be skipped by the check above.
            lane: NoLane,
            action: update.action,
            eagerReducer: update.eagerReducer,
            eagerState: update.eagerState,
            next: (null: any),
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }

        // Process this update. 这次更新会被处理
        if (update.eagerReducer === reducer) {
          // If this update was processed eagerly, and its reducer matches the
          // current reducer, we can use the eagerly computed state.
          newState = ((update.eagerState: any): S);//返回最新的state
        } else {
          const action = update.action;
          newState = reducer(newState, action); //reducer是basicStateReducer默认设置的
        }
      }
      update = update.next;
    } while (update !== null && update !== first);

    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = (newBaseQueueFirst: any);
    }

   
    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;

    queue.lastRenderedState = newState;
  }

  const dispatch: Dispatch<A> = (queue.dispatch: any);
  return [hook.memoizedState, dispatch];
}
```