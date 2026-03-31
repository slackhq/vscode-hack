// The `where` keyword in generic constraints should be highlighted as a keyword.
function foo<T>(): T where T super string {}
function bar<T>(): T where T as arraykey {}
function baz<T1, T2>(): void where T1 as T2, T2 super int {}
