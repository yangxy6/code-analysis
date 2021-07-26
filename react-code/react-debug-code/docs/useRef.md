```js
// useRef
function mountRef<T>(initialValue: T): {|current: T|} {
    const hook = mountWorkInProgressHook();
  
    const ref = { current: initialValue }; // ref中current保存value，没了
    hook.memoizedState = ref;
    return ref;
}


// update
function updateRef<T>(initialValue: T): {|current: T|} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState; // 就返回了ref对象，其中包含current属性
}
```