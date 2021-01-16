---
title: "xv6 - ls"
date: "2021-01-16"
description: "今日は最初ということで教育用のlinuxのlsを読みます。"
language: "c"
---

最初っぽいので ls にしました。

GNU とか BSD のは記述量とか多そうだったので教育用に作られた Linux である[xv6](https://pdos.csail.mit.edu/6.828/2012/xv6.html)のなかの ls を読んでみます。

ちなみに私の C 言語のレベルは[詳説 C ポインタ](https://amzn.to/35Nc5Bn)を読んで理解したというレベルです。読めるけど書けないというやつです。

# Repository

[github.com/mit-pdos/xv6-riscv](https://github.com/mit-pdos/xv6-riscv)

ちなみに

[github.com/mit-pdos/xv6-public](https://github.com/mit-pdos/xv6-public)はもうメンテナンスされていないらしいです。

## ls

コード: [ls.c](https://github.com/mit-pdos/xv6-riscv/blob/riscv/user/ls.c)

## Reading

### main function

```c
int
main(int argc, char *argv[])
{
  int i;

  if(argc < 2){
    ls(".");
    exit(0);
  }
  for(i=1; i<argc; i++)
    ls(argv[i]);
  exit(0);
}
```

main 関数はシンプルです。

コマンドの引数がない場合、ls 関数の引数として current directory を渡します。

コマンドの引数がある場合、順番に ls 関数の引数としてコマンドの引数を渡します。

## ls function

```c
void
ls(char *path)
{
  char buf[512], *p;
  int fd;
  struct dirent de;
  struct stat st;

  // 1
  if((fd = open(path, 0)) < 0){
    fprintf(2, "ls: cannot open %s\n", path);
    return;
  }

  // 2
  if(fstat(fd, &st) < 0){
    fprintf(2, "ls: cannot stat %s\n", path);
    close(fd);
    return;
  }

  // 3
  switch(st.type){
  case T_FILE:
    // 4
    printf("%s %d %d %l\n", fmtname(path), st.type, st.ino, st.size);
    break;

  case T_DIR:
    // 5
    if(strlen(path) + 1 + DIRSIZ + 1 > sizeof buf){
      printf("ls: path too long\n");
      break;
    }
    strcpy(buf, path);
    p = buf+strlen(buf);
    *p++ = '/';
    // 6
    while(read(fd, &de, sizeof(de)) == sizeof(de)){
      if(de.inum == 0)
        continue;
      memmove(p, de.name, DIRSIZ);
      p[DIRSIZ] = 0;
      if(stat(buf, &st) < 0){
        printf("ls: cannot stat %s\n", buf);
        continue;
      }
      // 7
      printf("%s %d %d %d\n", fmtname(buf), st.type, st.ino, st.size);
    }
    break;
  }
  close(fd);
}
```

流れはざっとこんなもん

- 1 パスをオープン
- 2 パスの情報取得
- 3 パスのタイプによって分岐
- 4 ファイルであれば、出力
- 5 ディレクトリの場合
- 6 ディレクトリ内のファイルをあるだけ読み込む
- 7 出力

# Rewrite

すべて自作の関数のため、一つ一つ見ていくのは時間がかかるので C11 で書き直してみました。

コード: [myls](https://github.com/the-coding-dead/code/blob/main/xv6-ls/myls.c)

```c
void ls(char *path) {
  struct stat st;

  if (stat(path, &st) < 0) {
    printf("ls: cannot stat %s\n", path);
    return;
  }

  if (S_ISREG(st.st_mode)) {
    printf("%s %d %lu %ld\n", fmtname(path), st.st_mode, st.st_ino, st.st_size);
  }

  // 1
  if (S_ISDIR(st.st_mode)) {
    char buf[512];
    // 2
    if (strlen(path) + 1 + DIRSIZ + 1 > sizeof buf) {
      printf("ls: path too long\n");
      return;
    }

    // 3
    strcpy(buf, path);
    char *p = buf + strlen(buf);
    *p++ = '/';

    // 4
    DIR *dir = opendir(path);
    for (struct dirent *de = readdir(dir); de != NULL; de = readdir(dir)) {
      // 5
      memmove(p, de->d_name, DIRSIZ);
      p[DIRSIZ] = 0;
      if (stat(buf, &st) < 0) {
        printf("ls: cannot stat %s\n", buf);
        continue;
      }
      // 6
      printf("%s %d %lu %ld\n", fmtname(buf), st.st_mode, st.st_ino,
             st.st_size);
    }
  }
}
```

やはり、少し短くなってる！

多分もう少し短く書けると思います。(fmtname 関数はそのまま使用)

- 1 のディレクトリを対象とした処理はいつもほぼ C を読んでいないためかなり手こずりました

- 2 ここは普段可変長の配列を使っているとほとんど意識しないような処理
  - malloc とかで動的に長さを設定できるようにしても良いかもしれない

```c
if (strlen(path) + 1 + DIRSIZ + 1 > sizeof buf) {
  printf("ls: path too long\n");
  return;
}
```

- 3 こういう配列をポインタで操作してくのは久しぶりに C やるとよくわかんなくなるなあ
  - buf はディレクトリとファイル名を`/`でつなげたものを格納する場所
  - p は格納していく際に一番後ろのメモリの位置を指すカーソルとして使用する

```c
strcpy(buf, path);
char *p = buf + strlen(buf);
*p++ = '/';
```

- 4 directory のなかのファイルを一覧していく

```c
DIR *dir = opendir(path);
for (struct dirent *de = readdir(dir); de != NULL; de = readdir(dir)) {
```

- 5 p にファイル名をコピーして、終端 null 文字を最後に入れる(`'\0'`を入れるのと同じ)

```c
memmove(p, de->d_name, DIRSIZ);
p[DIRSIZ] = 0;
```

- 6 出力
  - verb の数が多すぎて大変だなあ
  - go は楽で良い
  - 使いたいときだけ複雑なものを使用すれば良いから

```c
printf("%s %d %lu %ld\n", fmtname(buf), st.st_mode, st.st_ino,
       st.st_size);
```

## Conclusion

久しぶりに C のコードを読んだけど時間かかりました。。。

やってることは単純だけどポインタの動きを追いながら読むのは勉強になります。

ただ、書き直すのを毎日やるのはちょっともう無理かもです。

次は Go か Python にしとこうかな。
