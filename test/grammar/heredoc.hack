function _(): void {
  $not_heredoc = "<<<END";
  $either = "END";
  $unindented = Str\format(<<<END
END
);
  $indented = Str\format(
    <<<END
END
);
  $y = '';
  Cls::someMethod();
}
