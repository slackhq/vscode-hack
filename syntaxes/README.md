# Syntax Generation

This extension uses the Hack language grammar defined in the [Nuclide project](https://github.com/facebook/nuclide).

The source file is located at [https://github.com/facebook/nuclide/blob/master/pkg/nuclide-language-hack/grammars/hack.cson](https://github.com/facebook/nuclide/blob/master/pkg/nuclide-language-hack/grammars/hack.cson).

Since it is in CSON format, it has to be converted to JSON before use here. A converter is included as a npm dev dependency, and can be run by:

```bash
$ ./node_modules/cson/bin/cson2json syntaxes/hack.cson > syntaxes/hack.json
```