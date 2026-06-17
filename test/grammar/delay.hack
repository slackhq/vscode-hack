async function gen_foo(): Awaitable<int> {
  return 1;
}

async function gen_bar(): Awaitable<void> {
  $x = delay gen_foo();
}
