// All of these type names should be highlighted the same way.
function foo(num $x, string $s, int $s, Thing $x): void {
  if ($x is Foo) {
    $x as Thing;
  }
}
