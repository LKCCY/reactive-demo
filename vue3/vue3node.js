const isString = (val) => typeof val === 'string';
// const isObject = (val) => val !== null && typeof val === 'object';
const isFunction = (val) => typeof val === 'function';

const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
  TELEPORT: 64,
  SUSPENSE: 128,
  COMPONENT_SHOULD_KEEP_ALIVE: 256,
  COMPONENT_KEPT_ALIVE: 512,
  COMPONENT: 6
}

function createVNode (type, props, children) {
  if (props) {} // class style 格式化
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
      : isObject(type)
        ? ShapeFlags.STATEFUL_COMPONENT
        : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT
          : 0

  const vnode = {
    type,
    props,
    children: null,
    components: null,
    shapeFlag
  }

  // normalizeChildren(vnode, children)
  return vnode
}


