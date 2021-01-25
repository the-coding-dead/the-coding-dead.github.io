---
title: "httprouter2"
date: "2021-01-18"
description: "前回の続きです。httprouterを読みます。"
language: "go"
serialization: ["httprouter", "httprouter2", "httprouter3"]
---

前回から引き続き Go の[julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)を読んでいきます！

# Repository

[github.com/julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)

## router.go

コード: [router.go](https://github.com/julienschmidt/httprouter/blob/master/router.go)

# Review

前回の復習

httprouter の処理の流れは

1. HTTP リクエストごとにパスを管理
2. パスと実行したいハンドラをツリー構造で管理

だとわかりました。

パスと`Handle`を紐付けるときに呼ばれるのが`*Router.Handle`で

```go
func (r *Router) Handle(method, path string, handle Handle) {
	...
	root.addRoute(path, handle)
	...
}
```

その内部で呼ばれるのが`*node.addRoute`でした。

今日はこの中を見ることで

2. パスと実行したいハンドラをツリー構造で管理

する方法を理解していきます。

# Reading

```go
func (n *node) addRoute(path string, handle Handle) {
	fullPath := path
	n.priority++

	// Empty tree
	if n.path == "" && n.indices == "" {
		n.insertChild(path, fullPath, handle)
		n.nType = root
		return
	}

walk:
	for {
		// Find the longest common prefix.
		// This also implies that the common prefix contains no ':' or '*'
		// since the existing key can't contain those chars.
		i := longestCommonPrefix(path, n.path)

		// Split edge
		if i < len(n.path) {
			child := node{
				path:      n.path[i:],
				wildChild: n.wildChild,
				nType:     static,
				indices:   n.indices,
				children:  n.children,
				handle:    n.handle,
				priority:  n.priority - 1,
			}

			n.children = []*node{&child}
			// []byte for proper unicode char conversion, see #65
			n.indices = string([]byte{n.path[i]})
			n.path = path[:i]
			n.handle = nil
			n.wildChild = false
		}

		// Make new node a child of this node
		if i < len(path) {
			path = path[i:]

			if n.wildChild {
				n = n.children[0]
				n.priority++

				// Check if the wildcard matches
				if len(path) >= len(n.path) && n.path == path[:len(n.path)] &&
					// Adding a child to a catchAll is not possible
					n.nType != catchAll &&
					// Check for longer wildcard, e.g. :name and :names
					(len(n.path) >= len(path) || path[len(n.path)] == '/') {
					continue walk
				} else {
					// Wildcard conflict
					pathSeg := path
					if n.nType != catchAll {
						pathSeg = strings.SplitN(pathSeg, "/", 2)[0]
					}
					prefix := fullPath[:strings.Index(fullPath, pathSeg)] + n.path
					panic("'" + pathSeg +
						"' in new path '" + fullPath +
						"' conflicts with existing wildcard '" + n.path +
						"' in existing prefix '" + prefix +
						"'")
				}
			}

			idxc := path[0]

			// '/' after param
			if n.nType == param && idxc == '/' && len(n.children) == 1 {
				n = n.children[0]
				n.priority++
				continue walk
			}

			// Check if a child with the next path byte exists
			for i, c := range []byte(n.indices) {
				if c == idxc {
					i = n.incrementChildPrio(i)
					n = n.children[i]
					continue walk
				}
			}

			// Otherwise insert it
			if idxc != ':' && idxc != '*' {
				// []byte for proper unicode char conversion, see #65
				n.indices += string([]byte{idxc})
				child := &node{}
				n.children = append(n.children, child)
				n.incrementChildPrio(len(n.indices) - 1)
				n = child
			}
			n.insertChild(path, fullPath, handle)
			return
		}

		// Otherwise add handle to current node
		if n.handle != nil {
			panic("a handle is already registered for path '" + fullPath + "'")
		}
		n.handle = handle
		return
	}
}
```

まず、`*node`がまっさらの状態で`*node.addRoute`が呼ばれたときの処理を見ます。

```go
func (n *node) addRoute(path string, handle Handle) {
	fullPath := path
	n.priority++

	// Empty tree
	if n.path == "" && n.indices == "" {
		n.insertChild(path, fullPath, handle)
		n.nType = root
		return
	}
```

ここまでで良さそうです。

`*node.priority`が何に使われるのかはちょっとまだわからないので無視して進みます。

`*node.insertChild`を見てみましょう。

```go
func (n *node) insertChild(path, fullPath string, handle Handle) {
	for {
		// Find prefix until first wildcard
		wildcard, i, valid := findWildcard(path)
		if i < 0 { // No wilcard found
			break
		}

		// The wildcard name must not contain ':' and '*'
		if !valid {
			panic("only one wildcard per path segment is allowed, has: '" +
				wildcard + "' in path '" + fullPath + "'")
		}

		// Check if the wildcard has a name
		if len(wildcard) < 2 {
			panic("wildcards must be named with a non-empty name in path '" + fullPath + "'")
		}

		// Check if this node has existing children which would be
		// unreachable if we insert the wildcard here
		if len(n.children) > 0 {
			panic("wildcard segment '" + wildcard +
				"' conflicts with existing children in path '" + fullPath + "'")
		}

		// param
		if wildcard[0] == ':' {
			if i > 0 {
				// Insert prefix before the current wildcard
				n.path = path[:i]
				path = path[i:]
			}

			n.wildChild = true
			child := &node{
				nType: param,
				path:  wildcard,
			}
			n.children = []*node{child}
			n = child
			n.priority++

			// If the path doesn't end with the wildcard, then there
			// will be another non-wildcard subpath starting with '/'
			if len(wildcard) < len(path) {
				path = path[len(wildcard):]
				child := &node{
					priority: 1,
				}
				n.children = []*node{child}
				n = child
				continue
			}

			// Otherwise we're done. Insert the handle in the new leaf
			n.handle = handle
			return
		}

		// catchAll
		if i+len(wildcard) != len(path) {
			panic("catch-all routes are only allowed at the end of the path in path '" + fullPath + "'")
		}

		if len(n.path) > 0 && n.path[len(n.path)-1] == '/' {
			panic("catch-all conflicts with existing handle for the path segment root in path '" + fullPath + "'")
		}

		// Currently fixed width 1 for '/'
		i--
		if path[i] != '/' {
			panic("no / before catch-all in path '" + fullPath + "'")
		}

		n.path = path[:i]

		// First node: catchAll node with empty path
		child := &node{
			wildChild: true,
			nType:     catchAll,
		}
		n.children = []*node{child}
		n.indices = string('/')
		n = child
		n.priority++

		// Second node: node holding the variable
		child = &node{
			path:     path[i:],
			nType:    catchAll,
			handle:   handle,
			priority: 1,
		}
		n.children = []*node{child}

		return
	}

	// If no wildcard was found, simply insert the path and handle
	n.path = path
	n.handle = handle
}
```

これも長い。。。

丁寧に読んでいきます。

無限ループの直後

```go
// Find prefix until first wildcard
wildcard, i, valid := findWildcard(path)
```

最初のワイルドカードまでを取得しています。

ワイルドカードとは`:`と`*`ではじまるセグメントです。

`:`は前回、`Named parameters`と紹介しましたが、`*`で始まるものは`Catch-All parameters`というものです。

下記のようにマッチします。([README 参照](https://github.com/julienschmidt/httprouter#catch-all-parameters))

```
Pattern: /src/*filepath

 /src/                     match
 /src/somefile.go          match
 /src/subdir/somefile.go   match
```

では、`findWildcard`を読んでいきます。

```go
// Search for a wildcard segment and check the name for invalid characters.
// Returns -1 as index, if no wildcard was found.
func findWildcard(path string) (wilcard string, i int, valid bool) {
	// Find start
	// 1
	for start, c := range []byte(path) {
		// 2
		// A wildcard starts with ':' (param) or '*' (catch-all)
		if c != ':' && c != '*' {
			continue
		}

		// 3
		// Find end and check for invalid characters
		valid = true
		for end, c := range []byte(path[start+1:]) {
			switch c {
			case '/':
				return path[start : start+1+end], start, valid
			case ':', '*':
				valid = false
			}
		}
		return path[start:], start, valid
	}
	return "", -1, false
}
```

非常にシンプルです。

1. パスを一文字ずつループして
2. ワイルドカードじゃなかったら次
3. ワイルドカードが何なのか調べて、ついでにワイルドカードの文法エラーをチェック

という感じです。

返却値は

ワイルドカード、ワイルドカードのインデックス、文法エラーがないか

です。

ここで初めて気づいたのですが、

[julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)は

[`Named return values`](https://tour.golang.org/basics/7)を多用しています。

基本的に使うべきでないと思っていたので使用を避けていましたが、ドキュメントとしての効力がめちゃくちゃ高いなと思いました。

- 複数の返却値を返す
- 返却値が関数名から読み取れない
- 関数が割と短い

場合は使っていこうと思います。

では、`*node.insertChild`に戻ります。

```go
func (n *node) insertChild(path, fullPath string, handle Handle) {
	for {
		// Find prefix until first wildcard
		wildcard, i, valid := findWildcard(path)
		if i < 0 { // No wilcard found
			break
		}

		// The wildcard name must not contain ':' and '*'
		if !valid {
			panic("only one wildcard per path segment is allowed, has: '" +
				wildcard + "' in path '" + fullPath + "'")
		}

		// Check if the wildcard has a name
		if len(wildcard) < 2 {
			panic("wildcards must be named with a non-empty name in path '" + fullPath + "'")
		}

		// Check if this node has existing children which would be
		// unreachable if we insert the wildcard here
		if len(n.children) > 0 {
			panic("wildcard segment '" + wildcard +
				"' conflicts with existing children in path '" + fullPath + "'")
		}
```

findWildcard 後`if`は wildcard がなかった場合にすぐに関数最後に移動します。

```go
// If no wildcard was found, simply insert the path and handle
n.path = path
n.handle = handle
```

パスと`Handle`を紐付けています。

次の`if`3 連発はバリデーションですね。

次に移ります。

```go
// param
if wildcard[0] == ':' {
	if i > 0 {
		// Insert prefix before the current wildcard
		n.path = path[:i]
		path = path[i:]
	}

	n.wildChild = true
	child := &node{
		nType: param,
    path:  wildcard,
	}
	n.children = []*node{child}
	n = child
	n.priority++

	// If the path doesn't end with the wildcard, then there
	// will be another non-wildcard subpath starting with '/'
	if len(wildcard) < len(path) {
		path = path[len(wildcard):]
		child := &node{
			priority: 1,
		}
		n.children = []*node{child}
		n = child
		continue
	}

	// Otherwise we're done. Insert the handle in the new leaf
	n.handle = handle
	return
}
```

```go
if wildcard[0] == ':' {
```

なので`Named parameters`についてのようです。

やっていることは単純で、

`*node.children`に`Named parameters`として`*node`を追加し、

`/:hoge/huga`のように`Named parameters`の配下にサブパスがある場合はそのサブパスを先程追加した`Named paramters`の`*node`の`children`に追加しています。

`/:hoge/huga/:piyo`のような場合があるので上記を何度も繰り返します。

最後に`*node`に`Handle`を紐付けています。

やっと見えてきました。。。

次行きます。

```go
// catchAll
if i+len(wildcard) != len(path) {
	panic("catch-all routes are only allowed at the end of the path in path '" + fullPath + "'")
}

if len(n.path) > 0 && n.path[len(n.path)-1] == '/' {
	panic("catch-all conflicts with existing handle for the path segment root in path '" + fullPath + "'")
}

// Currently fixed width 1 for '/'
i--
if path[i] != '/' {
	panic("no / before catch-all in path '" + fullPath + "'")
}

n.path = path[:i]

// First node: catchAll node with empty path
child := &node{
	wildChild: true,
	nType:     catchAll,
}
n.children = []*node{child}
n.indices = string('/')
n = child
n.priority++

// Second node: node holding the variable
child = &node{
	path:     path[i:],
	nType:    catchAll,
	handle:   handle,
	priority: 1,
}
n.children = []*node{child}

return
```

こちらは`Catch-All parameters`の処理です。

バリデーションと`Named paramters`とほぼ同じ処理があります。

`Named paramters`と違い、`/*hoge/huga`のような指定はできないので

サブパスの処理はないです。

これでパスと`Handle`をどのように紐付けているのか、

`Named paramters`と`Catch-All parameters`はどのように処理するのかがわかりました。

とりあえず今回はこのへんにしときます。。。

# Conclusion

今回は主に`*node.insertChild`について見てきました。

`Named paramters`と`Catch-All parameters`をどのように処理するのかは非常に勉強になりました。

次回は`*node.insertChild`を呼び出している`*node.addRoute`に戻って処理を見ていきます。

今更ですが、`*Router.ServeHTTP`を先に読んでおけばここまで読んだ文を理解するのがもっと楽だった気がします。。。

以上です。
