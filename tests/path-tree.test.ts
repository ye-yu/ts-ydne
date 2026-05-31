import assert from "node:assert"
import { describe, it } from "node:test"
import { PathTree } from "../src/path-tree.ts"

describe("PathTree", () => {
  const pathTree = new PathTree<string>()

  pathTree.setPattern("/a/b{/d}/hello", (_, value) => value ?? "hello")
  pathTree.setPattern("/a/b/:name/hello", (_, value) => value ?? "hello from name")
  pathTree.setPattern("/a/b/:name/hello", (_, value) => value ?? "hello from name renamed")
  pathTree.setPattern("/a/b/*name/hello", (_, value) => value ?? "hello from name star")
  pathTree.setPattern("/a/b/*all", (_, value) => value ?? "hello from all")
  pathTree.setPattern("/a/b/*all/and/*next", (_, value) => value ?? "hello from all next")

  it("matches the static route and optional grouped variant", () => {
    const results = pathTree.match("/a/b/hello")
    const values = results.map((result) => result.node.value)

    assert.strictEqual(results.length, 2)
    assert.ok(values.includes("hello"))
    assert.ok(values.includes("hello from all"))

    const helloMatch = results.find((result) => result.node.value === "hello")
    assert.deepStrictEqual(helloMatch?.params, {})

    const allMatch = results.find((result) => result.node.value === "hello from all")
    assert.deepStrictEqual(allMatch?.params, { "*all": ["hello"] })
  })

  it("matches the optional grouped route with an inner segment", () => {
    const results = pathTree.match("/a/b/d/hello")
    const values = results.map((result) => result.node.value)

    assert.strictEqual(results.length, 5)
    assert.ok(values.includes("hello"))
    assert.ok(values.includes("hello from all"))
    assert.ok(values.includes("hello from name"))
    assert.ok(values.includes("hello from name star"))

    const helloMatch = results.find((result) => result.node.value === "hello")
    assert.deepStrictEqual(helloMatch?.params, {})

    const allMatch = results.find(
      (result) => result.node.value === "hello from all" && result.params["*all"]?.join("") === "d/hello"
    )
    assert.deepStrictEqual(allMatch?.params, { "*all": ["d", "/", "hello"] })

    const nameParam = results.find((result) => result.node.value === "hello from name")
    assert.deepStrictEqual(nameParam?.params, { ":name": ["d"] })

    const nameWildcard = results.find((result) => result.node.value === "hello from name star")
    assert.deepStrictEqual(nameWildcard?.params, { "*name": ["d"] })
  })

  it("matches named parameter and wildcard routes", () => {
    const results = pathTree.match("/a/b/name/hello")
    const values = results.map((result) => result.node.value)

    assert.strictEqual(results.length, 3)
    assert.ok(values.includes("hello from name"))
    assert.ok(values.includes("hello from name star"))
    assert.ok(values.includes("hello from all"))

    const nameParam = results.find((result) => result.node.value === "hello from name")
    assert.deepStrictEqual(nameParam?.params, { ":name": ["name"] })

    const nameWildcard = results.find((result) => result.node.value === "hello from name star")
    assert.deepStrictEqual(nameWildcard?.params, { "*name": ["name"] })
  })

  it("matches deeper wildcard paths", () => {
    const results = pathTree.match("/a/b/name/deep/hello")
    const values = results.map((result) => result.node.value)

    assert.strictEqual(results.length, 2)
    assert.ok(values.includes("hello from all"))
    assert.ok(values.includes("hello from name star"))

    const nameWildcard = results.find((result) => result.node.value === "hello from name star")
    assert.deepStrictEqual(nameWildcard?.params, { "*name": ["name", "/", "deep"] })
  })

  it("matches nested wildcard route with tail segments", () => {
    const results = pathTree.match("/a/b/name/deep/something/and/hello/again")
    const values = results.map((result) => result.node.value)

    assert.strictEqual(results.length, 2)
    assert.ok(values.includes("hello from all"))
    assert.ok(values.includes("hello from all next"))

    const allNext = results.find((result) => result.node.value === "hello from all next")
    assert.deepStrictEqual(allNext?.params, {
      "*all": ["name", "/", "deep", "/", "something"],
      "*next": ["hello", "/", "again"],
    })
  })

  it("does not match a non-existent route", () => {
    const results = pathTree.match("/a/bc/hello")
    assert.strictEqual(results.length, 0)
  })
})
