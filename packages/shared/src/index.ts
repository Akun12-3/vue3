export function isObject(val: any) {
  return typeof val === "object" && val !== null;
}

export function hasChanged(newVal: any, oldVal: any) {
  return !Object.is(newVal, oldVal);
}

export function isFunction(val: any) {
  return typeof val === "function";
}
