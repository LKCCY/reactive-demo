
// 创建 app
function createApp (...args) {
  const app = ensureRenderer().createApp(...args)
  const { mount } = app
  app.mount = (containerOrSelector) => {
    const container = document.querySelector(containerOrSelector)
    const proxy = mount(container)
    container.removeAttribute('v-cloak')
    container.setAttribute('data-v-app', '')
    return proxy
  }
  return app
}

// 实现dom 操作，属性patch的方法
const rendererOptions =  {
  patchProp () {},
  forcePatchProp () {},
  nodeOps: {
    insert () {},
    remove () {}
  }
}

// 创建渲染器
function ensureRenderer() {
  return createRenderer(rendererOptions)
}


// 通过 patch 进行渲染
const render =  (vnode, container) => {
  if (vnode == null) {

  } else {
    patch(container._vnode, vnode, container)
  }
  container._vnode = vnode
}

function createAppAPI (render) {
  // 创建 app创建，示例全局的属性
  return function createApp (rootComponent, rootProps = null) {
    const app = {
      use () {},
      mixin () {},
      provide () {},
      mount (rootContainer) {
        // 基于创建虚拟dom
        const vnode = createVNode(rootComponent, rootProps)
        render(vnode, rootContainer)
        app._container = rootContainer
      }
    }
    return app
  }
}

function createRenderer (options) {
  return {
    render,
    createApp: createAppAPI(render)
  }
}

// 执行渲染patch
function patch (n1, n2, container) {
  const { type, shapeFlag } = n2
  switch (type) {
    case 'Text':
      break
    case 'Fragment':
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {}
      else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1,n2,container)
      }
  }
}

function processComponent (n1, n2, container) {
  if (n1=== null) { // 挂载操作
    mountComponent(n2, container)
  } else {
    // 更新操作，此处不做多余说明以 mountComponent简单模拟
    // updateComponent(n1, n2, optimized)
    mountComponent(n2, container)
  }
}

function mountComponent (initialVNode, container) {
  const instance = (initialVNode.component = createComponentInstance(initialVNode))
  setupComponent(instance)
  // 关键的渲染函数，通过依赖收集。依赖更新实现渲染
  setupRenderEffect(instance,initialVNode,container)
}

let uid = 0

// 省略context等变量
function createComponentInstance(vnode) {
  const type = vnode.type
  const instance = {
    uid: uid++,
    vnode,
    type,
    render: null,
    isMounted: false
  }
  return instance
}

function setupComponent (instance) {
  const { props, children, shapeFlag } = instance.vnode
  const isStateful = shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  if (isStateful) {
    const Component = instance.type
    const { setup } = Component
    if (setup) {
      // 停止渲染函数的收集
      pauseTracking()
      const setupResult = setup(instance)
      resetTracking()
      if (isFunction(setupResult)) {
        // 收集渲染函数
        instance.render = setupResult
      }
    }
  }
}

function setupRenderEffect (instance, initialVNode, container) {
  // 通过 effect 进行依赖收集和触发
  instance.updata = effect(function componentEffect () {
    // 执行render 获取子树进行依赖收集和渲染，此处简单书写
    // const subTree = (instance.subTree = renderComponentRoot(instance))
    const { render } = instance
    render()
  })
}
