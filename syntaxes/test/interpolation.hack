// See https://www.php.net/manual/en/language.types.string.php#language.types.string.parsing
function double_quoted(): void {
  // Escape characters.
  $x = "world \n \t \\";

  // Octal/hex.
  $x = "world \07 \xFF"

  // Simple interpolation.
  $y = "hello $x";

  // We can do a single array access, but not nested.
  $y = "hello $x[0]";
  $y = "hello $x[0][1]"; // literal "[1]"

  // Similarly with properties, we can only access the first.
  $y = "hello $x->foo";
  $y = "hello $x->foo->bar"; // literal "->bar"

  // In {} we can use more complex expressions.
  $y = "hello {$x->y->z[0][1] + 2}";

  // Just accessing $x here due to the space.
  $y = "hello { $x + 1}";
}

function single_quoted(): void {
  // This is a literal \ and n.
  $x = 'foo\n bar';

  // No interpolation here.
  $x = 'foo $x';
}
