import { METHODS, type IncomingMessage, type ServerResponse } from "node:http";
import { PathTree } from "./path-tree.ts";

export type AsyncHttpHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
export type AsyncParamHandler = (request: IncomingMessage, response: ServerResponse, value: string | string[], segments?: string[]) => void | Promise<void>
export type AsyncHttpErrorHandler = (errors: any[], request: IncomingMessage, response: ServerResponse) => void | Promise<void>

export type RegisterRoutes<This = any> = {
  [method in Method]: (path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) => This
}
export type RegisterMaybePathRoutes<This = any> = {
  [method in Method]: {
    (...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): This
    (path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): This
  }
}
export type RegisterParamHandlers<This = any> = {
  (path: string, name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]): This
}

export type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "trace" | "connect"
type HttpHandlerMap = Map<string, AsyncHttpHandler[]>
type HttpErrorHandlerMap = Map<string, AsyncHttpErrorHandler[]>
type ParamHandlerMap = Map<string, AsyncParamHandler[]>

class PrefixedPathRegisterer { }
for (const method of METHODS.flatMap(e => [e.toLocaleUpperCase('en-us'), e.toLocaleLowerCase('en-us')]) as Method[]) {
  // @ts-expect-error ts(7053)
  if (PrefixedPathRegisterer.prototype[method]) continue
  // @ts-expect-error ts(7053)
  PrefixedPathRegisterer.prototype[method] = function (pathOrHandler: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    const path = typeof pathOrHandler === "string" ? pathOrHandler : ""
    if (typeof pathOrHandler !== "string") {
      handlers.unshift(pathOrHandler)
    }
    // @ts-expect-error ts(2339)
    return this.apply(method, path, ...handlers)
  }
}

class PathRegisterer { }
for (const method of METHODS.flatMap(e => [e.toLocaleUpperCase('en-us'), e.toLocaleLowerCase('en-us')]) as Method[]) {
  // @ts-expect-error ts(7053)
  if (PathRegisterer.prototype[method]) continue
  // @ts-expect-error ts(7053)
  PathRegisterer.prototype[method] = function (path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    // @ts-expect-error ts(2339)
    return this.apply(method, path, ...handlers)
  }
}



function AsyncRouterBase<T>(): { new(): RegisterRoutes<T> }
function AsyncRouterBase<T>(pathOptional: true): { new(): RegisterMaybePathRoutes<T> }
function AsyncRouterBase<T>(pathOptional?: boolean): typeof pathOptional extends true ? { new(): RegisterRoutes<T> } : { new(): RegisterMaybePathRoutes<T> } {
  if (pathOptional) {
    return PrefixedPathRegisterer as any
  }
  return PathRegisterer as any
}


type IterateHandlerResult<T> = { handler: T, params: Record<string, string[]> }

export class AsyncRouter extends AsyncRouterBase<AsyncPrefixRouter>() {
  readonly pathTree = new PathTree<boolean>()
  readonly pathPatternToHandlers = new Map<string, HttpHandlerMap>()
  readonly pathPatternToErrorHandlers = new Map<string, HttpErrorHandlerMap>()
  readonly pathPatternToParamHandlers = new Map<string, ParamHandlerMap>()
  rankingCounter = 0
  rankingMap = new Map<object, number>()

  activatePattern(path: string) {
    this.pathTree.setPattern(path, (_, __) => true);
  }

  setRanking(...objects: object[]) {
    for (const obj of objects) {
      if (!this.rankingMap.has(obj)) {
        this.rankingMap.set(obj, this.rankingCounter++)
      }
    }
  }

  apply(method: string, path: string, ...middlewares: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    method = method.toLocaleLowerCase('en-us')
    this.activatePattern(path);
    const methodHandlers = this.pathPatternToHandlers.get(path) ?? new Map<string, AsyncHttpHandler[]>()
    const handlers = methodHandlers.get(method) ?? []
    for (const handler of middlewares) {
      if (Array.isArray(handler)) {
        this.setRanking(...handler)
        handlers.push(...handler)
      } else {
        this.setRanking(handler)
        handlers.push(handler)
      }
    }
    methodHandlers.set(method, handlers)
    this.pathPatternToHandlers.set(path, methodHandlers)
    return this.route(path)
  }

