
function create_collections(): void {
  $v = Vector {};
  $v2 = ImmVector {};

  $m = Map { 'x' => 1 };
  $m2 = ImmMap { 'x' => 1 };

  $m = Set {};
  $m2 = ImmSet {};

  $p = Pair { 1, 2 };
}
