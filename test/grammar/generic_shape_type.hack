// This function should correctly highlight elements after the "shape(...)" syntax

function trace_shape_scalars_as_span_tags(SpanRef $span, shape(...) $shape, vec(arraykey) $v) {
    foreach (Shapes::toDict($shape) as $key => $value) {
        if ($value is int) {
            t($span, $key_prefix.(string)$key, $value);
        } else if ($value is float) {
            t($span, $key_prefix.(string)$key, $value);
        } else if ($value is bool) {
            t($span, $key_prefix.(string)$key, $value);
        } else if ($value is string) {
            t($span, $key_prefix.(string)$key, $value);
        }
    }
}