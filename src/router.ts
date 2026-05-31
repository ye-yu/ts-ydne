import { METHODS, type IncomingMessage, type ServerResponse } from "node:http";
import { PathTree } from "./path-tree.ts";

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
type HandlerMap = Map<string, AsyncHttpHandler[]>

export class AsyncRouter {
  readonly pathTree = new PathTree<HandlerMap>()

  apply(method: string, path: string, handler: AsyncHttpHandler) {
    this.pathTree.setPattern(path, (_, value) => {
      value ??= new Map()
      const handlers = value.get(method) ?? []
      handlers.push(handler)
      return value;
    });
  }


}