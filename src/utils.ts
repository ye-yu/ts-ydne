export function* flatten<T>(arr: (T | T[])[]): Generator<T> {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flatten(item)
    } else {
      yield item
    }
  }
}