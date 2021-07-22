import * as React from 'react'
const { useState, useEffect } = React

function App() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    console.log(count)
  }, [count])
  return (
    <div className="App">
      Hello React
      <p>显示count:{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}

export default App;
