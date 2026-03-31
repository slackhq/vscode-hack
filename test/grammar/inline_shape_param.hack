type sometype = shape(
    'x' => int
);

function myfunction(
    int $anint,
    shape(?'x'=>'a') $myshape = shape(),
    sometype $more,
    int $other = 5
): void {
}
