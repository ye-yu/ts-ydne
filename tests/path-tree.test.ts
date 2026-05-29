import { PathTree } from "../src/path-tree.ts";

const pathTree = new PathTree<string>()
pathTree.setPattern("/a/b{/d}/hello", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello"
})
pathTree.setPattern("/a/b/:name/hello", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello from name"
})
pathTree.setPattern("/a/b/:name/hello", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello from name renamed"
})
pathTree.setPattern("/a/b/*name/hello", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello from name star"
})
pathTree.setPattern("/a/b/*all", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello from all"
})
pathTree.setPattern("/a/b/*all/and/*next", (segments, value) => {
    console.log("mapping", segments.join(''), value)
    return value ?? "hello from all next"
})
for (const { segments, params, node } of pathTree.match("/a/b/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/d/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/name/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/name/deep/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/name/deep/something/and/hello/again")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/name/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/bc/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}
for (const { segments, params, node } of pathTree.match("/a/b/d/hello")) {
    console.log("traversing", segments.join(''), params, node.value)
}

pathTree.printTree()