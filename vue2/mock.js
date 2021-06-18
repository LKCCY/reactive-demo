function Vue (options) {
  // 初始化
  this._init(options)
  // 执行render函数
  this.$mount()
}

Vue.prototype._init = function (options) {
  const vm = this
  // 把options挂载到this上
  vm.$options = options
  if (options.data) {
    // 数据响应式
    initState(vm)
  }
  if (options.computed) {
    // 初始化计算属性
    initComputed(vm)
  }
  if (options.watch) {
    // 初始化watch
    initWatch(vm)
  }
}


// 从this上读取的数据全部拦截到this._data到里面读取
// 例如 this.name 等同于  this._data.name
function proxy(vm, source, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[source][key] // this.name 等同于  this._data.name
    },
    set(newValue) {
      return vm[source][key] = newValue
    }
  })
}


function initState(vm) {
  // 拿到配置的data属性值
  let data = vm.$options.data;
  // 判断data 是函数还是别的类型
  data = vm._data = typeof data === 'function' ? data.call(vm, vm) : data || {};
  // 数据代理
  const keys = Object.keys(data);
  let i = keys.length;
  while(i--) {
    // 从this上读取的数据全部拦截到this._data到里面读取
    // 例如 this.name 等同于  this._data.name
    proxy(vm, '_data', keys[i]);
  }
  // 数据观察
  observe(data);
}

// 数据观察函数
function observe(data) {
  if (typeof data !== 'object' && data != null) {
    return;
  }
  return new Observer(data)
}


class Observer{
  constructor(value) {
    // 给每一个属性都设置get set
    this.walk(value)
  }
  walk(data) {
    let keys = Object.keys(data);
    for (let i = 0, len = keys.length; i < len; i++) {
      let key = keys[i]
      let value = data[key]
      // 给对象设置get set
      defineReactive(data, key, value)
    }
  }
}

// 依赖收集
let dId = 0
class Dep{
  constructor() {
    this.id = dId++ // 每次实例化都生成一个id
    this.subs = [] // 让这个dep实例收集watcher
  }
  depend() {
    // Dep.target 就是当前的watcher
    if (Dep.target) {
      Dep.target.addDep(this) // 让watcher,去存放dep，然后里面dep存放对应的watcher，两个是多对多的关系
    }
  }
  notify() {
    // 触发更新
    this.subs.forEach(watcher => watcher.update())
  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
}


function defineReactive(data, key, value) {
  let dep = new Dep()
  Object.defineProperty(data, key, {
    get() {
      if (Dep.target) { // 如果取值时有watcher
        dep.depend() // 让watcher保存dep，并且让dep 保存watcher，双向保存
      }
      return value
    },
    set(newValue) {
      if (newValue == value) return
      observe(newValue) // 给新的值设置响应式
      value = newValue
      dep.notify()
    }
  })
  // 递归给数据设置get set
  observe(value);
}


Vue.prototype.$mount = function () {
  const vm = this
  new Watcher(vm, vm.$options.render, () => {}, true)
}

function parsePath (path) {
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}

let wid = 0
class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm // 把vm挂载到当前的this上
    if (typeof exprOrFn === 'function') {
      this.getter = exprOrFn // 把exprOrFn挂载到当前的this上，这里exprOrFn 等于 vm.$options.render
    } else {
      this.getter = parsePath(exprOrFn) // user watcher
    }

    if (options) {
      this.lazy = !!options.lazy // 为computed 设计的
      this.user = !!options.user
    } else {
      this.user = this.lazy = false
    }
    this.dirty = this.lazy
    this.cb = cb // 把cb挂载到当前的this上
    this.options = options // 把options挂载到当前的this上
    this.id = wid++
    this.deps = []
    this.depsId = new Set() // dep 已经收集过相同的watcher 就不要重复收集了
    this.value = this.lazy ? undefined : this.get() // 相当于运行 vm.$options.render()
  }
  get() {
    const vm = this.vm
    pushTarget(this)
    let value = this.getter.call(vm, vm) // 把this 指向到vm
    popTarget()
    return value
  }
  addDep(dep) {
    let id = dep.id
    if (!this.depsId.has(id)) {
      this.depsId.add(id)
      this.deps.push(dep)
      dep.addSub(this);
    }
  }
  update(){
    if (this.lazy) {
      this.dirty = true
    } else {
      this.run()
    }
  }
  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  depend() {
    let i = this.deps.length
    while(i--) {
      this.deps[i].depend()
    }
  }

  run () {
    const value = this.get()
    const oldValue = this.value
    this.value = value
    // 执行cb
    if (this.user) {
      try{
        this.cb.call(this.vm, value, oldValue)
      } catch(error) {
        console.error(error)
      }
    } else {
      this.cb && this.cb.call(this.vm, oldValue, value)
    }
  }
}


let stack = []
// push当前watcher到stack 中，并记录当前watcer
function pushTarget(watcher) {
  Dep.target = watcher
  stack.push(watcher)
}
// 运行完之后清空当前的watcher
function popTarget() {
  stack.pop()
  Dep.target = stack[stack.length - 1]
}

// 初始化computed
function initComputed(vm) {
  // 拿到computed配置
  const computed = vm.$options.computed
  // 给当前的vm挂载_computedWatchers属性，后面会用到
  const watchers = vm._computedWatchers = Object.create(null)
  // 循环computed每个属性
  for (const key in computed) {
    const userDef = computed[key]
    // 判断是函数还是对象
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    // 给每一个computed创建一个computed watcher 注意{ lazy: true }
    // 然后挂载到vm._computedWatchers对象上
    watchers[key] = new Watcher(vm, getter, () => {}, { lazy: true })
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}

// 设置comoputed的 set个set
function defineComputed(vm, key, userDef) {
  let getter = null
  // 判断是函数还是对象
  if (typeof userDef === 'function') {
    getter = createComputedGetter(key)
  } else {
    getter = userDef.get
  }
  Object.defineProperty(vm, key, {
    enumerable: true,
    configurable: true,
    get: getter,
    set: function() {} // 又偷懒，先不考虑set情况哈，自己去看源码实现一番也是可以的
  })
}

// 创建computed函数
function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {// 给computed的属性添加订阅watchers
        watcher.evaluate() // 执行 watch的get方法，从而使 Dep.wather 生效，完成 get的依赖收集
      }
      // 把渲染watcher 添加到属性的订阅里面去，这很关键
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function initWatch(vm) {
  let watch = vm.$options.watch
  for (let key in watch) {
    const handler = watch[key]
    new Watcher(vm, key, handler, { user: true })
  }
}