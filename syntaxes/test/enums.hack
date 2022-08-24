enum SimpleEnum: int as arraykey {
  X = 1;
  Y = 2;
  Z = 3;
  ENUM_FOO = 1;
  ENUM_CLASS_BAR = 2;
}

enum ComplicatedEnum: classname<Foo> as classname<Bar> {}
