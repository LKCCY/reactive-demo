const isObject = (val) => val !== null && typeof val === 'object';
const hasOwn = (val, key) => hasOwnProperty.call(val, key);
const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);


function effect (fn, options = {}) {
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    // effect 触发 reactive get进行 track
    effect()
  }
  return effect
}

let effId = 0
const effectStack = []
let activeEffect

function createReactiveEffect (fn, options) {
  const effect = function () {
    if (!effect.active) {
      return options.scheduler ? undefined : fn()
    }
    if (!effectStack.includes(effect)) {
      cleanup(effect)
      try {
        enableTracking()
        effectStack.push(effect)
        activeEffect = effect
        return fn()
      } finally {
        effectStack.pop()
        resetTracking()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.id = effId++
  effect._isEffect = true
  effect.active = true
  effect.raw = fn
  effect.deps = []
  effect.options = options
  return effect
}

function cleanup(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

const trackStack = []
let shouldTrack = true

function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

// 避免函数执行收集 effect
function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

function reactive(target) {
  const observed = new Proxy(target, {
    get (target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      // 进行依赖收集
      track(target, 'get', key)
      if (isObject(res)) {
        return reactive(res)
      }
      return res
    },
    set (target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      const hadKey = hasOwn(target, key)
      if (!hadKey) {
        trigger(target, 'add', key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, 'set', key, value, oldValue)
      }
      return result
    }
  })
  return observed
}

const targetMap = new WeakMap()

function track(target, type, key) {
  if (!shouldTrack || activeEffect === undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

function trigger (target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target)
  if (!depsMap) { return }
  const effects = new Set()


  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => effects.add(effect))
    }
  }
  add(depsMap.get(key))

  const run = (effect) => {
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  effects.forEach(run)
}