[参考文章](https://zhuanlan.zhihu.com/p/336933386)
思路：通过脚手架引用 react 官方 package，修改本地引用路径，和本地引用文件来达到本地调试功能。

1. clone react 源码
2. 使用脚手架创建 debug 项目
   `yarn create react-app react-debug-code`
3. 暴露 eject 配置
4. 引入 react 包
   react 包路径：react/packages 将整个 packages 包引用 debug 项目中
5. 修改 webpack 配置
   路径：config/webpack.config.js

```js
 alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
        /**  修改webpack 配置，引入react包*/
        'react': path.resolve(__dirname, '../src/react-packages/packages/react'),
        'react-dom': path.resolve(__dirname, '../src/react-packages/packages/react-dom'),
        'shared': path.resolve(__dirname, '../src/react/react-packages/shared'),
        'react-reconciler': path.resolve(__dirname, '../src/react-packages/packages/react-reconciler'),
        /** */
        // Allows for better profiling with ReactDevTools
        ...(isEnvProductionProfile && {
          'react-dom$': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        }),
        ...(modules.webpackAliases || {}),
      },
```

6. 修改环境变量
   - 路径: config/env.js
   - 根目录创建.eslintrc.json
   - 添加 flow 类型判断

```js
const stringified = {
  // 修改开始
  __DEV__: true,
  __PROFILE__: true,
  __UMD__: true,
  __EXPERIMENTAL__: true,
  // 修改结束
  "process.env": Object.keys(raw).reduce((env, key) => {
    env[key] = JSON.stringify(raw[key]);
    return env;
  }, {}),
};
```

```js
{
  "extends": "react-app",
  "globals": {
    "__DEV__": true,
    "__PROFILE__": true,
    "__UMD__": true,
    "__EXPERIMENTAL__": true
  }
}
```

`npm i @babel/plugin-transform-flow-strip-types -D`

```js
{
    test: /\.(js|mjs|jsx|ts|tsx)$/,
    include: paths.appSrc,
    loader: require.resolve('babel-loader'),
    options: {
    customize: require.resolve(
        'babel-preset-react-app/webpack-overrides'
    ),
    presets: [
        [
        require.resolve('babel-preset-react-app'),
        {
            runtime: hasJsxRuntime ? 'automatic' : 'classic',
        },
        ],
    ],

    plugins: [
        require.resolve('@babel/plugin-transform-flow-strip-types'), //flow类型
        [
        require.resolve('babel-plugin-named-asset-import'),
        {
            loaderMap: {
            svg: {
                ReactComponent:
                '@svgr/webpack?-svgo,+titleProp,+ref![path]',
            },
            },
        },
        ],
        isEnvDevelopment &&
        shouldUseReactRefresh &&
        require.resolve('react-refresh/babel'),
    ].filter(Boolean),
    // This is a feature of `babel-loader` for webpack (not Babel itself).
    // It enables caching results in ./node_modules/.cache/babel-loader/
    // directory for faster rebuilds.
    cacheDirectory: true,
    // See #6846 for context on why cacheCompression is disabled
    cacheCompression: false,
    compact: isEnvProduction,
    },
},

```

7. 修改三个本地文件

- react-reconciler/src/ReactFiberHostConfig 导出 HostConfig
- shared/ReactSharedInternals
- shared/invariant

```js
//invariant
export default function invariant(condition, format, a, b, c, d, e, f) {
  /** 本地调试新增代码 */
  if (condition) {
    return;
  }
  /** 本地调试新增代码 */
  throw new Error(
    "Internal React error: invariant() is meant to be replaced at compile " +
      "time. There is no runtime version."
  );
}
```

```js
// ReactFiberHostConfig
// import invariant from 'shared/invariant';

// invariant(false, 'This module must be shimmed by a specific renderer.');

/** 本地调试新增代码 */
export * from "./forks/ReactFiberHostConfig.dom";
```

```js
// ReactSharedInternals
// import * as React from 'react';
// const ReactSharedInternals =
//   React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
/** 本地调试新增代码 */
import ReactSharedInternals from "../react/src/ReactSharedInternals";

export default ReactSharedInternals;
```

8. 此时就可以愉快的调试代码了
