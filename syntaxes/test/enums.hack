enum SimpleEnum: int as arraykey {
  X = 1;
  Y = 2;
  Z = 3;
}

enum ComplicatedEnum: classname<Foo> as classname<Bar> {}
