
function booleans(): void {
  // normal boolean literals
  $x = true;
  $y = false;

  // booleans are case insensitive
  $x = True;
  $y = FALSE;

  // yes/no are not booleans.
  $x = yes;
  $y = no;

  // logical operators.
  $x = !true;
  $y = $x && ($x || true);
}
