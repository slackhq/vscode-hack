# Syntax Generation

This extension uses the Hack language grammar defined in the [atom-ide-hack project](https://github.com/hhvm/atom-ide-hack).

The source file is located at [https://github.com/hhvm/atom-ide-hack/blob/master/grammars/hack.cson](https://github.com/hhvm/atom-ide-hack/blob/master/grammars/hack.cson).

Since it is in CSON format, it has to be converted to JSON before use here. A converter is included as a npm dev dependency, and can be run by:

```bash
$ ./node_modules/cson/bin/cson2json syntaxes/hack.cson > syntaxes/hack.json
```
