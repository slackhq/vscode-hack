async function gen_foo(): Awaitable<int> {
  return 1;
}

async function gen_bar(): Awaitable<void> {
  concurrent {
    $x = await gen_foo(1);
    $y = await gen_foo(2);
  }
}