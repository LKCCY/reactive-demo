## 描述
比较 vue2 和 vue3 实现渲染的原理

+ vue2 通过 Object.defineProperty 为 data中的每个属性 都建立了 Dep, 来收集 Watcher
+ vue3 通过 Proxy, 将整个对象收集。每个key都对应一个 dep队列，来收集effects


## 启动
``` bash
  yarn
  yarn start
```
其中 vue2.html 代表vue2的示例, vue3.html 代表 vue3的示例