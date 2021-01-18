---
title: "httprouter"
date: "2021-01-17"
description: "Goの有名パッケージhttprouterを読みます。"
language: "go"
serialization: ["httprouter", "httprouter2"]
---

今日は[julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)です。

たまに雑な API を Go で作るときに使うのでどのように実装されているか気になってました。

見てみます。

# Repository

[github.com/julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)

# Package Features - Named parameters

[httprouter](https://github.com/julienschmidt/httprouter)の一番の`net/http`との違いは`Named parameters`だと思います。

`router.GET("/hello/:name", Hello)`と登録することで

`httprouter.Params.ByName("name")`でパラメータを取得できます。

まだいっぱい特徴があるのですが、今回はこの機能に絞ってコードを読んでいきます。

## router.go

コード: [router.go](https://github.com/julienschmidt/httprouter/blob/master/router.go)

# Reading

まず、必ず呼び出すコンストラクタです。

```go
// New returns a new initialized Router.
// Path auto-correction, including trailing slashes, is enabled by default.
func New() *Router {
	return &Router{
		RedirectTrailingSlash:  true,
		RedirectFixedPath:      true,
		HandleMethodNotAllowed: true,
		HandleOPTIONS:          true,
	}
}
```

返却される`*Router`は`net/http.Handler`インターフェイスを実装しています。

下記のコードでわかります。

```go
// Make sure the Router conforms with the http.Handler interface
var _ http.Handler = New()
```

`net/http`の方も読んでみたくなるなあ。また今度にします。

次に実際にパスに登録するための`GET`や`POST`メソッドです。

```go
router.GET("/hello/:name", Hello)
```

のように使います。

これは下記のコードです。

```go
// GET is a shortcut for router.Handle(http.MethodGet, path, handle)
func (r *Router) GET(path string, handle Handle) {
	r.Handle(http.MethodGet, path, handle)
}

// HEAD is a shortcut for router.Handle(http.MethodHead, path, handle)
func (r *Router) HEAD(path string, handle Handle) {
	r.Handle(http.MethodHead, path, handle)
}

// OPTIONS is a shortcut for router.Handle(http.MethodOptions, path, handle)
func (r *Router) OPTIONS(path string, handle Handle) {
	r.Handle(http.MethodOptions, path, handle)
}

// POST is a shortcut for router.Handle(http.MethodPost, path, handle)
func (r *Router) POST(path string, handle Handle) {
	r.Handle(http.MethodPost, path, handle)
}

// PUT is a shortcut for router.Handle(http.MethodPut, path, handle)
func (r *Router) PUT(path string, handle Handle) {
	r.Handle(http.MethodPut, path, handle)
}

// PATCH is a shortcut for router.Handle(http.MethodPatch, path, handle)
func (r *Router) PATCH(path string, handle Handle) {
	r.Handle(http.MethodPatch, path, handle)
}

// DELETE is a shortcut for router.Handle(http.MethodDelete, path, handle)
func (r *Router) DELETE(path string, handle Handle) {
	r.Handle(http.MethodDelete, path, handle)
}
```

`*Router.Handle`をラップしているだけです。

`*Router.Handle`に HTTP メソッド、パス、`Handle`型を渡します。

`Handle`型は

```go
type Handle func(http.ResponseWriter, *http.Request, Params)
```

と定義されています。

`net/http`の`HandlerFunc`型を拡張した型のようです。

```go
type HandlerFunc func(ResponseWriter, *Request)
```

`Handle`型の第三引数`Param`は下記です。

```go
// Param is a single URL parameter, consisting of a key and a value.
type Param struct {
	Key   string
	Value string
}

// Params is a Param-slice, as returned by the router.
// The slice is ordered, the first URL parameter is also the first slice value.
// It is therefore safe to read values by the index.
type Params []Param
```

単純にパラメータを格納しておくもののようです。

お目当てのパラメータは`Params.ByName`メソッドで取得できます。

```go
// ByName returns the value of the first Param which key matches the given name.
// If no matching Param is found, an empty string is returned.
func (ps Params) ByName(name string) string {
	for _, p := range ps {
		if p.Key == name {
			return p.Value
		}
	}
	return ""
}
```

なぜ`type Param map[string]string`で実装しないのでしょうか?

理由がありそうなので`*Router.Handle`で実際にどのようにパスと`Handle`型を紐付けているのか見てみます。

```go
// Handle registers a new request handle with the given path and method.
//
// For GET, POST, PUT, PATCH and DELETE requests the respective shortcut
// functions can be used.
//
// This function is intended for bulk loading and to allow the usage of less
// frequently used, non-standardized or custom methods (e.g. for internal
// communication with a proxy).
func (r *Router) Handle(method, path string, handle Handle) {
	varsCount := uint16(0)

	// 1
	if method == "" {
		panic("method must not be empty")
	}
	if len(path) < 1 || path[0] != '/' {
		panic("path must begin with '/' in path '" + path + "'")
	}
	if handle == nil {
		panic("handle must not be nil")
	}

	// 2
	if r.SaveMatchedRoutePath {
		varsCount++
		handle = r.saveMatchedRoutePath(path, handle)
	}

	// 3
	if r.trees == nil {
		r.trees = make(map[string]*node)
	}

	// 4
	root := r.trees[method]
	if root == nil {
		root = new(node)
		r.trees[method] = root

		r.globalAllowed = r.allowed("*", "")
	}

	// 5
	root.addRoute(path, handle)

	// Update maxParams
	if paramsCount := countParams(path); paramsCount+varsCount > r.maxParams {
		r.maxParams = paramsCount + varsCount
	}

	// Lazy-init paramsPool alloc func
	if r.paramsPool.New == nil && r.maxParams > 0 {
		r.paramsPool.New = func() interface{} {
			ps := make(Params, 0, r.maxParams)
			return &ps
		}
	}
}
```

1. バリデーション

```go
if method == "" {
	panic("method must not be empty")
}
if len(path) < 1 || path[0] != '/' {
	panic("path must begin with '/' in path '" + path + "'")
}
if handle == nil {
	panic("handle must not be nil")
}
```

2. `*Router.SaveMatchedRoutePath = true`を設定している場合のみ実行されます。

`Handle`型の実行の直前に`Params`にパスを追加します。

便利やー

```go
func (r *Router) saveMatchedRoutePath(path string, handle Handle) Handle {
	return func(w http.ResponseWriter, req *http.Request, ps Params) {
		if ps == nil {
			psp := r.getParams()
			ps = (*psp)[0:1]
			// ここ
			ps[0] = Param{Key: MatchedRoutePathParam, Value: path}
			handle(w, req, ps)
			r.putParams(psp)
		} else {
			ps = append(ps, Param{Key: MatchedRoutePathParam, Value: path})
			handle(w, req, ps)
		}
	}
}
```

```go
if r.SaveMatchedRoutePath {
	varsCount++
	handle = r.saveMatchedRoutePath(path, handle)
}
```

3. `*Router`に対して`Handle`が最初に呼び出された場合は初期化します。

```go
if r.trees == nil {
	r.trees = make(map[string]*node)
}
```

ここで`*Router`を見てみることにします。

```go
// Router is a http.Handler which can be used to dispatch requests to different
// handler functions via configurable routes
type Router struct {
	trees map[string]*node

	// comments...
	RedirectTrailingSlash bool

	// comments...
	RedirectFixedPath bool

	// comments...
	HandleMethodNotAllowed bool

	// comments...
	HandleOPTIONS bool

	// comments...
	GlobalOPTIONS http.Handler

	// comments...
	globalAllowed string

	// comments...
	NotFound http.Handler

	// comments...
	MethodNotAllowed http.Handler

	// comments...
	PanicHandler func(http.ResponseWriter, *http.Request, interface{})
}
```

ここで着目したいのは`trees`フィールドです。

```go
trees map[string]*node
```

`node`を見てみましょう。

```go
type node struct {
	path      string
	wildChild bool
	nType     nodeType
	maxParams uint8
	priority  uint32
	indices   string
	children  []*node
	handle    Handle
}
```

なんとなく見えてきました。

`node`構造体でパスと`Handle`型を紐付けていて、`node`を HTTP メソッドごとにツリー構造で管理しているようです。

では`*Router.Handle`に戻ります。

4. ここは登録したい HTTP メソッドがまだ`*Router.trees`に登録されていなければ初期化しているようです。

```go
	root := r.trees[method]
	if root == nil {
		root = new(node)
		r.trees[method] = root

		r.globalAllowed = r.allowed("*", "")
	}
```

`*Router.allowed(path, reqMethod string) (allow string)`は長いので割愛。

一応読みましたが、登録されている HTTP メソッドをカンマ区切りで返すだけです。

しかもその結果を格納している`*Router.globalAllowed`はどこでも使われていません。

よくわからん。。とりあえずスルー

5. やっと見たいところです。パスに`Handle`型を紐付けます。

```go
root.addRoute(path, handle)
```

やはり長い。。。

```go
// addRoute adds a node with the given handle to the path.
// Not concurrency-safe!
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

ここでツリー構造を組み立てています。

ちょっと一つの記事で見ていくには分量が多すぎるのでまた次回にします。。。

# Conclusion

httprouter の処理の流れとしては

1. HTTP リクエストごとにパスを管理
2. パスと実行したいハンドラをツリー構造で管理

という感じです。

次回以降は

2. パスと実行したいハンドラをツリー構造で管理

と、リクエストの際にどのように処理するのか読んでいきます。

コードが短いとはいえ、細かい挙動まで見ていくのは大変ですなあ。

それをするためにこのブログやっているのですがね。