  error(path: string, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]): AsyncPrefixRouter
  error(method: string, path: string, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]): AsyncPrefixRouter
  error(methodOrPath: any, pathOrMiddlewares: any, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]) {
    let method = "all"
    let path = ""

    if (typeof pathOrMiddlewares === "string") {
      method = methodOrPath
      path = pathOrMiddlewares
    } else {
      path = methodOrPath
      middlewares.unshift(pathOrMiddlewares as unknown as AsyncHttpErrorHandler)
    }

    method = method.toLocaleLowerCase('en-us')
    this.activatePattern(path);
    const methodHandlers = this.pathPatternToErrorHandlers.get(path) ?? new Map<string, AsyncHttpErrorHandler[]>()
    const handlers = methodHandlers.get(method) ?? []
    for (const handler of middlewares) {
      if (Array.isArray(handler)) {
        this.setRanking(...handler)
        handlers.push(...handler)
      } else {
        this.setRanking(handler)
        handlers.push(handler)
      }
    }
    methodHandlers.set(method, handlers)
    this.pathPatternToErrorHandlers.set(path, methodHandlers)
    return this.route(path)
  }

  route(path: string) {
    return new AsyncPrefixRouter(this, path)
  }

  param(path: string, name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]) {
    const paramHandlersMap = this.pathPatternToParamHandlers.get(path) ?? new Map<string, AsyncParamHandler[]>()
    const existingHandlers = [...(paramHandlersMap.get(`:${name}`) ?? []), ...(paramHandlersMap.get(`*${name}`) ?? [])]
    for (const handler of handlers) {
      if (Array.isArray(handler)) {
        this.setRanking(...handler)
        existingHandlers.push(...handler)
      } else {
        this.setRanking(handler)
        existingHandlers.push(handler)
      }
    }
    paramHandlersMap.set(`:${name}`, existingHandlers)
    paramHandlersMap.set(`*${name}`, existingHandlers)
    this.pathPatternToParamHandlers.set(path, paramHandlersMap)
    return this
  }

  use(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("use", path, ...handlers)
  }

  all(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("all", path, ...handlers)
  }

  *matchToPattern(path: string, split = false) {
    if (split) {
      const segments = this.pathTree.parsePathIntoSegments(path)
      let joined = ""
      for (const segment of segments) {
        joined += segment
        yield* this.pathTree.match(joined)
      }
    }

    yield* this.pathTree.match(path)
  }



  getHandlers<T extends object>(method: string, path: string, handlersMap: Map<string, Map<string, T[]>>): IterateHandlerResult<T>[] {
    method = method.toLocaleLowerCase('en-us')
    const result: { handlers: T[], params: Record<string, string[]> }[] = []

    // methods of use
    const usePatterns = this.matchToPattern(path, true)
    for (const { segments, params } of usePatterns) {
      const pattern = segments.join("")
      const methodHandlers = handlersMap.get(pattern)
      if (!methodHandlers) continue
      const handlers = methodHandlers.get("use")
      if (!handlers?.length) continue
      result.push({ handlers, params })
    }

    // method-specific handlers
    const methodPatterns = this.matchToPattern(path)
    for (const { segments, params } of methodPatterns) {
      const pattern = segments.join("")
      const methodHandlers = handlersMap.get(pattern)
      if (!methodHandlers) continue
      const handlers = [...(methodHandlers.get(method) ?? []), ...(methodHandlers.get("all") ?? [])]
      if (!handlers?.length) continue
      result.push({ handlers, params })
    }

    return result.flatMap(e => e.handlers.map(handler => ({ handler, params: e.params }))).toSorted((a, b) => {
      const aRanking = this.rankingMap.get(a.handler)
      const bRanking = this.rankingMap.get(b.handler)
      if (aRanking === undefined) return 1
      if (bRanking === undefined) return -1
      return aRanking - bRanking
    })
  }

  collapseWildcard(values: string[]): string[] {
    return values.flatMap((v, i, arr) => v !== "/" ? [v] : arr[i - 1] === "/" ? [''] : [])
  }

  defaultParamHandlerFor(name: string): AsyncParamHandler {
    return (req, _: any, value: string | string[], __?: string[]) => {
      const params = Reflect.get(req, "params") ?? {} as Record<string, string[]>
      params[name] = value
      Object.assign(req, { params })
    }
  }



  async handle(req: IncomingMessage, res: ServerResponse) {
    const { method, url } = req
    const parsedUrl = new URL(url ?? "", "http://example.com")
    const handlers = this.getHandlers(method ?? "all", parsedUrl.pathname, this.pathPatternToHandlers)
    let errors: any[] = []
    for (const handler of handlers) {
      const paramHandlers = this.pathPatternToParamHandlers.get(parsedUrl.pathname)
      if (paramHandlers) {
        for (const [name, values] of Object.entries(handler.params)) {
          for (const paramHandler of paramHandlers.get(name) ?? [this.defaultParamHandlerFor(name)]) {
            const value = name.startsWith(":") ? values[0] : this.collapseWildcard(values)
            paramHandler(req, res, value, values)
          }
        }
      } else {
        for (const [name, values] of Object.entries(handler.params)) {
          const paramHandler = this.defaultParamHandlerFor(name)
          const value = name.startsWith(":") ? values[0] : this.collapseWildcard(values)
          paramHandler(req, res, value, values)
        }
      }

      try {
        await Promise.resolve(handler.handler(req, res))
      } catch (err) {
        errors.push(err)
        break
      }
    }

    if (!errors.length) return

    const errorHandlers = this.getHandlers(method ?? "all", parsedUrl.pathname, this.pathPatternToErrorHandlers)

    for (const handler of errorHandlers) {
      const paramHandlers = this.pathPatternToParamHandlers.get(parsedUrl.pathname)
      if (paramHandlers) {
        for (const [name, values] of Object.entries(handler.params)) {
          for (const paramHandler of paramHandlers.get(name) ?? [this.defaultParamHandlerFor(name)]) {
            const value = name.startsWith(":") ? values[0] : this.collapseWildcard(values)
            paramHandler(req, res, value, values)
          }
        }
      } else {
        for (const [name, values] of Object.entries(handler.params)) {
          const paramHandler = this.defaultParamHandlerFor(name)
          const value = name.startsWith(":") ? values[0] : this.collapseWildcard(values)
          paramHandler(req, res, value, values)
        }
      }

      try {
        await Promise.resolve(handler.handler(errors, req, res))
      } catch (err) {
        errors.push(err)
      }
    }
  }
}

