import assert from "node:assert"
import { beforeEach, describe, it } from "node:test"
import { AsyncRouter, type AsyncHttpHandler, type Method } from "../src/router.ts";
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
})