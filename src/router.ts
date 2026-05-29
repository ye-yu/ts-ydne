import { METHODS, type IncomingMessage, type ServerResponse } from "node:http";
import { PathMap } from "./path-map.ts";
import { flatten } from "./utils.ts";

export type AsyncHttpHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
export type AsyncParamHandler = (request: IncomingMessage, response: ServerResponse, value: string) => void | Promise<void>

export type RegisterRoutes<This = any> = {
  [method in Method]: (path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) => This
}
export type RegisterParamHandlers<This = any> = {
  (path: string, name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]): This
}

export type Method = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "trace" | "connect"
const methods = ["get", "post", "put", "delete", "patch", "options", "head", "trace", "connect"] as const

export class AsyncRouter implements RegisterRoutes<AsyncRouter> {
  #pathMap = new PathMap<AsyncHttpHandler>()
  #paramHandlerMap = new PathMap<{ name: string; handler: AsyncParamHandler }[]>()
  constructor() {
    const self = this as AsyncRouter
    for (const _method of METHODS as unknown as (typeof methods)) {
      const method = _method.toUpperCase() as unknown as Method
      const methodLowercase = method.toLowerCase() as unknown as Method
      if (this[methodLowercase]) continue
      // @ts-expect-error ts(7052)
      this[method] = this[methodLowercase] = (path, ...handlers) => {
        for (const handler of flatten(handlers)) {
          path = self.#pathMap.cleanPath(path)
          self.apply(method, path, handler)
          self.apply(methodLowercase, path, handler)
          return self
        }
      }
    }
  }

  apply(method: string, path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    path = this.#pathMap.cleanPath(path)
    for (const handler of flatten(handlers)) {
      this.#pathMap.append(`/${method}${path}`, handler)
    }
    return this
  }

  use(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    for (const handler of flatten(handlers)) {
      this.#pathMap.append(`/${path}`, handler)
    }
    return this
  }

  all(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    for (const method of METHODS) {
      const methodLowercase = method.toLowerCase() as unknown as Method
      this[methodLowercase](path, ...handlers)
    }
    return this
  }

  route(path: string): AsyncRouteHandler {
    return new AsyncRouteHandler(this, path)
  }

  param(path: string, name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]): this {
    path = this.#pathMap.cleanPath(path)
    for (const handler of flatten(handlers)) {
      this.#paramHandlerMap.append(path, [{ name, handler }])
    }
    return this
  }


  // just to make TS shut up about it
  get(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("get", path, ...handlers)
  }
  post(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("post", path, ...handlers)
  }
  put(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("put", path, ...handlers)
  }
  delete(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("delete", path, ...handlers)
  }
  patch(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("patch", path, ...handlers)
  }
  options(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("options", path, ...handlers)
  }
  head(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("head", path, ...handlers)
  }
  connect(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("connect", path, ...handlers)
  }
  trace(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    return this.apply("trace", path, ...handlers)
  }
}

export type RegisterHandlers<This = any> = {
  [method in Method]: {
    (...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): This
    (path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): This
  }
}


export class AsyncRouteHandler implements RegisterHandlers<AsyncRouteHandler> {
  #parent: AsyncRouter
  #basePath: string
  constructor(parent: AsyncRouter, basePath: string) {
    this.#parent = parent
    this.#basePath = basePath
    const self = this
    for (const _method of METHODS as Method[]) {
      const method = _method.toUpperCase() as unknown as Method
      const methodLowercase = method.toLowerCase() as unknown as Method
      if (this[methodLowercase]) continue
      this[method] = this[methodLowercase] = (pathOrHandler, ...handlers) => {
        return self.apply(method, pathOrHandler, ...handlers)
      }
    }
  }

  prefixPath(path: string) {
    return `${this.#basePath}${path}`
  }

  use(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    for (const handler of flatten(handlers)) {
      this.#parent.use(this.prefixPath(path), handler)
    }
  }

  all(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]) {
    for (const method of METHODS) {
      const methodLowercase = method.toLowerCase() as unknown as Method
      this[methodLowercase](this.prefixPath(path), ...handlers)
    }
  }


  param(name: string, ...handlers: (AsyncParamHandler | AsyncParamHandler[])[]): this {

    return this
  }

  apply(method: string, pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    if (typeof pathOrHandler === "string") {
      const path = this.prefixPath(pathOrHandler)
      this.#parent.apply(method, path, ...handlers)
      return this
    }
    this.#parent.apply(method, this.#basePath, pathOrHandler, ...handlers)
    return this

  }


  // just to make TS shut up about it
  get(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  get(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  get(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("get", pathOrHandler, ...handlers)
  }
  post(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  post(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  post(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("post", pathOrHandler, ...handlers)
  }
  put(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  put(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  put(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("put", pathOrHandler, ...handlers)
  }
  delete(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  delete(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  delete(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("delete", pathOrHandler, ...handlers)
  }
  patch(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  patch(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  patch(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("patch", pathOrHandler, ...handlers)
  }
  options(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  options(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  options(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("options", pathOrHandler, ...handlers)
  }
  head(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  head(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  head(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("head", pathOrHandler, ...handlers)
  }
  connect(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  connect(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  connect(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("connect", pathOrHandler, ...handlers)
  }
  trace(path: string, ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  trace(...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this
  trace(pathOrHandler: string | AsyncHttpHandler | AsyncHttpHandler[], ...handlers: (AsyncHttpHandler | AsyncHttpHandler[])[]): this {
    return this.apply("trace", pathOrHandler, ...handlers)
  }

}
