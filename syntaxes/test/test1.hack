// This file has an error (unpaired quote).  Everything after line 6
// should be colored as part of the string.

<<__EntryPoint>>
function foo(): void {
  $x = 'SELECT (')');
  echo $x;
}