export class AsyncPrefixRouter extends AsyncRouterBase<AsyncPrefixRouter>(true) {
  parent: AsyncRouter
  prefix: string
  constructor(parent: AsyncRouter, prefix: string) {
    super()
    this.parent = parent
    this.prefix = prefix
    if (!this.prefix) {
      throw new Error("Prefix cannot be empty")
    }
  }

  apply(method: string, path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    this.parent.apply(method, this.prefix + path, ...handlers)
    return this
  }

  param(name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]) {
    this.parent.param(this.prefix, name, ...handlers)
    return this
  }

  error(...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]): AsyncPrefixRouter
  error(path: string, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]): AsyncPrefixRouter
  error(method: string, path: string, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]): AsyncPrefixRouter
  error(methodOrPathOrMiddleware: any, pathOrMiddlewares: any, ...middlewares: (AsyncHttpErrorHandler | AsyncHttpErrorHandler[])[]) {
    let method = "all"
    let path = ""

    if (typeof pathOrMiddlewares === "string") {
      method = methodOrPathOrMiddleware
      path = pathOrMiddlewares
    } else if (typeof methodOrPathOrMiddleware === "string")  {
      path = methodOrPathOrMiddleware
      middlewares.unshift(pathOrMiddlewares as unknown as AsyncHttpErrorHandler)
    } else {
      middlewares.unshift(pathOrMiddlewares as unknown as AsyncHttpErrorHandler)
      middlewares.unshift(methodOrPathOrMiddleware as unknown as AsyncHttpErrorHandler)
    }

    this.parent.error(method, this.prefix + path, ...middlewares)
    return this
  }
}
