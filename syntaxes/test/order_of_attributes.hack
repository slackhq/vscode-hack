// Syntax highlighting of attributes should be correct.
// In this example both "Lossy" and "Safe" should show
// as the same color regardless of order.

namespace Cast;
<<Lossy, Safe>>
function num_int_round(num $num): int {
	return $num is int ? $num : float_int_round($num as float);
}

<<Safe, Lossy>>
function num_int_round_2(num $num): int {
	return $num is int ? $num : float_int_round($num as float);
}