// This function returns an XHP snippet with embedded text
// that has some unpaired symbols.

  public static function getMetric(): :foo {
    return
    /* The text within this XHP snippet should be colored white */
      <foo >
        Testing embedded text with unpaired symbols that can cause breaks:
        (
        '
        "
        \
        }
        <
        >
      </foo>;
    /* After the text, normal syntax highlighting resumes */
  }

public function anotherFunction(): int {
    return 42;
}