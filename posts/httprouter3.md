---
title: "httprouter3"
date: "2021-01-25"
description: "3回目！httprouterです。"
language: "go"
serialization: ["httprouter", "httprouter2", "httprouter3"]
---

今回も引き続きGoの[julienschmidt/httprouter](https://github.com/julienschmidt/httprouter)を読んでいきます！

# Review

前回の復習

`*node.insertChild`内で`Named paramters`と`Catch-All parameters`をどのように処理するのかを確認していきました。

今回は呼び出し元の`*node.addRoute`に戻って処理を読み進めていきます。

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

で前回は終わりました。

空のtreeではないときの処理である、以降コードを見ていきます。

```go
walk:
	for {
		// Find the longest common prefix.
		// This also implies that the common prefix contains no ':' or '*'
		// since the existing key can't contain those chars.
		i := longestCommonPrefix(path, n.path)
```

`/foo/bar/`と`/foo/baz/`の共通prefix`/foo/`のインデックスを取得する処理です。

```go
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
```

インデックスがノードのパスより短いとき、つまり

`/foo/bar/baz`のようなノードに`/foo/bar`を追加するようなときの処理です。

単純に現在のノードの子ノードに割り込む形で登録しています。

```go
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
```

今度は逆で

`/foo/bar`のようなノードに`/foo/bar/baz`を追加するようなときの処理です。

`if n.wildChild { ... }` でワイルドカードのチェックをしています。

```go
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
```

```go
// '/' after param
if n.nType == param && idxc == '/' && len(n.children) == 1 {
  n = n.children[0]
  n.priority++
  continue walk
}
```

パラメータの直後だった場合は、現在ノードの子ノードを現在ノードとして、再度ループを回します。

```go
// Check if a child with the next path byte exists
for i, c := range []byte(n.indices) {
  if c == idxc {
    i = n.incrementChildPrio(i)
    n = n.children[i]
    continue walk
  }
}
```

子ノードにパスの最初の文字と同じ文字を持つ子が存在するかどうかのチェックしています。

同じ場合は、その子ノードを現在のノードとして再度無限ループに戻ります

なぜ`n.indices`ループしているかというと

直後で子要素が複数ある場合はそれらを結合して保存しているためです。

```go
// Otherwise insert it
if idxc != ':' && idxc != '*' {
  // []byte for proper unicode char conversion, see #65
  n.indices += string([]byte{idxc})
  child := &node{}
  n.children = append(n.children, child)
  n.incrementChildPrio(len(n.indices) - 1)
  n = child
}


// Otherwise add handle to current node
if n.handle != nil {
  panic("a handle is already registered for path '" + fullPath + "'")
}
n.handle = handle
return
```

上記に該当しなければ、現在のノードに子ノードを追加し、`Handle`をノードに登録して終了です。

どうやって階層構造を作っているのかが全て理解できました！

では最後に`Handle`とパスの階層構造をもつ`*Router`を呼び出すかを確認していきます。

```go
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if r.PanicHandler != nil {
		defer r.recv(w, req)
	}

	path := req.URL.Path

	if root := r.trees[req.Method]; root != nil {
		if handle, ps, tsr := root.getValue(path, r.getParams); handle != nil {
			if ps != nil {
				handle(w, req, *ps)
				r.putParams(ps)
			} else {
				handle(w, req, nil)
			}
			return
		} else if req.Method != http.MethodConnect && path != "/" {
			// Moved Permanently, request with GET method
			code := http.StatusMovedPermanently
			if req.Method != http.MethodGet {
				// Permanent Redirect, request with same method
				code = http.StatusPermanentRedirect
			}

			if tsr && r.RedirectTrailingSlash {
				if len(path) > 1 && path[len(path)-1] == '/' {
					req.URL.Path = path[:len(path)-1]
				} else {
					req.URL.Path = path + "/"
				}
				http.Redirect(w, req, req.URL.String(), code)
				return
			}

			// Try to fix the request path
			if r.RedirectFixedPath {
				fixedPath, found := root.findCaseInsensitivePath(
					CleanPath(path),
					r.RedirectTrailingSlash,
				)
				if found {
					req.URL.Path = fixedPath
					http.Redirect(w, req, req.URL.String(), code)
					return
				}
			}
		}
	}

	if req.Method == http.MethodOptions && r.HandleOPTIONS {
		// Handle OPTIONS requests
		if allow := r.allowed(path, http.MethodOptions); allow != "" {
			w.Header().Set("Allow", allow)
			if r.GlobalOPTIONS != nil {
				r.GlobalOPTIONS.ServeHTTP(w, req)
			}
			return
		}
	} else if r.HandleMethodNotAllowed { // Handle 405
		if allow := r.allowed(path, req.Method); allow != "" {
			w.Header().Set("Allow", allow)
			if r.MethodNotAllowed != nil {
				r.MethodNotAllowed.ServeHTTP(w, req)
			} else {
				http.Error(w,
					http.StatusText(http.StatusMethodNotAllowed),
					http.StatusMethodNotAllowed,
				)
			}
			return
		}
	}

	// Handle 404
	if r.NotFound != nil {
		r.NotFound.ServeHTTP(w, req)
	} else {
		http.NotFound(w, req)
	}
}
```

こっちはかなり読みやすいです。

```go
if r.PanicHandler != nil {
  defer r.recv(w, req)
}

path := req.URL.Path

if root := r.trees[req.Method]; root != nil {...}

if req.Method == http.MethodOptions && r.HandleOPTIONS {...} else if r.HandleMethodNotAllowed {...}

// Handle 404
if r.NotFound != nil {
  r.NotFound.ServeHTTP(w, req)
} else {
  http.NotFound(w, req)
}
```

リクエストで受け取った`HTTPメソッド`が登録されておらず、

`OPTIONS`でも`OPTIONS`設定が有効出ない場合は、

`404`を返却します。

では下記を見ていきます。

```go
if root := r.trees[req.Method]; root != nil {
  if handle, ps, tsr := root.getValue(path, r.getParams); handle != nil {
    if ps != nil {
      handle(w, req, *ps)
      r.putParams(ps)
    } else {
      handle(w, req, nil)
    }
    return
```

`*node.getValue`にすべて詰まっているようです。

今回はここまでにして、次回`*node.getValue`を見ます。

次回でラストにしよう。

# Conclusion

ノードと子ノードの階層を作っている`*node.addRoute`を見てきました。

正直、自分でかんたんなものを作ってみないと完全には理解できないような気がします。

次回で絶対に終わらせたい！最初の方に扱う題材としては良かったのかなあ。

以上です。
