import * as React from 'react'
const { useState, useEffect, useCallback } = React

function App() {
  // useState
  const [count, setCount] = useState(0)
  // useEffect
  useEffect(() => {
    console.log(count, 'useEffect')
  }, [count])
  // useCallback
  const fn = useCallback(() => {
    console.log(count, 'useCallback')
  }, [count])
  return (
    <div className="App">
      Hello React
      <p>显示count:{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => fn()}>打印</button>
    </div>
  );
}

export default App;
