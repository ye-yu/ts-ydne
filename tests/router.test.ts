import assert from "node:assert"
import { beforeEach, describe, it } from "node:test"
import { AsyncRouter, type AsyncHttpErrorHandler, type AsyncHttpHandler, type AsyncParamHandler, type Method } from "../src/router.ts";
import { METHODS } from "http";

describe('AsyncRouter', () => {
  let router!: AsyncRouter

  beforeEach(() => {
    router = new AsyncRouter()
  })

  describe('apply', () => {
    it('should match static routes', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.apply("GET", "/hello", handler)

      const handlers = router.getHandlers("GET", "/hello", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.strictEqual(handlers[0].handler, handler)
      assert.deepStrictEqual(handlers[0].params, {})
    })

    it('should be able to handle all methods: uppercase', () => {
      const methodsToHandler = METHODS.map((m) => ({
        method: m.toLocaleUpperCase('en-us'),
        handler: (async () => void 0) as AsyncHttpHandler
      }))
      for (const { method, handler } of methodsToHandler) {
        router.apply(method, "/test", handler)
      }

      for (const { method, handler } of methodsToHandler) {
        const handlers = router.getHandlers(method.toLocaleUpperCase('en-us'), "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }

      for (const { method, handler } of methodsToHandler) {
        const handlers = router.getHandlers(method.toLocaleLowerCase('en-us'), "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }
    })


    it('should be able to handle all methods: lowercase', () => {
      const methodsToHandler = METHODS.map((m) => ({
        method: m.toLocaleLowerCase('en-us'),
        handler: (async () => void 0) as AsyncHttpHandler
      }))
      for (const { method, handler } of methodsToHandler) {
        router.apply(method, "/test", handler)
      }

      for (const { method, handler } of methodsToHandler) {
        const handlers = router.getHandlers(method.toLocaleUpperCase('en-us'), "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }

      for (const { method, handler } of methodsToHandler) {
        const handlers = router.getHandlers(method.toLocaleLowerCase('en-us'), "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }
    })

    it('should match named parameters', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.apply("GET", "/hello/:name", handler)

      const handlers = router.getHandlers("GET", "/hello/world", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.strictEqual(handlers[0].handler, handler)
      assert.deepStrictEqual(handlers[0].params, { ":name": ["world"] })
    })

    it('should match wildcard parameters', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.apply("GET", "/hello/*all", handler)

      const handlers = router.getHandlers("GET", "/hello/world/and/universe", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.strictEqual(handlers[0].handler, handler)
      assert.deepStrictEqual(handlers[0].params, { "*all": ["world", "/", "and", "/", "universe"] })
    })
  })

  describe('this[method]', () => {
    it('should be able to handle all methods', () => {
      const methodsToHandler = METHODS.map((m) => ({
        method: m as Method,
        handler: (async () => void 0) as AsyncHttpHandler
      }))
      for (const { method, handler } of methodsToHandler) {
        router[method]("/test", handler)
      }

      for (const { method, handler } of methodsToHandler) {
        const handlers = router.getHandlers(method, "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }
    })
  })

  describe('all', () => {
    it('should match all methods', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.all("/test", handler)
      for (const method of METHODS.flatMap(e => [e.toLocaleUpperCase('en-us') as Method, e.toLocaleLowerCase('en-us') as Method])) {
        const handlers = router.getHandlers(method, "/test", router.pathPatternToHandlers)
        assert.strictEqual(handlers.length, 1)
        assert.strictEqual(handlers[0].handler, handler)
        assert.deepStrictEqual(handlers[0].params, {})
      }
    })
  })

  describe('use', () => {
    it('should apply use by segments', () => {
      type RegisteredHandler = { pattern: string, handler: AsyncHttpHandler }
      const use1: RegisteredHandler = {
        pattern: "/a/b",
        handler: async () => void 0
      }
      const use2: RegisteredHandler = {
        pattern: "/a/b/", // note: with slash
        handler: async () => void 0
      }
      const handler: RegisteredHandler = {
        pattern: "/a/b/c/d",
        handler: async () => void 0
      }
      const unrelatedHandler: RegisteredHandler = {
        pattern: "/x/y/z",
        handler: async () => void 0
      }

      router.use(use1.pattern, use1.handler)
      router.use(use2.pattern, use2.handler)
      router.get(handler.pattern, handler.handler)
      router.get(unrelatedHandler.pattern, unrelatedHandler.handler)

      const handlers = router.getHandlers("get", "/a/b/c/d", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 3)
      assert.ok(handlers.some(h => h.handler === use1.handler))
      assert.ok(handlers.some(h => h.handler === use2.handler))
      assert.ok(handlers.some(h => h.handler === handler.handler))
      assert.ok(!handlers.some(h => h.handler === unrelatedHandler.handler))
    })
  })

  describe('ranking', () => {
    it('should sort handler by order of registration', () => {
      const useBefore: AsyncHttpHandler = async () => void 0
      const useAfter: AsyncHttpHandler = async () => void 0
      const handler1: AsyncHttpHandler = async () => void 0
      const handler2: AsyncHttpHandler = async () => void 0
      const handler3: AsyncHttpHandler = async () => void 0

      router.use('/api', useBefore)
      router.get("/api/v1/something", handler1)
      router.get("/api/v1/something", handler2)
      router.get("/api/v1/something", handler3)
      router.use('/api/v1', useAfter)

      const handlers = router.getHandlers("GET", "/api/v1/something", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 5)
      assert.strictEqual(handlers[0].handler, useBefore)
      assert.strictEqual(handlers[1].handler, handler1)
      assert.strictEqual(handlers[2].handler, handler2)
      assert.strictEqual(handlers[3].handler, handler3)
      assert.strictEqual(handlers[4].handler, useAfter)
    })
  })

  describe('param', () => {
    it('should extract single named parameter', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.get("/users/:id", handler)

      const handlers = router.getHandlers("GET", "/users/123", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.deepStrictEqual(handlers[0].params, { ":id": ["123"] })
    })

    it('should extract multiple named parameters', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.get("/users/:userId/posts/:postId", handler)

      const handlers = router.getHandlers("GET", "/users/42/posts/99", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.deepStrictEqual(handlers[0].params, { ":userId": ["42"], ":postId": ["99"] })
    })

    it('should extract wildcard parameter as array', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.get("/files/*path", handler)

      const handlers = router.getHandlers("GET", "/files/docs/2024/report.pdf", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.ok(handlers[0].params["*path"])
      assert.strictEqual(handlers[0].params["*path"].length, 5)
    })

    it('should handle parameters with special characters', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.get("/api/:version/resource/:id", handler)

      const handlers = router.getHandlers("GET", "/api/v2/resource/abc-123", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.deepStrictEqual(handlers[0].params, { ":version": ["v2"], ":id": ["abc-123"] })
    })
  })

  describe('error', () => {
    it('should handle no matching routes', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.get("/hello", handler)

      const handlers = router.getHandlers("GET", "/goodbye", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 0)
    })

    it('should handle method not allowed', () => {
      const handler: AsyncHttpHandler = async () => void 0
      router.post("/data", handler)

      const handlers = router.getHandlers("GET", "/data", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 0)
    })

    it('should collect multiple error handlers for a path', () => {
      const errorHandler1 = async (errors: any[], req: any, res: any) => void 0
      const errorHandler2 = async (errors: any[], req: any, res: any) => void 0

      router.error("/api", errorHandler1)
      router.error("/api", errorHandler2)

      const handlers = router.getHandlers("all", "/api", router.pathPatternToErrorHandlers)
      assert.ok(handlers.length > 0)
      assert.ok(handlers.some(h => h.handler === errorHandler1))
      assert.ok(handlers.some(h => h.handler === errorHandler2))
    })

    it('should return empty array when no error handlers match', () => {
      const errorHandler: AsyncHttpErrorHandler = async () => void 0
      router.error("/admin", errorHandler)

      const handlers = router.getHandlers("all", "/public/page", router.pathPatternToErrorHandlers)
      assert.strictEqual(handlers.length, 0)
    })
  })

  describe('handle', () => {
    it('should execute handler with request and response objects', async () => {
      let called = false
      let receivedReq: any = null
      let receivedRes: any = null

      const handler: AsyncHttpHandler = async (req: any, res: any) => {
        called = true
        receivedReq = req
        receivedRes = res
      }

      const req: any = { method: "GET", url: "/test" }
      const res: any = { statusCode: 200 }

      await handler(req, res)
      assert.ok(called)
      assert.strictEqual(receivedReq, req)
      assert.strictEqual(receivedRes, res)
    })

    it('should handle synchronous handler', async () => {
      let executed = false
      const handler: AsyncHttpHandler = (req: any, res: any) => {
        executed = true
      }

      await handler({} as any, {} as any)
      assert.ok(executed)
    })

    it('should handle multiple handlers in sequence', async () => {
      const order: string[] = []

      const handler1: AsyncHttpHandler = async (req: any, res: any) => {
        order.push("handler1")
      }
      const handler2: AsyncHttpHandler = async (req: any, res: any) => {
        order.push("handler2")
      }
      const handler3: AsyncHttpHandler = async (req: any, res: any) => {
        order.push("handler3")
      }

      router.get("/test", handler1)
      router.get("/test", handler2)
      router.get("/test", handler3)

      const handlers = router.getHandlers("GET", "/test", router.pathPatternToHandlers)
      for (const h of handlers) {
        await h.handler({} as any, {} as any)
      }

      assert.deepStrictEqual(order, ["handler1", "handler2", "handler3"])
    })

    it('should provide request and response context to handlers', async () => {
      const captured: any = {}

      const handler: AsyncHttpHandler = async (req: any, res: any) => {
        captured.req = req
        captured.res = res
      }

      const mockReq: any = { method: "POST", url: "/api/users", headers: { "content-type": "application/json" } }
      const mockRes: any = { statusCode: 201, locals: {} }

      await handler(mockReq, mockRes)

      assert.strictEqual(captured.req.method, "POST")
      assert.strictEqual(captured.req.url, "/api/users")
      assert.strictEqual(captured.res.statusCode, 201)
    })

    it('should handle errors thrown in handlers', async () => {
      const handler: AsyncHttpHandler = async (req: any, res: any) => {
        const { divident, divisor } = req.body || {}
        if (divisor === 0) {
          throw new Error("Divisor cannot be zero")
        }
        return res.end(divident / divisor)
      }

      const errorHandler: AsyncHttpErrorHandler = async (errors: any[], req: any, res: any) => {
        res.statusCode = 400
        res.end(errors[0].message)
      }

      router.post("/divide", handler)
      router.error("/divide", errorHandler)
      // success 
      {
        const mockReq: any = { method: "POST", url: "/divide", body: { divident: 10, divisor: 2 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 200)
        assert.strictEqual(mockRes.endCalledWith, 5)
      }

      // fail case
      {
        const mockReq: any = { method: "POST", url: "/divide", body: { divident: 10, divisor: 0 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 400)
        assert.strictEqual(mockRes.endCalledWith, "Divisor cannot be zero")
      }
    })
  })
})


describe('AsyncPrefixRouter', () => {
  let router!: AsyncRouter

  beforeEach(() => {
    router = new AsyncRouter()
  })

  describe('constructor', () => {
    it('should throw error if prefix is empty', () => {
      assert.throws(() => {
        router.route("")
      }, /Prefix cannot be empty/)
    })

    it('should create prefix router with non-empty prefix', () => {
      const prefixRouter = router.route("/api")
      assert.ok(prefixRouter)
      assert.strictEqual(prefixRouter.prefix, "/api")
      assert.strictEqual(prefixRouter.parent, router)
    })
  })

  describe('apply', () => {
    it('should prepend prefix to routes', () => {
      const handler: AsyncHttpHandler = async () => void 0
      const prefixRouter = router.route("/api")
      prefixRouter.apply("GET", "/users", handler)

      const handlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.strictEqual(handlers[0].handler, handler)
    })

    it('should support all HTTP methods via direct method calls', () => {
      const prefixRouter = router.route("/api")
      const handler: AsyncHttpHandler = async () => void 0

      prefixRouter.get("/users", handler)
      const handlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.strictEqual(handlers[0].handler, handler)
    })

    it('should support method chaining', () => {
      const handler1: AsyncHttpHandler = async () => void 0
      const handler2: AsyncHttpHandler = async () => void 0

      const prefixRouter = router.route("/api")
      const result = prefixRouter.get("/users", handler1).post("/users", handler2)

      assert.strictEqual(result, prefixRouter)
      const getHandlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      const postHandlers = router.getHandlers("POST", "/api/users", router.pathPatternToHandlers)
      assert.strictEqual(getHandlers.length, 1)
      assert.strictEqual(postHandlers.length, 1)
    })

    it('should handle routes with parameters in prefix path', () => {
      const handler: AsyncHttpHandler = async () => void 0
      const prefixRouter = router.route("/api")
      prefixRouter.get("/users/:id", handler)

      const handlers = router.getHandlers("GET", "/api/users/42", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.deepStrictEqual(handlers[0].params, { ":id": ["42"] })
    })

    it('should handle routes with wildcard parameters', () => {
      const handler: AsyncHttpHandler = async () => void 0
      const prefixRouter = router.route("/files")
      prefixRouter.get("/*path", handler)

      const handlers = router.getHandlers("GET", "/files/docs/2024/report.pdf", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.ok(handlers[0].params["*path"])
    })

    it('should handle multiple routes with same prefix', () => {
      const handler1: AsyncHttpHandler = async () => void 0
      const handler2: AsyncHttpHandler = async () => void 0
      const handler3: AsyncHttpHandler = async () => void 0
      const prefixRouter = router.route("/api")

      prefixRouter.get("/users", handler1)
      prefixRouter.post("/users", handler2)
      prefixRouter.delete("/users/:id", handler3)

      const getHandlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      const postHandlers = router.getHandlers("POST", "/api/users", router.pathPatternToHandlers)
      const deleteHandlers = router.getHandlers("DELETE", "/api/users/42", router.pathPatternToHandlers)

      assert.strictEqual(getHandlers.length, 1)
      assert.strictEqual(postHandlers.length, 1)
      assert.strictEqual(deleteHandlers.length, 1)
      assert.strictEqual(deleteHandlers[0].params[":id"][0], "42")
    })
  })

  describe('param', () => {
    it('should register param handler for named parameter', () => {
      const paramHandler: AsyncParamHandler = async () => void 0
      const prefixRouter = router.route("/users")
      prefixRouter.param("id", paramHandler)

      const paramHandlers = router.pathPatternToParamHandlers.get("/users")
      assert.ok(paramHandlers)
      assert.ok(paramHandlers.has(":id"))
      assert.ok(paramHandlers.has("*id"))
    })

    it('should register multiple param handlers', () => {
      const paramHandler1: AsyncParamHandler = async () => void 0
      const paramHandler2: AsyncParamHandler = async () => void 0
      const prefixRouter = router.route("/api")
      prefixRouter.param("id", paramHandler1)
      prefixRouter.param("id", paramHandler2)

      const paramHandlers = router.pathPatternToParamHandlers.get("/api")
      const handlers = paramHandlers?.get(":id") ?? []
      assert.ok(handlers.length >= 2)
    })
  })

  describe('error', () => {
    it('should register error handler for all methods', () => {
      const errorHandler: AsyncHttpErrorHandler = async () => void 0
      const prefixRouter = router.route("/api")
      prefixRouter.error("/users", errorHandler)

      const handlers = router.getHandlers("all", "/api/users", router.pathPatternToErrorHandlers)
      assert.ok(handlers.length > 0)
      assert.ok(handlers.some(h => h.handler === errorHandler))
    })

    it('should register error handler for specific method', () => {
      const errorHandler: AsyncHttpErrorHandler = async () => void 0
      const prefixRouter = router.route("/api")
      prefixRouter.error("POST", "/users", errorHandler)

      const handlers = router.getHandlers("post", "/api/users", router.pathPatternToErrorHandlers)
      assert.ok(handlers.length > 0)
      assert.ok(handlers.some(h => h.handler === errorHandler))
    })

    it('should support method chaining with error', () => {
      const errorHandler1: AsyncHttpErrorHandler = async () => void 0
      const errorHandler2: AsyncHttpErrorHandler = async () => void 0
      const prefixRouter = router.route("/api")
      const result = prefixRouter.error("/users", errorHandler1).error("/posts", errorHandler2)

      assert.strictEqual(result, prefixRouter)
    })

    it('should handle multiple error handlers with prefix', () => {
      const errorHandler1: AsyncHttpErrorHandler = async () => void 0
      const errorHandler2: AsyncHttpErrorHandler = async () => void 0
      const prefixRouter = router.route("/api")

      prefixRouter.error("/users", errorHandler1)
      prefixRouter.error("/users", errorHandler2)

      const handlers = router.getHandlers("all", "/api/users", router.pathPatternToErrorHandlers)
      assert.ok(handlers.length >= 2)
      assert.ok(handlers.some(h => h.handler === errorHandler1))
      assert.ok(handlers.some(h => h.handler === errorHandler2))
    })
  })

  describe('integration', () => {
    it('should handle complete workflow with prefix router', async () => {
      const order: string[] = []

      const handler1: AsyncHttpHandler = async () => {
        order.push("handler1")
      }
      const handler2: AsyncHttpHandler = async () => {
        order.push("handler2")
      }

      const prefixRouter = router.route("/api")
      prefixRouter.get("/users", handler1)
      prefixRouter.post("/users", handler2)

      const getHandlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      for (const h of getHandlers) {
        await h.handler({} as any, {} as any)
      }

      assert.deepStrictEqual(order, ["handler1"])

      order.length = 0
      const postHandlers = router.getHandlers("POST", "/api/users", router.pathPatternToHandlers)
      for (const h of postHandlers) {
        await h.handler({} as any, {} as any)
      }

      assert.deepStrictEqual(order, ["handler2"])
    })

    it('should handle multiple prefix routers on same parent', () => {
      const handler1: AsyncHttpHandler = async () => void 0
      const handler2: AsyncHttpHandler = async () => void 0

      const apiRouter = router.route("/api")
      const webRouter = router.route("/web")

      apiRouter.get("/users", handler1)
      webRouter.get("/users", handler2)

      const apiHandlers = router.getHandlers("GET", "/api/users", router.pathPatternToHandlers)
      const webHandlers = router.getHandlers("GET", "/web/users", router.pathPatternToHandlers)

      assert.strictEqual(apiHandlers.length, 1)
      assert.strictEqual(webHandlers.length, 1)
      assert.strictEqual(apiHandlers[0].handler, handler1)
      assert.strictEqual(webHandlers[0].handler, handler2)
    })

    it('should handle prefix router with error handling', async () => {
      const prefixRouter = router.route("/api")

      const handler: AsyncHttpHandler = async (req: any) => {
        if (req.shouldError) {
          throw new Error("Test error")
        }
      }

      const errorHandler: AsyncHttpErrorHandler = async (errors: any[], req: any, res: any) => {
        res.statusCode = 500
        res.errorHandled = true
      }

      prefixRouter.post("/data", handler)
      prefixRouter.error("/data", errorHandler)

      const mockReq: any = { method: "POST", url: "/api/data", shouldError: true }
      const mockRes: any = { statusCode: 200 }

      await router.handle(mockReq, mockRes)
      assert.strictEqual(mockRes.statusCode, 500)
      assert.ok(mockRes.errorHandled)
    })

    it('should correctly extract parameters from prefixed routes', () => {
      const handler: AsyncHttpHandler = async () => void 0
      const prefixRouter = router.route("/api")

      prefixRouter.get("/users/:userId/posts/:postId", handler)

      const handlers = router.getHandlers("GET", "/api/users/123/posts/456", router.pathPatternToHandlers)
      assert.strictEqual(handlers.length, 1)
      assert.deepStrictEqual(handlers[0].params, {
        ":userId": ["123"],
        ":postId": ["456"]
      })
    })

    it('should integrate with .handle', async () => {
      const handler: AsyncHttpHandler = async (req: any, res: any) => {
        const { divident, divisor } = req.body || {}
        if (divisor === 0) {
          throw new Error("Divisor cannot be zero")
        }
        return res.end(divident / divisor)
      }

      const errorHandler: AsyncHttpErrorHandler = async (errors: any[], req: any, res: any) => {
        res.statusCode = 400
        res.end(errors[0].message)
      }

      router.route("/divide").post(handler)
      router.route("/divide").error(errorHandler)
      // success 
      {
        const mockReq: any = { method: "POST", url: "/divide", body: { divident: 10, divisor: 2 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 200)
        assert.strictEqual(mockRes.endCalledWith, 5)
      }

      // fail case
      {
        const mockReq: any = { method: "POST", url: "/divide", body: { divident: 10, divisor: 0 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 400)
        assert.strictEqual(mockRes.endCalledWith, "Divisor cannot be zero")
      }
    })


    it('should assign param to request', async () => {
      const handler: AsyncHttpHandler = async (req: any, res: any) => {
        const { operand1, operand2 } = req.body || {}
        if (typeof operand1 !== "number" && typeof operand2 !== "number") {
          throw new Error(`Invalid operands: ${operand1} ${operand2}`)
        }
        const operator = req.params["operator"]
        switch (operator) {
          case "divide": {
            if (operand2 === 0) {
              throw new Error("Divisor cannot be zero")
            }
            return res.end(operand1 / operand2)
          }
          case "multiply": {
            return res.end(operand1 * operand2)
          }
          default: {
            throw new Error("Invalid operator: " + operator)
          }

        }
      }

      const errorHandler: AsyncHttpErrorHandler = async (errors: any[], req: any, res: any) => {
        res.statusCode = 400
        res.end(errors[0].message)
      }

      router.route("/math").post("/:operator", handler)
      router.route("/math").error(errorHandler)
      // success 
      {
        const mockReq: any = { method: "POST", url: "/math/divide", body: { operand1: 10, operand2: 2 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 200)
        assert.strictEqual(mockRes.endCalledWith, 5)
      }

      // fail case
      {
        const mockReq: any = { method: "POST", url: "/math/divide", body: { operand1: 10, operand2: 0 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 400)
        assert.strictEqual(mockRes.endCalledWith, "Divisor cannot be zero")
      }

      // fail case with invalid operator
      {
        const mockReq: any = { method: "POST", url: "/math/add", body: { operand1: 10, operand2: 2 } }
        const mockRes: any = { statusCode: 200, endCalledWith: null, end: function (arg: any) { this.endCalledWith = arg } }

        await router.handle(mockReq, mockRes)
        assert.strictEqual(mockRes.statusCode, 400)
        assert.strictEqual(mockRes.endCalledWith, "Invalid operator: add")
      }
    })
  })
})