int main(int argc, char *argv[]) {
  if (argc < 2) {
    ls(".");
    exit(0);
  }

  for (int i = 1; i < argc; i++)
    ls(argv[i]);

  exit(0);
}
