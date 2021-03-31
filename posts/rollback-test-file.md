---
title: "Go - テストデータの巻き戻し"
date: "2021-03-31"
description: "ユニットテストで変更されたデータを終了後に戻したいとき、ありますよね?"
language: "go"
---

秒殺でブログやめてたのですが、いかんと思い、書きます。

Goでテスト書いているときに(というかどんな言語でも)

テスト中に変更されたテストデータをテスト終了後に戻したいときありませんか?

- テキストファイルに追記されていることを確認するテストで、テスト終了後にもとのテキストファイルにもどしてほしい！
- 画像がマスキングされることを確認するテストで、テスト終了後にもとの画像にもどしてほしい！
- テストデータをGit管理していると差分が出るのでもどしてほしい!

あるよね(たまにね)

なのでそういう便利な関数を書いてみました。

# Sample Code

[DeferRollbackDir](https://github.com/the-coding-dead/code/blob/main/testutils/defer_rollback_dir.go)

# How To Use

こんなふうにテスト対象を実行する前にディレクトリを登録しておくと

テスト終了後にディレクトリをもとに戻してくれます。

```go
func TestHoge(t *testing.T) {
  testutils.DeferRollbackDir(t, "testdata/hoge")

  ChangeHoge()
}
```

これを作るために[os](https://golang.org/pkg/os)パッケージ周りを再復習しました。

## [os.Open](https://golang.org/pkg/os/#Open)

これは読み込むためにしか利用できません。

実装上は[os.OpenFile](https://golang.org/pkg/os/#OpenFile)を読み込み専用で開いています。

```go
func Open(name string) (*File, error) {
	return OpenFile(name, O_RDONLY, 0)
}
```

## [os.Create](https://golang.org/pkg/os/#Create)

これは作成時用です。

存在している場合はtruncateします。

ディレクトリ内のファイルの退避として[os.Create](https://golang.org/pkg/os/#Create)を使用します。

```go
func Create(name string) (*File, error) {
	return OpenFile(name, O_RDWR|O_CREATE|O_TRUNC, 0666)
}
```

## [os.RemoveAll](https://golang.org/pkg/os/#RemoveAll)

ディレクトリまたはファイルを削除できます。

[os.Remove](https://golang.org/pkg/os/#Remove)は空のディレクトリかファイルにしか使用できません。

[os.RemoveAll](https://golang.org/pkg/os/#RemoveAll)はディレクトリにファイルがある場合も削除可能です。

[DeferRollbackDir](https://github.com/the-coding-dead/code/blob/main/testutils/defer_rollback_dir.go)はディレクトリ復元する前に、対象のディレクトリを削除することにしました。

## [os.Mkdir](https://golang.org/pkg/os/#Mkdir)

ディレクトリを作成します。

親のディレクトリがない場合はエラーが起きます。

[DeferRollbackDir](https://github.com/the-coding-dead/code/blob/main/testutils/defer_rollback_dir.go)はそれぞれのディレクトリごとにPermissionを設定したいので(無意味か?)これを使うことにしました。

## [os.Stat](https://golang.org/pkg/os/#Stat)

この関数は対象のファイルまたはディレクトリが存在しないときに[os.ErrNotExist](https://golang.org/pkg/os/#pkg-variables)を返却します。

こんな感じで[os.Mkdir](https://golang.org/pkg/os/#Mkdir)と組み合わせます。

```go
if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
  if err := os.Mkdir(path, mode); err != nil {
    return err
  }
}
```

## [os.OpenFile](https://golang.org/pkg/os/#OpenFile)

[DeferRollbackDir](https://github.com/the-coding-dead/code/blob/main/testutils/defer_rollback_dir.go)はファイル復元時に、もとのPermissionで復元したいのでPermissionを指定できる[os.OpenFile](https://golang.org/pkg/os/#OpenFile)でファイルを作成します。

## Conclusion

大したことやっていないのですが、結構作るの時間かかりました。

これくらいの関数をまとめてテスト用のパッケージにしてくれてたりしないですかね?

作ってみようかな?

あと、[(\*T).Cleanup](https://golang.org/pkg/testing/#T.Cleanup)が便利すぎますね

以上です。
