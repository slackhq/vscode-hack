type upcast_test_t = shape('x' => string);

function upcast_test(dynamic $b): void {
    $var = $b upcast ~int;
    $upcast = 'test';
}
