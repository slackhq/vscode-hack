// In this test, there are two >> symbols next to each other.
// They should not break the overall flow of syntax coloring.
// Everything after shape(...)>> should be colored correctly.

protected static function initializeCoValidators(
): vec<LoggerCoValidator<shape(...)>> {
    return vec[];
}