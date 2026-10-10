"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from == "object" || typeof from == "function")
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
    mod
  ));

  // node_modules/@babel/parser/lib/index.js
  var require_lib = __commonJS({
    "node_modules/@babel/parser/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", {
        value: !0
      });
      function _objectWithoutPropertiesLoose(r, e) {
        if (r == null) return {};
        var t = {};
        for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
          if (e.indexOf(n) !== -1) continue;
          t[n] = r[n];
        }
        return t;
      }
      var Position = class {
        constructor(line, col, index) {
          this.line = void 0, this.column = void 0, this.index = void 0, this.line = line, this.column = col, this.index = index;
        }
      }, SourceLocation = class {
        constructor(start, end) {
          this.start = void 0, this.end = void 0, this.filename = void 0, this.identifierName = void 0, this.start = start, this.end = end;
        }
      };
      function createPositionWithColumnOffset(position, columnOffset) {
        let {
          line,
          column,
          index
        } = position;
        return new Position(line, column + columnOffset, index + columnOffset);
      }
      var code = "BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED", ModuleErrors = {
        ImportMetaOutsideModule: {
          message: `import.meta may appear only with 'sourceType: "module"'`,
          code
        },
        ImportOutsideModule: {
          message: `'import' and 'export' may appear only with 'sourceType: "module"'`,
          code
        }
      }, NodeDescriptions = {
        ArrayPattern: "array destructuring pattern",
        AssignmentExpression: "assignment expression",
        AssignmentPattern: "assignment expression",
        ArrowFunctionExpression: "arrow function expression",
        ConditionalExpression: "conditional expression",
        CatchClause: "catch clause",
        ForOfStatement: "for-of statement",
        ForInStatement: "for-in statement",
        ForStatement: "for-loop",
        FormalParameters: "function parameter list",
        Identifier: "identifier",
        ImportSpecifier: "import specifier",
        ImportDefaultSpecifier: "import default specifier",
        ImportNamespaceSpecifier: "import namespace specifier",
        ObjectPattern: "object destructuring pattern",
        ParenthesizedExpression: "parenthesized expression",
        RestElement: "rest element",
        UpdateExpression: {
          true: "prefix operation",
          false: "postfix operation"
        },
        VariableDeclarator: "variable declaration",
        YieldExpression: "yield expression"
      }, toNodeDescription = (node) => node.type === "UpdateExpression" ? NodeDescriptions.UpdateExpression[`${node.prefix}`] : NodeDescriptions[node.type], StandardErrors = {
        AccessorIsGenerator: ({
          kind
        }) => `A ${kind}ter cannot be a generator.`,
        ArgumentsInClass: "'arguments' is only allowed in functions and class methods.",
        AsyncFunctionInSingleStatementContext: "Async functions can only be declared at the top level or inside a block.",
        AwaitBindingIdentifier: "Can not use 'await' as identifier inside an async function.",
        AwaitBindingIdentifierInStaticBlock: "Can not use 'await' as identifier inside a static block.",
        AwaitExpressionFormalParameter: "'await' is not allowed in async function parameters.",
        AwaitUsingNotInAsyncContext: "'await using' is only allowed within async functions and at the top levels of modules.",
        AwaitNotInAsyncContext: "'await' is only allowed within async functions and at the top levels of modules.",
        BadGetterArity: "A 'get' accessor must not have any formal parameters.",
        BadSetterArity: "A 'set' accessor must have exactly one formal parameter.",
        BadSetterRestParameter: "A 'set' accessor function argument must not be a rest parameter.",
        ConstructorClassField: "Classes may not have a field named 'constructor'.",
        ConstructorClassPrivateField: "Classes may not have a private field named '#constructor'.",
        ConstructorIsAccessor: "Class constructor may not be an accessor.",
        ConstructorIsAsync: "Constructor can't be an async function.",
        ConstructorIsGenerator: "Constructor can't be a generator.",
        DeclarationMissingInitializer: ({
          kind
        }) => `Missing initializer in ${kind} declaration.`,
        DecoratorArgumentsOutsideParentheses: "Decorator arguments must be moved inside parentheses: use '@(decorator(args))' instead of '@(decorator)(args)'.",
        DecoratorBeforeExport: "Decorators must be placed *before* the 'export' keyword. Remove the 'decoratorsBeforeExport: true' option to use the 'export @decorator class {}' syntax.",
        DecoratorsBeforeAfterExport: "Decorators can be placed *either* before or after the 'export' keyword, but not in both locations at the same time.",
        DecoratorConstructor: "Decorators can't be used with a constructor. Did you mean '@dec class { ... }'?",
        DecoratorExportClass: "Decorators must be placed *after* the 'export' keyword. Remove the 'decoratorsBeforeExport: false' option to use the '@decorator export class {}' syntax.",
        DecoratorSemicolon: "Decorators must not be followed by a semicolon.",
        DecoratorStaticBlock: "Decorators can't be used with a static block.",
        DeferImportRequiresNamespace: 'Only `import defer * as x from "./module"` is valid.',
        DeletePrivateField: "Deleting a private field is not allowed.",
        DestructureNamedImport: "ES2015 named imports do not destructure. Use another statement for destructuring after the import.",
        DuplicateConstructor: "Duplicate constructor in the same class.",
        DuplicateDefaultExport: "Only one default export allowed per module.",
        DuplicateExport: ({
          exportName
        }) => `\`${exportName}\` has already been exported. Exported identifiers must be unique.`,
        DuplicateProto: "Redefinition of __proto__ property.",
        DuplicateRegExpFlags: "Duplicate regular expression flag.",
        ElementAfterRest: "Rest element must be last element.",
        EscapedCharNotAnIdentifier: "Invalid Unicode escape.",
        ExportBindingIsString: ({
          localName,
          exportName
        }) => `A string literal cannot be used as an exported binding without \`from\`.
- Did you mean \`export { '${localName}' as '${exportName}' } from 'some-module'\`?`,
        ExportDefaultFromAsIdentifier: "'from' is not allowed as an identifier after 'export default'.",
        ForInOfLoopInitializer: ({
          type
        }) => `'${type === "ForInStatement" ? "for-in" : "for-of"}' loop variable declaration may not have an initializer.`,
        ForInUsing: "For-in loop may not start with 'using' declaration.",
        ForOfAsync: "The left-hand side of a for-of loop may not be 'async'.",
        ForOfLet: "The left-hand side of a for-of loop may not start with 'let'.",
        GeneratorInSingleStatementContext: "Generators can only be declared at the top level or inside a block.",
        IllegalBreakContinue: ({
          type
        }) => `Unsyntactic ${type === "BreakStatement" ? "break" : "continue"}.`,
        IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list.",
        IllegalReturn: "'return' outside of function.",
        ImportAttributesUseAssert: "The `assert` keyword in import attributes is deprecated and it has been replaced by the `with` keyword. You can enable the `deprecatedImportAssert` parser plugin to suppress this error.",
        ImportBindingIsString: ({
          importName
        }) => `A string literal cannot be used as an imported binding.
- Did you mean \`import { "${importName}" as foo }\`?`,
        ImportCallArity: "`import()` requires exactly one or two arguments.",
        ImportCallNotNewExpression: "Cannot use new with import(...).",
        ImportCallSpreadArgument: "`...` is not allowed in `import()`.",
        ImportJSONBindingNotDefault: "A JSON module can only be imported with `default`.",
        ImportReflectionHasAssertion: "`import module x` cannot have assertions.",
        ImportReflectionNotBinding: 'Only `import module x from "./module"` is valid.',
        IncompatibleRegExpUVFlags: "The 'u' and 'v' regular expression flags cannot be enabled at the same time.",
        InvalidBigIntLiteral: "Invalid BigIntLiteral.",
        InvalidCodePoint: "Code point out of bounds.",
        InvalidCoverDiscardElement: "'void' must be followed by an expression when not used in a binding position.",
        InvalidCoverInitializedName: "Invalid shorthand property initializer.",
        InvalidDecimal: "Invalid decimal.",
        InvalidDigit: ({
          radix
        }) => `Expected number in radix ${radix}.`,
        InvalidEscapeSequence: "Bad character escape sequence.",
        InvalidEscapeSequenceTemplate: "Invalid escape sequence in template.",
        InvalidEscapedReservedWord: ({
          reservedWord
        }) => `Escape sequence in keyword ${reservedWord}.`,
        InvalidIdentifier: ({
          identifierName
        }) => `Invalid identifier ${identifierName}.`,
        InvalidLhs: ({
          ancestor
        }) => `Invalid left-hand side in ${toNodeDescription(ancestor)}.`,
        InvalidLhsBinding: ({
          ancestor
        }) => `Binding invalid left-hand side in ${toNodeDescription(ancestor)}.`,
        InvalidLhsOptionalChaining: ({
          ancestor
        }) => `Invalid optional chaining in the left-hand side of ${toNodeDescription(ancestor)}.`,
        InvalidNumber: "Invalid number.",
        InvalidOrMissingExponent: "Floating-point numbers require a valid exponent after the 'e'.",
        InvalidOrUnexpectedToken: ({
          unexpected
        }) => `Unexpected character '${unexpected}'.`,
        InvalidParenthesizedAssignment: "Invalid parenthesized assignment pattern.",
        InvalidPrivateFieldResolution: ({
          identifierName
        }) => `Private name #${identifierName} is not defined.`,
        InvalidPropertyBindingPattern: "Binding member expression.",
        InvalidRecordProperty: "Only properties and spread elements are allowed in record definitions.",
        InvalidRestAssignmentPattern: "Invalid rest operator's argument.",
        LabelRedeclaration: ({
          labelName
        }) => `Label '${labelName}' is already declared.`,
        LetInLexicalBinding: "'let' is disallowed as a lexically bound name.",
        LineTerminatorBeforeArrow: "No line break is allowed before '=>'.",
        MalformedRegExpFlags: "Invalid regular expression flag.",
        MissingClassName: "A class name is required.",
        MissingEqInAssignment: "Only '=' operator can be used for specifying default value.",
        MissingSemicolon: "Missing semicolon.",
        MissingPlugin: ({
          missingPlugin
        }) => `This experimental syntax requires enabling the parser plugin: ${missingPlugin.map((name) => JSON.stringify(name)).join(", ")}.`,
        MissingOneOfPlugins: ({
          missingPlugin
        }) => `This experimental syntax requires enabling one of the following parser plugin(s): ${missingPlugin.map((name) => JSON.stringify(name)).join(", ")}.`,
        MissingUnicodeEscape: "Expecting Unicode escape sequence \\uXXXX.",
        MixingCoalesceWithLogical: "Nullish coalescing operator(??) requires parens when mixing with logical operators.",
        ModuleAttributeDifferentFromType: "The only accepted module attribute is `type`.",
        ModuleAttributeInvalidValue: "Only string literals are allowed as module attribute values.",
        ModuleAttributesWithDuplicateKeys: ({
          key
        }) => `Duplicate key "${key}" is not allowed in module attributes.`,
        ModuleExportNameHasLoneSurrogate: ({
          surrogateCharCode
        }) => `An export name cannot include a lone surrogate, found '\\u${surrogateCharCode.toString(16)}'.`,
        ModuleExportUndefined: ({
          localName
        }) => `Export '${localName}' is not defined.`,
        MultipleDefaultsInSwitch: "Multiple default clauses.",
        NewlineAfterThrow: "Illegal newline after throw.",
        NoCatchOrFinally: "Missing catch or finally clause.",
        NumberIdentifier: "Identifier directly after number.",
        NumericSeparatorInEscapeSequence: "Numeric separators are not allowed inside unicode escape sequences or hex escape sequences.",
        ObsoleteAwaitStar: "'await*' has been removed from the async functions proposal. Use Promise.all() instead.",
        OptionalChainingNoNew: "Constructors in/after an Optional Chain are not allowed.",
        OptionalChainingNoTemplate: "Tagged Template Literals are not allowed in optionalChain.",
        OverrideOnConstructor: "'override' modifier cannot appear on a constructor declaration.",
        ParamDupe: "Argument name clash.",
        PatternHasAccessor: "Object pattern can't contain getter or setter.",
        PatternHasMethod: "Object pattern can't contain methods.",
        PrivateInExpectedIn: ({
          identifierName
        }) => `Private names are only allowed in property accesses (\`obj.#${identifierName}\`) or in \`in\` expressions (\`#${identifierName} in obj\`).`,
        PrivateNameRedeclaration: ({
          identifierName
        }) => `Duplicate private name #${identifierName}.`,
        RecordExpressionBarIncorrectEndSyntaxType: "Record expressions ending with '|}' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
        RecordExpressionBarIncorrectStartSyntaxType: "Record expressions starting with '{|' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
        RecordExpressionHashIncorrectStartSyntaxType: "Record expressions starting with '#{' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'hash'.",
        RecordNoProto: "'__proto__' is not allowed in Record expressions.",
        RestTrailingComma: "Unexpected trailing comma after rest element.",
        SloppyFunction: "In non-strict mode code, functions can only be declared at top level or inside a block.",
        SloppyFunctionAnnexB: "In non-strict mode code, functions can only be declared at top level, inside a block, or as the body of an if statement.",
        SourcePhaseImportRequiresDefault: 'Only `import source x from "./module"` is valid.',
        StaticPrototype: "Classes may not have static property named prototype.",
        SuperCallNotNewExpression: "Cannot use new with super(...).",
        SuperNotAllowed: "`super()` is only valid inside a class constructor of a subclass. Maybe a typo in the method name ('constructor') or not extending another class?",
        SuperPrivateField: "Private fields can't be accessed on super.",
        TrailingDecorator: "Decorators must be attached to a class element.",
        TupleExpressionBarIncorrectEndSyntaxType: "Tuple expressions ending with '|]' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
        TupleExpressionBarIncorrectStartSyntaxType: "Tuple expressions starting with '[|' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'bar'.",
        TupleExpressionHashIncorrectStartSyntaxType: "Tuple expressions starting with '#[' are only allowed when the 'syntaxType' option of the 'recordAndTuple' plugin is set to 'hash'.",
        UnexpectedArgumentPlaceholder: "Unexpected argument placeholder.",
        UnexpectedAwaitAfterPipelineBody: 'Unexpected "await" after pipeline body; await must have parentheses in minimal proposal.',
        UnexpectedDigitAfterHash: "Unexpected digit after hash token.",
        UnexpectedImportExport: "'import' and 'export' may only appear at the top level.",
        UnexpectedKeyword: ({
          keyword
        }) => `Unexpected keyword '${keyword}'.`,
        UnexpectedLeadingDecorator: "Leading decorators must be attached to a class declaration.",
        UnexpectedLexicalDeclaration: "Lexical declaration cannot appear in a single-statement context.",
        UnexpectedNewTarget: "`new.target` can only be used in functions or class properties.",
        UnexpectedNumericSeparator: "A numeric separator is only allowed between two digits.",
        UnexpectedPrivateField: "Unexpected private name.",
        UnexpectedReservedWord: ({
          reservedWord
        }) => `Unexpected reserved word '${reservedWord}'.`,
        UnexpectedSuper: "'super' is only allowed in object methods and classes.",
        UnexpectedToken: ({
          expected,
          unexpected
        }) => `Unexpected token${unexpected ? ` '${unexpected}'.` : ""}${expected ? `, expected "${expected}"` : ""}`,
        UnexpectedTokenUnaryExponentiation: "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.",
        UnexpectedUsingDeclaration: "Using declaration cannot appear in the top level when source type is `script` or in the bare case statement.",
        UnexpectedVoidPattern: "Unexpected void binding.",
        UnsupportedDecoratorExport: "A decorated export must export a class declaration.",
        UnsupportedDefaultExport: "Only expressions, functions or classes are allowed as the `default` export.",
        UnsupportedImport: "`import` can only be used in `import()` or `import.meta`.",
        UnsupportedMetaProperty: ({
          target,
          onlyValidPropertyName
        }) => `The only valid meta property for ${target} is ${target}.${onlyValidPropertyName}.`,
        UnsupportedParameterDecorator: "Decorators cannot be used to decorate parameters.",
        UnsupportedPropertyDecorator: "Decorators cannot be used to decorate object literal properties.",
        UnsupportedSuper: "'super' can only be used with function calls (i.e. super()) or in property accesses (i.e. super.prop or super[prop]).",
        UnterminatedComment: "Unterminated comment.",
        UnterminatedRegExp: "Unterminated regular expression.",
        UnterminatedString: "Unterminated string constant.",
        UnterminatedTemplate: "Unterminated template.",
        UsingDeclarationExport: "Using declaration cannot be exported.",
        UsingDeclarationHasBindingPattern: "Using declaration cannot have destructuring patterns.",
        VarRedeclaration: ({
          identifierName
        }) => `Identifier '${identifierName}' has already been declared.`,
        VoidPatternCatchClauseParam: "A void binding can not be the catch clause parameter. Use `try { ... } catch { ... }` if you want to discard the caught error.",
        VoidPatternInitializer: "A void binding may not have an initializer.",
        YieldBindingIdentifier: "Can not use 'yield' as identifier inside a generator.",
        YieldInParameter: "Yield expression is not allowed in formal parameters.",
        YieldNotInGeneratorFunction: "'yield' is only allowed within generator functions.",
        ZeroDigitNumericSeparator: "Numeric separator can not be used after leading 0."
      }, StrictModeErrors = {
        StrictDelete: "Deleting local variable in strict mode.",
        StrictEvalArguments: ({
          referenceName
        }) => `Assigning to '${referenceName}' in strict mode.`,
        StrictEvalArgumentsBinding: ({
          bindingName
        }) => `Binding '${bindingName}' in strict mode.`,
        StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block.",
        StrictNumericEscape: "The only valid numeric escape in strict mode is '\\0'.",
        StrictOctalLiteral: "Legacy octal literals are not allowed in strict mode.",
        StrictWith: "'with' in strict mode."
      }, ParseExpressionErrors = {
        ParseExpressionEmptyInput: "Unexpected parseExpression() input: The input is empty or contains only comments.",
        ParseExpressionExpectsEOF: ({
          unexpected
        }) => `Unexpected parseExpression() input: The input should contain exactly one expression, but the first expression is followed by the unexpected character \`${String.fromCodePoint(unexpected)}\`.`
      }, UnparenthesizedPipeBodyDescriptions = /* @__PURE__ */ new Set(["ArrowFunctionExpression", "AssignmentExpression", "ConditionalExpression", "YieldExpression"]), PipelineOperatorErrors = Object.assign({
        PipeBodyIsTighter: "Unexpected yield after pipeline body; any yield expression acting as Hack-style pipe body must be parenthesized due to its loose operator precedence.",
        PipeTopicRequiresHackPipes: 'Topic reference is used, but the pipelineOperator plugin was not passed a "proposal": "hack" or "smart" option.',
        PipeTopicUnbound: "Topic reference is unbound; it must be inside a pipe body.",
        PipeTopicUnconfiguredToken: ({
          token
        }) => `Invalid topic token ${token}. In order to use ${token} as a topic reference, the pipelineOperator plugin must be configured with { "proposal": "hack", "topicToken": "${token}" }.`,
        PipeTopicUnused: "Hack-style pipe body does not contain a topic reference; Hack-style pipes must use topic at least once.",
        PipeUnparenthesizedBody: ({
          type
        }) => `Hack-style pipe body cannot be an unparenthesized ${toNodeDescription({
          type
        })}; please wrap it in parentheses.`
      }, {
        PipelineBodyNoArrow: 'Unexpected arrow "=>" after pipeline body; arrow function in pipeline body must be parenthesized.',
        PipelineBodySequenceExpression: "Pipeline body may not be a comma-separated sequence expression.",
        PipelineHeadSequenceExpression: "Pipeline head should not be a comma-separated sequence expression.",
        PipelineTopicUnused: "Pipeline is in topic style but does not use topic reference.",
        PrimaryTopicNotAllowed: "Topic reference was used in a lexical context without topic binding.",
        PrimaryTopicRequiresSmartPipeline: 'Topic reference is used, but the pipelineOperator plugin was not passed a "proposal": "hack" or "smart" option.'
      }), FunctionBindErrors = {
        UnsupportedBind: "Binding should be performed on object property.",
        UnsupportedBindRHS: "The right-hand side of binding can not be super or import."
      }, _excluded = ["message"];
      function defineHidden(obj, key, value) {
        Object.defineProperty(obj, key, {
          enumerable: !1,
          configurable: !0,
          value
        });
      }
      function toParseErrorConstructor({
        toMessage,
        code: code2,
        reasonCode,
        syntaxPlugin
      }) {
        let hasMissingPlugin = reasonCode === "MissingPlugin" || reasonCode === "MissingOneOfPlugins", oldReasonCodes = {
          AccessorCannotDeclareThisParameter: "AccesorCannotDeclareThisParameter",
          AccessorCannotHaveTypeParameters: "AccesorCannotHaveTypeParameters",
          ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference: "ConstInitiailizerMustBeStringOrNumericLiteralOrLiteralEnumReference",
          SetAccessorCannotHaveOptionalParameter: "SetAccesorCannotHaveOptionalParameter",
          SetAccessorCannotHaveRestParameter: "SetAccesorCannotHaveRestParameter",
          SetAccessorCannotHaveReturnType: "SetAccesorCannotHaveReturnType"
        };
        return oldReasonCodes[reasonCode] && (reasonCode = oldReasonCodes[reasonCode]), function constructor(loc, details) {
          let error = new SyntaxError();
          return error.code = code2, error.reasonCode = reasonCode, error.loc = loc, error.pos = loc.index, error.syntaxPlugin = syntaxPlugin, hasMissingPlugin && (error.missingPlugin = details.missingPlugin), defineHidden(error, "clone", function(overrides = {}) {
            var _overrides$loc;
            let {
              line,
              column,
              index
            } = (_overrides$loc = overrides.loc) != null ? _overrides$loc : loc;
            return constructor(new Position(line, column, index), Object.assign({}, details, overrides.details));
          }), defineHidden(error, "details", details), Object.defineProperty(error, "message", {
            configurable: !0,
            get() {
              let message = `${toMessage(details)} (${loc.line}:${loc.column})`;
              return this.message = message, message;
            },
            set(value) {
              Object.defineProperty(this, "message", {
                value,
                writable: !0
              });
            }
          }), error;
        };
      }
      function ParseErrorEnum(argument, syntaxPlugin) {
        if (Array.isArray(argument))
          return (parseErrorTemplates) => ParseErrorEnum(parseErrorTemplates, argument[0]);
        let ParseErrorConstructors = {};
        for (let reasonCode of Object.keys(argument)) {
          let template = argument[reasonCode], _ref = typeof template == "string" ? {
            message: () => template
          } : typeof template == "function" ? {
            message: template
          } : template, {
            message
          } = _ref, rest = _objectWithoutPropertiesLoose(_ref, _excluded), toMessage = typeof message == "string" ? () => message : message;
          ParseErrorConstructors[reasonCode] = toParseErrorConstructor(Object.assign({
            code: "BABEL_PARSER_SYNTAX_ERROR",
            reasonCode,
            toMessage
          }, syntaxPlugin ? {
            syntaxPlugin
          } : {}, rest));
        }
        return ParseErrorConstructors;
      }
      var Errors = Object.assign({}, ParseErrorEnum(ModuleErrors), ParseErrorEnum(StandardErrors), ParseErrorEnum(StrictModeErrors), ParseErrorEnum(ParseExpressionErrors), ParseErrorEnum`pipelineOperator`(PipelineOperatorErrors), ParseErrorEnum`functionBind`(FunctionBindErrors));
      function createDefaultOptions() {
        return {
          sourceType: "script",
          sourceFilename: void 0,
          startIndex: 0,
          startColumn: 0,
          startLine: 1,
          allowAwaitOutsideFunction: !1,
          allowReturnOutsideFunction: !1,
          allowNewTargetOutsideFunction: !1,
          allowImportExportEverywhere: !1,
          allowSuperOutsideMethod: !1,
          allowUndeclaredExports: !1,
          allowYieldOutsideFunction: !1,
          plugins: [],
          strictMode: void 0,
          ranges: !1,
          tokens: !1,
          createImportExpressions: !1,
          createParenthesizedExpressions: !1,
          errorRecovery: !1,
          attachComment: !0,
          annexB: !0
        };
      }
      function getOptions(opts) {
        let options = createDefaultOptions();
        if (opts == null)
          return options;
        if (opts.annexB != null && opts.annexB !== !1)
          throw new Error("The `annexB` option can only be set to `false`.");
        for (let key of Object.keys(options))
          opts[key] != null && (options[key] = opts[key]);
        if (options.startLine === 1)
          opts.startIndex == null && options.startColumn > 0 ? options.startIndex = options.startColumn : opts.startColumn == null && options.startIndex > 0 && (options.startColumn = options.startIndex);
        else if ((opts.startColumn == null || opts.startIndex == null) && opts.startIndex != null)
          throw new Error("With a `startLine > 1` you must also specify `startIndex` and `startColumn`.");
        if (options.sourceType === "commonjs") {
          if (opts.allowAwaitOutsideFunction != null)
            throw new Error("The `allowAwaitOutsideFunction` option cannot be used with `sourceType: 'commonjs'`.");
          if (opts.allowReturnOutsideFunction != null)
            throw new Error("`sourceType: 'commonjs'` implies `allowReturnOutsideFunction: true`, please remove the `allowReturnOutsideFunction` option or use `sourceType: 'script'`.");
          if (opts.allowNewTargetOutsideFunction != null)
            throw new Error("`sourceType: 'commonjs'` implies `allowNewTargetOutsideFunction: true`, please remove the `allowNewTargetOutsideFunction` option or use `sourceType: 'script'`.");
        }
        return options;
      }
      var {
        defineProperty
      } = Object, toUnenumerable = (object, key) => {
        object && defineProperty(object, key, {
          enumerable: !1,
          value: object[key]
        });
      };
      function toESTreeLocation(node) {
        return toUnenumerable(node.loc.start, "index"), toUnenumerable(node.loc.end, "index"), node;
      }
      var estree = (superClass) => class extends superClass {
        parse() {
          let file = toESTreeLocation(super.parse());
          return this.optionFlags & 256 && (file.tokens = file.tokens.map(toESTreeLocation)), file;
        }
        parseRegExpLiteral({
          pattern,
          flags
        }) {
          let regex = null;
          try {
            regex = new RegExp(pattern, flags);
          } catch {
          }
          let node = this.estreeParseLiteral(regex);
          return node.regex = {
            pattern,
            flags
          }, node;
        }
        parseBigIntLiteral(value) {
          let bigInt;
          try {
            bigInt = BigInt(value);
          } catch {
            bigInt = null;
          }
          let node = this.estreeParseLiteral(bigInt);
          return node.bigint = String(node.value || value), node;
        }
        parseDecimalLiteral(value) {
          let node = this.estreeParseLiteral(null);
          return node.decimal = String(node.value || value), node;
        }
        estreeParseLiteral(value) {
          return this.parseLiteral(value, "Literal");
        }
        parseStringLiteral(value) {
          return this.estreeParseLiteral(value);
        }
        parseNumericLiteral(value) {
          return this.estreeParseLiteral(value);
        }
        parseNullLiteral() {
          return this.estreeParseLiteral(null);
        }
        parseBooleanLiteral(value) {
          return this.estreeParseLiteral(value);
        }
        estreeParseChainExpression(node, endLoc) {
          let chain = this.startNodeAtNode(node);
          return chain.expression = node, this.finishNodeAt(chain, "ChainExpression", endLoc);
        }
        directiveToStmt(directive) {
          let expression = directive.value;
          delete directive.value, this.castNodeTo(expression, "Literal"), expression.raw = expression.extra.raw, expression.value = expression.extra.expressionValue;
          let stmt = this.castNodeTo(directive, "ExpressionStatement");
          return stmt.expression = expression, stmt.directive = expression.extra.rawValue, delete expression.extra, stmt;
        }
        fillOptionalPropertiesForTSESLint(node) {
        }
        cloneEstreeStringLiteral(node) {
          let {
            start,
            end,
            loc,
            range,
            raw,
            value
          } = node, cloned = Object.create(node.constructor.prototype);
          return cloned.type = "Literal", cloned.start = start, cloned.end = end, cloned.loc = loc, cloned.range = range, cloned.raw = raw, cloned.value = value, cloned;
        }
        initFunction(node, isAsync) {
          super.initFunction(node, isAsync), node.expression = !1;
        }
        checkDeclaration(node) {
          node != null && this.isObjectProperty(node) ? this.checkDeclaration(node.value) : super.checkDeclaration(node);
        }
        getObjectOrClassMethodParams(method) {
          return method.value.params;
        }
        isValidDirective(stmt) {
          var _stmt$expression$extr;
          return stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && typeof stmt.expression.value == "string" && !((_stmt$expression$extr = stmt.expression.extra) != null && _stmt$expression$extr.parenthesized);
        }
        parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse) {
          super.parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse);
          let directiveStatements = node.directives.map((d) => this.directiveToStmt(d));
          node.body = directiveStatements.concat(node.body), delete node.directives;
        }
        parsePrivateName() {
          let node = super.parsePrivateName();
          return this.getPluginOption("estree", "classFeatures") ? this.convertPrivateNameToPrivateIdentifier(node) : node;
        }
        convertPrivateNameToPrivateIdentifier(node) {
          let name = super.getPrivateNameSV(node);
          return delete node.id, node.name = name, this.castNodeTo(node, "PrivateIdentifier");
        }
        isPrivateName(node) {
          return this.getPluginOption("estree", "classFeatures") ? node.type === "PrivateIdentifier" : super.isPrivateName(node);
        }
        getPrivateNameSV(node) {
          return this.getPluginOption("estree", "classFeatures") ? node.name : super.getPrivateNameSV(node);
        }
        parseLiteral(value, type) {
          let node = super.parseLiteral(value, type);
          return node.raw = node.extra.raw, delete node.extra, node;
        }
        parseFunctionBody(node, allowExpression, isMethod = !1) {
          super.parseFunctionBody(node, allowExpression, isMethod), node.expression = node.body.type !== "BlockStatement";
        }
        parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope = !1) {
          let funcNode = this.startNode();
          funcNode.kind = node.kind, funcNode = super.parseMethod(funcNode, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope), delete funcNode.kind;
          let {
            typeParameters
          } = node;
          typeParameters && (delete node.typeParameters, funcNode.typeParameters = typeParameters, this.resetStartLocationFromNode(funcNode, typeParameters));
          let valueNode = this.castNodeTo(funcNode, "FunctionExpression");
          return node.value = valueNode, type === "ClassPrivateMethod" && (node.computed = !1), type === "ObjectMethod" ? (node.kind === "method" && (node.kind = "init"), node.shorthand = !1, this.finishNode(node, "Property")) : this.finishNode(node, "MethodDefinition");
        }
        nameIsConstructor(key) {
          return key.type === "Literal" ? key.value === "constructor" : super.nameIsConstructor(key);
        }
        parseClassProperty(...args) {
          let propertyNode = super.parseClassProperty(...args);
          return this.getPluginOption("estree", "classFeatures") && this.castNodeTo(propertyNode, "PropertyDefinition"), propertyNode;
        }
        parseClassPrivateProperty(...args) {
          let propertyNode = super.parseClassPrivateProperty(...args);
          return this.getPluginOption("estree", "classFeatures") && (this.castNodeTo(propertyNode, "PropertyDefinition"), propertyNode.computed = !1), propertyNode;
        }
        parseClassAccessorProperty(node) {
          let accessorPropertyNode = super.parseClassAccessorProperty(node);
          return this.getPluginOption("estree", "classFeatures") && (accessorPropertyNode.abstract && this.hasPlugin("typescript") ? (delete accessorPropertyNode.abstract, this.castNodeTo(accessorPropertyNode, "TSAbstractAccessorProperty")) : this.castNodeTo(accessorPropertyNode, "AccessorProperty")), accessorPropertyNode;
        }
        parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors) {
          let node = super.parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors);
          return node && (node.kind = "init", this.castNodeTo(node, "Property")), node;
        }
        finishObjectProperty(node) {
          return node.kind = "init", this.finishNode(node, "Property");
        }
        isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding) {
          return type === "Property" ? "value" : super.isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding);
        }
        isAssignable(node, isBinding) {
          return node != null && this.isObjectProperty(node) ? this.isAssignable(node.value, isBinding) : super.isAssignable(node, isBinding);
        }
        toAssignable(node, isLHS = !1) {
          if (node != null && this.isObjectProperty(node)) {
            let {
              key,
              value
            } = node;
            this.isPrivateName(key) && this.classScope.usePrivateName(this.getPrivateNameSV(key), key.loc.start), this.toAssignable(value, isLHS);
          } else
            super.toAssignable(node, isLHS);
        }
        toAssignableObjectExpressionProp(prop, isLast, isLHS) {
          prop.type === "Property" && (prop.kind === "get" || prop.kind === "set") ? this.raise(Errors.PatternHasAccessor, prop.key) : prop.type === "Property" && prop.method ? this.raise(Errors.PatternHasMethod, prop.key) : super.toAssignableObjectExpressionProp(prop, isLast, isLHS);
        }
        finishCallExpression(unfinished, optional) {
          let node = super.finishCallExpression(unfinished, optional);
          if (node.callee.type === "Import") {
            var _ref, _ref2;
            this.castNodeTo(node, "ImportExpression"), node.source = node.arguments[0], node.options = (_ref = node.arguments[1]) != null ? _ref : null, node.attributes = (_ref2 = node.arguments[1]) != null ? _ref2 : null, delete node.arguments, delete node.callee;
          } else node.type === "OptionalCallExpression" ? this.castNodeTo(node, "CallExpression") : node.optional = !1;
          return node;
        }
        toReferencedArguments(node) {
          node.type !== "ImportExpression" && super.toReferencedArguments(node);
        }
        parseExport(unfinished, decorators) {
          let exportStartLoc = this.state.lastTokStartLoc, node = super.parseExport(unfinished, decorators);
          switch (node.type) {
            case "ExportAllDeclaration":
              node.exported = null;
              break;
            case "ExportNamedDeclaration":
              node.specifiers.length === 1 && node.specifiers[0].type === "ExportNamespaceSpecifier" && (this.castNodeTo(node, "ExportAllDeclaration"), node.exported = node.specifiers[0].exported, delete node.specifiers);
            case "ExportDefaultDeclaration":
              {
                var _declaration$decorato;
                let {
                  declaration: declaration2
                } = node;
                declaration2?.type === "ClassDeclaration" && ((_declaration$decorato = declaration2.decorators) == null ? void 0 : _declaration$decorato.length) > 0 && declaration2.start === node.start && this.resetStartLocation(node, exportStartLoc);
              }
              break;
          }
          return node;
        }
        stopParseSubscript(base, state) {
          let node = super.stopParseSubscript(base, state);
          return state.optionalChainMember ? this.estreeParseChainExpression(node, base.loc.end) : node;
        }
        parseMember(base, startLoc, state, computed, optional) {
          let node = super.parseMember(base, startLoc, state, computed, optional);
          return node.type === "OptionalMemberExpression" ? this.castNodeTo(node, "MemberExpression") : node.optional = !1, node;
        }
        isOptionalMemberExpression(node) {
          return node.type === "ChainExpression" ? node.expression.type === "MemberExpression" : super.isOptionalMemberExpression(node);
        }
        hasPropertyAsPrivateName(node) {
          return node.type === "ChainExpression" && (node = node.expression), super.hasPropertyAsPrivateName(node);
        }
        isObjectProperty(node) {
          return node.type === "Property" && node.kind === "init" && !node.method;
        }
        isObjectMethod(node) {
          return node.type === "Property" && (node.method || node.kind === "get" || node.kind === "set");
        }
        castNodeTo(node, type) {
          let result = super.castNodeTo(node, type);
          return this.fillOptionalPropertiesForTSESLint(result), result;
        }
        cloneIdentifier(node) {
          let cloned = super.cloneIdentifier(node);
          return this.fillOptionalPropertiesForTSESLint(cloned), cloned;
        }
        cloneStringLiteral(node) {
          return node.type === "Literal" ? this.cloneEstreeStringLiteral(node) : super.cloneStringLiteral(node);
        }
        finishNodeAt(node, type, endLoc) {
          return toESTreeLocation(super.finishNodeAt(node, type, endLoc));
        }
        finishNode(node, type) {
          let result = super.finishNode(node, type);
          return this.fillOptionalPropertiesForTSESLint(result), result;
        }
        resetStartLocation(node, startLoc) {
          super.resetStartLocation(node, startLoc), toESTreeLocation(node);
        }
        resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
          super.resetEndLocation(node, endLoc), toESTreeLocation(node);
        }
      }, TokContext = class {
        constructor(token, preserveSpace) {
          this.token = void 0, this.preserveSpace = void 0, this.token = token, this.preserveSpace = !!preserveSpace;
        }
      }, types = {
        brace: new TokContext("{"),
        j_oTag: new TokContext("<tag"),
        j_cTag: new TokContext("</tag"),
        j_expr: new TokContext("<tag>...</tag>", !0)
      };
      types.template = new TokContext("`", !0);
      var beforeExpr = !0, startsExpr = !0, isLoop = !0, isAssign = !0, prefix = !0, postfix = !0, ExportedTokenType = class {
        constructor(label, conf = {}) {
          this.label = void 0, this.keyword = void 0, this.beforeExpr = void 0, this.startsExpr = void 0, this.rightAssociative = void 0, this.isLoop = void 0, this.isAssign = void 0, this.prefix = void 0, this.postfix = void 0, this.binop = void 0, this.label = label, this.keyword = conf.keyword, this.beforeExpr = !!conf.beforeExpr, this.startsExpr = !!conf.startsExpr, this.rightAssociative = !!conf.rightAssociative, this.isLoop = !!conf.isLoop, this.isAssign = !!conf.isAssign, this.prefix = !!conf.prefix, this.postfix = !!conf.postfix, this.binop = conf.binop != null ? conf.binop : null, this.updateContext = null;
        }
      }, keywords$1 = /* @__PURE__ */ new Map();
      function createKeyword(name, options = {}) {
        options.keyword = name;
        let token = createToken(name, options);
        return keywords$1.set(name, token), token;
      }
      function createBinop(name, binop) {
        return createToken(name, {
          beforeExpr,
          binop
        });
      }
      var tokenTypeCounter = -1, tokenTypes = [], tokenLabels = [], tokenBinops = [], tokenBeforeExprs = [], tokenStartsExprs = [], tokenPrefixes = [];
      function createToken(name, options = {}) {
        var _options$binop, _options$beforeExpr, _options$startsExpr, _options$prefix;
        return ++tokenTypeCounter, tokenLabels.push(name), tokenBinops.push((_options$binop = options.binop) != null ? _options$binop : -1), tokenBeforeExprs.push((_options$beforeExpr = options.beforeExpr) != null ? _options$beforeExpr : !1), tokenStartsExprs.push((_options$startsExpr = options.startsExpr) != null ? _options$startsExpr : !1), tokenPrefixes.push((_options$prefix = options.prefix) != null ? _options$prefix : !1), tokenTypes.push(new ExportedTokenType(name, options)), tokenTypeCounter;
      }
      function createKeywordLike(name, options = {}) {
        var _options$binop2, _options$beforeExpr2, _options$startsExpr2, _options$prefix2;
        return ++tokenTypeCounter, keywords$1.set(name, tokenTypeCounter), tokenLabels.push(name), tokenBinops.push((_options$binop2 = options.binop) != null ? _options$binop2 : -1), tokenBeforeExprs.push((_options$beforeExpr2 = options.beforeExpr) != null ? _options$beforeExpr2 : !1), tokenStartsExprs.push((_options$startsExpr2 = options.startsExpr) != null ? _options$startsExpr2 : !1), tokenPrefixes.push((_options$prefix2 = options.prefix) != null ? _options$prefix2 : !1), tokenTypes.push(new ExportedTokenType("name", options)), tokenTypeCounter;
      }
      var tt = {
        bracketL: createToken("[", {
          beforeExpr,
          startsExpr
        }),
        bracketHashL: createToken("#[", {
          beforeExpr,
          startsExpr
        }),
        bracketBarL: createToken("[|", {
          beforeExpr,
          startsExpr
        }),
        bracketR: createToken("]"),
        bracketBarR: createToken("|]"),
        braceL: createToken("{", {
          beforeExpr,
          startsExpr
        }),
        braceBarL: createToken("{|", {
          beforeExpr,
          startsExpr
        }),
        braceHashL: createToken("#{", {
          beforeExpr,
          startsExpr
        }),
        braceR: createToken("}"),
        braceBarR: createToken("|}"),
        parenL: createToken("(", {
          beforeExpr,
          startsExpr
        }),
        parenR: createToken(")"),
        comma: createToken(",", {
          beforeExpr
        }),
        semi: createToken(";", {
          beforeExpr
        }),
        colon: createToken(":", {
          beforeExpr
        }),
        doubleColon: createToken("::", {
          beforeExpr
        }),
        dot: createToken("."),
        question: createToken("?", {
          beforeExpr
        }),
        questionDot: createToken("?."),
        arrow: createToken("=>", {
          beforeExpr
        }),
        template: createToken("template"),
        ellipsis: createToken("...", {
          beforeExpr
        }),
        backQuote: createToken("`", {
          startsExpr
        }),
        dollarBraceL: createToken("${", {
          beforeExpr,
          startsExpr
        }),
        templateTail: createToken("...`", {
          startsExpr
        }),
        templateNonTail: createToken("...${", {
          beforeExpr,
          startsExpr
        }),
        at: createToken("@"),
        hash: createToken("#", {
          startsExpr
        }),
        interpreterDirective: createToken("#!..."),
        eq: createToken("=", {
          beforeExpr,
          isAssign
        }),
        assign: createToken("_=", {
          beforeExpr,
          isAssign
        }),
        slashAssign: createToken("_=", {
          beforeExpr,
          isAssign
        }),
        xorAssign: createToken("_=", {
          beforeExpr,
          isAssign
        }),
        moduloAssign: createToken("_=", {
          beforeExpr,
          isAssign
        }),
        incDec: createToken("++/--", {
          prefix,
          postfix,
          startsExpr
        }),
        bang: createToken("!", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        tilde: createToken("~", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        doubleCaret: createToken("^^", {
          startsExpr
        }),
        doubleAt: createToken("@@", {
          startsExpr
        }),
        pipeline: createBinop("|>", 0),
        nullishCoalescing: createBinop("??", 1),
        logicalOR: createBinop("||", 1),
        logicalAND: createBinop("&&", 2),
        bitwiseOR: createBinop("|", 3),
        bitwiseXOR: createBinop("^", 4),
        bitwiseAND: createBinop("&", 5),
        equality: createBinop("==/!=/===/!==", 6),
        lt: createBinop("</>/<=/>=", 7),
        gt: createBinop("</>/<=/>=", 7),
        relational: createBinop("</>/<=/>=", 7),
        bitShift: createBinop("<</>>/>>>", 8),
        bitShiftL: createBinop("<</>>/>>>", 8),
        bitShiftR: createBinop("<</>>/>>>", 8),
        plusMin: createToken("+/-", {
          beforeExpr,
          binop: 9,
          prefix,
          startsExpr
        }),
        modulo: createToken("%", {
          binop: 10,
          startsExpr
        }),
        star: createToken("*", {
          binop: 10
        }),
        slash: createBinop("/", 10),
        exponent: createToken("**", {
          beforeExpr,
          binop: 11,
          rightAssociative: !0
        }),
        _in: createKeyword("in", {
          beforeExpr,
          binop: 7
        }),
        _instanceof: createKeyword("instanceof", {
          beforeExpr,
          binop: 7
        }),
        _break: createKeyword("break"),
        _case: createKeyword("case", {
          beforeExpr
        }),
        _catch: createKeyword("catch"),
        _continue: createKeyword("continue"),
        _debugger: createKeyword("debugger"),
        _default: createKeyword("default", {
          beforeExpr
        }),
        _else: createKeyword("else", {
          beforeExpr
        }),
        _finally: createKeyword("finally"),
        _function: createKeyword("function", {
          startsExpr
        }),
        _if: createKeyword("if"),
        _return: createKeyword("return", {
          beforeExpr
        }),
        _switch: createKeyword("switch"),
        _throw: createKeyword("throw", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        _try: createKeyword("try"),
        _var: createKeyword("var"),
        _const: createKeyword("const"),
        _with: createKeyword("with"),
        _new: createKeyword("new", {
          beforeExpr,
          startsExpr
        }),
        _this: createKeyword("this", {
          startsExpr
        }),
        _super: createKeyword("super", {
          startsExpr
        }),
        _class: createKeyword("class", {
          startsExpr
        }),
        _extends: createKeyword("extends", {
          beforeExpr
        }),
        _export: createKeyword("export"),
        _import: createKeyword("import", {
          startsExpr
        }),
        _null: createKeyword("null", {
          startsExpr
        }),
        _true: createKeyword("true", {
          startsExpr
        }),
        _false: createKeyword("false", {
          startsExpr
        }),
        _typeof: createKeyword("typeof", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        _void: createKeyword("void", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        _delete: createKeyword("delete", {
          beforeExpr,
          prefix,
          startsExpr
        }),
        _do: createKeyword("do", {
          isLoop,
          beforeExpr
        }),
        _for: createKeyword("for", {
          isLoop
        }),
        _while: createKeyword("while", {
          isLoop
        }),
        _as: createKeywordLike("as", {
          startsExpr
        }),
        _assert: createKeywordLike("assert", {
          startsExpr
        }),
        _async: createKeywordLike("async", {
          startsExpr
        }),
        _await: createKeywordLike("await", {
          startsExpr
        }),
        _defer: createKeywordLike("defer", {
          startsExpr
        }),
        _from: createKeywordLike("from", {
          startsExpr
        }),
        _get: createKeywordLike("get", {
          startsExpr
        }),
        _let: createKeywordLike("let", {
          startsExpr
        }),
        _meta: createKeywordLike("meta", {
          startsExpr
        }),
        _of: createKeywordLike("of", {
          startsExpr
        }),
        _sent: createKeywordLike("sent", {
          startsExpr
        }),
        _set: createKeywordLike("set", {
          startsExpr
        }),
        _source: createKeywordLike("source", {
          startsExpr
        }),
        _static: createKeywordLike("static", {
          startsExpr
        }),
        _using: createKeywordLike("using", {
          startsExpr
        }),
        _yield: createKeywordLike("yield", {
          startsExpr
        }),
        _asserts: createKeywordLike("asserts", {
          startsExpr
        }),
        _checks: createKeywordLike("checks", {
          startsExpr
        }),
        _exports: createKeywordLike("exports", {
          startsExpr
        }),
        _global: createKeywordLike("global", {
          startsExpr
        }),
        _implements: createKeywordLike("implements", {
          startsExpr
        }),
        _intrinsic: createKeywordLike("intrinsic", {
          startsExpr
        }),
        _infer: createKeywordLike("infer", {
          startsExpr
        }),
        _is: createKeywordLike("is", {
          startsExpr
        }),
        _mixins: createKeywordLike("mixins", {
          startsExpr
        }),
        _proto: createKeywordLike("proto", {
          startsExpr
        }),
        _require: createKeywordLike("require", {
          startsExpr
        }),
        _satisfies: createKeywordLike("satisfies", {
          startsExpr
        }),
        _keyof: createKeywordLike("keyof", {
          startsExpr
        }),
        _readonly: createKeywordLike("readonly", {
          startsExpr
        }),
        _unique: createKeywordLike("unique", {
          startsExpr
        }),
        _abstract: createKeywordLike("abstract", {
          startsExpr
        }),
        _declare: createKeywordLike("declare", {
          startsExpr
        }),
        _enum: createKeywordLike("enum", {
          startsExpr
        }),
        _module: createKeywordLike("module", {
          startsExpr
        }),
        _namespace: createKeywordLike("namespace", {
          startsExpr
        }),
        _interface: createKeywordLike("interface", {
          startsExpr
        }),
        _type: createKeywordLike("type", {
          startsExpr
        }),
        _opaque: createKeywordLike("opaque", {
          startsExpr
        }),
        name: createToken("name", {
          startsExpr
        }),
        placeholder: createToken("%%", {
          startsExpr
        }),
        string: createToken("string", {
          startsExpr
        }),
        num: createToken("num", {
          startsExpr
        }),
        bigint: createToken("bigint", {
          startsExpr
        }),
        decimal: createToken("decimal", {
          startsExpr
        }),
        regexp: createToken("regexp", {
          startsExpr
        }),
        privateName: createToken("#name", {
          startsExpr
        }),
        eof: createToken("eof"),
        jsxName: createToken("jsxName"),
        jsxText: createToken("jsxText", {
          beforeExpr
        }),
        jsxTagStart: createToken("jsxTagStart", {
          startsExpr
        }),
        jsxTagEnd: createToken("jsxTagEnd")
      };
      function tokenIsIdentifier(token) {
        return token >= 93 && token <= 133;
      }
      function tokenKeywordOrIdentifierIsKeyword(token) {
        return token <= 92;
      }
      function tokenIsKeywordOrIdentifier(token) {
        return token >= 58 && token <= 133;
      }
      function tokenIsLiteralPropertyName(token) {
        return token >= 58 && token <= 137;
      }
      function tokenComesBeforeExpression(token) {
        return tokenBeforeExprs[token];
      }
      function tokenCanStartExpression(token) {
        return tokenStartsExprs[token];
      }
      function tokenIsAssignment(token) {
        return token >= 29 && token <= 33;
      }
      function tokenIsFlowInterfaceOrTypeOrOpaque(token) {
        return token >= 129 && token <= 131;
      }
      function tokenIsLoop(token) {
        return token >= 90 && token <= 92;
      }
      function tokenIsKeyword(token) {
        return token >= 58 && token <= 92;
      }
      function tokenIsOperator(token) {
        return token >= 39 && token <= 59;
      }
      function tokenIsPostfix(token) {
        return token === 34;
      }
      function tokenIsPrefix(token) {
        return tokenPrefixes[token];
      }
      function tokenIsTSTypeOperator(token) {
        return token >= 121 && token <= 123;
      }
      function tokenIsTSDeclarationStart(token) {
        return token >= 124 && token <= 130;
      }
      function tokenLabelName(token) {
        return tokenLabels[token];
      }
      function tokenOperatorPrecedence(token) {
        return tokenBinops[token];
      }
      function tokenIsRightAssociative(token) {
        return token === 57;
      }
      function tokenIsTemplate(token) {
        return token >= 24 && token <= 25;
      }
      function getExportedToken(token) {
        return tokenTypes[token];
      }
      tokenTypes[8].updateContext = (context) => {
        context.pop();
      };
      tokenTypes[5].updateContext = tokenTypes[7].updateContext = tokenTypes[23].updateContext = (context) => {
        context.push(types.brace);
      };
      tokenTypes[22].updateContext = (context) => {
        context[context.length - 1] === types.template ? context.pop() : context.push(types.template);
      };
      tokenTypes[143].updateContext = (context) => {
        context.push(types.j_expr, types.j_oTag);
      };
      var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-࢏ࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱৼਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚ౜ౝౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ೜-ೞೠೡೱೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄຆ-ຊຌ-ຣລວ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ", nonASCIIidentifierChars = "·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߽߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࢗ-࢟࣊-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯৾ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ૺ-૿ଁ-ଃ଼ା-ୄେୈୋ-୍୕-ୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఄ఼ా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ೳഀ-ഃ഻഼ാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ඁ-ඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ຼ່-໎໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜕ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠏-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᪿ-᫝᫠-᫫ᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭᳴᳷-᳹᷀-᷿‌‍‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯・꘠-꘩꙯ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧ꠬ꢀꢁꢴ-ꣅ꣐-꣙꣠-꣱ꣿ-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︯︳︴﹍-﹏０-９＿･", nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]"), nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
      nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
      var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 7, 25, 39, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27, 10, 22, 251, 41, 7, 1, 17, 5, 57, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9, 2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 24, 43, 261, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 33, 24, 3, 24, 45, 74, 6, 0, 67, 12, 65, 1, 2, 0, 15, 4, 10, 7381, 42, 31, 98, 114, 8702, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 229, 29, 3, 0, 208, 30, 2, 2, 2, 1, 2, 6, 3, 4, 10, 1, 225, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4381, 3, 5773, 3, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 8489], astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32, 4, 318, 1, 78, 5, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 199, 7, 137, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 55, 9, 266, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87, 9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 233, 0, 3, 0, 8, 1, 6, 0, 475, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
      function isInAstralSet(code2, set) {
        let pos = 65536;
        for (let i = 0, length = set.length; i < length; i += 2) {
          if (pos += set[i], pos > code2) return !1;
          if (pos += set[i + 1], pos >= code2) return !0;
        }
        return !1;
      }
      function isIdentifierStart(code2) {
        return code2 < 65 ? code2 === 36 : code2 <= 90 ? !0 : code2 < 97 ? code2 === 95 : code2 <= 122 ? !0 : code2 <= 65535 ? code2 >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code2)) : isInAstralSet(code2, astralIdentifierStartCodes);
      }
      function isIdentifierChar(code2) {
        return code2 < 48 ? code2 === 36 : code2 < 58 ? !0 : code2 < 65 ? !1 : code2 <= 90 ? !0 : code2 < 97 ? code2 === 95 : code2 <= 122 ? !0 : code2 <= 65535 ? code2 >= 170 && nonASCIIidentifier.test(String.fromCharCode(code2)) : isInAstralSet(code2, astralIdentifierStartCodes) || isInAstralSet(code2, astralIdentifierCodes);
      }
      var reservedWords = {
        keyword: ["break", "case", "catch", "continue", "debugger", "default", "do", "else", "finally", "for", "function", "if", "return", "switch", "throw", "try", "var", "const", "while", "with", "new", "this", "super", "class", "extends", "export", "import", "null", "true", "false", "in", "instanceof", "typeof", "void", "delete"],
        strict: ["implements", "interface", "let", "package", "private", "protected", "public", "static", "yield"],
        strictBind: ["eval", "arguments"]
      }, keywords = new Set(reservedWords.keyword), reservedWordsStrictSet = new Set(reservedWords.strict), reservedWordsStrictBindSet = new Set(reservedWords.strictBind);
      function isReservedWord(word, inModule) {
        return inModule && word === "await" || word === "enum";
      }
      function isStrictReservedWord(word, inModule) {
        return isReservedWord(word, inModule) || reservedWordsStrictSet.has(word);
      }
      function isStrictBindOnlyReservedWord(word) {
        return reservedWordsStrictBindSet.has(word);
      }
      function isStrictBindReservedWord(word, inModule) {
        return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
      }
      function isKeyword(word) {
        return keywords.has(word);
      }
      function isIteratorStart(current, next, next2) {
        return current === 64 && next === 64 && isIdentifierStart(next2);
      }
      var reservedWordLikeSet = /* @__PURE__ */ new Set(["break", "case", "catch", "continue", "debugger", "default", "do", "else", "finally", "for", "function", "if", "return", "switch", "throw", "try", "var", "const", "while", "with", "new", "this", "super", "class", "extends", "export", "import", "null", "true", "false", "in", "instanceof", "typeof", "void", "delete", "implements", "interface", "let", "package", "private", "protected", "public", "static", "yield", "eval", "arguments", "enum", "await"]);
      function canBeReservedWord(word) {
        return reservedWordLikeSet.has(word);
      }
      var Scope = class {
        constructor(flags) {
          this.flags = 0, this.names = /* @__PURE__ */ new Map(), this.firstLexicalName = "", this.flags = flags;
        }
      }, ScopeHandler = class {
        constructor(parser, inModule) {
          this.parser = void 0, this.scopeStack = [], this.inModule = void 0, this.undefinedExports = /* @__PURE__ */ new Map(), this.parser = parser, this.inModule = inModule;
        }
        get inTopLevel() {
          return (this.currentScope().flags & 1) > 0;
        }
        get inFunction() {
          return (this.currentVarScopeFlags() & 2) > 0;
        }
        get allowSuper() {
          return (this.currentThisScopeFlags() & 16) > 0;
        }
        get allowDirectSuper() {
          return (this.currentThisScopeFlags() & 32) > 0;
        }
        get allowNewTarget() {
          return (this.currentThisScopeFlags() & 512) > 0;
        }
        get inClass() {
          return (this.currentThisScopeFlags() & 64) > 0;
        }
        get inClassAndNotInNonArrowFunction() {
          let flags = this.currentThisScopeFlags();
          return (flags & 64) > 0 && (flags & 2) === 0;
        }
        get inStaticBlock() {
          for (let i = this.scopeStack.length - 1; ; i--) {
            let {
              flags
            } = this.scopeStack[i];
            if (flags & 128)
              return !0;
            if (flags & 1731)
              return !1;
          }
        }
        get inNonArrowFunction() {
          return (this.currentThisScopeFlags() & 2) > 0;
        }
        get inBareCaseStatement() {
          return (this.currentScope().flags & 256) > 0;
        }
        get treatFunctionsAsVar() {
          return this.treatFunctionsAsVarInScope(this.currentScope());
        }
        createScope(flags) {
          return new Scope(flags);
        }
        enter(flags) {
          this.scopeStack.push(this.createScope(flags));
        }
        exit() {
          return this.scopeStack.pop().flags;
        }
        treatFunctionsAsVarInScope(scope) {
          return !!(scope.flags & 130 || !this.parser.inModule && scope.flags & 1);
        }
        declareName(name, bindingType, loc) {
          let scope = this.currentScope();
          if (bindingType & 8 || bindingType & 16) {
            this.checkRedeclarationInScope(scope, name, bindingType, loc);
            let type = scope.names.get(name) || 0;
            bindingType & 16 ? type = type | 4 : (scope.firstLexicalName || (scope.firstLexicalName = name), type = type | 2), scope.names.set(name, type), bindingType & 8 && this.maybeExportDefined(scope, name);
          } else if (bindingType & 4)
            for (let i = this.scopeStack.length - 1; i >= 0 && (scope = this.scopeStack[i], this.checkRedeclarationInScope(scope, name, bindingType, loc), scope.names.set(name, (scope.names.get(name) || 0) | 1), this.maybeExportDefined(scope, name), !(scope.flags & 1667)); --i)
              ;
          this.parser.inModule && scope.flags & 1 && this.undefinedExports.delete(name);
        }
        maybeExportDefined(scope, name) {
          this.parser.inModule && scope.flags & 1 && this.undefinedExports.delete(name);
        }
        checkRedeclarationInScope(scope, name, bindingType, loc) {
          this.isRedeclaredInScope(scope, name, bindingType) && this.parser.raise(Errors.VarRedeclaration, loc, {
            identifierName: name
          });
        }
        isRedeclaredInScope(scope, name, bindingType) {
          if (!(bindingType & 1)) return !1;
          if (bindingType & 8)
            return scope.names.has(name);
          let type = scope.names.get(name) || 0;
          return bindingType & 16 ? (type & 2) > 0 || !this.treatFunctionsAsVarInScope(scope) && (type & 1) > 0 : (type & 2) > 0 && !(scope.flags & 8 && scope.firstLexicalName === name) || !this.treatFunctionsAsVarInScope(scope) && (type & 4) > 0;
        }
        checkLocalExport(id) {
          let {
            name
          } = id;
          this.scopeStack[0].names.has(name) || this.undefinedExports.set(name, id.loc.start);
        }
        currentScope() {
          return this.scopeStack[this.scopeStack.length - 1];
        }
        currentVarScopeFlags() {
          for (let i = this.scopeStack.length - 1; ; i--) {
            let {
              flags
            } = this.scopeStack[i];
            if (flags & 1667)
              return flags;
          }
        }
        currentThisScopeFlags() {
          for (let i = this.scopeStack.length - 1; ; i--) {
            let {
              flags
            } = this.scopeStack[i];
            if (flags & 1731 && !(flags & 4))
              return flags;
          }
        }
      }, FlowScope = class extends Scope {
        constructor(...args) {
          super(...args), this.declareFunctions = /* @__PURE__ */ new Set();
        }
      }, FlowScopeHandler = class extends ScopeHandler {
        createScope(flags) {
          return new FlowScope(flags);
        }
        declareName(name, bindingType, loc) {
          let scope = this.currentScope();
          if (bindingType & 2048) {
            this.checkRedeclarationInScope(scope, name, bindingType, loc), this.maybeExportDefined(scope, name), scope.declareFunctions.add(name);
            return;
          }
          super.declareName(name, bindingType, loc);
        }
        isRedeclaredInScope(scope, name, bindingType) {
          if (super.isRedeclaredInScope(scope, name, bindingType)) return !0;
          if (bindingType & 2048 && !scope.declareFunctions.has(name)) {
            let type = scope.names.get(name);
            return (type & 4) > 0 || (type & 2) > 0;
          }
          return !1;
        }
        checkLocalExport(id) {
          this.scopeStack[0].declareFunctions.has(id.name) || super.checkLocalExport(id);
        }
      }, reservedTypes = /* @__PURE__ */ new Set(["_", "any", "bool", "boolean", "empty", "extends", "false", "interface", "mixed", "null", "number", "static", "string", "true", "typeof", "void"]), FlowErrors = ParseErrorEnum`flow`({
        AmbiguousConditionalArrow: "Ambiguous expression: wrap the arrow functions in parentheses to disambiguate.",
        AmbiguousDeclareModuleKind: "Found both `declare module.exports` and `declare export` in the same module. Modules can only have 1 since they are either an ES module or they are a CommonJS module.",
        AssignReservedType: ({
          reservedType
        }) => `Cannot overwrite reserved type ${reservedType}.`,
        DeclareClassElement: "The `declare` modifier can only appear on class fields.",
        DeclareClassFieldInitializer: "Initializers are not allowed in fields with the `declare` modifier.",
        DuplicateDeclareModuleExports: "Duplicate `declare module.exports` statement.",
        EnumBooleanMemberNotInitialized: ({
          memberName,
          enumName
        }) => `Boolean enum members need to be initialized. Use either \`${memberName} = true,\` or \`${memberName} = false,\` in enum \`${enumName}\`.`,
        EnumDuplicateMemberName: ({
          memberName,
          enumName
        }) => `Enum member names need to be unique, but the name \`${memberName}\` has already been used before in enum \`${enumName}\`.`,
        EnumInconsistentMemberValues: ({
          enumName
        }) => `Enum \`${enumName}\` has inconsistent member initializers. Either use no initializers, or consistently use literals (either booleans, numbers, or strings) for all member initializers.`,
        EnumInvalidExplicitType: ({
          invalidEnumType,
          enumName
        }) => `Enum type \`${invalidEnumType}\` is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
        EnumInvalidExplicitTypeUnknownSupplied: ({
          enumName
        }) => `Supplied enum type is not valid. Use one of \`boolean\`, \`number\`, \`string\`, or \`symbol\` in enum \`${enumName}\`.`,
        EnumInvalidMemberInitializerPrimaryType: ({
          enumName,
          memberName,
          explicitType
        }) => `Enum \`${enumName}\` has type \`${explicitType}\`, so the initializer of \`${memberName}\` needs to be a ${explicitType} literal.`,
        EnumInvalidMemberInitializerSymbolType: ({
          enumName,
          memberName
        }) => `Symbol enum members cannot be initialized. Use \`${memberName},\` in enum \`${enumName}\`.`,
        EnumInvalidMemberInitializerUnknownType: ({
          enumName,
          memberName
        }) => `The enum member initializer for \`${memberName}\` needs to be a literal (either a boolean, number, or string) in enum \`${enumName}\`.`,
        EnumInvalidMemberName: ({
          enumName,
          memberName,
          suggestion
        }) => `Enum member names cannot start with lowercase 'a' through 'z'. Instead of using \`${memberName}\`, consider using \`${suggestion}\`, in enum \`${enumName}\`.`,
        EnumNumberMemberNotInitialized: ({
          enumName,
          memberName
        }) => `Number enum members need to be initialized, e.g. \`${memberName} = 1\` in enum \`${enumName}\`.`,
        EnumStringMemberInconsistentlyInitialized: ({
          enumName
        }) => `String enum members need to consistently either all use initializers, or use no initializers, in enum \`${enumName}\`.`,
        GetterMayNotHaveThisParam: "A getter cannot have a `this` parameter.",
        ImportReflectionHasImportType: "An `import module` declaration can not use `type` or `typeof` keyword.",
        ImportTypeShorthandOnlyInPureImport: "The `type` and `typeof` keywords on named imports can only be used on regular `import` statements. It cannot be used with `import type` or `import typeof` statements.",
        InexactInsideExact: "Explicit inexact syntax cannot appear inside an explicit exact object type.",
        InexactInsideNonObject: "Explicit inexact syntax cannot appear in class or interface definitions.",
        InexactVariance: "Explicit inexact syntax cannot have variance.",
        InvalidNonTypeImportInDeclareModule: "Imports within a `declare module` body must always be `import type` or `import typeof`.",
        MissingTypeParamDefault: "Type parameter declaration needs a default, since a preceding type parameter declaration has a default.",
        NestedDeclareModule: "`declare module` cannot be used inside another `declare module`.",
        NestedFlowComment: "Cannot have a flow comment inside another flow comment.",
        PatternIsOptional: Object.assign({
          message: "A binding pattern parameter cannot be optional in an implementation signature."
        }, {
          reasonCode: "OptionalBindingPattern"
        }),
        SetterMayNotHaveThisParam: "A setter cannot have a `this` parameter.",
        SpreadVariance: "Spread properties cannot have variance.",
        ThisParamAnnotationRequired: "A type annotation is required for the `this` parameter.",
        ThisParamBannedInConstructor: "Constructors cannot have a `this` parameter; constructors don't bind `this` like other functions.",
        ThisParamMayNotBeOptional: "The `this` parameter cannot be optional.",
        ThisParamMustBeFirst: "The `this` parameter must be the first function parameter.",
        ThisParamNoDefault: "The `this` parameter may not have a default value.",
        TypeBeforeInitializer: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
        TypeCastInPattern: "The type cast expression is expected to be wrapped with parenthesis.",
        UnexpectedExplicitInexactInObject: "Explicit inexact syntax must appear at the end of an inexact object.",
        UnexpectedReservedType: ({
          reservedType
        }) => `Unexpected reserved type ${reservedType}.`,
        UnexpectedReservedUnderscore: "`_` is only allowed as a type argument to call or new.",
        UnexpectedSpaceBetweenModuloChecks: "Spaces between `%` and `checks` are not allowed here.",
        UnexpectedSpreadType: "Spread operator cannot appear in class or interface definitions.",
        UnexpectedSubtractionOperand: 'Unexpected token, expected "number" or "bigint".',
        UnexpectedTokenAfterTypeParameter: "Expected an arrow function after this type parameter declaration.",
        UnexpectedTypeParameterBeforeAsyncArrowFunction: "Type parameters must come after the async keyword, e.g. instead of `<T> async () => {}`, use `async <T>() => {}`.",
        UnsupportedDeclareExportKind: ({
          unsupportedExportKind,
          suggestion
        }) => `\`declare export ${unsupportedExportKind}\` is not supported. Use \`${suggestion}\` instead.`,
        UnsupportedStatementInDeclareModule: "Only declares and type imports are allowed inside declare module.",
        UnterminatedFlowComment: "Unterminated flow-comment."
      });
      function isEsModuleType(bodyElement) {
        return bodyElement.type === "DeclareExportAllDeclaration" || bodyElement.type === "DeclareExportDeclaration" && (!bodyElement.declaration || bodyElement.declaration.type !== "TypeAlias" && bodyElement.declaration.type !== "InterfaceDeclaration");
      }
      function hasTypeImportKind(node) {
        return node.importKind === "type" || node.importKind === "typeof";
      }
      var exportSuggestions = {
        const: "declare export var",
        let: "declare export var",
        type: "export type",
        interface: "export interface"
      };
      function partition(list, test) {
        let list1 = [], list2 = [];
        for (let i = 0; i < list.length; i++)
          (test(list[i], i, list) ? list1 : list2).push(list[i]);
        return [list1, list2];
      }
      var FLOW_PRAGMA_REGEX = /\*?\s*@((?:no)?flow)\b/, flow = (superClass) => class extends superClass {
        constructor(...args) {
          super(...args), this.flowPragma = void 0;
        }
        getScopeHandler() {
          return FlowScopeHandler;
        }
        shouldParseTypes() {
          return this.getPluginOption("flow", "all") || this.flowPragma === "flow";
        }
        finishToken(type, val) {
          type !== 134 && type !== 13 && type !== 28 && this.flowPragma === void 0 && (this.flowPragma = null), super.finishToken(type, val);
        }
        addComment(comment) {
          if (this.flowPragma === void 0) {
            let matches = FLOW_PRAGMA_REGEX.exec(comment.value);
            if (matches) if (matches[1] === "flow")
              this.flowPragma = "flow";
            else if (matches[1] === "noflow")
              this.flowPragma = "noflow";
            else
              throw new Error("Unexpected flow pragma");
          }
          super.addComment(comment);
        }
        flowParseTypeInitialiser(tok) {
          let oldInType = this.state.inType;
          this.state.inType = !0, this.expect(tok || 14);
          let type = this.flowParseType();
          return this.state.inType = oldInType, type;
        }
        flowParsePredicate() {
          let node = this.startNode(), moduloLoc = this.state.startLoc;
          return this.next(), this.expectContextual(110), this.state.lastTokStartLoc.index > moduloLoc.index + 1 && this.raise(FlowErrors.UnexpectedSpaceBetweenModuloChecks, moduloLoc), this.eat(10) ? (node.value = super.parseExpression(), this.expect(11), this.finishNode(node, "DeclaredPredicate")) : this.finishNode(node, "InferredPredicate");
        }
        flowParseTypeAndPredicateInitialiser() {
          let oldInType = this.state.inType;
          this.state.inType = !0, this.expect(14);
          let type = null, predicate = null;
          return this.match(54) ? (this.state.inType = oldInType, predicate = this.flowParsePredicate()) : (type = this.flowParseType(), this.state.inType = oldInType, this.match(54) && (predicate = this.flowParsePredicate())), [type, predicate];
        }
        flowParseDeclareClass(node) {
          return this.next(), this.flowParseInterfaceish(node, !0), this.finishNode(node, "DeclareClass");
        }
        flowParseDeclareFunction(node) {
          this.next();
          let id = node.id = this.parseIdentifier(), typeNode = this.startNode(), typeContainer = this.startNode();
          this.match(47) ? typeNode.typeParameters = this.flowParseTypeParameterDeclaration() : typeNode.typeParameters = null, this.expect(10);
          let tmp = this.flowParseFunctionTypeParams();
          return typeNode.params = tmp.params, typeNode.rest = tmp.rest, typeNode.this = tmp._this, this.expect(11), [typeNode.returnType, node.predicate] = this.flowParseTypeAndPredicateInitialiser(), typeContainer.typeAnnotation = this.finishNode(typeNode, "FunctionTypeAnnotation"), id.typeAnnotation = this.finishNode(typeContainer, "TypeAnnotation"), this.resetEndLocation(id), this.semicolon(), this.scope.declareName(node.id.name, 2048, node.id.loc.start), this.finishNode(node, "DeclareFunction");
        }
        flowParseDeclare(node, insideModule) {
          if (this.match(80))
            return this.flowParseDeclareClass(node);
          if (this.match(68))
            return this.flowParseDeclareFunction(node);
          if (this.match(74))
            return this.flowParseDeclareVariable(node);
          if (this.eatContextual(127))
            return this.match(16) ? this.flowParseDeclareModuleExports(node) : (insideModule && this.raise(FlowErrors.NestedDeclareModule, this.state.lastTokStartLoc), this.flowParseDeclareModule(node));
          if (this.isContextual(130))
            return this.flowParseDeclareTypeAlias(node);
          if (this.isContextual(131))
            return this.flowParseDeclareOpaqueType(node);
          if (this.isContextual(129))
            return this.flowParseDeclareInterface(node);
          if (this.match(82))
            return this.flowParseDeclareExportDeclaration(node, insideModule);
          throw this.unexpected();
        }
        flowParseDeclareVariable(node) {
          return this.next(), node.id = this.flowParseTypeAnnotatableIdentifier(), this.scope.declareName(node.id.name, 5, node.id.loc.start), this.semicolon(), this.finishNode(node, "DeclareVariable");
        }
        flowParseDeclareModule(node) {
          this.scope.enter(0), this.match(134) ? node.id = super.parseExprAtom() : node.id = this.parseIdentifier();
          let bodyNode = node.body = this.startNode(), body = bodyNode.body = [];
          for (this.expect(5); !this.match(8); ) {
            let bodyNode2 = this.startNode();
            this.match(83) ? (this.next(), !this.isContextual(130) && !this.match(87) && this.raise(FlowErrors.InvalidNonTypeImportInDeclareModule, this.state.lastTokStartLoc), body.push(super.parseImport(bodyNode2))) : (this.expectContextual(125, FlowErrors.UnsupportedStatementInDeclareModule), body.push(this.flowParseDeclare(bodyNode2, !0)));
          }
          this.scope.exit(), this.expect(8), this.finishNode(bodyNode, "BlockStatement");
          let kind = null, hasModuleExport = !1;
          return body.forEach((bodyElement) => {
            isEsModuleType(bodyElement) ? (kind === "CommonJS" && this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement), kind = "ES") : bodyElement.type === "DeclareModuleExports" && (hasModuleExport && this.raise(FlowErrors.DuplicateDeclareModuleExports, bodyElement), kind === "ES" && this.raise(FlowErrors.AmbiguousDeclareModuleKind, bodyElement), kind = "CommonJS", hasModuleExport = !0);
          }), node.kind = kind || "CommonJS", this.finishNode(node, "DeclareModule");
        }
        flowParseDeclareExportDeclaration(node, insideModule) {
          if (this.expect(82), this.eat(65))
            return this.match(68) || this.match(80) ? node.declaration = this.flowParseDeclare(this.startNode()) : (node.declaration = this.flowParseType(), this.semicolon()), node.default = !0, this.finishNode(node, "DeclareExportDeclaration");
          if (this.match(75) || this.isLet() || (this.isContextual(130) || this.isContextual(129)) && !insideModule) {
            let label = this.state.value;
            throw this.raise(FlowErrors.UnsupportedDeclareExportKind, this.state.startLoc, {
              unsupportedExportKind: label,
              suggestion: exportSuggestions[label]
            });
          }
          if (this.match(74) || this.match(68) || this.match(80) || this.isContextual(131))
            return node.declaration = this.flowParseDeclare(this.startNode()), node.default = !1, this.finishNode(node, "DeclareExportDeclaration");
          if (this.match(55) || this.match(5) || this.isContextual(129) || this.isContextual(130) || this.isContextual(131))
            return node = this.parseExport(node, null), node.type === "ExportNamedDeclaration" ? (node.default = !1, delete node.exportKind, this.castNodeTo(node, "DeclareExportDeclaration")) : this.castNodeTo(node, "DeclareExportAllDeclaration");
          throw this.unexpected();
        }
        flowParseDeclareModuleExports(node) {
          return this.next(), this.expectContextual(111), node.typeAnnotation = this.flowParseTypeAnnotation(), this.semicolon(), this.finishNode(node, "DeclareModuleExports");
        }
        flowParseDeclareTypeAlias(node) {
          this.next();
          let finished = this.flowParseTypeAlias(node);
          return this.castNodeTo(finished, "DeclareTypeAlias"), finished;
        }
        flowParseDeclareOpaqueType(node) {
          this.next();
          let finished = this.flowParseOpaqueType(node, !0);
          return this.castNodeTo(finished, "DeclareOpaqueType"), finished;
        }
        flowParseDeclareInterface(node) {
          return this.next(), this.flowParseInterfaceish(node, !1), this.finishNode(node, "DeclareInterface");
        }
        flowParseInterfaceish(node, isClass) {
          if (node.id = this.flowParseRestrictedIdentifier(!isClass, !0), this.scope.declareName(node.id.name, isClass ? 17 : 8201, node.id.loc.start), this.match(47) ? node.typeParameters = this.flowParseTypeParameterDeclaration() : node.typeParameters = null, node.extends = [], this.eat(81))
            do
              node.extends.push(this.flowParseInterfaceExtends());
            while (!isClass && this.eat(12));
          if (isClass) {
            if (node.implements = [], node.mixins = [], this.eatContextual(117))
              do
                node.mixins.push(this.flowParseInterfaceExtends());
              while (this.eat(12));
            if (this.eatContextual(113))
              do
                node.implements.push(this.flowParseInterfaceExtends());
              while (this.eat(12));
          }
          node.body = this.flowParseObjectType({
            allowStatic: isClass,
            allowExact: !1,
            allowSpread: !1,
            allowProto: isClass,
            allowInexact: !1
          });
        }
        flowParseInterfaceExtends() {
          let node = this.startNode();
          return node.id = this.flowParseQualifiedTypeIdentifier(), this.match(47) ? node.typeParameters = this.flowParseTypeParameterInstantiation() : node.typeParameters = null, this.finishNode(node, "InterfaceExtends");
        }
        flowParseInterface(node) {
          return this.flowParseInterfaceish(node, !1), this.finishNode(node, "InterfaceDeclaration");
        }
        checkNotUnderscore(word) {
          word === "_" && this.raise(FlowErrors.UnexpectedReservedUnderscore, this.state.startLoc);
        }
        checkReservedType(word, startLoc, declaration2) {
          reservedTypes.has(word) && this.raise(declaration2 ? FlowErrors.AssignReservedType : FlowErrors.UnexpectedReservedType, startLoc, {
            reservedType: word
          });
        }
        flowParseRestrictedIdentifierName(liberal, declaration2) {
          return this.checkReservedType(this.state.value, this.state.startLoc, declaration2), this.parseIdentifierName(liberal);
        }
        flowParseRestrictedIdentifier(liberal, declaration2) {
          let node = this.startNode(), name = this.flowParseRestrictedIdentifierName(liberal, declaration2);
          return this.createIdentifier(node, name);
        }
        flowParseTypeAlias(node) {
          return node.id = this.flowParseRestrictedIdentifier(!1, !0), this.scope.declareName(node.id.name, 8201, node.id.loc.start), this.match(47) ? node.typeParameters = this.flowParseTypeParameterDeclaration() : node.typeParameters = null, node.right = this.flowParseTypeInitialiser(29), this.semicolon(), this.finishNode(node, "TypeAlias");
        }
        flowParseOpaqueType(node, declare) {
          return this.expectContextual(130), node.id = this.flowParseRestrictedIdentifier(!0, !0), this.scope.declareName(node.id.name, 8201, node.id.loc.start), this.match(47) ? node.typeParameters = this.flowParseTypeParameterDeclaration() : node.typeParameters = null, node.supertype = null, this.match(14) && (node.supertype = this.flowParseTypeInitialiser(14)), node.impltype = null, declare || (node.impltype = this.flowParseTypeInitialiser(29)), this.semicolon(), this.finishNode(node, "OpaqueType");
        }
        flowParseTypeParameterBound() {
          if (this.match(14) || this.isContextual(81)) {
            let node = this.startNode();
            return this.next(), node.typeAnnotation = this.flowParseType(), this.finishNode(node, "TypeAnnotation");
          }
        }
        flowParseTypeParameter(requireDefault = !1) {
          let nodeStartLoc = this.state.startLoc, node = this.startNode(), variance = this.flowParseVariance();
          return node.name = this.flowParseRestrictedIdentifierName(), node.variance = variance, node.bound = this.flowParseTypeParameterBound(), this.match(29) ? (this.eat(29), node.default = this.flowParseType()) : requireDefault && this.raise(FlowErrors.MissingTypeParamDefault, nodeStartLoc), this.finishNode(node, "TypeParameter");
        }
        flowParseTypeParameterDeclaration() {
          let oldInType = this.state.inType, node = this.startNode();
          node.params = [], this.state.inType = !0, this.match(47) || this.match(143) ? this.next() : this.unexpected();
          let defaultRequired = !1;
          do {
            let typeParameter = this.flowParseTypeParameter(defaultRequired);
            node.params.push(typeParameter), typeParameter.default && (defaultRequired = !0), this.match(48) || this.expect(12);
          } while (!this.match(48));
          return this.expect(48), this.state.inType = oldInType, this.finishNode(node, "TypeParameterDeclaration");
        }
        flowInTopLevelContext(cb) {
          if (this.curContext() !== types.brace) {
            let oldContext = this.state.context;
            this.state.context = [oldContext[0]];
            try {
              return cb();
            } finally {
              this.state.context = oldContext;
            }
          } else
            return cb();
        }
        flowParseTypeParameterInstantiationInExpression() {
          if (this.reScan_lt() === 47)
            return this.flowParseTypeParameterInstantiation();
        }
        flowParseTypeParameterInstantiation() {
          let node = this.startNode(), oldInType = this.state.inType;
          return this.state.inType = !0, node.params = [], this.flowInTopLevelContext(() => {
            this.expect(47);
            let oldNoAnonFunctionType = this.state.noAnonFunctionType;
            for (this.state.noAnonFunctionType = !1; !this.match(48); )
              node.params.push(this.flowParseType()), this.match(48) || this.expect(12);
            this.state.noAnonFunctionType = oldNoAnonFunctionType;
          }), this.state.inType = oldInType, !this.state.inType && this.curContext() === types.brace && this.reScan_lt_gt(), this.expect(48), this.finishNode(node, "TypeParameterInstantiation");
        }
        flowParseTypeParameterInstantiationCallOrNew() {
          if (this.reScan_lt() !== 47) return null;
          let node = this.startNode(), oldInType = this.state.inType;
          for (node.params = [], this.state.inType = !0, this.expect(47); !this.match(48); )
            node.params.push(this.flowParseTypeOrImplicitInstantiation()), this.match(48) || this.expect(12);
          return this.expect(48), this.state.inType = oldInType, this.finishNode(node, "TypeParameterInstantiation");
        }
        flowParseInterfaceType() {
          let node = this.startNode();
          if (this.expectContextual(129), node.extends = [], this.eat(81))
            do
              node.extends.push(this.flowParseInterfaceExtends());
            while (this.eat(12));
          return node.body = this.flowParseObjectType({
            allowStatic: !1,
            allowExact: !1,
            allowSpread: !1,
            allowProto: !1,
            allowInexact: !1
          }), this.finishNode(node, "InterfaceTypeAnnotation");
        }
        flowParseObjectPropertyKey() {
          return this.match(135) || this.match(134) ? super.parseExprAtom() : this.parseIdentifier(!0);
        }
        flowParseObjectTypeIndexer(node, isStatic, variance) {
          return node.static = isStatic, this.lookahead().type === 14 ? (node.id = this.flowParseObjectPropertyKey(), node.key = this.flowParseTypeInitialiser()) : (node.id = null, node.key = this.flowParseType()), this.expect(3), node.value = this.flowParseTypeInitialiser(), node.variance = variance, this.finishNode(node, "ObjectTypeIndexer");
        }
        flowParseObjectTypeInternalSlot(node, isStatic) {
          return node.static = isStatic, node.id = this.flowParseObjectPropertyKey(), this.expect(3), this.expect(3), this.match(47) || this.match(10) ? (node.method = !0, node.optional = !1, node.value = this.flowParseObjectTypeMethodish(this.startNodeAt(node.loc.start))) : (node.method = !1, this.eat(17) && (node.optional = !0), node.value = this.flowParseTypeInitialiser()), this.finishNode(node, "ObjectTypeInternalSlot");
        }
        flowParseObjectTypeMethodish(node) {
          for (node.params = [], node.rest = null, node.typeParameters = null, node.this = null, this.match(47) && (node.typeParameters = this.flowParseTypeParameterDeclaration()), this.expect(10), this.match(78) && (node.this = this.flowParseFunctionTypeParam(!0), node.this.name = null, this.match(11) || this.expect(12)); !this.match(11) && !this.match(21); )
            node.params.push(this.flowParseFunctionTypeParam(!1)), this.match(11) || this.expect(12);
          return this.eat(21) && (node.rest = this.flowParseFunctionTypeParam(!1)), this.expect(11), node.returnType = this.flowParseTypeInitialiser(), this.finishNode(node, "FunctionTypeAnnotation");
        }
        flowParseObjectTypeCallProperty(node, isStatic) {
          let valueNode = this.startNode();
          return node.static = isStatic, node.value = this.flowParseObjectTypeMethodish(valueNode), this.finishNode(node, "ObjectTypeCallProperty");
        }
        flowParseObjectType({
          allowStatic,
          allowExact,
          allowSpread,
          allowProto,
          allowInexact
        }) {
          let oldInType = this.state.inType;
          this.state.inType = !0;
          let nodeStart = this.startNode();
          nodeStart.callProperties = [], nodeStart.properties = [], nodeStart.indexers = [], nodeStart.internalSlots = [];
          let endDelim, exact, inexact = !1;
          for (allowExact && this.match(6) ? (this.expect(6), endDelim = 9, exact = !0) : (this.expect(5), endDelim = 8, exact = !1), nodeStart.exact = exact; !this.match(endDelim); ) {
            let isStatic = !1, protoStartLoc = null, inexactStartLoc = null, node = this.startNode();
            if (allowProto && this.isContextual(118)) {
              let lookahead = this.lookahead();
              lookahead.type !== 14 && lookahead.type !== 17 && (this.next(), protoStartLoc = this.state.startLoc, allowStatic = !1);
            }
            if (allowStatic && this.isContextual(106)) {
              let lookahead = this.lookahead();
              lookahead.type !== 14 && lookahead.type !== 17 && (this.next(), isStatic = !0);
            }
            let variance = this.flowParseVariance();
            if (this.eat(0))
              protoStartLoc != null && this.unexpected(protoStartLoc), this.eat(0) ? (variance && this.unexpected(variance.loc.start), nodeStart.internalSlots.push(this.flowParseObjectTypeInternalSlot(node, isStatic))) : nodeStart.indexers.push(this.flowParseObjectTypeIndexer(node, isStatic, variance));
            else if (this.match(10) || this.match(47))
              protoStartLoc != null && this.unexpected(protoStartLoc), variance && this.unexpected(variance.loc.start), nodeStart.callProperties.push(this.flowParseObjectTypeCallProperty(node, isStatic));
            else {
              let kind = "init";
              if (this.isContextual(99) || this.isContextual(104)) {
                let lookahead = this.lookahead();
                tokenIsLiteralPropertyName(lookahead.type) && (kind = this.state.value, this.next());
              }
              let propOrInexact = this.flowParseObjectTypeProperty(node, isStatic, protoStartLoc, variance, kind, allowSpread, allowInexact ?? !exact);
              propOrInexact === null ? (inexact = !0, inexactStartLoc = this.state.lastTokStartLoc) : nodeStart.properties.push(propOrInexact);
            }
            this.flowObjectTypeSemicolon(), inexactStartLoc && !this.match(8) && !this.match(9) && this.raise(FlowErrors.UnexpectedExplicitInexactInObject, inexactStartLoc);
          }
          this.expect(endDelim), allowSpread && (nodeStart.inexact = inexact);
          let out = this.finishNode(nodeStart, "ObjectTypeAnnotation");
          return this.state.inType = oldInType, out;
        }
        flowParseObjectTypeProperty(node, isStatic, protoStartLoc, variance, kind, allowSpread, allowInexact) {
          if (this.eat(21))
            return this.match(12) || this.match(13) || this.match(8) || this.match(9) ? (allowSpread ? allowInexact || this.raise(FlowErrors.InexactInsideExact, this.state.lastTokStartLoc) : this.raise(FlowErrors.InexactInsideNonObject, this.state.lastTokStartLoc), variance && this.raise(FlowErrors.InexactVariance, variance), null) : (allowSpread || this.raise(FlowErrors.UnexpectedSpreadType, this.state.lastTokStartLoc), protoStartLoc != null && this.unexpected(protoStartLoc), variance && this.raise(FlowErrors.SpreadVariance, variance), node.argument = this.flowParseType(), this.finishNode(node, "ObjectTypeSpreadProperty"));
          {
            node.key = this.flowParseObjectPropertyKey(), node.static = isStatic, node.proto = protoStartLoc != null, node.kind = kind;
            let optional = !1;
            return this.match(47) || this.match(10) ? (node.method = !0, protoStartLoc != null && this.unexpected(protoStartLoc), variance && this.unexpected(variance.loc.start), node.value = this.flowParseObjectTypeMethodish(this.startNodeAt(node.loc.start)), (kind === "get" || kind === "set") && this.flowCheckGetterSetterParams(node), !allowSpread && node.key.name === "constructor" && node.value.this && this.raise(FlowErrors.ThisParamBannedInConstructor, node.value.this)) : (kind !== "init" && this.unexpected(), node.method = !1, this.eat(17) && (optional = !0), node.value = this.flowParseTypeInitialiser(), node.variance = variance), node.optional = optional, this.finishNode(node, "ObjectTypeProperty");
          }
        }
        flowCheckGetterSetterParams(property) {
          let paramCount = property.kind === "get" ? 0 : 1, length = property.value.params.length + (property.value.rest ? 1 : 0);
          property.value.this && this.raise(property.kind === "get" ? FlowErrors.GetterMayNotHaveThisParam : FlowErrors.SetterMayNotHaveThisParam, property.value.this), length !== paramCount && this.raise(property.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity, property), property.kind === "set" && property.value.rest && this.raise(Errors.BadSetterRestParameter, property);
        }
        flowObjectTypeSemicolon() {
          !this.eat(13) && !this.eat(12) && !this.match(8) && !this.match(9) && this.unexpected();
        }
        flowParseQualifiedTypeIdentifier(startLoc, id) {
          startLoc ?? (startLoc = this.state.startLoc);
          let node = id || this.flowParseRestrictedIdentifier(!0);
          for (; this.eat(16); ) {
            let node2 = this.startNodeAt(startLoc);
            node2.qualification = node, node2.id = this.flowParseRestrictedIdentifier(!0), node = this.finishNode(node2, "QualifiedTypeIdentifier");
          }
          return node;
        }
        flowParseGenericType(startLoc, id) {
          let node = this.startNodeAt(startLoc);
          return node.typeParameters = null, node.id = this.flowParseQualifiedTypeIdentifier(startLoc, id), this.match(47) && (node.typeParameters = this.flowParseTypeParameterInstantiation()), this.finishNode(node, "GenericTypeAnnotation");
        }
        flowParseTypeofType() {
          let node = this.startNode();
          return this.expect(87), node.argument = this.flowParsePrimaryType(), this.finishNode(node, "TypeofTypeAnnotation");
        }
        flowParseTupleType() {
          let node = this.startNode();
          for (node.types = [], this.expect(0); this.state.pos < this.length && !this.match(3) && (node.types.push(this.flowParseType()), !this.match(3)); )
            this.expect(12);
          return this.expect(3), this.finishNode(node, "TupleTypeAnnotation");
        }
        flowParseFunctionTypeParam(first) {
          let name = null, optional = !1, typeAnnotation = null, node = this.startNode(), lh = this.lookahead(), isThis = this.state.type === 78;
          return lh.type === 14 || lh.type === 17 ? (isThis && !first && this.raise(FlowErrors.ThisParamMustBeFirst, node), name = this.parseIdentifier(isThis), this.eat(17) && (optional = !0, isThis && this.raise(FlowErrors.ThisParamMayNotBeOptional, node)), typeAnnotation = this.flowParseTypeInitialiser()) : typeAnnotation = this.flowParseType(), node.name = name, node.optional = optional, node.typeAnnotation = typeAnnotation, this.finishNode(node, "FunctionTypeParam");
        }
        reinterpretTypeAsFunctionTypeParam(type) {
          let node = this.startNodeAt(type.loc.start);
          return node.name = null, node.optional = !1, node.typeAnnotation = type, this.finishNode(node, "FunctionTypeParam");
        }
        flowParseFunctionTypeParams(params = []) {
          let rest = null, _this = null;
          for (this.match(78) && (_this = this.flowParseFunctionTypeParam(!0), _this.name = null, this.match(11) || this.expect(12)); !this.match(11) && !this.match(21); )
            params.push(this.flowParseFunctionTypeParam(!1)), this.match(11) || this.expect(12);
          return this.eat(21) && (rest = this.flowParseFunctionTypeParam(!1)), {
            params,
            rest,
            _this
          };
        }
        flowIdentToTypeAnnotation(startLoc, node, id) {
          switch (id.name) {
            case "any":
              return this.finishNode(node, "AnyTypeAnnotation");
            case "bool":
            case "boolean":
              return this.finishNode(node, "BooleanTypeAnnotation");
            case "mixed":
              return this.finishNode(node, "MixedTypeAnnotation");
            case "empty":
              return this.finishNode(node, "EmptyTypeAnnotation");
            case "number":
              return this.finishNode(node, "NumberTypeAnnotation");
            case "string":
              return this.finishNode(node, "StringTypeAnnotation");
            case "symbol":
              return this.finishNode(node, "SymbolTypeAnnotation");
            default:
              return this.checkNotUnderscore(id.name), this.flowParseGenericType(startLoc, id);
          }
        }
        flowParsePrimaryType() {
          let startLoc = this.state.startLoc, node = this.startNode(), tmp, type, isGroupedType = !1, oldNoAnonFunctionType = this.state.noAnonFunctionType;
          switch (this.state.type) {
            case 5:
              return this.flowParseObjectType({
                allowStatic: !1,
                allowExact: !1,
                allowSpread: !0,
                allowProto: !1,
                allowInexact: !0
              });
            case 6:
              return this.flowParseObjectType({
                allowStatic: !1,
                allowExact: !0,
                allowSpread: !0,
                allowProto: !1,
                allowInexact: !1
              });
            case 0:
              return this.state.noAnonFunctionType = !1, type = this.flowParseTupleType(), this.state.noAnonFunctionType = oldNoAnonFunctionType, type;
            case 47: {
              let node2 = this.startNode();
              return node2.typeParameters = this.flowParseTypeParameterDeclaration(), this.expect(10), tmp = this.flowParseFunctionTypeParams(), node2.params = tmp.params, node2.rest = tmp.rest, node2.this = tmp._this, this.expect(11), this.expect(19), node2.returnType = this.flowParseType(), this.finishNode(node2, "FunctionTypeAnnotation");
            }
            case 10: {
              let node2 = this.startNode();
              if (this.next(), !this.match(11) && !this.match(21))
                if (tokenIsIdentifier(this.state.type) || this.match(78)) {
                  let token = this.lookahead().type;
                  isGroupedType = token !== 17 && token !== 14;
                } else
                  isGroupedType = !0;
              if (isGroupedType) {
                if (this.state.noAnonFunctionType = !1, type = this.flowParseType(), this.state.noAnonFunctionType = oldNoAnonFunctionType, this.state.noAnonFunctionType || !(this.match(12) || this.match(11) && this.lookahead().type === 19))
                  return this.expect(11), type;
                this.eat(12);
              }
              return type ? tmp = this.flowParseFunctionTypeParams([this.reinterpretTypeAsFunctionTypeParam(type)]) : tmp = this.flowParseFunctionTypeParams(), node2.params = tmp.params, node2.rest = tmp.rest, node2.this = tmp._this, this.expect(11), this.expect(19), node2.returnType = this.flowParseType(), node2.typeParameters = null, this.finishNode(node2, "FunctionTypeAnnotation");
            }
            case 134:
              return this.parseLiteral(this.state.value, "StringLiteralTypeAnnotation");
            case 85:
            case 86:
              return node.value = this.match(85), this.next(), this.finishNode(node, "BooleanLiteralTypeAnnotation");
            case 53:
              if (this.state.value === "-") {
                if (this.next(), this.match(135))
                  return this.parseLiteralAtNode(-this.state.value, "NumberLiteralTypeAnnotation", node);
                if (this.match(136))
                  return this.parseLiteralAtNode(-this.state.value, "BigIntLiteralTypeAnnotation", node);
                throw this.raise(FlowErrors.UnexpectedSubtractionOperand, this.state.startLoc);
              }
              throw this.unexpected();
            case 135:
              return this.parseLiteral(this.state.value, "NumberLiteralTypeAnnotation");
            case 136:
              return this.parseLiteral(this.state.value, "BigIntLiteralTypeAnnotation");
            case 88:
              return this.next(), this.finishNode(node, "VoidTypeAnnotation");
            case 84:
              return this.next(), this.finishNode(node, "NullLiteralTypeAnnotation");
            case 78:
              return this.next(), this.finishNode(node, "ThisTypeAnnotation");
            case 55:
              return this.next(), this.finishNode(node, "ExistsTypeAnnotation");
            case 87:
              return this.flowParseTypeofType();
            default:
              if (tokenIsKeyword(this.state.type)) {
                let label = tokenLabelName(this.state.type);
                return this.next(), super.createIdentifier(node, label);
              } else if (tokenIsIdentifier(this.state.type))
                return this.isContextual(129) ? this.flowParseInterfaceType() : this.flowIdentToTypeAnnotation(startLoc, node, this.parseIdentifier());
          }
          throw this.unexpected();
        }
        flowParsePostfixType() {
          let startLoc = this.state.startLoc, type = this.flowParsePrimaryType(), seenOptionalIndexedAccess = !1;
          for (; (this.match(0) || this.match(18)) && !this.canInsertSemicolon(); ) {
            let node = this.startNodeAt(startLoc), optional = this.eat(18);
            seenOptionalIndexedAccess = seenOptionalIndexedAccess || optional, this.expect(0), !optional && this.match(3) ? (node.elementType = type, this.next(), type = this.finishNode(node, "ArrayTypeAnnotation")) : (node.objectType = type, node.indexType = this.flowParseType(), this.expect(3), seenOptionalIndexedAccess ? (node.optional = optional, type = this.finishNode(node, "OptionalIndexedAccessType")) : type = this.finishNode(node, "IndexedAccessType"));
          }
          return type;
        }
        flowParsePrefixType() {
          let node = this.startNode();
          return this.eat(17) ? (node.typeAnnotation = this.flowParsePrefixType(), this.finishNode(node, "NullableTypeAnnotation")) : this.flowParsePostfixType();
        }
        flowParseAnonFunctionWithoutParens() {
          let param = this.flowParsePrefixType();
          if (!this.state.noAnonFunctionType && this.eat(19)) {
            let node = this.startNodeAt(param.loc.start);
            return node.params = [this.reinterpretTypeAsFunctionTypeParam(param)], node.rest = null, node.this = null, node.returnType = this.flowParseType(), node.typeParameters = null, this.finishNode(node, "FunctionTypeAnnotation");
          }
          return param;
        }
        flowParseIntersectionType() {
          let node = this.startNode();
          this.eat(45);
          let type = this.flowParseAnonFunctionWithoutParens();
          for (node.types = [type]; this.eat(45); )
            node.types.push(this.flowParseAnonFunctionWithoutParens());
          return node.types.length === 1 ? type : this.finishNode(node, "IntersectionTypeAnnotation");
        }
        flowParseUnionType() {
          let node = this.startNode();
          this.eat(43);
          let type = this.flowParseIntersectionType();
          for (node.types = [type]; this.eat(43); )
            node.types.push(this.flowParseIntersectionType());
          return node.types.length === 1 ? type : this.finishNode(node, "UnionTypeAnnotation");
        }
        flowParseType() {
          let oldInType = this.state.inType;
          this.state.inType = !0;
          let type = this.flowParseUnionType();
          return this.state.inType = oldInType, type;
        }
        flowParseTypeOrImplicitInstantiation() {
          if (this.state.type === 132 && this.state.value === "_") {
            let startLoc = this.state.startLoc, node = this.parseIdentifier();
            return this.flowParseGenericType(startLoc, node);
          } else
            return this.flowParseType();
        }
        flowParseTypeAnnotation() {
          let node = this.startNode();
          return node.typeAnnotation = this.flowParseTypeInitialiser(), this.finishNode(node, "TypeAnnotation");
        }
        flowParseTypeAnnotatableIdentifier() {
          let node = this.startNode(), name = this.parseIdentifierName();
          return this.match(14) && (node.typeAnnotation = this.flowParseTypeAnnotation()), this.createIdentifier(node, name);
        }
        typeCastToParameter(node) {
          return node.expression.typeAnnotation = node.typeAnnotation, this.resetEndLocation(node.expression, node.typeAnnotation.loc.end), node.expression;
        }
        flowParseVariance() {
          let variance = null;
          return this.match(53) ? (variance = this.startNode(), this.state.value === "+" ? variance.kind = "plus" : variance.kind = "minus", this.next(), this.finishNode(variance, "Variance")) : variance;
        }
        parseFunctionBody(node, allowExpressionBody, isMethod = !1) {
          if (allowExpressionBody) {
            this.forwardNoArrowParamsConversionAt(node, () => super.parseFunctionBody(node, !0, isMethod));
            return;
          }
          super.parseFunctionBody(node, !1, isMethod);
        }
        parseFunctionBodyAndFinish(node, type, isMethod = !1) {
          if (this.match(14)) {
            let typeNode = this.startNode();
            [typeNode.typeAnnotation, node.predicate] = this.flowParseTypeAndPredicateInitialiser(), node.returnType = typeNode.typeAnnotation ? this.finishNode(typeNode, "TypeAnnotation") : null;
          }
          return super.parseFunctionBodyAndFinish(node, type, isMethod);
        }
        parseStatementLike(flags) {
          if (this.state.strict && this.isContextual(129)) {
            let lookahead = this.lookahead();
            if (tokenIsKeywordOrIdentifier(lookahead.type)) {
              let node = this.startNode();
              return this.next(), this.flowParseInterface(node);
            }
          } else if (this.isContextual(126)) {
            let node = this.startNode();
            return this.next(), this.flowParseEnumDeclaration(node);
          }
          let stmt = super.parseStatementLike(flags);
          return this.flowPragma === void 0 && !this.isValidDirective(stmt) && (this.flowPragma = null), stmt;
        }
        parseExpressionStatement(node, expr, decorators) {
          if (expr.type === "Identifier") {
            if (expr.name === "declare") {
              if (this.match(80) || tokenIsIdentifier(this.state.type) || this.match(68) || this.match(74) || this.match(82))
                return this.flowParseDeclare(node);
            } else if (tokenIsIdentifier(this.state.type)) {
              if (expr.name === "interface")
                return this.flowParseInterface(node);
              if (expr.name === "type")
                return this.flowParseTypeAlias(node);
              if (expr.name === "opaque")
                return this.flowParseOpaqueType(node, !1);
            }
          }
          return super.parseExpressionStatement(node, expr, decorators);
        }
        shouldParseExportDeclaration() {
          let {
            type
          } = this.state;
          return type === 126 || tokenIsFlowInterfaceOrTypeOrOpaque(type) ? !this.state.containsEsc : super.shouldParseExportDeclaration();
        }
        isExportDefaultSpecifier() {
          let {
            type
          } = this.state;
          return type === 126 || tokenIsFlowInterfaceOrTypeOrOpaque(type) ? this.state.containsEsc : super.isExportDefaultSpecifier();
        }
        parseExportDefaultExpression() {
          if (this.isContextual(126)) {
            let node = this.startNode();
            return this.next(), this.flowParseEnumDeclaration(node);
          }
          return super.parseExportDefaultExpression();
        }
        parseConditional(expr, startLoc, refExpressionErrors) {
          if (!this.match(17)) return expr;
          if (this.state.maybeInArrowParameters) {
            let nextCh = this.lookaheadCharCode();
            if (nextCh === 44 || nextCh === 61 || nextCh === 58 || nextCh === 41)
              return this.setOptionalParametersError(refExpressionErrors), expr;
          }
          this.expect(17);
          let state = this.state.clone(), originalNoArrowAt = this.state.noArrowAt, node = this.startNodeAt(startLoc), {
            consequent,
            failed
          } = this.tryParseConditionalConsequent(), [valid, invalid] = this.getArrowLikeExpressions(consequent);
          if (failed || invalid.length > 0) {
            let noArrowAt = [...originalNoArrowAt];
            if (invalid.length > 0) {
              this.state = state, this.state.noArrowAt = noArrowAt;
              for (let i = 0; i < invalid.length; i++)
                noArrowAt.push(invalid[i].start);
              ({
                consequent,
                failed
              } = this.tryParseConditionalConsequent()), [valid, invalid] = this.getArrowLikeExpressions(consequent);
            }
            failed && valid.length > 1 && this.raise(FlowErrors.AmbiguousConditionalArrow, state.startLoc), failed && valid.length === 1 && (this.state = state, noArrowAt.push(valid[0].start), this.state.noArrowAt = noArrowAt, {
              consequent,
              failed
            } = this.tryParseConditionalConsequent());
          }
          return this.getArrowLikeExpressions(consequent, !0), this.state.noArrowAt = originalNoArrowAt, this.expect(14), node.test = expr, node.consequent = consequent, node.alternate = this.forwardNoArrowParamsConversionAt(node, () => this.parseMaybeAssign(void 0, void 0)), this.finishNode(node, "ConditionalExpression");
        }
        tryParseConditionalConsequent() {
          this.state.noArrowParamsConversionAt.push(this.state.start);
          let consequent = this.parseMaybeAssignAllowIn(), failed = !this.match(14);
          return this.state.noArrowParamsConversionAt.pop(), {
            consequent,
            failed
          };
        }
        getArrowLikeExpressions(node, disallowInvalid) {
          let stack = [node], arrows = [];
          for (; stack.length !== 0; ) {
            let node2 = stack.pop();
            node2.type === "ArrowFunctionExpression" ? (node2.typeParameters || !node2.returnType ? this.finishArrowValidation(node2) : arrows.push(node2), node2.body.type !== "BlockStatement" && stack.push(node2.body)) : node2.type === "ConditionalExpression" && (stack.push(node2.consequent), stack.push(node2.alternate));
          }
          return disallowInvalid ? (arrows.forEach((node2) => this.finishArrowValidation(node2)), [arrows, []]) : partition(arrows, (node2) => node2.params.every((param) => this.isAssignable(param, !0)));
        }
        finishArrowValidation(node) {
          var _node$extra;
          this.toAssignableList(node.params, (_node$extra = node.extra) == null ? void 0 : _node$extra.trailingCommaLoc, !1), this.scope.enter(518), super.checkParams(node, !1, !0), this.scope.exit();
        }
        forwardNoArrowParamsConversionAt(node, parse3) {
          let result;
          return this.state.noArrowParamsConversionAt.includes(this.offsetToSourcePos(node.start)) ? (this.state.noArrowParamsConversionAt.push(this.state.start), result = parse3(), this.state.noArrowParamsConversionAt.pop()) : result = parse3(), result;
        }
        parseParenItem(node, startLoc) {
          let newNode = super.parseParenItem(node, startLoc);
          if (this.eat(17) && (newNode.optional = !0, this.resetEndLocation(node)), this.match(14)) {
            let typeCastNode = this.startNodeAt(startLoc);
            return typeCastNode.expression = newNode, typeCastNode.typeAnnotation = this.flowParseTypeAnnotation(), this.finishNode(typeCastNode, "TypeCastExpression");
          }
          return newNode;
        }
        assertModuleNodeAllowed(node) {
          node.type === "ImportDeclaration" && (node.importKind === "type" || node.importKind === "typeof") || node.type === "ExportNamedDeclaration" && node.exportKind === "type" || node.type === "ExportAllDeclaration" && node.exportKind === "type" || super.assertModuleNodeAllowed(node);
        }
        parseExportDeclaration(node) {
          if (this.isContextual(130)) {
            node.exportKind = "type";
            let declarationNode = this.startNode();
            return this.next(), this.match(5) ? (node.specifiers = this.parseExportSpecifiers(!0), super.parseExportFrom(node), null) : this.flowParseTypeAlias(declarationNode);
          } else if (this.isContextual(131)) {
            node.exportKind = "type";
            let declarationNode = this.startNode();
            return this.next(), this.flowParseOpaqueType(declarationNode, !1);
          } else if (this.isContextual(129)) {
            node.exportKind = "type";
            let declarationNode = this.startNode();
            return this.next(), this.flowParseInterface(declarationNode);
          } else if (this.isContextual(126)) {
            node.exportKind = "value";
            let declarationNode = this.startNode();
            return this.next(), this.flowParseEnumDeclaration(declarationNode);
          } else
            return super.parseExportDeclaration(node);
        }
        eatExportStar(node) {
          return super.eatExportStar(node) ? !0 : this.isContextual(130) && this.lookahead().type === 55 ? (node.exportKind = "type", this.next(), this.next(), !0) : !1;
        }
        maybeParseExportNamespaceSpecifier(node) {
          let {
            startLoc
          } = this.state, hasNamespace = super.maybeParseExportNamespaceSpecifier(node);
          return hasNamespace && node.exportKind === "type" && this.unexpected(startLoc), hasNamespace;
        }
        parseClassId(node, isStatement, optionalId) {
          super.parseClassId(node, isStatement, optionalId), this.match(47) && (node.typeParameters = this.flowParseTypeParameterDeclaration());
        }
        parseClassMember(classBody, member, state) {
          let {
            startLoc
          } = this.state;
          if (this.isContextual(125)) {
            if (super.parseClassMemberFromModifier(classBody, member))
              return;
            member.declare = !0;
          }
          super.parseClassMember(classBody, member, state), member.declare && (member.type !== "ClassProperty" && member.type !== "ClassPrivateProperty" && member.type !== "PropertyDefinition" ? this.raise(FlowErrors.DeclareClassElement, startLoc) : member.value && this.raise(FlowErrors.DeclareClassFieldInitializer, member.value));
        }
        isIterator(word) {
          return word === "iterator" || word === "asyncIterator";
        }
        readIterator() {
          let word = super.readWord1(), fullWord = "@@" + word;
          (!this.isIterator(word) || !this.state.inType) && this.raise(Errors.InvalidIdentifier, this.state.curPosition(), {
            identifierName: fullWord
          }), this.finishToken(132, fullWord);
        }
        getTokenFromCode(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          code2 === 123 && next === 124 ? this.finishOp(6, 2) : this.state.inType && (code2 === 62 || code2 === 60) ? this.finishOp(code2 === 62 ? 48 : 47, 1) : this.state.inType && code2 === 63 ? next === 46 ? this.finishOp(18, 2) : this.finishOp(17, 1) : isIteratorStart(code2, next, this.input.charCodeAt(this.state.pos + 2)) ? (this.state.pos += 2, this.readIterator()) : super.getTokenFromCode(code2);
        }
        isAssignable(node, isBinding) {
          return node.type === "TypeCastExpression" ? this.isAssignable(node.expression, isBinding) : super.isAssignable(node, isBinding);
        }
        toAssignable(node, isLHS = !1) {
          !isLHS && node.type === "AssignmentExpression" && node.left.type === "TypeCastExpression" && (node.left = this.typeCastToParameter(node.left)), super.toAssignable(node, isLHS);
        }
        toAssignableList(exprList, trailingCommaLoc, isLHS) {
          for (let i = 0; i < exprList.length; i++) {
            let expr = exprList[i];
            expr?.type === "TypeCastExpression" && (exprList[i] = this.typeCastToParameter(expr));
          }
          super.toAssignableList(exprList, trailingCommaLoc, isLHS);
        }
        toReferencedList(exprList, isParenthesizedExpr) {
          for (let i = 0; i < exprList.length; i++) {
            var _expr$extra;
            let expr = exprList[i];
            expr && expr.type === "TypeCastExpression" && !((_expr$extra = expr.extra) != null && _expr$extra.parenthesized) && (exprList.length > 1 || !isParenthesizedExpr) && this.raise(FlowErrors.TypeCastInPattern, expr.typeAnnotation);
          }
          return exprList;
        }
        parseArrayLike(close, isTuple, refExpressionErrors) {
          let node = super.parseArrayLike(close, isTuple, refExpressionErrors);
          return refExpressionErrors != null && !this.state.maybeInArrowParameters && this.toReferencedList(node.elements), node;
        }
        isValidLVal(type, disallowCallExpression, isParenthesized, binding) {
          return type === "TypeCastExpression" || super.isValidLVal(type, disallowCallExpression, isParenthesized, binding);
        }
        parseClassProperty(node) {
          return this.match(14) && (node.typeAnnotation = this.flowParseTypeAnnotation()), super.parseClassProperty(node);
        }
        parseClassPrivateProperty(node) {
          return this.match(14) && (node.typeAnnotation = this.flowParseTypeAnnotation()), super.parseClassPrivateProperty(node);
        }
        isClassMethod() {
          return this.match(47) || super.isClassMethod();
        }
        isClassProperty() {
          return this.match(14) || super.isClassProperty();
        }
        isNonstaticConstructor(method) {
          return !this.match(14) && super.isNonstaticConstructor(method);
        }
        pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
          if (method.variance && this.unexpected(method.variance.loc.start), delete method.variance, this.match(47) && (method.typeParameters = this.flowParseTypeParameterDeclaration()), super.pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper), method.params && isConstructor) {
            let params = method.params;
            params.length > 0 && this.isThisParam(params[0]) && this.raise(FlowErrors.ThisParamBannedInConstructor, method);
          } else if (method.type === "MethodDefinition" && isConstructor && method.value.params) {
            let params = method.value.params;
            params.length > 0 && this.isThisParam(params[0]) && this.raise(FlowErrors.ThisParamBannedInConstructor, method);
          }
        }
        pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
          method.variance && this.unexpected(method.variance.loc.start), delete method.variance, this.match(47) && (method.typeParameters = this.flowParseTypeParameterDeclaration()), super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
        }
        parseClassSuper(node) {
          if (super.parseClassSuper(node), node.superClass && (this.match(47) || this.match(51)) && (node.superTypeParameters = this.flowParseTypeParameterInstantiationInExpression()), this.isContextual(113)) {
            this.next();
            let implemented = node.implements = [];
            do {
              let node2 = this.startNode();
              node2.id = this.flowParseRestrictedIdentifier(!0), this.match(47) ? node2.typeParameters = this.flowParseTypeParameterInstantiation() : node2.typeParameters = null, implemented.push(this.finishNode(node2, "ClassImplements"));
            } while (this.eat(12));
          }
        }
        checkGetterSetterParams(method) {
          super.checkGetterSetterParams(method);
          let params = this.getObjectOrClassMethodParams(method);
          if (params.length > 0) {
            let param = params[0];
            this.isThisParam(param) && method.kind === "get" ? this.raise(FlowErrors.GetterMayNotHaveThisParam, param) : this.isThisParam(param) && this.raise(FlowErrors.SetterMayNotHaveThisParam, param);
          }
        }
        parsePropertyNamePrefixOperator(node) {
          node.variance = this.flowParseVariance();
        }
        parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
          prop.variance && this.unexpected(prop.variance.loc.start), delete prop.variance;
          let typeParameters;
          this.match(47) && !isAccessor && (typeParameters = this.flowParseTypeParameterDeclaration(), this.match(10) || this.unexpected());
          let result = super.parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors);
          return typeParameters && ((result.value || result).typeParameters = typeParameters), result;
        }
        parseFunctionParamType(param) {
          return this.eat(17) && (param.type !== "Identifier" && this.raise(FlowErrors.PatternIsOptional, param), this.isThisParam(param) && this.raise(FlowErrors.ThisParamMayNotBeOptional, param), param.optional = !0), this.match(14) ? param.typeAnnotation = this.flowParseTypeAnnotation() : this.isThisParam(param) && this.raise(FlowErrors.ThisParamAnnotationRequired, param), this.match(29) && this.isThisParam(param) && this.raise(FlowErrors.ThisParamNoDefault, param), this.resetEndLocation(param), param;
        }
        parseMaybeDefault(startLoc, left) {
          let node = super.parseMaybeDefault(startLoc, left);
          return node.type === "AssignmentPattern" && node.typeAnnotation && node.right.start < node.typeAnnotation.start && this.raise(FlowErrors.TypeBeforeInitializer, node.typeAnnotation), node;
        }
        checkImportReflection(node) {
          super.checkImportReflection(node), node.module && node.importKind !== "value" && this.raise(FlowErrors.ImportReflectionHasImportType, node.specifiers[0].loc.start);
        }
        parseImportSpecifierLocal(node, specifier, type) {
          specifier.local = hasTypeImportKind(node) ? this.flowParseRestrictedIdentifier(!0, !0) : this.parseIdentifier(), node.specifiers.push(this.finishImportSpecifier(specifier, type));
        }
        isPotentialImportPhase(isExport) {
          if (super.isPotentialImportPhase(isExport)) return !0;
          if (this.isContextual(130)) {
            if (!isExport) return !0;
            let ch = this.lookaheadCharCode();
            return ch === 123 || ch === 42;
          }
          return !isExport && this.isContextual(87);
        }
        applyImportPhase(node, isExport, phase, loc) {
          if (super.applyImportPhase(node, isExport, phase, loc), isExport) {
            if (!phase && this.match(65))
              return;
            node.exportKind = phase === "type" ? phase : "value";
          } else
            phase === "type" && this.match(55) && this.unexpected(), node.importKind = phase === "type" || phase === "typeof" ? phase : "value";
        }
        parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
          let firstIdent = specifier.imported, specifierTypeKind = null;
          firstIdent.type === "Identifier" && (firstIdent.name === "type" ? specifierTypeKind = "type" : firstIdent.name === "typeof" && (specifierTypeKind = "typeof"));
          let isBinding = !1;
          if (this.isContextual(93) && !this.isLookaheadContextual("as")) {
            let as_ident = this.parseIdentifier(!0);
            specifierTypeKind !== null && !tokenIsKeywordOrIdentifier(this.state.type) ? (specifier.imported = as_ident, specifier.importKind = specifierTypeKind, specifier.local = this.cloneIdentifier(as_ident)) : (specifier.imported = firstIdent, specifier.importKind = null, specifier.local = this.parseIdentifier());
          } else {
            if (specifierTypeKind !== null && tokenIsKeywordOrIdentifier(this.state.type))
              specifier.imported = this.parseIdentifier(!0), specifier.importKind = specifierTypeKind;
            else {
              if (importedIsString)
                throw this.raise(Errors.ImportBindingIsString, specifier, {
                  importName: firstIdent.value
                });
              specifier.imported = firstIdent, specifier.importKind = null;
            }
            this.eatContextual(93) ? specifier.local = this.parseIdentifier() : (isBinding = !0, specifier.local = this.cloneIdentifier(specifier.imported));
          }
          let specifierIsTypeImport = hasTypeImportKind(specifier);
          return isInTypeOnlyImport && specifierIsTypeImport && this.raise(FlowErrors.ImportTypeShorthandOnlyInPureImport, specifier), (isInTypeOnlyImport || specifierIsTypeImport) && this.checkReservedType(specifier.local.name, specifier.local.loc.start, !0), isBinding && !isInTypeOnlyImport && !specifierIsTypeImport && this.checkReservedWord(specifier.local.name, specifier.loc.start, !0, !0), this.finishImportSpecifier(specifier, "ImportSpecifier");
        }
        parseBindingAtom() {
          return this.state.type === 78 ? this.parseIdentifier(!0) : super.parseBindingAtom();
        }
        parseFunctionParams(node, isConstructor) {
          let kind = node.kind;
          kind !== "get" && kind !== "set" && this.match(47) && (node.typeParameters = this.flowParseTypeParameterDeclaration()), super.parseFunctionParams(node, isConstructor);
        }
        parseVarId(decl, kind) {
          super.parseVarId(decl, kind), this.match(14) && (decl.id.typeAnnotation = this.flowParseTypeAnnotation(), this.resetEndLocation(decl.id));
        }
        parseAsyncArrowFromCallExpression(node, call) {
          if (this.match(14)) {
            let oldNoAnonFunctionType = this.state.noAnonFunctionType;
            this.state.noAnonFunctionType = !0, node.returnType = this.flowParseTypeAnnotation(), this.state.noAnonFunctionType = oldNoAnonFunctionType;
          }
          return super.parseAsyncArrowFromCallExpression(node, call);
        }
        shouldParseAsyncArrow() {
          return this.match(14) || super.shouldParseAsyncArrow();
        }
        parseMaybeAssign(refExpressionErrors, afterLeftParse) {
          var _jsx;
          let state = null, jsx2;
          if (this.hasPlugin("jsx") && (this.match(143) || this.match(47))) {
            if (state = this.state.clone(), jsx2 = this.tryParse(() => super.parseMaybeAssign(refExpressionErrors, afterLeftParse), state), !jsx2.error) return jsx2.node;
            let {
              context
            } = this.state, currentContext = context[context.length - 1];
            (currentContext === types.j_oTag || currentContext === types.j_expr) && context.pop();
          }
          if ((_jsx = jsx2) != null && _jsx.error || this.match(47)) {
            var _jsx2, _jsx3;
            state = state || this.state.clone();
            let typeParameters, arrow = this.tryParse((abort) => {
              var _arrowExpression$extr;
              typeParameters = this.flowParseTypeParameterDeclaration();
              let arrowExpression2 = this.forwardNoArrowParamsConversionAt(typeParameters, () => {
                let result = super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
                return this.resetStartLocationFromNode(result, typeParameters), result;
              });
              (_arrowExpression$extr = arrowExpression2.extra) != null && _arrowExpression$extr.parenthesized && abort();
              let expr = this.maybeUnwrapTypeCastExpression(arrowExpression2);
              return expr.type !== "ArrowFunctionExpression" && abort(), expr.typeParameters = typeParameters, this.resetStartLocationFromNode(expr, typeParameters), arrowExpression2;
            }, state), arrowExpression = null;
            if (arrow.node && this.maybeUnwrapTypeCastExpression(arrow.node).type === "ArrowFunctionExpression") {
              if (!arrow.error && !arrow.aborted)
                return arrow.node.async && this.raise(FlowErrors.UnexpectedTypeParameterBeforeAsyncArrowFunction, typeParameters), arrow.node;
              arrowExpression = arrow.node;
            }
            if ((_jsx2 = jsx2) != null && _jsx2.node)
              return this.state = jsx2.failState, jsx2.node;
            if (arrowExpression)
              return this.state = arrow.failState, arrowExpression;
            throw (_jsx3 = jsx2) != null && _jsx3.thrown ? jsx2.error : arrow.thrown ? arrow.error : this.raise(FlowErrors.UnexpectedTokenAfterTypeParameter, typeParameters);
          }
          return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
        }
        parseArrow(node) {
          if (this.match(14)) {
            let result = this.tryParse(() => {
              let oldNoAnonFunctionType = this.state.noAnonFunctionType;
              this.state.noAnonFunctionType = !0;
              let typeNode = this.startNode();
              return [typeNode.typeAnnotation, node.predicate] = this.flowParseTypeAndPredicateInitialiser(), this.state.noAnonFunctionType = oldNoAnonFunctionType, this.canInsertSemicolon() && this.unexpected(), this.match(19) || this.unexpected(), typeNode;
            });
            if (result.thrown) return null;
            result.error && (this.state = result.failState), node.returnType = result.node.typeAnnotation ? this.finishNode(result.node, "TypeAnnotation") : null;
          }
          return super.parseArrow(node);
        }
        shouldParseArrow(params) {
          return this.match(14) || super.shouldParseArrow(params);
        }
        setArrowFunctionParameters(node, params) {
          this.state.noArrowParamsConversionAt.includes(this.offsetToSourcePos(node.start)) ? node.params = params : super.setArrowFunctionParameters(node, params);
        }
        checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged = !0) {
          if (!(isArrowFunction && this.state.noArrowParamsConversionAt.includes(this.offsetToSourcePos(node.start)))) {
            for (let i = 0; i < node.params.length; i++)
              this.isThisParam(node.params[i]) && i > 0 && this.raise(FlowErrors.ThisParamMustBeFirst, node.params[i]);
            super.checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged);
          }
        }
        parseParenAndDistinguishExpression(canBeArrow) {
          return super.parseParenAndDistinguishExpression(canBeArrow && !this.state.noArrowAt.includes(this.sourceToOffsetPos(this.state.start)));
        }
        parseSubscripts(base, startLoc, noCalls) {
          if (base.type === "Identifier" && base.name === "async" && this.state.noArrowAt.includes(startLoc.index)) {
            this.next();
            let node = this.startNodeAt(startLoc);
            node.callee = base, node.arguments = super.parseCallExpressionArguments(), base = this.finishNode(node, "CallExpression");
          } else if (base.type === "Identifier" && base.name === "async" && this.match(47)) {
            let state = this.state.clone(), arrow = this.tryParse((abort) => this.parseAsyncArrowWithTypeParameters(startLoc) || abort(), state);
            if (!arrow.error && !arrow.aborted) return arrow.node;
            let result = this.tryParse(() => super.parseSubscripts(base, startLoc, noCalls), state);
            if (result.node && !result.error) return result.node;
            if (arrow.node)
              return this.state = arrow.failState, arrow.node;
            if (result.node)
              return this.state = result.failState, result.node;
            throw arrow.error || result.error;
          }
          return super.parseSubscripts(base, startLoc, noCalls);
        }
        parseSubscript(base, startLoc, noCalls, subscriptState) {
          if (this.match(18) && this.isLookaheadToken_lt()) {
            if (subscriptState.optionalChainMember = !0, noCalls)
              return subscriptState.stop = !0, base;
            this.next();
            let node = this.startNodeAt(startLoc);
            return node.callee = base, node.typeArguments = this.flowParseTypeParameterInstantiationInExpression(), this.expect(10), node.arguments = this.parseCallExpressionArguments(), node.optional = !0, this.finishCallExpression(node, !0);
          } else if (!noCalls && this.shouldParseTypes() && (this.match(47) || this.match(51))) {
            let node = this.startNodeAt(startLoc);
            node.callee = base;
            let result = this.tryParse(() => (node.typeArguments = this.flowParseTypeParameterInstantiationCallOrNew(), this.expect(10), node.arguments = super.parseCallExpressionArguments(), subscriptState.optionalChainMember && (node.optional = !1), this.finishCallExpression(node, subscriptState.optionalChainMember)));
            if (result.node)
              return result.error && (this.state = result.failState), result.node;
          }
          return super.parseSubscript(base, startLoc, noCalls, subscriptState);
        }
        parseNewCallee(node) {
          super.parseNewCallee(node);
          let targs = null;
          this.shouldParseTypes() && this.match(47) && (targs = this.tryParse(() => this.flowParseTypeParameterInstantiationCallOrNew()).node), node.typeArguments = targs;
        }
        parseAsyncArrowWithTypeParameters(startLoc) {
          let node = this.startNodeAt(startLoc);
          if (this.parseFunctionParams(node, !1), !!this.parseArrow(node))
            return super.parseArrowExpression(node, void 0, !0);
        }
        readToken_mult_modulo(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (code2 === 42 && next === 47 && this.state.hasFlowComment) {
            this.state.hasFlowComment = !1, this.state.pos += 2, this.nextToken();
            return;
          }
          super.readToken_mult_modulo(code2);
        }
        readToken_pipe_amp(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (code2 === 124 && next === 125) {
            this.finishOp(9, 2);
            return;
          }
          super.readToken_pipe_amp(code2);
        }
        parseTopLevel(file, program) {
          let fileNode = super.parseTopLevel(file, program);
          return this.state.hasFlowComment && this.raise(FlowErrors.UnterminatedFlowComment, this.state.curPosition()), fileNode;
        }
        skipBlockComment() {
          if (this.hasPlugin("flowComments") && this.skipFlowComment()) {
            if (this.state.hasFlowComment)
              throw this.raise(FlowErrors.NestedFlowComment, this.state.startLoc);
            this.hasFlowCommentCompletion();
            let commentSkip = this.skipFlowComment();
            commentSkip && (this.state.pos += commentSkip, this.state.hasFlowComment = !0);
            return;
          }
          return super.skipBlockComment(this.state.hasFlowComment ? "*-/" : "*/");
        }
        skipFlowComment() {
          let {
            pos
          } = this.state, shiftToFirstNonWhiteSpace = 2;
          for (; [32, 9].includes(this.input.charCodeAt(pos + shiftToFirstNonWhiteSpace)); )
            shiftToFirstNonWhiteSpace++;
          let ch2 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos), ch3 = this.input.charCodeAt(shiftToFirstNonWhiteSpace + pos + 1);
          return ch2 === 58 && ch3 === 58 ? shiftToFirstNonWhiteSpace + 2 : this.input.slice(shiftToFirstNonWhiteSpace + pos, shiftToFirstNonWhiteSpace + pos + 12) === "flow-include" ? shiftToFirstNonWhiteSpace + 12 : ch2 === 58 && ch3 !== 58 ? shiftToFirstNonWhiteSpace : !1;
        }
        hasFlowCommentCompletion() {
          if (this.input.indexOf("*/", this.state.pos) === -1)
            throw this.raise(Errors.UnterminatedComment, this.state.curPosition());
        }
        flowEnumErrorBooleanMemberNotInitialized(loc, {
          enumName,
          memberName
        }) {
          this.raise(FlowErrors.EnumBooleanMemberNotInitialized, loc, {
            memberName,
            enumName
          });
        }
        flowEnumErrorInvalidMemberInitializer(loc, enumContext) {
          return this.raise(enumContext.explicitType ? enumContext.explicitType === "symbol" ? FlowErrors.EnumInvalidMemberInitializerSymbolType : FlowErrors.EnumInvalidMemberInitializerPrimaryType : FlowErrors.EnumInvalidMemberInitializerUnknownType, loc, enumContext);
        }
        flowEnumErrorNumberMemberNotInitialized(loc, details) {
          this.raise(FlowErrors.EnumNumberMemberNotInitialized, loc, details);
        }
        flowEnumErrorStringMemberInconsistentlyInitialized(node, details) {
          this.raise(FlowErrors.EnumStringMemberInconsistentlyInitialized, node, details);
        }
        flowEnumMemberInit() {
          let startLoc = this.state.startLoc, endOfInit = () => this.match(12) || this.match(8);
          switch (this.state.type) {
            case 135: {
              let literal = this.parseNumericLiteral(this.state.value);
              return endOfInit() ? {
                type: "number",
                loc: literal.loc.start,
                value: literal
              } : {
                type: "invalid",
                loc: startLoc
              };
            }
            case 134: {
              let literal = this.parseStringLiteral(this.state.value);
              return endOfInit() ? {
                type: "string",
                loc: literal.loc.start,
                value: literal
              } : {
                type: "invalid",
                loc: startLoc
              };
            }
            case 85:
            case 86: {
              let literal = this.parseBooleanLiteral(this.match(85));
              return endOfInit() ? {
                type: "boolean",
                loc: literal.loc.start,
                value: literal
              } : {
                type: "invalid",
                loc: startLoc
              };
            }
            default:
              return {
                type: "invalid",
                loc: startLoc
              };
          }
        }
        flowEnumMemberRaw() {
          let loc = this.state.startLoc, id = this.parseIdentifier(!0), init = this.eat(29) ? this.flowEnumMemberInit() : {
            type: "none",
            loc
          };
          return {
            id,
            init
          };
        }
        flowEnumCheckExplicitTypeMismatch(loc, context, expectedType) {
          let {
            explicitType
          } = context;
          explicitType !== null && explicitType !== expectedType && this.flowEnumErrorInvalidMemberInitializer(loc, context);
        }
        flowEnumMembers({
          enumName,
          explicitType
        }) {
          let seenNames = /* @__PURE__ */ new Set(), members = {
            booleanMembers: [],
            numberMembers: [],
            stringMembers: [],
            defaultedMembers: []
          }, hasUnknownMembers = !1;
          for (; !this.match(8); ) {
            if (this.eat(21)) {
              hasUnknownMembers = !0;
              break;
            }
            let memberNode = this.startNode(), {
              id,
              init
            } = this.flowEnumMemberRaw(), memberName = id.name;
            if (memberName === "")
              continue;
            /^[a-z]/.test(memberName) && this.raise(FlowErrors.EnumInvalidMemberName, id, {
              memberName,
              suggestion: memberName[0].toUpperCase() + memberName.slice(1),
              enumName
            }), seenNames.has(memberName) && this.raise(FlowErrors.EnumDuplicateMemberName, id, {
              memberName,
              enumName
            }), seenNames.add(memberName);
            let context = {
              enumName,
              explicitType,
              memberName
            };
            switch (memberNode.id = id, init.type) {
              case "boolean": {
                this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "boolean"), memberNode.init = init.value, members.booleanMembers.push(this.finishNode(memberNode, "EnumBooleanMember"));
                break;
              }
              case "number": {
                this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "number"), memberNode.init = init.value, members.numberMembers.push(this.finishNode(memberNode, "EnumNumberMember"));
                break;
              }
              case "string": {
                this.flowEnumCheckExplicitTypeMismatch(init.loc, context, "string"), memberNode.init = init.value, members.stringMembers.push(this.finishNode(memberNode, "EnumStringMember"));
                break;
              }
              case "invalid":
                throw this.flowEnumErrorInvalidMemberInitializer(init.loc, context);
              case "none":
                switch (explicitType) {
                  case "boolean":
                    this.flowEnumErrorBooleanMemberNotInitialized(init.loc, context);
                    break;
                  case "number":
                    this.flowEnumErrorNumberMemberNotInitialized(init.loc, context);
                    break;
                  default:
                    members.defaultedMembers.push(this.finishNode(memberNode, "EnumDefaultedMember"));
                }
            }
            this.match(8) || this.expect(12);
          }
          return {
            members,
            hasUnknownMembers
          };
        }
        flowEnumStringMembers(initializedMembers, defaultedMembers, {
          enumName
        }) {
          if (initializedMembers.length === 0)
            return defaultedMembers;
          if (defaultedMembers.length === 0)
            return initializedMembers;
          if (defaultedMembers.length > initializedMembers.length) {
            for (let member of initializedMembers)
              this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
                enumName
              });
            return defaultedMembers;
          } else {
            for (let member of defaultedMembers)
              this.flowEnumErrorStringMemberInconsistentlyInitialized(member, {
                enumName
              });
            return initializedMembers;
          }
        }
        flowEnumParseExplicitType({
          enumName
        }) {
          if (!this.eatContextual(102)) return null;
          if (!tokenIsIdentifier(this.state.type))
            throw this.raise(FlowErrors.EnumInvalidExplicitTypeUnknownSupplied, this.state.startLoc, {
              enumName
            });
          let {
            value
          } = this.state;
          return this.next(), value !== "boolean" && value !== "number" && value !== "string" && value !== "symbol" && this.raise(FlowErrors.EnumInvalidExplicitType, this.state.startLoc, {
            enumName,
            invalidEnumType: value
          }), value;
        }
        flowEnumBody(node, id) {
          let enumName = id.name, nameLoc = id.loc.start, explicitType = this.flowEnumParseExplicitType({
            enumName
          });
          this.expect(5);
          let {
            members,
            hasUnknownMembers
          } = this.flowEnumMembers({
            enumName,
            explicitType
          });
          switch (node.hasUnknownMembers = hasUnknownMembers, explicitType) {
            case "boolean":
              return node.explicitType = !0, node.members = members.booleanMembers, this.expect(8), this.finishNode(node, "EnumBooleanBody");
            case "number":
              return node.explicitType = !0, node.members = members.numberMembers, this.expect(8), this.finishNode(node, "EnumNumberBody");
            case "string":
              return node.explicitType = !0, node.members = this.flowEnumStringMembers(members.stringMembers, members.defaultedMembers, {
                enumName
              }), this.expect(8), this.finishNode(node, "EnumStringBody");
            case "symbol":
              return node.members = members.defaultedMembers, this.expect(8), this.finishNode(node, "EnumSymbolBody");
            default: {
              let empty = () => (node.members = [], this.expect(8), this.finishNode(node, "EnumStringBody"));
              node.explicitType = !1;
              let boolsLen = members.booleanMembers.length, numsLen = members.numberMembers.length, strsLen = members.stringMembers.length, defaultedLen = members.defaultedMembers.length;
              if (!boolsLen && !numsLen && !strsLen && !defaultedLen)
                return empty();
              if (!boolsLen && !numsLen)
                return node.members = this.flowEnumStringMembers(members.stringMembers, members.defaultedMembers, {
                  enumName
                }), this.expect(8), this.finishNode(node, "EnumStringBody");
              if (!numsLen && !strsLen && boolsLen >= defaultedLen) {
                for (let member of members.defaultedMembers)
                  this.flowEnumErrorBooleanMemberNotInitialized(member.loc.start, {
                    enumName,
                    memberName: member.id.name
                  });
                return node.members = members.booleanMembers, this.expect(8), this.finishNode(node, "EnumBooleanBody");
              } else if (!boolsLen && !strsLen && numsLen >= defaultedLen) {
                for (let member of members.defaultedMembers)
                  this.flowEnumErrorNumberMemberNotInitialized(member.loc.start, {
                    enumName,
                    memberName: member.id.name
                  });
                return node.members = members.numberMembers, this.expect(8), this.finishNode(node, "EnumNumberBody");
              } else
                return this.raise(FlowErrors.EnumInconsistentMemberValues, nameLoc, {
                  enumName
                }), empty();
            }
          }
        }
        flowParseEnumDeclaration(node) {
          let id = this.parseIdentifier();
          return node.id = id, node.body = this.flowEnumBody(this.startNode(), id), this.finishNode(node, "EnumDeclaration");
        }
        jsxParseOpeningElementAfterName(node) {
          return this.shouldParseTypes() && (this.match(47) || this.match(51)) && (node.typeArguments = this.flowParseTypeParameterInstantiationInExpression()), super.jsxParseOpeningElementAfterName(node);
        }
        isLookaheadToken_lt() {
          let next = this.nextTokenStart();
          if (this.input.charCodeAt(next) === 60) {
            let afterNext = this.input.charCodeAt(next + 1);
            return afterNext !== 60 && afterNext !== 61;
          }
          return !1;
        }
        reScan_lt_gt() {
          let {
            type
          } = this.state;
          type === 47 ? (this.state.pos -= 1, this.readToken_lt()) : type === 48 && (this.state.pos -= 1, this.readToken_gt());
        }
        reScan_lt() {
          let {
            type
          } = this.state;
          return type === 51 ? (this.state.pos -= 2, this.finishOp(47, 1), 47) : type;
        }
        maybeUnwrapTypeCastExpression(node) {
          return node.type === "TypeCastExpression" ? node.expression : node;
        }
      }, entities = {
        __proto__: null,
        quot: '"',
        amp: "&",
        apos: "'",
        lt: "<",
        gt: ">",
        nbsp: " ",
        iexcl: "¡",
        cent: "¢",
        pound: "£",
        curren: "¤",
        yen: "¥",
        brvbar: "¦",
        sect: "§",
        uml: "¨",
        copy: "©",
        ordf: "ª",
        laquo: "«",
        not: "¬",
        shy: "­",
        reg: "®",
        macr: "¯",
        deg: "°",
        plusmn: "±",
        sup2: "²",
        sup3: "³",
        acute: "´",
        micro: "µ",
        para: "¶",
        middot: "·",
        cedil: "¸",
        sup1: "¹",
        ordm: "º",
        raquo: "»",
        frac14: "¼",
        frac12: "½",
        frac34: "¾",
        iquest: "¿",
        Agrave: "À",
        Aacute: "Á",
        Acirc: "Â",
        Atilde: "Ã",
        Auml: "Ä",
        Aring: "Å",
        AElig: "Æ",
        Ccedil: "Ç",
        Egrave: "È",
        Eacute: "É",
        Ecirc: "Ê",
        Euml: "Ë",
        Igrave: "Ì",
        Iacute: "Í",
        Icirc: "Î",
        Iuml: "Ï",
        ETH: "Ð",
        Ntilde: "Ñ",
        Ograve: "Ò",
        Oacute: "Ó",
        Ocirc: "Ô",
        Otilde: "Õ",
        Ouml: "Ö",
        times: "×",
        Oslash: "Ø",
        Ugrave: "Ù",
        Uacute: "Ú",
        Ucirc: "Û",
        Uuml: "Ü",
        Yacute: "Ý",
        THORN: "Þ",
        szlig: "ß",
        agrave: "à",
        aacute: "á",
        acirc: "â",
        atilde: "ã",
        auml: "ä",
        aring: "å",
        aelig: "æ",
        ccedil: "ç",
        egrave: "è",
        eacute: "é",
        ecirc: "ê",
        euml: "ë",
        igrave: "ì",
        iacute: "í",
        icirc: "î",
        iuml: "ï",
        eth: "ð",
        ntilde: "ñ",
        ograve: "ò",
        oacute: "ó",
        ocirc: "ô",
        otilde: "õ",
        ouml: "ö",
        divide: "÷",
        oslash: "ø",
        ugrave: "ù",
        uacute: "ú",
        ucirc: "û",
        uuml: "ü",
        yacute: "ý",
        thorn: "þ",
        yuml: "ÿ",
        OElig: "Œ",
        oelig: "œ",
        Scaron: "Š",
        scaron: "š",
        Yuml: "Ÿ",
        fnof: "ƒ",
        circ: "ˆ",
        tilde: "˜",
        Alpha: "Α",
        Beta: "Β",
        Gamma: "Γ",
        Delta: "Δ",
        Epsilon: "Ε",
        Zeta: "Ζ",
        Eta: "Η",
        Theta: "Θ",
        Iota: "Ι",
        Kappa: "Κ",
        Lambda: "Λ",
        Mu: "Μ",
        Nu: "Ν",
        Xi: "Ξ",
        Omicron: "Ο",
        Pi: "Π",
        Rho: "Ρ",
        Sigma: "Σ",
        Tau: "Τ",
        Upsilon: "Υ",
        Phi: "Φ",
        Chi: "Χ",
        Psi: "Ψ",
        Omega: "Ω",
        alpha: "α",
        beta: "β",
        gamma: "γ",
        delta: "δ",
        epsilon: "ε",
        zeta: "ζ",
        eta: "η",
        theta: "θ",
        iota: "ι",
        kappa: "κ",
        lambda: "λ",
        mu: "μ",
        nu: "ν",
        xi: "ξ",
        omicron: "ο",
        pi: "π",
        rho: "ρ",
        sigmaf: "ς",
        sigma: "σ",
        tau: "τ",
        upsilon: "υ",
        phi: "φ",
        chi: "χ",
        psi: "ψ",
        omega: "ω",
        thetasym: "ϑ",
        upsih: "ϒ",
        piv: "ϖ",
        ensp: " ",
        emsp: " ",
        thinsp: " ",
        zwnj: "‌",
        zwj: "‍",
        lrm: "‎",
        rlm: "‏",
        ndash: "–",
        mdash: "—",
        lsquo: "‘",
        rsquo: "’",
        sbquo: "‚",
        ldquo: "“",
        rdquo: "”",
        bdquo: "„",
        dagger: "†",
        Dagger: "‡",
        bull: "•",
        hellip: "…",
        permil: "‰",
        prime: "′",
        Prime: "″",
        lsaquo: "‹",
        rsaquo: "›",
        oline: "‾",
        frasl: "⁄",
        euro: "€",
        image: "ℑ",
        weierp: "℘",
        real: "ℜ",
        trade: "™",
        alefsym: "ℵ",
        larr: "←",
        uarr: "↑",
        rarr: "→",
        darr: "↓",
        harr: "↔",
        crarr: "↵",
        lArr: "⇐",
        uArr: "⇑",
        rArr: "⇒",
        dArr: "⇓",
        hArr: "⇔",
        forall: "∀",
        part: "∂",
        exist: "∃",
        empty: "∅",
        nabla: "∇",
        isin: "∈",
        notin: "∉",
        ni: "∋",
        prod: "∏",
        sum: "∑",
        minus: "−",
        lowast: "∗",
        radic: "√",
        prop: "∝",
        infin: "∞",
        ang: "∠",
        and: "∧",
        or: "∨",
        cap: "∩",
        cup: "∪",
        int: "∫",
        there4: "∴",
        sim: "∼",
        cong: "≅",
        asymp: "≈",
        ne: "≠",
        equiv: "≡",
        le: "≤",
        ge: "≥",
        sub: "⊂",
        sup: "⊃",
        nsub: "⊄",
        sube: "⊆",
        supe: "⊇",
        oplus: "⊕",
        otimes: "⊗",
        perp: "⊥",
        sdot: "⋅",
        lceil: "⌈",
        rceil: "⌉",
        lfloor: "⌊",
        rfloor: "⌋",
        lang: "〈",
        rang: "〉",
        loz: "◊",
        spades: "♠",
        clubs: "♣",
        hearts: "♥",
        diams: "♦"
      }, lineBreak = /\r\n|[\r\n\u2028\u2029]/, lineBreakG = new RegExp(lineBreak.source, "g");
      function isNewLine(code2) {
        switch (code2) {
          case 10:
          case 13:
          case 8232:
          case 8233:
            return !0;
          default:
            return !1;
        }
      }
      function hasNewLine(input, start, end) {
        for (let i = start; i < end; i++)
          if (isNewLine(input.charCodeAt(i)))
            return !0;
        return !1;
      }
      var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g, skipWhiteSpaceInLine = /(?:[^\S\n\r\u2028\u2029]|\/\/.*|\/\*.*?\*\/)*/g;
      function isWhitespace(code2) {
        switch (code2) {
          case 9:
          case 11:
          case 12:
          case 32:
          case 160:
          case 5760:
          case 8192:
          case 8193:
          case 8194:
          case 8195:
          case 8196:
          case 8197:
          case 8198:
          case 8199:
          case 8200:
          case 8201:
          case 8202:
          case 8239:
          case 8287:
          case 12288:
          case 65279:
            return !0;
          default:
            return !1;
        }
      }
      var JsxErrors = ParseErrorEnum`jsx`({
        AttributeIsEmpty: "JSX attributes must only be assigned a non-empty expression.",
        MissingClosingTagElement: ({
          openingTagName
        }) => `Expected corresponding JSX closing tag for <${openingTagName}>.`,
        MissingClosingTagFragment: "Expected corresponding JSX closing tag for <>.",
        UnexpectedSequenceExpression: "Sequence expressions cannot be directly nested inside JSX. Did you mean to wrap it in parentheses (...)?",
        UnexpectedToken: ({
          unexpected,
          HTMLEntity
        }) => `Unexpected token \`${unexpected}\`. Did you mean \`${HTMLEntity}\` or \`{'${unexpected}'}\`?`,
        UnsupportedJsxValue: "JSX value should be either an expression or a quoted JSX text.",
        UnterminatedJsxContent: "Unterminated JSX contents.",
        UnwrappedAdjacentJSXElements: "Adjacent JSX elements must be wrapped in an enclosing tag. Did you want a JSX fragment <>...</>?"
      });
      function isFragment(object) {
        return object ? object.type === "JSXOpeningFragment" || object.type === "JSXClosingFragment" : !1;
      }
      function getQualifiedJSXName(object) {
        if (object.type === "JSXIdentifier")
          return object.name;
        if (object.type === "JSXNamespacedName")
          return object.namespace.name + ":" + object.name.name;
        if (object.type === "JSXMemberExpression")
          return getQualifiedJSXName(object.object) + "." + getQualifiedJSXName(object.property);
        throw new Error("Node had unexpected type: " + object.type);
      }
      var jsx = (superClass) => class extends superClass {
        jsxReadToken() {
          let out = "", chunkStart = this.state.pos;
          for (; ; ) {
            if (this.state.pos >= this.length)
              throw this.raise(JsxErrors.UnterminatedJsxContent, this.state.startLoc);
            let ch = this.input.charCodeAt(this.state.pos);
            switch (ch) {
              case 60:
              case 123:
                if (this.state.pos === this.state.start) {
                  ch === 60 && this.state.canStartJSXElement ? (++this.state.pos, this.finishToken(143)) : super.getTokenFromCode(ch);
                  return;
                }
                out += this.input.slice(chunkStart, this.state.pos), this.finishToken(142, out);
                return;
              case 38:
                out += this.input.slice(chunkStart, this.state.pos), out += this.jsxReadEntity(), chunkStart = this.state.pos;
                break;
              default:
                isNewLine(ch) ? (out += this.input.slice(chunkStart, this.state.pos), out += this.jsxReadNewLine(!0), chunkStart = this.state.pos) : ++this.state.pos;
            }
          }
        }
        jsxReadNewLine(normalizeCRLF) {
          let ch = this.input.charCodeAt(this.state.pos), out;
          return ++this.state.pos, ch === 13 && this.input.charCodeAt(this.state.pos) === 10 ? (++this.state.pos, out = normalizeCRLF ? `
` : `\r
`) : out = String.fromCharCode(ch), ++this.state.curLine, this.state.lineStart = this.state.pos, out;
        }
        jsxReadString(quote) {
          let out = "", chunkStart = ++this.state.pos;
          for (; ; ) {
            if (this.state.pos >= this.length)
              throw this.raise(Errors.UnterminatedString, this.state.startLoc);
            let ch = this.input.charCodeAt(this.state.pos);
            if (ch === quote) break;
            ch === 38 ? (out += this.input.slice(chunkStart, this.state.pos), out += this.jsxReadEntity(), chunkStart = this.state.pos) : isNewLine(ch) ? (out += this.input.slice(chunkStart, this.state.pos), out += this.jsxReadNewLine(!1), chunkStart = this.state.pos) : ++this.state.pos;
          }
          out += this.input.slice(chunkStart, this.state.pos++), this.finishToken(134, out);
        }
        jsxReadEntity() {
          let startPos = ++this.state.pos;
          if (this.codePointAtPos(this.state.pos) === 35) {
            ++this.state.pos;
            let radix = 10;
            this.codePointAtPos(this.state.pos) === 120 && (radix = 16, ++this.state.pos);
            let codePoint = this.readInt(radix, void 0, !1, "bail");
            if (codePoint !== null && this.codePointAtPos(this.state.pos) === 59)
              return ++this.state.pos, String.fromCodePoint(codePoint);
          } else {
            let count = 0, semi = !1;
            for (; count++ < 10 && this.state.pos < this.length && !(semi = this.codePointAtPos(this.state.pos) === 59); )
              ++this.state.pos;
            if (semi) {
              let desc = this.input.slice(startPos, this.state.pos), entity = entities[desc];
              if (++this.state.pos, entity)
                return entity;
            }
          }
          return this.state.pos = startPos, "&";
        }
        jsxReadWord() {
          let ch, start = this.state.pos;
          do
            ch = this.input.charCodeAt(++this.state.pos);
          while (isIdentifierChar(ch) || ch === 45);
          this.finishToken(141, this.input.slice(start, this.state.pos));
        }
        jsxParseIdentifier() {
          let node = this.startNode();
          return this.match(141) ? node.name = this.state.value : tokenIsKeyword(this.state.type) ? node.name = tokenLabelName(this.state.type) : this.unexpected(), this.next(), this.finishNode(node, "JSXIdentifier");
        }
        jsxParseNamespacedName() {
          let startLoc = this.state.startLoc, name = this.jsxParseIdentifier();
          if (!this.eat(14)) return name;
          let node = this.startNodeAt(startLoc);
          return node.namespace = name, node.name = this.jsxParseIdentifier(), this.finishNode(node, "JSXNamespacedName");
        }
        jsxParseElementName() {
          let startLoc = this.state.startLoc, node = this.jsxParseNamespacedName();
          if (node.type === "JSXNamespacedName")
            return node;
          for (; this.eat(16); ) {
            let newNode = this.startNodeAt(startLoc);
            newNode.object = node, newNode.property = this.jsxParseIdentifier(), node = this.finishNode(newNode, "JSXMemberExpression");
          }
          return node;
        }
        jsxParseAttributeValue() {
          let node;
          switch (this.state.type) {
            case 5:
              return node = this.startNode(), this.setContext(types.brace), this.next(), node = this.jsxParseExpressionContainer(node, types.j_oTag), node.expression.type === "JSXEmptyExpression" && this.raise(JsxErrors.AttributeIsEmpty, node), node;
            case 143:
            case 134:
              return this.parseExprAtom();
            default:
              throw this.raise(JsxErrors.UnsupportedJsxValue, this.state.startLoc);
          }
        }
        jsxParseEmptyExpression() {
          let node = this.startNodeAt(this.state.lastTokEndLoc);
          return this.finishNodeAt(node, "JSXEmptyExpression", this.state.startLoc);
        }
        jsxParseSpreadChild(node) {
          return this.next(), node.expression = this.parseExpression(), this.setContext(types.j_expr), this.state.canStartJSXElement = !0, this.expect(8), this.finishNode(node, "JSXSpreadChild");
        }
        jsxParseExpressionContainer(node, previousContext) {
          if (this.match(8))
            node.expression = this.jsxParseEmptyExpression();
          else {
            let expression = this.parseExpression();
            node.expression = expression;
          }
          return this.setContext(previousContext), this.state.canStartJSXElement = !0, this.expect(8), this.finishNode(node, "JSXExpressionContainer");
        }
        jsxParseAttribute() {
          let node = this.startNode();
          return this.match(5) ? (this.setContext(types.brace), this.next(), this.expect(21), node.argument = this.parseMaybeAssignAllowIn(), this.setContext(types.j_oTag), this.state.canStartJSXElement = !0, this.expect(8), this.finishNode(node, "JSXSpreadAttribute")) : (node.name = this.jsxParseNamespacedName(), node.value = this.eat(29) ? this.jsxParseAttributeValue() : null, this.finishNode(node, "JSXAttribute"));
        }
        jsxParseOpeningElementAt(startLoc) {
          let node = this.startNodeAt(startLoc);
          return this.eat(144) ? this.finishNode(node, "JSXOpeningFragment") : (node.name = this.jsxParseElementName(), this.jsxParseOpeningElementAfterName(node));
        }
        jsxParseOpeningElementAfterName(node) {
          let attributes = [];
          for (; !this.match(56) && !this.match(144); )
            attributes.push(this.jsxParseAttribute());
          return node.attributes = attributes, node.selfClosing = this.eat(56), this.expect(144), this.finishNode(node, "JSXOpeningElement");
        }
        jsxParseClosingElementAt(startLoc) {
          let node = this.startNodeAt(startLoc);
          return this.eat(144) ? this.finishNode(node, "JSXClosingFragment") : (node.name = this.jsxParseElementName(), this.expect(144), this.finishNode(node, "JSXClosingElement"));
        }
        jsxParseElementAt(startLoc) {
          let node = this.startNodeAt(startLoc), children = [], openingElement = this.jsxParseOpeningElementAt(startLoc), closingElement = null;
          if (!openingElement.selfClosing) {
            contents: for (; ; )
              switch (this.state.type) {
                case 143:
                  if (startLoc = this.state.startLoc, this.next(), this.eat(56)) {
                    closingElement = this.jsxParseClosingElementAt(startLoc);
                    break contents;
                  }
                  children.push(this.jsxParseElementAt(startLoc));
                  break;
                case 142:
                  children.push(this.parseLiteral(this.state.value, "JSXText"));
                  break;
                case 5: {
                  let node2 = this.startNode();
                  this.setContext(types.brace), this.next(), this.match(21) ? children.push(this.jsxParseSpreadChild(node2)) : children.push(this.jsxParseExpressionContainer(node2, types.j_expr));
                  break;
                }
                default:
                  this.unexpected();
              }
            isFragment(openingElement) && !isFragment(closingElement) && closingElement !== null ? this.raise(JsxErrors.MissingClosingTagFragment, closingElement) : !isFragment(openingElement) && isFragment(closingElement) ? this.raise(JsxErrors.MissingClosingTagElement, closingElement, {
              openingTagName: getQualifiedJSXName(openingElement.name)
            }) : !isFragment(openingElement) && !isFragment(closingElement) && getQualifiedJSXName(closingElement.name) !== getQualifiedJSXName(openingElement.name) && this.raise(JsxErrors.MissingClosingTagElement, closingElement, {
              openingTagName: getQualifiedJSXName(openingElement.name)
            });
          }
          if (isFragment(openingElement) ? (node.openingFragment = openingElement, node.closingFragment = closingElement) : (node.openingElement = openingElement, node.closingElement = closingElement), node.children = children, this.match(47))
            throw this.raise(JsxErrors.UnwrappedAdjacentJSXElements, this.state.startLoc);
          return isFragment(openingElement) ? this.finishNode(node, "JSXFragment") : this.finishNode(node, "JSXElement");
        }
        jsxParseElement() {
          let startLoc = this.state.startLoc;
          return this.next(), this.jsxParseElementAt(startLoc);
        }
        setContext(newContext) {
          let {
            context
          } = this.state;
          context[context.length - 1] = newContext;
        }
        parseExprAtom(refExpressionErrors) {
          return this.match(143) ? this.jsxParseElement() : this.match(47) && this.input.charCodeAt(this.state.pos) !== 33 ? (this.replaceToken(143), this.jsxParseElement()) : super.parseExprAtom(refExpressionErrors);
        }
        skipSpace() {
          this.curContext().preserveSpace || super.skipSpace();
        }
        getTokenFromCode(code2) {
          let context = this.curContext();
          if (context === types.j_expr) {
            this.jsxReadToken();
            return;
          }
          if (context === types.j_oTag || context === types.j_cTag) {
            if (isIdentifierStart(code2)) {
              this.jsxReadWord();
              return;
            }
            if (code2 === 62) {
              ++this.state.pos, this.finishToken(144);
              return;
            }
            if ((code2 === 34 || code2 === 39) && context === types.j_oTag) {
              this.jsxReadString(code2);
              return;
            }
          }
          if (code2 === 60 && this.state.canStartJSXElement && this.input.charCodeAt(this.state.pos + 1) !== 33) {
            ++this.state.pos, this.finishToken(143);
            return;
          }
          super.getTokenFromCode(code2);
        }
        updateContext(prevType) {
          let {
            context,
            type
          } = this.state;
          if (type === 56 && prevType === 143)
            context.splice(-2, 2, types.j_cTag), this.state.canStartJSXElement = !1;
          else if (type === 143)
            context.push(types.j_oTag);
          else if (type === 144) {
            let out = context[context.length - 1];
            out === types.j_oTag && prevType === 56 || out === types.j_cTag ? (context.pop(), this.state.canStartJSXElement = context[context.length - 1] === types.j_expr) : (this.setContext(types.j_expr), this.state.canStartJSXElement = !0);
          } else
            this.state.canStartJSXElement = tokenComesBeforeExpression(type);
        }
      }, TypeScriptScope = class extends Scope {
        constructor(...args) {
          super(...args), this.tsNames = /* @__PURE__ */ new Map();
        }
      }, TypeScriptScopeHandler = class extends ScopeHandler {
        constructor(...args) {
          super(...args), this.importsStack = [];
        }
        createScope(flags) {
          return this.importsStack.push(/* @__PURE__ */ new Set()), new TypeScriptScope(flags);
        }
        enter(flags) {
          flags === 1024 && this.importsStack.push(/* @__PURE__ */ new Set()), super.enter(flags);
        }
        exit() {
          let flags = super.exit();
          return flags === 1024 && this.importsStack.pop(), flags;
        }
        hasImport(name, allowShadow) {
          let len = this.importsStack.length;
          if (this.importsStack[len - 1].has(name))
            return !0;
          if (!allowShadow && len > 1) {
            for (let i = 0; i < len - 1; i++)
              if (this.importsStack[i].has(name)) return !0;
          }
          return !1;
        }
        declareName(name, bindingType, loc) {
          if (bindingType & 4096) {
            this.hasImport(name, !0) && this.parser.raise(Errors.VarRedeclaration, loc, {
              identifierName: name
            }), this.importsStack[this.importsStack.length - 1].add(name);
            return;
          }
          let scope = this.currentScope(), type = scope.tsNames.get(name) || 0;
          if (bindingType & 1024) {
            this.maybeExportDefined(scope, name), scope.tsNames.set(name, type | 16);
            return;
          }
          super.declareName(name, bindingType, loc), bindingType & 2 && (bindingType & 1 || (this.checkRedeclarationInScope(scope, name, bindingType, loc), this.maybeExportDefined(scope, name)), type = type | 1), bindingType & 256 && (type = type | 2), bindingType & 512 && (type = type | 4), bindingType & 128 && (type = type | 8), type && scope.tsNames.set(name, type);
        }
        isRedeclaredInScope(scope, name, bindingType) {
          let type = scope.tsNames.get(name);
          if ((type & 2) > 0) {
            if (bindingType & 256) {
              let isConst = !!(bindingType & 512), wasConst = (type & 4) > 0;
              return isConst !== wasConst;
            }
            return !0;
          }
          return bindingType & 128 && (type & 8) > 0 ? scope.names.get(name) & 2 ? !!(bindingType & 1) : !1 : bindingType & 2 && (type & 1) > 0 ? !0 : super.isRedeclaredInScope(scope, name, bindingType);
        }
        checkLocalExport(id) {
          let {
            name
          } = id;
          if (this.hasImport(name)) return;
          let len = this.scopeStack.length;
          for (let i = len - 1; i >= 0; i--) {
            let type = this.scopeStack[i].tsNames.get(name);
            if ((type & 1) > 0 || (type & 16) > 0)
              return;
          }
          super.checkLocalExport(id);
        }
      }, ProductionParameterHandler = class {
        constructor() {
          this.stacks = [];
        }
        enter(flags) {
          this.stacks.push(flags);
        }
        exit() {
          this.stacks.pop();
        }
        currentFlags() {
          return this.stacks[this.stacks.length - 1];
        }
        get hasAwait() {
          return (this.currentFlags() & 2) > 0;
        }
        get hasYield() {
          return (this.currentFlags() & 1) > 0;
        }
        get hasReturn() {
          return (this.currentFlags() & 4) > 0;
        }
        get hasIn() {
          return (this.currentFlags() & 8) > 0;
        }
      };
      function functionFlags(isAsync, isGenerator) {
        return (isAsync ? 2 : 0) | (isGenerator ? 1 : 0);
      }
      var BaseParser = class {
        constructor() {
          this.sawUnambiguousESM = !1, this.ambiguousScriptDifferentAst = !1;
        }
        sourceToOffsetPos(sourcePos) {
          return sourcePos + this.startIndex;
        }
        offsetToSourcePos(offsetPos) {
          return offsetPos - this.startIndex;
        }
        hasPlugin(pluginConfig) {
          if (typeof pluginConfig == "string")
            return this.plugins.has(pluginConfig);
          {
            let [pluginName, pluginOptions] = pluginConfig;
            if (!this.hasPlugin(pluginName))
              return !1;
            let actualOptions = this.plugins.get(pluginName);
            for (let key of Object.keys(pluginOptions))
              if (actualOptions?.[key] !== pluginOptions[key])
                return !1;
            return !0;
          }
        }
        getPluginOption(plugin, name) {
          var _this$plugins$get;
          return (_this$plugins$get = this.plugins.get(plugin)) == null ? void 0 : _this$plugins$get[name];
        }
      };
      function setTrailingComments(node, comments) {
        node.trailingComments === void 0 ? node.trailingComments = comments : node.trailingComments.unshift(...comments);
      }
      function setLeadingComments(node, comments) {
        node.leadingComments === void 0 ? node.leadingComments = comments : node.leadingComments.unshift(...comments);
      }
      function setInnerComments(node, comments) {
        node.innerComments === void 0 ? node.innerComments = comments : node.innerComments.unshift(...comments);
      }
      function adjustInnerComments(node, elements, commentWS) {
        let lastElement = null, i = elements.length;
        for (; lastElement === null && i > 0; )
          lastElement = elements[--i];
        lastElement === null || lastElement.start > commentWS.start ? setInnerComments(node, commentWS.comments) : setTrailingComments(lastElement, commentWS.comments);
      }
      var CommentsParser = class extends BaseParser {
        addComment(comment) {
          this.filename && (comment.loc.filename = this.filename);
          let {
            commentsLen
          } = this.state;
          this.comments.length !== commentsLen && (this.comments.length = commentsLen), this.comments.push(comment), this.state.commentsLen++;
        }
        processComment(node) {
          let {
            commentStack
          } = this.state, commentStackLength = commentStack.length;
          if (commentStackLength === 0) return;
          let i = commentStackLength - 1, lastCommentWS = commentStack[i];
          lastCommentWS.start === node.end && (lastCommentWS.leadingNode = node, i--);
          let {
            start: nodeStart
          } = node;
          for (; i >= 0; i--) {
            let commentWS = commentStack[i], commentEnd = commentWS.end;
            if (commentEnd > nodeStart)
              commentWS.containingNode = node, this.finalizeComment(commentWS), commentStack.splice(i, 1);
            else {
              commentEnd === nodeStart && (commentWS.trailingNode = node);
              break;
            }
          }
        }
        finalizeComment(commentWS) {
          var _node$options;
          let {
            comments
          } = commentWS;
          if (commentWS.leadingNode !== null || commentWS.trailingNode !== null)
            commentWS.leadingNode !== null && setTrailingComments(commentWS.leadingNode, comments), commentWS.trailingNode !== null && setLeadingComments(commentWS.trailingNode, comments);
          else {
            let node = commentWS.containingNode, commentStart = commentWS.start;
            if (this.input.charCodeAt(this.offsetToSourcePos(commentStart) - 1) === 44)
              switch (node.type) {
                case "ObjectExpression":
                case "ObjectPattern":
                  adjustInnerComments(node, node.properties, commentWS);
                  break;
                case "CallExpression":
                case "NewExpression":
                case "OptionalCallExpression":
                  adjustInnerComments(node, node.arguments, commentWS);
                  break;
                case "ImportExpression":
                  adjustInnerComments(node, [node.source, (_node$options = node.options) != null ? _node$options : null], commentWS);
                  break;
                case "FunctionDeclaration":
                case "FunctionExpression":
                case "ArrowFunctionExpression":
                case "ObjectMethod":
                case "ClassMethod":
                case "ClassPrivateMethod":
                case "TSTypeParameterDeclaration":
                  adjustInnerComments(node, node.params, commentWS);
                  break;
                case "ArrayExpression":
                case "ArrayPattern":
                  adjustInnerComments(node, node.elements, commentWS);
                  break;
                case "ExportNamedDeclaration":
                case "ImportDeclaration":
                  adjustInnerComments(node, node.specifiers, commentWS);
                  break;
                case "TSEnumDeclaration":
                  adjustInnerComments(node, node.members, commentWS);
                  break;
                case "TSEnumBody":
                  adjustInnerComments(node, node.members, commentWS);
                  break;
                case "TSInterfaceBody":
                  adjustInnerComments(node, node.body, commentWS);
                  break;
                default: {
                  if (node.type === "RecordExpression") {
                    adjustInnerComments(node, node.properties, commentWS);
                    break;
                  }
                  if (node.type === "TupleExpression") {
                    adjustInnerComments(node, node.elements, commentWS);
                    break;
                  }
                  setInnerComments(node, comments);
                }
              }
            else
              setInnerComments(node, comments);
          }
        }
        finalizeRemainingComments() {
          let {
            commentStack
          } = this.state;
          for (let i = commentStack.length - 1; i >= 0; i--)
            this.finalizeComment(commentStack[i]);
          this.state.commentStack = [];
        }
        resetPreviousNodeTrailingComments(node) {
          let {
            commentStack
          } = this.state, {
            length
          } = commentStack;
          if (length === 0) return;
          let commentWS = commentStack[length - 1];
          commentWS.leadingNode === node && (commentWS.leadingNode = null);
        }
        takeSurroundingComments(node, start, end) {
          let {
            commentStack
          } = this.state, commentStackLength = commentStack.length;
          if (commentStackLength === 0) return;
          let i = commentStackLength - 1;
          for (; i >= 0; i--) {
            let commentWS = commentStack[i], commentEnd = commentWS.end;
            if (commentWS.start === end)
              commentWS.leadingNode = node;
            else if (commentEnd === start)
              commentWS.trailingNode = node;
            else if (commentEnd < start)
              break;
          }
        }
      }, State = class _State {
        constructor() {
          this.flags = 1024, this.startIndex = void 0, this.curLine = void 0, this.lineStart = void 0, this.startLoc = void 0, this.endLoc = void 0, this.errors = [], this.potentialArrowAt = -1, this.noArrowAt = [], this.noArrowParamsConversionAt = [], this.topicContext = {
            maxNumOfResolvableTopics: 0,
            maxTopicIndex: null
          }, this.labels = [], this.commentsLen = 0, this.commentStack = [], this.pos = 0, this.type = 140, this.value = null, this.start = 0, this.end = 0, this.lastTokEndLoc = null, this.lastTokStartLoc = null, this.context = [types.brace], this.firstInvalidTemplateEscapePos = null, this.strictErrors = /* @__PURE__ */ new Map(), this.tokensLength = 0;
        }
        get strict() {
          return (this.flags & 1) > 0;
        }
        set strict(v) {
          v ? this.flags |= 1 : this.flags &= -2;
        }
        init({
          strictMode,
          sourceType,
          startIndex,
          startLine,
          startColumn
        }) {
          this.strict = strictMode === !1 ? !1 : strictMode === !0 ? !0 : sourceType === "module", this.startIndex = startIndex, this.curLine = startLine, this.lineStart = -startColumn, this.startLoc = this.endLoc = new Position(startLine, startColumn, startIndex);
        }
        get maybeInArrowParameters() {
          return (this.flags & 2) > 0;
        }
        set maybeInArrowParameters(v) {
          v ? this.flags |= 2 : this.flags &= -3;
        }
        get inType() {
          return (this.flags & 4) > 0;
        }
        set inType(v) {
          v ? this.flags |= 4 : this.flags &= -5;
        }
        get noAnonFunctionType() {
          return (this.flags & 8) > 0;
        }
        set noAnonFunctionType(v) {
          v ? this.flags |= 8 : this.flags &= -9;
        }
        get hasFlowComment() {
          return (this.flags & 16) > 0;
        }
        set hasFlowComment(v) {
          v ? this.flags |= 16 : this.flags &= -17;
        }
        get isAmbientContext() {
          return (this.flags & 32) > 0;
        }
        set isAmbientContext(v) {
          v ? this.flags |= 32 : this.flags &= -33;
        }
        get inAbstractClass() {
          return (this.flags & 64) > 0;
        }
        set inAbstractClass(v) {
          v ? this.flags |= 64 : this.flags &= -65;
        }
        get inDisallowConditionalTypesContext() {
          return (this.flags & 128) > 0;
        }
        set inDisallowConditionalTypesContext(v) {
          v ? this.flags |= 128 : this.flags &= -129;
        }
        get soloAwait() {
          return (this.flags & 256) > 0;
        }
        set soloAwait(v) {
          v ? this.flags |= 256 : this.flags &= -257;
        }
        get inFSharpPipelineDirectBody() {
          return (this.flags & 512) > 0;
        }
        set inFSharpPipelineDirectBody(v) {
          v ? this.flags |= 512 : this.flags &= -513;
        }
        get canStartJSXElement() {
          return (this.flags & 1024) > 0;
        }
        set canStartJSXElement(v) {
          v ? this.flags |= 1024 : this.flags &= -1025;
        }
        get containsEsc() {
          return (this.flags & 2048) > 0;
        }
        set containsEsc(v) {
          v ? this.flags |= 2048 : this.flags &= -2049;
        }
        get hasTopLevelAwait() {
          return (this.flags & 4096) > 0;
        }
        set hasTopLevelAwait(v) {
          v ? this.flags |= 4096 : this.flags &= -4097;
        }
        curPosition() {
          return new Position(this.curLine, this.pos - this.lineStart, this.pos + this.startIndex);
        }
        clone() {
          let state = new _State();
          return state.flags = this.flags, state.startIndex = this.startIndex, state.curLine = this.curLine, state.lineStart = this.lineStart, state.startLoc = this.startLoc, state.endLoc = this.endLoc, state.errors = this.errors.slice(), state.potentialArrowAt = this.potentialArrowAt, state.noArrowAt = this.noArrowAt.slice(), state.noArrowParamsConversionAt = this.noArrowParamsConversionAt.slice(), state.topicContext = this.topicContext, state.labels = this.labels.slice(), state.commentsLen = this.commentsLen, state.commentStack = this.commentStack.slice(), state.pos = this.pos, state.type = this.type, state.value = this.value, state.start = this.start, state.end = this.end, state.lastTokEndLoc = this.lastTokEndLoc, state.lastTokStartLoc = this.lastTokStartLoc, state.context = this.context.slice(), state.firstInvalidTemplateEscapePos = this.firstInvalidTemplateEscapePos, state.strictErrors = this.strictErrors, state.tokensLength = this.tokensLength, state;
        }
      }, _isDigit = function(code2) {
        return code2 >= 48 && code2 <= 57;
      }, forbiddenNumericSeparatorSiblings = {
        decBinOct: /* @__PURE__ */ new Set([46, 66, 69, 79, 95, 98, 101, 111]),
        hex: /* @__PURE__ */ new Set([46, 88, 95, 120])
      }, isAllowedNumericSeparatorSibling = {
        bin: (ch) => ch === 48 || ch === 49,
        oct: (ch) => ch >= 48 && ch <= 55,
        dec: (ch) => ch >= 48 && ch <= 57,
        hex: (ch) => ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102
      };
      function readStringContents(type, input, pos, lineStart, curLine, errors) {
        let initialPos = pos, initialLineStart = lineStart, initialCurLine = curLine, out = "", firstInvalidLoc = null, chunkStart = pos, {
          length
        } = input;
        for (; ; ) {
          if (pos >= length) {
            errors.unterminated(initialPos, initialLineStart, initialCurLine), out += input.slice(chunkStart, pos);
            break;
          }
          let ch = input.charCodeAt(pos);
          if (isStringEnd(type, ch, input, pos)) {
            out += input.slice(chunkStart, pos);
            break;
          }
          if (ch === 92) {
            out += input.slice(chunkStart, pos);
            let res = readEscapedChar(input, pos, lineStart, curLine, type === "template", errors);
            res.ch === null && !firstInvalidLoc ? firstInvalidLoc = {
              pos,
              lineStart,
              curLine
            } : out += res.ch, {
              pos,
              lineStart,
              curLine
            } = res, chunkStart = pos;
          } else ch === 8232 || ch === 8233 ? (++pos, ++curLine, lineStart = pos) : ch === 10 || ch === 13 ? type === "template" ? (out += input.slice(chunkStart, pos) + `
`, ++pos, ch === 13 && input.charCodeAt(pos) === 10 && ++pos, ++curLine, chunkStart = lineStart = pos) : errors.unterminated(initialPos, initialLineStart, initialCurLine) : ++pos;
        }
        return {
          pos,
          str: out,
          firstInvalidLoc,
          lineStart,
          curLine,
          containsInvalid: !!firstInvalidLoc
        };
      }
      function isStringEnd(type, ch, input, pos) {
        return type === "template" ? ch === 96 || ch === 36 && input.charCodeAt(pos + 1) === 123 : ch === (type === "double" ? 34 : 39);
      }
      function readEscapedChar(input, pos, lineStart, curLine, inTemplate, errors) {
        let throwOnInvalid = !inTemplate;
        pos++;
        let res = (ch2) => ({
          pos,
          ch: ch2,
          lineStart,
          curLine
        }), ch = input.charCodeAt(pos++);
        switch (ch) {
          case 110:
            return res(`
`);
          case 114:
            return res("\r");
          case 120: {
            let code2;
            return {
              code: code2,
              pos
            } = readHexChar(input, pos, lineStart, curLine, 2, !1, throwOnInvalid, errors), res(code2 === null ? null : String.fromCharCode(code2));
          }
          case 117: {
            let code2;
            return {
              code: code2,
              pos
            } = readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors), res(code2 === null ? null : String.fromCodePoint(code2));
          }
          case 116:
            return res("	");
          case 98:
            return res("\b");
          case 118:
            return res("\v");
          case 102:
            return res("\f");
          case 13:
            input.charCodeAt(pos) === 10 && ++pos;
          case 10:
            lineStart = pos, ++curLine;
          case 8232:
          case 8233:
            return res("");
          case 56:
          case 57:
            if (inTemplate)
              return res(null);
            errors.strictNumericEscape(pos - 1, lineStart, curLine);
          default:
            if (ch >= 48 && ch <= 55) {
              let startPos = pos - 1, octalStr = /^[0-7]+/.exec(input.slice(startPos, pos + 2))[0], octal = parseInt(octalStr, 8);
              octal > 255 && (octalStr = octalStr.slice(0, -1), octal = parseInt(octalStr, 8)), pos += octalStr.length - 1;
              let next = input.charCodeAt(pos);
              if (octalStr !== "0" || next === 56 || next === 57) {
                if (inTemplate)
                  return res(null);
                errors.strictNumericEscape(startPos, lineStart, curLine);
              }
              return res(String.fromCharCode(octal));
            }
            return res(String.fromCharCode(ch));
        }
      }
      function readHexChar(input, pos, lineStart, curLine, len, forceLen, throwOnInvalid, errors) {
        let initialPos = pos, n;
        return {
          n,
          pos
        } = readInt(input, pos, lineStart, curLine, 16, len, forceLen, !1, errors, !throwOnInvalid), n === null && (throwOnInvalid ? errors.invalidEscapeSequence(initialPos, lineStart, curLine) : pos = initialPos - 1), {
          code: n,
          pos
        };
      }
      function readInt(input, pos, lineStart, curLine, radix, len, forceLen, allowNumSeparator, errors, bailOnError) {
        let start = pos, forbiddenSiblings = radix === 16 ? forbiddenNumericSeparatorSiblings.hex : forbiddenNumericSeparatorSiblings.decBinOct, isAllowedSibling = radix === 16 ? isAllowedNumericSeparatorSibling.hex : radix === 10 ? isAllowedNumericSeparatorSibling.dec : radix === 8 ? isAllowedNumericSeparatorSibling.oct : isAllowedNumericSeparatorSibling.bin, invalid = !1, total = 0;
        for (let i = 0, e = len ?? 1 / 0; i < e; ++i) {
          let code2 = input.charCodeAt(pos), val;
          if (code2 === 95 && allowNumSeparator !== "bail") {
            let prev = input.charCodeAt(pos - 1), next = input.charCodeAt(pos + 1);
            if (allowNumSeparator) {
              if (Number.isNaN(next) || !isAllowedSibling(next) || forbiddenSiblings.has(prev) || forbiddenSiblings.has(next)) {
                if (bailOnError) return {
                  n: null,
                  pos
                };
                errors.unexpectedNumericSeparator(pos, lineStart, curLine);
              }
            } else {
              if (bailOnError) return {
                n: null,
                pos
              };
              errors.numericSeparatorInEscapeSequence(pos, lineStart, curLine);
            }
            ++pos;
            continue;
          }
          if (code2 >= 97 ? val = code2 - 97 + 10 : code2 >= 65 ? val = code2 - 65 + 10 : _isDigit(code2) ? val = code2 - 48 : val = 1 / 0, val >= radix) {
            if (val <= 9 && bailOnError)
              return {
                n: null,
                pos
              };
            if (val <= 9 && errors.invalidDigit(pos, lineStart, curLine, radix))
              val = 0;
            else if (forceLen)
              val = 0, invalid = !0;
            else
              break;
          }
          ++pos, total = total * radix + val;
        }
        return pos === start || len != null && pos - start !== len || invalid ? {
          n: null,
          pos
        } : {
          n: total,
          pos
        };
      }
      function readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors) {
        let ch = input.charCodeAt(pos), code2;
        if (ch === 123) {
          if (++pos, {
            code: code2,
            pos
          } = readHexChar(input, pos, lineStart, curLine, input.indexOf("}", pos) - pos, !0, throwOnInvalid, errors), ++pos, code2 !== null && code2 > 1114111)
            if (throwOnInvalid)
              errors.invalidCodePoint(pos, lineStart, curLine);
            else
              return {
                code: null,
                pos
              };
        } else
          ({
            code: code2,
            pos
          } = readHexChar(input, pos, lineStart, curLine, 4, !1, throwOnInvalid, errors));
        return {
          code: code2,
          pos
        };
      }
      function buildPosition(pos, lineStart, curLine) {
        return new Position(curLine, pos - lineStart, pos);
      }
      var VALID_REGEX_FLAGS = /* @__PURE__ */ new Set([103, 109, 115, 105, 121, 117, 100, 118]), Token = class {
        constructor(state) {
          let startIndex = state.startIndex || 0;
          this.type = state.type, this.value = state.value, this.start = startIndex + state.start, this.end = startIndex + state.end, this.loc = new SourceLocation(state.startLoc, state.endLoc);
        }
      }, Tokenizer = class extends CommentsParser {
        constructor(options, input) {
          super(), this.isLookahead = void 0, this.tokens = [], this.errorHandlers_readInt = {
            invalidDigit: (pos, lineStart, curLine, radix) => this.optionFlags & 2048 ? (this.raise(Errors.InvalidDigit, buildPosition(pos, lineStart, curLine), {
              radix
            }), !0) : !1,
            numericSeparatorInEscapeSequence: this.errorBuilder(Errors.NumericSeparatorInEscapeSequence),
            unexpectedNumericSeparator: this.errorBuilder(Errors.UnexpectedNumericSeparator)
          }, this.errorHandlers_readCodePoint = Object.assign({}, this.errorHandlers_readInt, {
            invalidEscapeSequence: this.errorBuilder(Errors.InvalidEscapeSequence),
            invalidCodePoint: this.errorBuilder(Errors.InvalidCodePoint)
          }), this.errorHandlers_readStringContents_string = Object.assign({}, this.errorHandlers_readCodePoint, {
            strictNumericEscape: (pos, lineStart, curLine) => {
              this.recordStrictModeErrors(Errors.StrictNumericEscape, buildPosition(pos, lineStart, curLine));
            },
            unterminated: (pos, lineStart, curLine) => {
              throw this.raise(Errors.UnterminatedString, buildPosition(pos - 1, lineStart, curLine));
            }
          }), this.errorHandlers_readStringContents_template = Object.assign({}, this.errorHandlers_readCodePoint, {
            strictNumericEscape: this.errorBuilder(Errors.StrictNumericEscape),
            unterminated: (pos, lineStart, curLine) => {
              throw this.raise(Errors.UnterminatedTemplate, buildPosition(pos, lineStart, curLine));
            }
          }), this.state = new State(), this.state.init(options), this.input = input, this.length = input.length, this.comments = [], this.isLookahead = !1;
        }
        pushToken(token) {
          this.tokens.length = this.state.tokensLength, this.tokens.push(token), ++this.state.tokensLength;
        }
        next() {
          this.checkKeywordEscapes(), this.optionFlags & 256 && this.pushToken(new Token(this.state)), this.state.lastTokEndLoc = this.state.endLoc, this.state.lastTokStartLoc = this.state.startLoc, this.nextToken();
        }
        eat(type) {
          return this.match(type) ? (this.next(), !0) : !1;
        }
        match(type) {
          return this.state.type === type;
        }
        createLookaheadState(state) {
          return {
            pos: state.pos,
            value: null,
            type: state.type,
            start: state.start,
            end: state.end,
            context: [this.curContext()],
            inType: state.inType,
            startLoc: state.startLoc,
            lastTokEndLoc: state.lastTokEndLoc,
            curLine: state.curLine,
            lineStart: state.lineStart,
            curPosition: state.curPosition
          };
        }
        lookahead() {
          let old = this.state;
          this.state = this.createLookaheadState(old), this.isLookahead = !0, this.nextToken(), this.isLookahead = !1;
          let curr = this.state;
          return this.state = old, curr;
        }
        nextTokenStart() {
          return this.nextTokenStartSince(this.state.pos);
        }
        nextTokenStartSince(pos) {
          return skipWhiteSpace.lastIndex = pos, skipWhiteSpace.test(this.input) ? skipWhiteSpace.lastIndex : pos;
        }
        lookaheadCharCode() {
          return this.lookaheadCharCodeSince(this.state.pos);
        }
        lookaheadCharCodeSince(pos) {
          return this.input.charCodeAt(this.nextTokenStartSince(pos));
        }
        nextTokenInLineStart() {
          return this.nextTokenInLineStartSince(this.state.pos);
        }
        nextTokenInLineStartSince(pos) {
          return skipWhiteSpaceInLine.lastIndex = pos, skipWhiteSpaceInLine.test(this.input) ? skipWhiteSpaceInLine.lastIndex : pos;
        }
        lookaheadInLineCharCode() {
          return this.input.charCodeAt(this.nextTokenInLineStart());
        }
        codePointAtPos(pos) {
          let cp = this.input.charCodeAt(pos);
          if ((cp & 64512) === 55296 && ++pos < this.input.length) {
            let trail = this.input.charCodeAt(pos);
            (trail & 64512) === 56320 && (cp = 65536 + ((cp & 1023) << 10) + (trail & 1023));
          }
          return cp;
        }
        setStrict(strict) {
          this.state.strict = strict, strict && (this.state.strictErrors.forEach(([toParseError, at]) => this.raise(toParseError, at)), this.state.strictErrors.clear());
        }
        curContext() {
          return this.state.context[this.state.context.length - 1];
        }
        nextToken() {
          if (this.skipSpace(), this.state.start = this.state.pos, this.isLookahead || (this.state.startLoc = this.state.curPosition()), this.state.pos >= this.length) {
            this.finishToken(140);
            return;
          }
          this.getTokenFromCode(this.codePointAtPos(this.state.pos));
        }
        skipBlockComment(commentEnd) {
          let startLoc;
          this.isLookahead || (startLoc = this.state.curPosition());
          let start = this.state.pos, end = this.input.indexOf(commentEnd, start + 2);
          if (end === -1)
            throw this.raise(Errors.UnterminatedComment, this.state.curPosition());
          for (this.state.pos = end + commentEnd.length, lineBreakG.lastIndex = start + 2; lineBreakG.test(this.input) && lineBreakG.lastIndex <= end; )
            ++this.state.curLine, this.state.lineStart = lineBreakG.lastIndex;
          if (this.isLookahead) return;
          let comment = {
            type: "CommentBlock",
            value: this.input.slice(start + 2, end),
            start: this.sourceToOffsetPos(start),
            end: this.sourceToOffsetPos(end + commentEnd.length),
            loc: new SourceLocation(startLoc, this.state.curPosition())
          };
          return this.optionFlags & 256 && this.pushToken(comment), comment;
        }
        skipLineComment(startSkip) {
          let start = this.state.pos, startLoc;
          this.isLookahead || (startLoc = this.state.curPosition());
          let ch = this.input.charCodeAt(this.state.pos += startSkip);
          if (this.state.pos < this.length)
            for (; !isNewLine(ch) && ++this.state.pos < this.length; )
              ch = this.input.charCodeAt(this.state.pos);
          if (this.isLookahead) return;
          let end = this.state.pos, comment = {
            type: "CommentLine",
            value: this.input.slice(start + startSkip, end),
            start: this.sourceToOffsetPos(start),
            end: this.sourceToOffsetPos(end),
            loc: new SourceLocation(startLoc, this.state.curPosition())
          };
          return this.optionFlags & 256 && this.pushToken(comment), comment;
        }
        skipSpace() {
          let spaceStart = this.state.pos, comments = this.optionFlags & 4096 ? [] : null;
          loop: for (; this.state.pos < this.length; ) {
            let ch = this.input.charCodeAt(this.state.pos);
            switch (ch) {
              case 32:
              case 160:
              case 9:
                ++this.state.pos;
                break;
              case 13:
                this.input.charCodeAt(this.state.pos + 1) === 10 && ++this.state.pos;
              case 10:
              case 8232:
              case 8233:
                ++this.state.pos, ++this.state.curLine, this.state.lineStart = this.state.pos;
                break;
              case 47:
                switch (this.input.charCodeAt(this.state.pos + 1)) {
                  case 42: {
                    let comment = this.skipBlockComment("*/");
                    comment !== void 0 && (this.addComment(comment), comments?.push(comment));
                    break;
                  }
                  case 47: {
                    let comment = this.skipLineComment(2);
                    comment !== void 0 && (this.addComment(comment), comments?.push(comment));
                    break;
                  }
                  default:
                    break loop;
                }
                break;
              default:
                if (isWhitespace(ch))
                  ++this.state.pos;
                else if (ch === 45 && !this.inModule && this.optionFlags & 8192) {
                  let pos = this.state.pos;
                  if (this.input.charCodeAt(pos + 1) === 45 && this.input.charCodeAt(pos + 2) === 62 && (spaceStart === 0 || this.state.lineStart > spaceStart)) {
                    let comment = this.skipLineComment(3);
                    comment !== void 0 && (this.addComment(comment), comments?.push(comment));
                  } else
                    break loop;
                } else if (ch === 60 && !this.inModule && this.optionFlags & 8192) {
                  let pos = this.state.pos;
                  if (this.input.charCodeAt(pos + 1) === 33 && this.input.charCodeAt(pos + 2) === 45 && this.input.charCodeAt(pos + 3) === 45) {
                    let comment = this.skipLineComment(4);
                    comment !== void 0 && (this.addComment(comment), comments?.push(comment));
                  } else
                    break loop;
                } else
                  break loop;
            }
          }
          if (comments?.length > 0) {
            let end = this.state.pos, commentWhitespace = {
              start: this.sourceToOffsetPos(spaceStart),
              end: this.sourceToOffsetPos(end),
              comments,
              leadingNode: null,
              trailingNode: null,
              containingNode: null
            };
            this.state.commentStack.push(commentWhitespace);
          }
        }
        finishToken(type, val) {
          this.state.end = this.state.pos, this.state.endLoc = this.state.curPosition();
          let prevType = this.state.type;
          this.state.type = type, this.state.value = val, this.isLookahead || this.updateContext(prevType);
        }
        replaceToken(type) {
          this.state.type = type, this.updateContext();
        }
        readToken_numberSign() {
          if (this.state.pos === 0 && this.readToken_interpreter())
            return;
          let nextPos = this.state.pos + 1, next = this.codePointAtPos(nextPos);
          if (next >= 48 && next <= 57)
            throw this.raise(Errors.UnexpectedDigitAfterHash, this.state.curPosition());
          if (next === 123 || next === 91 && this.hasPlugin("recordAndTuple")) {
            if (this.expectPlugin("recordAndTuple"), this.getPluginOption("recordAndTuple", "syntaxType") === "bar")
              throw this.raise(next === 123 ? Errors.RecordExpressionHashIncorrectStartSyntaxType : Errors.TupleExpressionHashIncorrectStartSyntaxType, this.state.curPosition());
            this.state.pos += 2, next === 123 ? this.finishToken(7) : this.finishToken(1);
          } else isIdentifierStart(next) ? (++this.state.pos, this.finishToken(139, this.readWord1(next))) : next === 92 ? (++this.state.pos, this.finishToken(139, this.readWord1())) : this.finishOp(27, 1);
        }
        readToken_dot() {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (next >= 48 && next <= 57) {
            this.readNumber(!0);
            return;
          }
          next === 46 && this.input.charCodeAt(this.state.pos + 2) === 46 ? (this.state.pos += 3, this.finishToken(21)) : (++this.state.pos, this.finishToken(16));
        }
        readToken_slash() {
          this.input.charCodeAt(this.state.pos + 1) === 61 ? this.finishOp(31, 2) : this.finishOp(56, 1);
        }
        readToken_interpreter() {
          if (this.state.pos !== 0 || this.length < 2) return !1;
          let ch = this.input.charCodeAt(this.state.pos + 1);
          if (ch !== 33) return !1;
          let start = this.state.pos;
          for (this.state.pos += 1; !isNewLine(ch) && ++this.state.pos < this.length; )
            ch = this.input.charCodeAt(this.state.pos);
          let value = this.input.slice(start + 2, this.state.pos);
          return this.finishToken(28, value), !0;
        }
        readToken_mult_modulo(code2) {
          let type = code2 === 42 ? 55 : 54, width = 1, next = this.input.charCodeAt(this.state.pos + 1);
          code2 === 42 && next === 42 && (width++, next = this.input.charCodeAt(this.state.pos + 2), type = 57), next === 61 && !this.state.inType && (width++, type = code2 === 37 ? 33 : 30), this.finishOp(type, width);
        }
        readToken_pipe_amp(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (next === code2) {
            this.input.charCodeAt(this.state.pos + 2) === 61 ? this.finishOp(30, 3) : this.finishOp(code2 === 124 ? 41 : 42, 2);
            return;
          }
          if (code2 === 124) {
            if (next === 62) {
              this.finishOp(39, 2);
              return;
            }
            if (this.hasPlugin("recordAndTuple") && next === 125) {
              if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar")
                throw this.raise(Errors.RecordExpressionBarIncorrectEndSyntaxType, this.state.curPosition());
              this.state.pos += 2, this.finishToken(9);
              return;
            }
            if (this.hasPlugin("recordAndTuple") && next === 93) {
              if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar")
                throw this.raise(Errors.TupleExpressionBarIncorrectEndSyntaxType, this.state.curPosition());
              this.state.pos += 2, this.finishToken(4);
              return;
            }
          }
          if (next === 61) {
            this.finishOp(30, 2);
            return;
          }
          this.finishOp(code2 === 124 ? 43 : 45, 1);
        }
        readToken_caret() {
          let next = this.input.charCodeAt(this.state.pos + 1);
          next === 61 && !this.state.inType ? this.finishOp(32, 2) : next === 94 && this.hasPlugin(["pipelineOperator", {
            proposal: "hack",
            topicToken: "^^"
          }]) ? (this.finishOp(37, 2), this.input.codePointAt(this.state.pos) === 94 && this.unexpected()) : this.finishOp(44, 1);
        }
        readToken_atSign() {
          this.input.charCodeAt(this.state.pos + 1) === 64 && this.hasPlugin(["pipelineOperator", {
            proposal: "hack",
            topicToken: "@@"
          }]) ? this.finishOp(38, 2) : this.finishOp(26, 1);
        }
        readToken_plus_min(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (next === code2) {
            this.finishOp(34, 2);
            return;
          }
          next === 61 ? this.finishOp(30, 2) : this.finishOp(53, 1);
        }
        readToken_lt() {
          let {
            pos
          } = this.state, next = this.input.charCodeAt(pos + 1);
          if (next === 60) {
            if (this.input.charCodeAt(pos + 2) === 61) {
              this.finishOp(30, 3);
              return;
            }
            this.finishOp(51, 2);
            return;
          }
          if (next === 61) {
            this.finishOp(49, 2);
            return;
          }
          this.finishOp(47, 1);
        }
        readToken_gt() {
          let {
            pos
          } = this.state, next = this.input.charCodeAt(pos + 1);
          if (next === 62) {
            let size = this.input.charCodeAt(pos + 2) === 62 ? 3 : 2;
            if (this.input.charCodeAt(pos + size) === 61) {
              this.finishOp(30, size + 1);
              return;
            }
            this.finishOp(52, size);
            return;
          }
          if (next === 61) {
            this.finishOp(49, 2);
            return;
          }
          this.finishOp(48, 1);
        }
        readToken_eq_excl(code2) {
          let next = this.input.charCodeAt(this.state.pos + 1);
          if (next === 61) {
            this.finishOp(46, this.input.charCodeAt(this.state.pos + 2) === 61 ? 3 : 2);
            return;
          }
          if (code2 === 61 && next === 62) {
            this.state.pos += 2, this.finishToken(19);
            return;
          }
          this.finishOp(code2 === 61 ? 29 : 35, 1);
        }
        readToken_question() {
          let next = this.input.charCodeAt(this.state.pos + 1), next2 = this.input.charCodeAt(this.state.pos + 2);
          next === 63 ? next2 === 61 ? this.finishOp(30, 3) : this.finishOp(40, 2) : next === 46 && !(next2 >= 48 && next2 <= 57) ? (this.state.pos += 2, this.finishToken(18)) : (++this.state.pos, this.finishToken(17));
        }
        getTokenFromCode(code2) {
          switch (code2) {
            case 46:
              this.readToken_dot();
              return;
            case 40:
              ++this.state.pos, this.finishToken(10);
              return;
            case 41:
              ++this.state.pos, this.finishToken(11);
              return;
            case 59:
              ++this.state.pos, this.finishToken(13);
              return;
            case 44:
              ++this.state.pos, this.finishToken(12);
              return;
            case 91:
              if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === 124) {
                if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar")
                  throw this.raise(Errors.TupleExpressionBarIncorrectStartSyntaxType, this.state.curPosition());
                this.state.pos += 2, this.finishToken(2);
              } else
                ++this.state.pos, this.finishToken(0);
              return;
            case 93:
              ++this.state.pos, this.finishToken(3);
              return;
            case 123:
              if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === 124) {
                if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar")
                  throw this.raise(Errors.RecordExpressionBarIncorrectStartSyntaxType, this.state.curPosition());
                this.state.pos += 2, this.finishToken(6);
              } else
                ++this.state.pos, this.finishToken(5);
              return;
            case 125:
              ++this.state.pos, this.finishToken(8);
              return;
            case 58:
              this.hasPlugin("functionBind") && this.input.charCodeAt(this.state.pos + 1) === 58 ? this.finishOp(15, 2) : (++this.state.pos, this.finishToken(14));
              return;
            case 63:
              this.readToken_question();
              return;
            case 96:
              this.readTemplateToken();
              return;
            case 48: {
              let next = this.input.charCodeAt(this.state.pos + 1);
              if (next === 120 || next === 88) {
                this.readRadixNumber(16);
                return;
              }
              if (next === 111 || next === 79) {
                this.readRadixNumber(8);
                return;
              }
              if (next === 98 || next === 66) {
                this.readRadixNumber(2);
                return;
              }
            }
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
              this.readNumber(!1);
              return;
            case 34:
            case 39:
              this.readString(code2);
              return;
            case 47:
              this.readToken_slash();
              return;
            case 37:
            case 42:
              this.readToken_mult_modulo(code2);
              return;
            case 124:
            case 38:
              this.readToken_pipe_amp(code2);
              return;
            case 94:
              this.readToken_caret();
              return;
            case 43:
            case 45:
              this.readToken_plus_min(code2);
              return;
            case 60:
              this.readToken_lt();
              return;
            case 62:
              this.readToken_gt();
              return;
            case 61:
            case 33:
              this.readToken_eq_excl(code2);
              return;
            case 126:
              this.finishOp(36, 1);
              return;
            case 64:
              this.readToken_atSign();
              return;
            case 35:
              this.readToken_numberSign();
              return;
            case 92:
              this.readWord();
              return;
            default:
              if (isIdentifierStart(code2)) {
                this.readWord(code2);
                return;
              }
          }
          throw this.raise(Errors.InvalidOrUnexpectedToken, this.state.curPosition(), {
            unexpected: String.fromCodePoint(code2)
          });
        }
        finishOp(type, size) {
          let str = this.input.slice(this.state.pos, this.state.pos + size);
          this.state.pos += size, this.finishToken(type, str);
        }
        readRegexp() {
          let startLoc = this.state.startLoc, start = this.state.start + 1, escaped, inClass, {
            pos
          } = this.state;
          for (; ; ++pos) {
            if (pos >= this.length)
              throw this.raise(Errors.UnterminatedRegExp, createPositionWithColumnOffset(startLoc, 1));
            let ch = this.input.charCodeAt(pos);
            if (isNewLine(ch))
              throw this.raise(Errors.UnterminatedRegExp, createPositionWithColumnOffset(startLoc, 1));
            if (escaped)
              escaped = !1;
            else {
              if (ch === 91)
                inClass = !0;
              else if (ch === 93 && inClass)
                inClass = !1;
              else if (ch === 47 && !inClass)
                break;
              escaped = ch === 92;
            }
          }
          let content = this.input.slice(start, pos);
          ++pos;
          let mods = "", nextPos = () => createPositionWithColumnOffset(startLoc, pos + 2 - start);
          for (; pos < this.length; ) {
            let cp = this.codePointAtPos(pos), char = String.fromCharCode(cp);
            if (VALID_REGEX_FLAGS.has(cp))
              cp === 118 ? mods.includes("u") && this.raise(Errors.IncompatibleRegExpUVFlags, nextPos()) : cp === 117 && mods.includes("v") && this.raise(Errors.IncompatibleRegExpUVFlags, nextPos()), mods.includes(char) && this.raise(Errors.DuplicateRegExpFlags, nextPos());
            else if (isIdentifierChar(cp) || cp === 92)
              this.raise(Errors.MalformedRegExpFlags, nextPos());
            else
              break;
            ++pos, mods += char;
          }
          this.state.pos = pos, this.finishToken(138, {
            pattern: content,
            flags: mods
          });
        }
        readInt(radix, len, forceLen = !1, allowNumSeparator = !0) {
          let {
            n,
            pos
          } = readInt(this.input, this.state.pos, this.state.lineStart, this.state.curLine, radix, len, forceLen, allowNumSeparator, this.errorHandlers_readInt, !1);
          return this.state.pos = pos, n;
        }
        readRadixNumber(radix) {
          let start = this.state.pos, startLoc = this.state.curPosition(), isBigInt = !1;
          this.state.pos += 2;
          let val = this.readInt(radix);
          val == null && this.raise(Errors.InvalidDigit, createPositionWithColumnOffset(startLoc, 2), {
            radix
          });
          let next = this.input.charCodeAt(this.state.pos);
          if (next === 110)
            ++this.state.pos, isBigInt = !0;
          else if (next === 109)
            throw this.raise(Errors.InvalidDecimal, startLoc);
          if (isIdentifierStart(this.codePointAtPos(this.state.pos)))
            throw this.raise(Errors.NumberIdentifier, this.state.curPosition());
          if (isBigInt) {
            let str = this.input.slice(start, this.state.pos).replace(/[_n]/g, "");
            this.finishToken(136, str);
            return;
          }
          this.finishToken(135, val);
        }
        readNumber(startsWithDot) {
          let start = this.state.pos, startLoc = this.state.curPosition(), isFloat = !1, isBigInt = !1, hasExponent = !1, isOctal = !1;
          !startsWithDot && this.readInt(10) === null && this.raise(Errors.InvalidNumber, this.state.curPosition());
          let hasLeadingZero = this.state.pos - start >= 2 && this.input.charCodeAt(start) === 48;
          if (hasLeadingZero) {
            let integer = this.input.slice(start, this.state.pos);
            if (this.recordStrictModeErrors(Errors.StrictOctalLiteral, startLoc), !this.state.strict) {
              let underscorePos = integer.indexOf("_");
              underscorePos > 0 && this.raise(Errors.ZeroDigitNumericSeparator, createPositionWithColumnOffset(startLoc, underscorePos));
            }
            isOctal = hasLeadingZero && !/[89]/.test(integer);
          }
          let next = this.input.charCodeAt(this.state.pos);
          if (next === 46 && !isOctal && (++this.state.pos, this.readInt(10), isFloat = !0, next = this.input.charCodeAt(this.state.pos)), (next === 69 || next === 101) && !isOctal && (next = this.input.charCodeAt(++this.state.pos), (next === 43 || next === 45) && ++this.state.pos, this.readInt(10) === null && this.raise(Errors.InvalidOrMissingExponent, startLoc), isFloat = !0, hasExponent = !0, next = this.input.charCodeAt(this.state.pos)), next === 110 && ((isFloat || hasLeadingZero) && this.raise(Errors.InvalidBigIntLiteral, startLoc), ++this.state.pos, isBigInt = !0), next === 109) {
            this.expectPlugin("decimal", this.state.curPosition()), (hasExponent || hasLeadingZero) && this.raise(Errors.InvalidDecimal, startLoc), ++this.state.pos;
            var isDecimal = !0;
          }
          if (isIdentifierStart(this.codePointAtPos(this.state.pos)))
            throw this.raise(Errors.NumberIdentifier, this.state.curPosition());
          let str = this.input.slice(start, this.state.pos).replace(/[_mn]/g, "");
          if (isBigInt) {
            this.finishToken(136, str);
            return;
          }
          if (isDecimal) {
            this.finishToken(137, str);
            return;
          }
          let val = isOctal ? parseInt(str, 8) : parseFloat(str);
          this.finishToken(135, val);
        }
        readCodePoint(throwOnInvalid) {
          let {
            code: code2,
            pos
          } = readCodePoint(this.input, this.state.pos, this.state.lineStart, this.state.curLine, throwOnInvalid, this.errorHandlers_readCodePoint);
          return this.state.pos = pos, code2;
        }
        readString(quote) {
          let {
            str,
            pos,
            curLine,
            lineStart
          } = readStringContents(quote === 34 ? "double" : "single", this.input, this.state.pos + 1, this.state.lineStart, this.state.curLine, this.errorHandlers_readStringContents_string);
          this.state.pos = pos + 1, this.state.lineStart = lineStart, this.state.curLine = curLine, this.finishToken(134, str);
        }
        readTemplateContinuation() {
          this.match(8) || this.unexpected(null, 8), this.state.pos--, this.readTemplateToken();
        }
        readTemplateToken() {
          let opening = this.input[this.state.pos], {
            str,
            firstInvalidLoc,
            pos,
            curLine,
            lineStart
          } = readStringContents("template", this.input, this.state.pos + 1, this.state.lineStart, this.state.curLine, this.errorHandlers_readStringContents_template);
          this.state.pos = pos + 1, this.state.lineStart = lineStart, this.state.curLine = curLine, firstInvalidLoc && (this.state.firstInvalidTemplateEscapePos = new Position(firstInvalidLoc.curLine, firstInvalidLoc.pos - firstInvalidLoc.lineStart, this.sourceToOffsetPos(firstInvalidLoc.pos))), this.input.codePointAt(pos) === 96 ? this.finishToken(24, firstInvalidLoc ? null : opening + str + "`") : (this.state.pos++, this.finishToken(25, firstInvalidLoc ? null : opening + str + "${"));
        }
        recordStrictModeErrors(toParseError, at) {
          let index = at.index;
          this.state.strict && !this.state.strictErrors.has(index) ? this.raise(toParseError, at) : this.state.strictErrors.set(index, [toParseError, at]);
        }
        readWord1(firstCode) {
          this.state.containsEsc = !1;
          let word = "", start = this.state.pos, chunkStart = this.state.pos;
          for (firstCode !== void 0 && (this.state.pos += firstCode <= 65535 ? 1 : 2); this.state.pos < this.length; ) {
            let ch = this.codePointAtPos(this.state.pos);
            if (isIdentifierChar(ch))
              this.state.pos += ch <= 65535 ? 1 : 2;
            else if (ch === 92) {
              this.state.containsEsc = !0, word += this.input.slice(chunkStart, this.state.pos);
              let escStart = this.state.curPosition(), identifierCheck = this.state.pos === start ? isIdentifierStart : isIdentifierChar;
              if (this.input.charCodeAt(++this.state.pos) !== 117) {
                this.raise(Errors.MissingUnicodeEscape, this.state.curPosition()), chunkStart = this.state.pos - 1;
                continue;
              }
              ++this.state.pos;
              let esc = this.readCodePoint(!0);
              esc !== null && (identifierCheck(esc) || this.raise(Errors.EscapedCharNotAnIdentifier, escStart), word += String.fromCodePoint(esc)), chunkStart = this.state.pos;
            } else
              break;
          }
          return word + this.input.slice(chunkStart, this.state.pos);
        }
        readWord(firstCode) {
          let word = this.readWord1(firstCode), type = keywords$1.get(word);
          type !== void 0 ? this.finishToken(type, tokenLabelName(type)) : this.finishToken(132, word);
        }
        checkKeywordEscapes() {
          let {
            type
          } = this.state;
          tokenIsKeyword(type) && this.state.containsEsc && this.raise(Errors.InvalidEscapedReservedWord, this.state.startLoc, {
            reservedWord: tokenLabelName(type)
          });
        }
        raise(toParseError, at, details = {}) {
          let loc = at instanceof Position ? at : at.loc.start, error = toParseError(loc, details);
          if (!(this.optionFlags & 2048)) throw error;
          return this.isLookahead || this.state.errors.push(error), error;
        }
        raiseOverwrite(toParseError, at, details = {}) {
          let loc = at instanceof Position ? at : at.loc.start, pos = loc.index, errors = this.state.errors;
          for (let i = errors.length - 1; i >= 0; i--) {
            let error = errors[i];
            if (error.loc.index === pos)
              return errors[i] = toParseError(loc, details);
            if (error.loc.index < pos) break;
          }
          return this.raise(toParseError, at, details);
        }
        updateContext(prevType) {
        }
        unexpected(loc, type) {
          throw this.raise(Errors.UnexpectedToken, loc ?? this.state.startLoc, {
            expected: type ? tokenLabelName(type) : null
          });
        }
        expectPlugin(pluginName, loc) {
          if (this.hasPlugin(pluginName))
            return !0;
          throw this.raise(Errors.MissingPlugin, loc ?? this.state.startLoc, {
            missingPlugin: [pluginName]
          });
        }
        expectOnePlugin(pluginNames) {
          if (!pluginNames.some((name) => this.hasPlugin(name)))
            throw this.raise(Errors.MissingOneOfPlugins, this.state.startLoc, {
              missingPlugin: pluginNames
            });
        }
        errorBuilder(error) {
          return (pos, lineStart, curLine) => {
            this.raise(error, buildPosition(pos, lineStart, curLine));
          };
        }
      }, ClassScope = class {
        constructor() {
          this.privateNames = /* @__PURE__ */ new Set(), this.loneAccessors = /* @__PURE__ */ new Map(), this.undefinedPrivateNames = /* @__PURE__ */ new Map();
        }
      }, ClassScopeHandler = class {
        constructor(parser) {
          this.parser = void 0, this.stack = [], this.undefinedPrivateNames = /* @__PURE__ */ new Map(), this.parser = parser;
        }
        current() {
          return this.stack[this.stack.length - 1];
        }
        enter() {
          this.stack.push(new ClassScope());
        }
        exit() {
          let oldClassScope = this.stack.pop(), current = this.current();
          for (let [name, loc] of Array.from(oldClassScope.undefinedPrivateNames))
            current ? current.undefinedPrivateNames.has(name) || current.undefinedPrivateNames.set(name, loc) : this.parser.raise(Errors.InvalidPrivateFieldResolution, loc, {
              identifierName: name
            });
        }
        declarePrivateName(name, elementType, loc) {
          let {
            privateNames,
            loneAccessors,
            undefinedPrivateNames
          } = this.current(), redefined = privateNames.has(name);
          if (elementType & 3) {
            let accessor = redefined && loneAccessors.get(name);
            if (accessor) {
              let oldStatic = accessor & 4, newStatic = elementType & 4, oldKind = accessor & 3, newKind = elementType & 3;
              redefined = oldKind === newKind || oldStatic !== newStatic, redefined || loneAccessors.delete(name);
            } else redefined || loneAccessors.set(name, elementType);
          }
          redefined && this.parser.raise(Errors.PrivateNameRedeclaration, loc, {
            identifierName: name
          }), privateNames.add(name), undefinedPrivateNames.delete(name);
        }
        usePrivateName(name, loc) {
          let classScope;
          for (classScope of this.stack)
            if (classScope.privateNames.has(name)) return;
          classScope ? classScope.undefinedPrivateNames.set(name, loc) : this.parser.raise(Errors.InvalidPrivateFieldResolution, loc, {
            identifierName: name
          });
        }
      }, ExpressionScope = class {
        constructor(type = 0) {
          this.type = type;
        }
        canBeArrowParameterDeclaration() {
          return this.type === 2 || this.type === 1;
        }
        isCertainlyParameterDeclaration() {
          return this.type === 3;
        }
      }, ArrowHeadParsingScope = class extends ExpressionScope {
        constructor(type) {
          super(type), this.declarationErrors = /* @__PURE__ */ new Map();
        }
        recordDeclarationError(ParsingErrorClass, at) {
          let index = at.index;
          this.declarationErrors.set(index, [ParsingErrorClass, at]);
        }
        clearDeclarationError(index) {
          this.declarationErrors.delete(index);
        }
        iterateErrors(iterator) {
          this.declarationErrors.forEach(iterator);
        }
      }, ExpressionScopeHandler = class {
        constructor(parser) {
          this.parser = void 0, this.stack = [new ExpressionScope()], this.parser = parser;
        }
        enter(scope) {
          this.stack.push(scope);
        }
        exit() {
          this.stack.pop();
        }
        recordParameterInitializerError(toParseError, node) {
          let origin = node.loc.start, {
            stack
          } = this, i = stack.length - 1, scope = stack[i];
          for (; !scope.isCertainlyParameterDeclaration(); ) {
            if (scope.canBeArrowParameterDeclaration())
              scope.recordDeclarationError(toParseError, origin);
            else
              return;
            scope = stack[--i];
          }
          this.parser.raise(toParseError, origin);
        }
        recordArrowParameterBindingError(error, node) {
          let {
            stack
          } = this, scope = stack[stack.length - 1], origin = node.loc.start;
          if (scope.isCertainlyParameterDeclaration())
            this.parser.raise(error, origin);
          else if (scope.canBeArrowParameterDeclaration())
            scope.recordDeclarationError(error, origin);
          else
            return;
        }
        recordAsyncArrowParametersError(at) {
          let {
            stack
          } = this, i = stack.length - 1, scope = stack[i];
          for (; scope.canBeArrowParameterDeclaration(); )
            scope.type === 2 && scope.recordDeclarationError(Errors.AwaitBindingIdentifier, at), scope = stack[--i];
        }
        validateAsPattern() {
          let {
            stack
          } = this, currentScope = stack[stack.length - 1];
          currentScope.canBeArrowParameterDeclaration() && currentScope.iterateErrors(([toParseError, loc]) => {
            this.parser.raise(toParseError, loc);
            let i = stack.length - 2, scope = stack[i];
            for (; scope.canBeArrowParameterDeclaration(); )
              scope.clearDeclarationError(loc.index), scope = stack[--i];
          });
        }
      };
      function newParameterDeclarationScope() {
        return new ExpressionScope(3);
      }
      function newArrowHeadScope() {
        return new ArrowHeadParsingScope(1);
      }
      function newAsyncArrowScope() {
        return new ArrowHeadParsingScope(2);
      }
      function newExpressionScope() {
        return new ExpressionScope();
      }
      var UtilParser = class extends Tokenizer {
        addExtra(node, key, value, enumerable = !0) {
          if (!node) return;
          let {
            extra
          } = node;
          extra == null && (extra = {}, node.extra = extra), enumerable ? extra[key] = value : Object.defineProperty(extra, key, {
            enumerable,
            value
          });
        }
        isContextual(token) {
          return this.state.type === token && !this.state.containsEsc;
        }
        isUnparsedContextual(nameStart, name) {
          if (this.input.startsWith(name, nameStart)) {
            let nextCh = this.input.charCodeAt(nameStart + name.length);
            return !(isIdentifierChar(nextCh) || (nextCh & 64512) === 55296);
          }
          return !1;
        }
        isLookaheadContextual(name) {
          let next = this.nextTokenStart();
          return this.isUnparsedContextual(next, name);
        }
        eatContextual(token) {
          return this.isContextual(token) ? (this.next(), !0) : !1;
        }
        expectContextual(token, toParseError) {
          if (!this.eatContextual(token)) {
            if (toParseError != null)
              throw this.raise(toParseError, this.state.startLoc);
            this.unexpected(null, token);
          }
        }
        canInsertSemicolon() {
          return this.match(140) || this.match(8) || this.hasPrecedingLineBreak();
        }
        hasPrecedingLineBreak() {
          return hasNewLine(this.input, this.offsetToSourcePos(this.state.lastTokEndLoc.index), this.state.start);
        }
        hasFollowingLineBreak() {
          return hasNewLine(this.input, this.state.end, this.nextTokenStart());
        }
        isLineTerminator() {
          return this.eat(13) || this.canInsertSemicolon();
        }
        semicolon(allowAsi = !0) {
          (allowAsi ? this.isLineTerminator() : this.eat(13)) || this.raise(Errors.MissingSemicolon, this.state.lastTokEndLoc);
        }
        expect(type, loc) {
          this.eat(type) || this.unexpected(loc, type);
        }
        tryParse(fn, oldState = this.state.clone()) {
          let abortSignal = {
            node: null
          };
          try {
            let node = fn((node2 = null) => {
              throw abortSignal.node = node2, abortSignal;
            });
            if (this.state.errors.length > oldState.errors.length) {
              let failState = this.state;
              return this.state = oldState, this.state.tokensLength = failState.tokensLength, {
                node,
                error: failState.errors[oldState.errors.length],
                thrown: !1,
                aborted: !1,
                failState
              };
            }
            return {
              node,
              error: null,
              thrown: !1,
              aborted: !1,
              failState: null
            };
          } catch (error) {
            let failState = this.state;
            if (this.state = oldState, error instanceof SyntaxError)
              return {
                node: null,
                error,
                thrown: !0,
                aborted: !1,
                failState
              };
            if (error === abortSignal)
              return {
                node: abortSignal.node,
                error: null,
                thrown: !1,
                aborted: !0,
                failState
              };
            throw error;
          }
        }
        checkExpressionErrors(refExpressionErrors, andThrow) {
          if (!refExpressionErrors) return !1;
          let {
            shorthandAssignLoc,
            doubleProtoLoc,
            privateKeyLoc,
            optionalParametersLoc,
            voidPatternLoc
          } = refExpressionErrors, hasErrors = !!shorthandAssignLoc || !!doubleProtoLoc || !!optionalParametersLoc || !!privateKeyLoc || !!voidPatternLoc;
          if (!andThrow)
            return hasErrors;
          shorthandAssignLoc != null && this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc), doubleProtoLoc != null && this.raise(Errors.DuplicateProto, doubleProtoLoc), privateKeyLoc != null && this.raise(Errors.UnexpectedPrivateField, privateKeyLoc), optionalParametersLoc != null && this.unexpected(optionalParametersLoc), voidPatternLoc != null && this.raise(Errors.InvalidCoverDiscardElement, voidPatternLoc);
        }
        isLiteralPropertyName() {
          return tokenIsLiteralPropertyName(this.state.type);
        }
        isPrivateName(node) {
          return node.type === "PrivateName";
        }
        getPrivateNameSV(node) {
          return node.id.name;
        }
        hasPropertyAsPrivateName(node) {
          return (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && this.isPrivateName(node.property);
        }
        isObjectProperty(node) {
          return node.type === "ObjectProperty";
        }
        isObjectMethod(node) {
          return node.type === "ObjectMethod";
        }
        initializeScopes(inModule = this.options.sourceType === "module") {
          let oldLabels = this.state.labels;
          this.state.labels = [];
          let oldExportedIdentifiers = this.exportedIdentifiers;
          this.exportedIdentifiers = /* @__PURE__ */ new Set();
          let oldInModule = this.inModule;
          this.inModule = inModule;
          let oldScope = this.scope, ScopeHandler2 = this.getScopeHandler();
          this.scope = new ScopeHandler2(this, inModule);
          let oldProdParam = this.prodParam;
          this.prodParam = new ProductionParameterHandler();
          let oldClassScope = this.classScope;
          this.classScope = new ClassScopeHandler(this);
          let oldExpressionScope = this.expressionScope;
          return this.expressionScope = new ExpressionScopeHandler(this), () => {
            this.state.labels = oldLabels, this.exportedIdentifiers = oldExportedIdentifiers, this.inModule = oldInModule, this.scope = oldScope, this.prodParam = oldProdParam, this.classScope = oldClassScope, this.expressionScope = oldExpressionScope;
          };
        }
        enterInitialScopes() {
          let paramFlags = 0;
          (this.inModule || this.optionFlags & 1) && (paramFlags |= 2), this.optionFlags & 32 && (paramFlags |= 1);
          let isCommonJS = !this.inModule && this.options.sourceType === "commonjs";
          (isCommonJS || this.optionFlags & 2) && (paramFlags |= 4), this.prodParam.enter(paramFlags);
          let scopeFlags = isCommonJS ? 514 : 1;
          this.optionFlags & 4 && (scopeFlags |= 512), this.scope.enter(scopeFlags);
        }
        checkDestructuringPrivate(refExpressionErrors) {
          let {
            privateKeyLoc
          } = refExpressionErrors;
          privateKeyLoc !== null && this.expectPlugin("destructuringPrivate", privateKeyLoc);
        }
      }, ExpressionErrors = class {
        constructor() {
          this.shorthandAssignLoc = null, this.doubleProtoLoc = null, this.privateKeyLoc = null, this.optionalParametersLoc = null, this.voidPatternLoc = null;
        }
      }, Node = class {
        constructor(parser, pos, loc) {
          this.type = "", this.start = pos, this.end = 0, this.loc = new SourceLocation(loc), parser?.optionFlags & 128 && (this.range = [pos, 0]), parser != null && parser.filename && (this.loc.filename = parser.filename);
        }
      }, NodePrototype = Node.prototype;
      NodePrototype.__clone = function() {
        let newNode = new Node(void 0, this.start, this.loc.start), keys = Object.keys(this);
        for (let i = 0, length = keys.length; i < length; i++) {
          let key = keys[i];
          key !== "leadingComments" && key !== "trailingComments" && key !== "innerComments" && (newNode[key] = this[key]);
        }
        return newNode;
      };
      var NodeUtils = class extends UtilParser {
        startNode() {
          let loc = this.state.startLoc;
          return new Node(this, loc.index, loc);
        }
        startNodeAt(loc) {
          return new Node(this, loc.index, loc);
        }
        startNodeAtNode(type) {
          return this.startNodeAt(type.loc.start);
        }
        finishNode(node, type) {
          return this.finishNodeAt(node, type, this.state.lastTokEndLoc);
        }
        finishNodeAt(node, type, endLoc) {
          return node.type = type, node.end = endLoc.index, node.loc.end = endLoc, this.optionFlags & 128 && (node.range[1] = endLoc.index), this.optionFlags & 4096 && this.processComment(node), node;
        }
        resetStartLocation(node, startLoc) {
          node.start = startLoc.index, node.loc.start = startLoc, this.optionFlags & 128 && (node.range[0] = startLoc.index);
        }
        resetEndLocation(node, endLoc = this.state.lastTokEndLoc) {
          node.end = endLoc.index, node.loc.end = endLoc, this.optionFlags & 128 && (node.range[1] = endLoc.index);
        }
        resetStartLocationFromNode(node, locationNode) {
          this.resetStartLocation(node, locationNode.loc.start);
        }
        castNodeTo(node, type) {
          return node.type = type, node;
        }
        cloneIdentifier(node) {
          let {
            type,
            start,
            end,
            loc,
            range,
            name
          } = node, cloned = Object.create(NodePrototype);
          return cloned.type = type, cloned.start = start, cloned.end = end, cloned.loc = loc, cloned.range = range, cloned.name = name, node.extra && (cloned.extra = node.extra), cloned;
        }
        cloneStringLiteral(node) {
          let {
            type,
            start,
            end,
            loc,
            range,
            extra
          } = node, cloned = Object.create(NodePrototype);
          return cloned.type = type, cloned.start = start, cloned.end = end, cloned.loc = loc, cloned.range = range, cloned.extra = extra, cloned.value = node.value, cloned;
        }
      }, unwrapParenthesizedExpression = (node) => node.type === "ParenthesizedExpression" ? unwrapParenthesizedExpression(node.expression) : node, LValParser = class extends NodeUtils {
        toAssignable(node, isLHS = !1) {
          var _node$extra, _node$extra3;
          let parenthesized;
          switch ((node.type === "ParenthesizedExpression" || (_node$extra = node.extra) != null && _node$extra.parenthesized) && (parenthesized = unwrapParenthesizedExpression(node), isLHS ? parenthesized.type === "Identifier" ? this.expressionScope.recordArrowParameterBindingError(Errors.InvalidParenthesizedAssignment, node) : parenthesized.type !== "CallExpression" && parenthesized.type !== "MemberExpression" && !this.isOptionalMemberExpression(parenthesized) && this.raise(Errors.InvalidParenthesizedAssignment, node) : this.raise(Errors.InvalidParenthesizedAssignment, node)), node.type) {
            case "Identifier":
            case "ObjectPattern":
            case "ArrayPattern":
            case "AssignmentPattern":
            case "RestElement":
            case "VoidPattern":
              break;
            case "ObjectExpression":
              this.castNodeTo(node, "ObjectPattern");
              for (let i = 0, length = node.properties.length, last = length - 1; i < length; i++) {
                var _node$extra2;
                let prop = node.properties[i], isLast = i === last;
                this.toAssignableObjectExpressionProp(prop, isLast, isLHS), isLast && prop.type === "RestElement" && (_node$extra2 = node.extra) != null && _node$extra2.trailingCommaLoc && this.raise(Errors.RestTrailingComma, node.extra.trailingCommaLoc);
              }
              break;
            case "ObjectProperty": {
              let {
                key,
                value
              } = node;
              this.isPrivateName(key) && this.classScope.usePrivateName(this.getPrivateNameSV(key), key.loc.start), this.toAssignable(value, isLHS);
              break;
            }
            case "SpreadElement":
              throw new Error("Internal @babel/parser error (this is a bug, please report it). SpreadElement should be converted by .toAssignable's caller.");
            case "ArrayExpression":
              this.castNodeTo(node, "ArrayPattern"), this.toAssignableList(node.elements, (_node$extra3 = node.extra) == null ? void 0 : _node$extra3.trailingCommaLoc, isLHS);
              break;
            case "AssignmentExpression":
              node.operator !== "=" && this.raise(Errors.MissingEqInAssignment, node.left.loc.end), this.castNodeTo(node, "AssignmentPattern"), delete node.operator, node.left.type === "VoidPattern" && this.raise(Errors.VoidPatternInitializer, node.left), this.toAssignable(node.left, isLHS);
              break;
            case "ParenthesizedExpression":
              this.toAssignable(parenthesized, isLHS);
              break;
          }
        }
        toAssignableObjectExpressionProp(prop, isLast, isLHS) {
          if (prop.type === "ObjectMethod")
            this.raise(prop.kind === "get" || prop.kind === "set" ? Errors.PatternHasAccessor : Errors.PatternHasMethod, prop.key);
          else if (prop.type === "SpreadElement") {
            this.castNodeTo(prop, "RestElement");
            let arg = prop.argument;
            this.checkToRestConversion(arg, !1), this.toAssignable(arg, isLHS), isLast || this.raise(Errors.RestTrailingComma, prop);
          } else
            this.toAssignable(prop, isLHS);
        }
        toAssignableList(exprList, trailingCommaLoc, isLHS) {
          let end = exprList.length - 1;
          for (let i = 0; i <= end; i++) {
            let elt = exprList[i];
            elt && (this.toAssignableListItem(exprList, i, isLHS), elt.type === "RestElement" && (i < end ? this.raise(Errors.RestTrailingComma, elt) : trailingCommaLoc && this.raise(Errors.RestTrailingComma, trailingCommaLoc)));
          }
        }
        toAssignableListItem(exprList, index, isLHS) {
          let node = exprList[index];
          if (node.type === "SpreadElement") {
            this.castNodeTo(node, "RestElement");
            let arg = node.argument;
            this.checkToRestConversion(arg, !0), this.toAssignable(arg, isLHS);
          } else
            this.toAssignable(node, isLHS);
        }
        isAssignable(node, isBinding) {
          switch (node.type) {
            case "Identifier":
            case "ObjectPattern":
            case "ArrayPattern":
            case "AssignmentPattern":
            case "RestElement":
            case "VoidPattern":
              return !0;
            case "ObjectExpression": {
              let last = node.properties.length - 1;
              return node.properties.every((prop, i) => prop.type !== "ObjectMethod" && (i === last || prop.type !== "SpreadElement") && this.isAssignable(prop));
            }
            case "ObjectProperty":
              return this.isAssignable(node.value);
            case "SpreadElement":
              return this.isAssignable(node.argument);
            case "ArrayExpression":
              return node.elements.every((element) => element === null || this.isAssignable(element));
            case "AssignmentExpression":
              return node.operator === "=";
            case "ParenthesizedExpression":
              return this.isAssignable(node.expression);
            case "MemberExpression":
            case "OptionalMemberExpression":
              return !isBinding;
            default:
              return !1;
          }
        }
        toReferencedList(exprList, isParenthesizedExpr) {
          return exprList;
        }
        toReferencedListDeep(exprList, isParenthesizedExpr) {
          this.toReferencedList(exprList, isParenthesizedExpr);
          for (let expr of exprList)
            expr?.type === "ArrayExpression" && this.toReferencedListDeep(expr.elements);
        }
        parseSpread(refExpressionErrors) {
          let node = this.startNode();
          return this.next(), node.argument = this.parseMaybeAssignAllowIn(refExpressionErrors, void 0), this.finishNode(node, "SpreadElement");
        }
        parseRestBinding() {
          let node = this.startNode();
          this.next();
          let argument = this.parseBindingAtom();
          return argument.type === "VoidPattern" && this.raise(Errors.UnexpectedVoidPattern, argument), node.argument = argument, this.finishNode(node, "RestElement");
        }
        parseBindingAtom() {
          switch (this.state.type) {
            case 0: {
              let node = this.startNode();
              return this.next(), node.elements = this.parseBindingList(3, 93, 1), this.finishNode(node, "ArrayPattern");
            }
            case 5:
              return this.parseObjectLike(8, !0);
            case 88:
              return this.parseVoidPattern(null);
          }
          return this.parseIdentifier();
        }
        parseBindingList(close, closeCharCode, flags) {
          let allowEmpty = flags & 1, elts = [], first = !0;
          for (; !this.eat(close); )
            if (first ? first = !1 : this.expect(12), allowEmpty && this.match(12))
              elts.push(null);
            else {
              if (this.eat(close))
                break;
              if (this.match(21)) {
                let rest = this.parseRestBinding();
                if ((this.hasPlugin("flow") || flags & 2) && (rest = this.parseFunctionParamType(rest)), elts.push(rest), !this.checkCommaAfterRest(closeCharCode)) {
                  this.expect(close);
                  break;
                }
              } else {
                let decorators = [];
                if (flags & 2)
                  for (this.match(26) && this.hasPlugin("decorators") && this.raise(Errors.UnsupportedParameterDecorator, this.state.startLoc); this.match(26); )
                    decorators.push(this.parseDecorator());
                elts.push(this.parseBindingElement(flags, decorators));
              }
            }
          return elts;
        }
        parseBindingRestProperty(prop) {
          return this.next(), this.hasPlugin("discardBinding") && this.match(88) ? (prop.argument = this.parseVoidPattern(null), this.raise(Errors.UnexpectedVoidPattern, prop.argument)) : prop.argument = this.parseIdentifier(), this.checkCommaAfterRest(125), this.finishNode(prop, "RestElement");
        }
        parseBindingProperty() {
          let {
            type,
            startLoc
          } = this.state;
          if (type === 21)
            return this.parseBindingRestProperty(this.startNode());
          let prop = this.startNode();
          return type === 139 ? (this.expectPlugin("destructuringPrivate", startLoc), this.classScope.usePrivateName(this.state.value, startLoc), prop.key = this.parsePrivateName()) : this.parsePropertyName(prop), prop.method = !1, this.parseObjPropValue(prop, startLoc, !1, !1, !0, !1);
        }
        parseBindingElement(flags, decorators) {
          let left = this.parseMaybeDefault();
          return (this.hasPlugin("flow") || flags & 2) && this.parseFunctionParamType(left), decorators.length && (left.decorators = decorators, this.resetStartLocationFromNode(left, decorators[0])), this.parseMaybeDefault(left.loc.start, left);
        }
        parseFunctionParamType(param) {
          return param;
        }
        parseMaybeDefault(startLoc, left) {
          if (startLoc ?? (startLoc = this.state.startLoc), left = left ?? this.parseBindingAtom(), !this.eat(29)) return left;
          let node = this.startNodeAt(startLoc);
          return left.type === "VoidPattern" && this.raise(Errors.VoidPatternInitializer, left), node.left = left, node.right = this.parseMaybeAssignAllowIn(), this.finishNode(node, "AssignmentPattern");
        }
        isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding) {
          switch (type) {
            case "AssignmentPattern":
              return "left";
            case "RestElement":
              return "argument";
            case "ObjectProperty":
              return "value";
            case "ParenthesizedExpression":
              return "expression";
            case "ArrayPattern":
              return "elements";
            case "ObjectPattern":
              return "properties";
            case "VoidPattern":
              return !0;
            case "CallExpression":
              if (!disallowCallExpression && !this.state.strict && this.optionFlags & 8192)
                return !0;
          }
          return !1;
        }
        isOptionalMemberExpression(expression) {
          return expression.type === "OptionalMemberExpression";
        }
        checkLVal(expression, ancestor, binding = 64, checkClashes = !1, strictModeChanged = !1, hasParenthesizedAncestor = !1, disallowCallExpression = !1) {
          var _expression$extra;
          let type = expression.type;
          if (this.isObjectMethod(expression)) return;
          let isOptionalMemberExpression = this.isOptionalMemberExpression(expression);
          if (isOptionalMemberExpression || type === "MemberExpression") {
            isOptionalMemberExpression && (this.expectPlugin("optionalChainingAssign", expression.loc.start), ancestor.type !== "AssignmentExpression" && this.raise(Errors.InvalidLhsOptionalChaining, expression, {
              ancestor
            })), binding !== 64 && this.raise(Errors.InvalidPropertyBindingPattern, expression);
            return;
          }
          if (type === "Identifier") {
            this.checkIdentifier(expression, binding, strictModeChanged);
            let {
              name
            } = expression;
            checkClashes && (checkClashes.has(name) ? this.raise(Errors.ParamDupe, expression) : checkClashes.add(name));
            return;
          } else type === "VoidPattern" && ancestor.type === "CatchClause" && this.raise(Errors.VoidPatternCatchClauseParam, expression);
          let unwrappedExpression = unwrapParenthesizedExpression(expression);
          disallowCallExpression || (disallowCallExpression = unwrappedExpression.type === "CallExpression" && (unwrappedExpression.callee.type === "Import" || unwrappedExpression.callee.type === "Super"));
          let validity = this.isValidLVal(type, disallowCallExpression, !(hasParenthesizedAncestor || (_expression$extra = expression.extra) != null && _expression$extra.parenthesized) && ancestor.type === "AssignmentExpression", binding);
          if (validity === !0) return;
          if (validity === !1) {
            let ParseErrorClass = binding === 64 ? Errors.InvalidLhs : Errors.InvalidLhsBinding;
            this.raise(ParseErrorClass, expression, {
              ancestor
            });
            return;
          }
          let key, isParenthesizedExpression;
          typeof validity == "string" ? (key = validity, isParenthesizedExpression = type === "ParenthesizedExpression") : [key, isParenthesizedExpression] = validity;
          let nextAncestor = type === "ArrayPattern" || type === "ObjectPattern" ? {
            type
          } : ancestor, val = expression[key];
          if (Array.isArray(val))
            for (let child of val)
              child && this.checkLVal(child, nextAncestor, binding, checkClashes, strictModeChanged, isParenthesizedExpression, !0);
          else val && this.checkLVal(val, nextAncestor, binding, checkClashes, strictModeChanged, isParenthesizedExpression, disallowCallExpression);
        }
        checkIdentifier(at, bindingType, strictModeChanged = !1) {
          this.state.strict && (strictModeChanged ? isStrictBindReservedWord(at.name, this.inModule) : isStrictBindOnlyReservedWord(at.name)) && (bindingType === 64 ? this.raise(Errors.StrictEvalArguments, at, {
            referenceName: at.name
          }) : this.raise(Errors.StrictEvalArgumentsBinding, at, {
            bindingName: at.name
          })), bindingType & 8192 && at.name === "let" && this.raise(Errors.LetInLexicalBinding, at), bindingType & 64 || this.declareNameFromIdentifier(at, bindingType);
        }
        declareNameFromIdentifier(identifier, binding) {
          this.scope.declareName(identifier.name, binding, identifier.loc.start);
        }
        checkToRestConversion(node, allowPattern) {
          switch (node.type) {
            case "ParenthesizedExpression":
              this.checkToRestConversion(node.expression, allowPattern);
              break;
            case "Identifier":
            case "MemberExpression":
              break;
            case "ArrayExpression":
            case "ObjectExpression":
              if (allowPattern) break;
            default:
              this.raise(Errors.InvalidRestAssignmentPattern, node);
          }
        }
        checkCommaAfterRest(close) {
          return this.match(12) ? (this.raise(this.lookaheadCharCode() === close ? Errors.RestTrailingComma : Errors.ElementAfterRest, this.state.startLoc), !0) : !1;
        }
      }, keywordAndTSRelationalOperator = /in(?:stanceof)?|as|satisfies/y;
      function nonNull(x) {
        if (x == null)
          throw new Error(`Unexpected ${x} value.`);
        return x;
      }
      function assert(x) {
        if (!x)
          throw new Error("Assert fail");
      }
      var TSErrors = ParseErrorEnum`typescript`({
        AbstractMethodHasImplementation: ({
          methodName
        }) => `Method '${methodName}' cannot have an implementation because it is marked abstract.`,
        AbstractPropertyHasInitializer: ({
          propertyName
        }) => `Property '${propertyName}' cannot have an initializer because it is marked abstract.`,
        AccessorCannotBeOptional: "An 'accessor' property cannot be declared optional.",
        AccessorCannotDeclareThisParameter: "'get' and 'set' accessors cannot declare 'this' parameters.",
        AccessorCannotHaveTypeParameters: "An accessor cannot have type parameters.",
        ClassMethodHasDeclare: "Class methods cannot have the 'declare' modifier.",
        ClassMethodHasReadonly: "Class methods cannot have the 'readonly' modifier.",
        ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference: "A 'const' initializer in an ambient context must be a string or numeric literal or literal enum reference.",
        ConstructorHasTypeParameters: "Type parameters cannot appear on a constructor declaration.",
        DeclareAccessor: ({
          kind
        }) => `'declare' is not allowed in ${kind}ters.`,
        DeclareClassFieldHasInitializer: "Initializers are not allowed in ambient contexts.",
        DeclareFunctionHasImplementation: "An implementation cannot be declared in ambient contexts.",
        DuplicateAccessibilityModifier: ({
          modifier
        }) => `Accessibility modifier already seen: '${modifier}'.`,
        DuplicateModifier: ({
          modifier
        }) => `Duplicate modifier: '${modifier}'.`,
        EmptyHeritageClauseType: ({
          token
        }) => `'${token}' list cannot be empty.`,
        EmptyTypeArguments: "Type argument list cannot be empty.",
        EmptyTypeParameters: "Type parameter list cannot be empty.",
        ExpectedAmbientAfterExportDeclare: "'export declare' must be followed by an ambient declaration.",
        ImportAliasHasImportType: "An import alias can not use 'import type'.",
        ImportReflectionHasImportType: "An `import module` declaration can not use `type` modifier",
        IncompatibleModifiers: ({
          modifiers
        }) => `'${modifiers[0]}' modifier cannot be used with '${modifiers[1]}' modifier.`,
        IndexSignatureHasAbstract: "Index signatures cannot have the 'abstract' modifier.",
        IndexSignatureHasAccessibility: ({
          modifier
        }) => `Index signatures cannot have an accessibility modifier ('${modifier}').`,
        IndexSignatureHasDeclare: "Index signatures cannot have the 'declare' modifier.",
        IndexSignatureHasOverride: "'override' modifier cannot appear on an index signature.",
        IndexSignatureHasStatic: "Index signatures cannot have the 'static' modifier.",
        InitializerNotAllowedInAmbientContext: "Initializers are not allowed in ambient contexts.",
        InvalidHeritageClauseType: ({
          token
        }) => `'${token}' list can only include identifiers or qualified-names with optional type arguments.`,
        InvalidModifierOnAwaitUsingDeclaration: (modifier) => `'${modifier}' modifier cannot appear on an await using declaration.`,
        InvalidModifierOnTypeMember: ({
          modifier
        }) => `'${modifier}' modifier cannot appear on a type member.`,
        InvalidModifierOnTypeParameter: ({
          modifier
        }) => `'${modifier}' modifier cannot appear on a type parameter.`,
        InvalidModifierOnTypeParameterPositions: ({
          modifier
        }) => `'${modifier}' modifier can only appear on a type parameter of a class, interface or type alias.`,
        InvalidModifierOnUsingDeclaration: (modifier) => `'${modifier}' modifier cannot appear on a using declaration.`,
        InvalidModifiersOrder: ({
          orderedModifiers
        }) => `'${orderedModifiers[0]}' modifier must precede '${orderedModifiers[1]}' modifier.`,
        InvalidPropertyAccessAfterInstantiationExpression: "Invalid property access after an instantiation expression. You can either wrap the instantiation expression in parentheses, or delete the type arguments.",
        InvalidTupleMemberLabel: "Tuple members must be labeled with a simple identifier.",
        MissingInterfaceName: "'interface' declarations must be followed by an identifier.",
        NonAbstractClassHasAbstractMethod: "Abstract methods can only appear within an abstract class.",
        NonClassMethodPropertyHasAbstractModifier: "'abstract' modifier can only appear on a class, method, or property declaration.",
        OptionalTypeBeforeRequired: "A required element cannot follow an optional element.",
        OverrideNotInSubClass: "This member cannot have an 'override' modifier because its containing class does not extend another class.",
        PatternIsOptional: "A binding pattern parameter cannot be optional in an implementation signature.",
        PrivateElementHasAbstract: "Private elements cannot have the 'abstract' modifier.",
        PrivateElementHasAccessibility: ({
          modifier
        }) => `Private elements cannot have an accessibility modifier ('${modifier}').`,
        ReadonlyForMethodSignature: "'readonly' modifier can only appear on a property declaration or index signature.",
        ReservedArrowTypeParam: "This syntax is reserved in files with the .mts or .cts extension. Add a trailing comma, as in `<T,>() => ...`.",
        ReservedTypeAssertion: "This syntax is reserved in files with the .mts or .cts extension. Use an `as` expression instead.",
        SetAccessorCannotHaveOptionalParameter: "A 'set' accessor cannot have an optional parameter.",
        SetAccessorCannotHaveRestParameter: "A 'set' accessor cannot have rest parameter.",
        SetAccessorCannotHaveReturnType: "A 'set' accessor cannot have a return type annotation.",
        SingleTypeParameterWithoutTrailingComma: ({
          typeParameterName
        }) => `Single type parameter ${typeParameterName} should have a trailing comma. Example usage: <${typeParameterName},>.`,
        StaticBlockCannotHaveModifier: "Static class blocks cannot have any modifier.",
        TupleOptionalAfterType: "A labeled tuple optional element must be declared using a question mark after the name and before the colon (`name?: type`), rather than after the type (`name: type?`).",
        TypeAnnotationAfterAssign: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
        TypeImportCannotSpecifyDefaultAndNamed: "A type-only import can specify a default import or named bindings, but not both.",
        TypeModifierIsUsedInTypeExports: "The 'type' modifier cannot be used on a named export when 'export type' is used on its export statement.",
        TypeModifierIsUsedInTypeImports: "The 'type' modifier cannot be used on a named import when 'import type' is used on its import statement.",
        UnexpectedParameterModifier: "A parameter property is only allowed in a constructor implementation.",
        UnexpectedReadonly: "'readonly' type modifier is only permitted on array and tuple literal types.",
        UnexpectedTypeAnnotation: "Did not expect a type annotation here.",
        UnexpectedTypeCastInParameter: "Unexpected type cast in parameter position.",
        UnsupportedImportTypeArgument: "Argument in a type import must be a string literal.",
        UnsupportedParameterPropertyKind: "A parameter property may not be declared using a binding pattern.",
        UnsupportedSignatureParameterKind: ({
          type
        }) => `Name in a signature must be an Identifier, ObjectPattern or ArrayPattern, instead got ${type}.`,
        UsingDeclarationInAmbientContext: (kind) => `'${kind}' declarations are not allowed in ambient contexts.`
      });
      function keywordTypeFromName(value) {
        switch (value) {
          case "any":
            return "TSAnyKeyword";
          case "boolean":
            return "TSBooleanKeyword";
          case "bigint":
            return "TSBigIntKeyword";
          case "never":
            return "TSNeverKeyword";
          case "number":
            return "TSNumberKeyword";
          case "object":
            return "TSObjectKeyword";
          case "string":
            return "TSStringKeyword";
          case "symbol":
            return "TSSymbolKeyword";
          case "undefined":
            return "TSUndefinedKeyword";
          case "unknown":
            return "TSUnknownKeyword";
          default:
            return;
        }
      }
      function tsIsAccessModifier(modifier) {
        return modifier === "private" || modifier === "public" || modifier === "protected";
      }
      function tsIsVarianceAnnotations(modifier) {
        return modifier === "in" || modifier === "out";
      }
      var typescript = (superClass) => class extends superClass {
        constructor(...args) {
          super(...args), this.tsParseInOutModifiers = this.tsParseModifiers.bind(this, {
            allowedModifiers: ["in", "out"],
            disallowedModifiers: ["const", "public", "private", "protected", "readonly", "declare", "abstract", "override"],
            errorTemplate: TSErrors.InvalidModifierOnTypeParameter
          }), this.tsParseConstModifier = this.tsParseModifiers.bind(this, {
            allowedModifiers: ["const"],
            disallowedModifiers: ["in", "out"],
            errorTemplate: TSErrors.InvalidModifierOnTypeParameterPositions
          }), this.tsParseInOutConstModifiers = this.tsParseModifiers.bind(this, {
            allowedModifiers: ["in", "out", "const"],
            disallowedModifiers: ["public", "private", "protected", "readonly", "declare", "abstract", "override"],
            errorTemplate: TSErrors.InvalidModifierOnTypeParameter
          });
        }
        getScopeHandler() {
          return TypeScriptScopeHandler;
        }
        tsIsIdentifier() {
          return tokenIsIdentifier(this.state.type);
        }
        tsTokenCanFollowModifier() {
          return this.match(0) || this.match(5) || this.match(55) || this.match(21) || this.match(139) || this.isLiteralPropertyName();
        }
        tsNextTokenOnSameLineAndCanFollowModifier() {
          return this.next(), this.hasPrecedingLineBreak() ? !1 : this.tsTokenCanFollowModifier();
        }
        tsNextTokenCanFollowModifier() {
          return this.match(106) ? (this.next(), this.tsTokenCanFollowModifier()) : this.tsNextTokenOnSameLineAndCanFollowModifier();
        }
        tsParseModifier(allowedModifiers, stopOnStartOfClassStaticBlock, hasSeenStaticModifier) {
          if (!tokenIsIdentifier(this.state.type) && this.state.type !== 58 && this.state.type !== 75)
            return;
          let modifier = this.state.value;
          if (allowedModifiers.includes(modifier)) {
            if (hasSeenStaticModifier && this.match(106) || stopOnStartOfClassStaticBlock && this.tsIsStartOfStaticBlocks())
              return;
            if (this.tsTryParse(this.tsNextTokenCanFollowModifier.bind(this)))
              return modifier;
          }
        }
        tsParseModifiers({
          allowedModifiers,
          disallowedModifiers,
          stopOnStartOfClassStaticBlock,
          errorTemplate = TSErrors.InvalidModifierOnTypeMember
        }, modified) {
          let enforceOrder = (loc, modifier, before, after) => {
            modifier === before && modified[after] && this.raise(TSErrors.InvalidModifiersOrder, loc, {
              orderedModifiers: [before, after]
            });
          }, incompatible = (loc, modifier, mod1, mod2) => {
            (modified[mod1] && modifier === mod2 || modified[mod2] && modifier === mod1) && this.raise(TSErrors.IncompatibleModifiers, loc, {
              modifiers: [mod1, mod2]
            });
          };
          for (; ; ) {
            let {
              startLoc
            } = this.state, modifier = this.tsParseModifier(allowedModifiers.concat(disallowedModifiers ?? []), stopOnStartOfClassStaticBlock, modified.static);
            if (!modifier) break;
            tsIsAccessModifier(modifier) ? modified.accessibility ? this.raise(TSErrors.DuplicateAccessibilityModifier, startLoc, {
              modifier
            }) : (enforceOrder(startLoc, modifier, modifier, "override"), enforceOrder(startLoc, modifier, modifier, "static"), enforceOrder(startLoc, modifier, modifier, "readonly"), modified.accessibility = modifier) : tsIsVarianceAnnotations(modifier) ? (modified[modifier] && this.raise(TSErrors.DuplicateModifier, startLoc, {
              modifier
            }), modified[modifier] = !0, enforceOrder(startLoc, modifier, "in", "out")) : (hasOwnProperty.call(modified, modifier) ? this.raise(TSErrors.DuplicateModifier, startLoc, {
              modifier
            }) : (enforceOrder(startLoc, modifier, "static", "readonly"), enforceOrder(startLoc, modifier, "static", "override"), enforceOrder(startLoc, modifier, "override", "readonly"), enforceOrder(startLoc, modifier, "abstract", "override"), incompatible(startLoc, modifier, "declare", "override"), incompatible(startLoc, modifier, "static", "abstract")), modified[modifier] = !0), disallowedModifiers != null && disallowedModifiers.includes(modifier) && this.raise(errorTemplate, startLoc, {
              modifier
            });
          }
        }
        tsIsListTerminator(kind) {
          switch (kind) {
            case "EnumMembers":
            case "TypeMembers":
              return this.match(8);
            case "HeritageClauseElement":
              return this.match(5);
            case "TupleElementTypes":
              return this.match(3);
            case "TypeParametersOrArguments":
              return this.match(48);
          }
        }
        tsParseList(kind, parseElement) {
          let result = [];
          for (; !this.tsIsListTerminator(kind); )
            result.push(parseElement());
          return result;
        }
        tsParseDelimitedList(kind, parseElement, refTrailingCommaPos) {
          return nonNull(this.tsParseDelimitedListWorker(kind, parseElement, !0, refTrailingCommaPos));
        }
        tsParseDelimitedListWorker(kind, parseElement, expectSuccess, refTrailingCommaPos) {
          let result = [], trailingCommaPos = -1;
          for (; !this.tsIsListTerminator(kind); ) {
            trailingCommaPos = -1;
            let element = parseElement();
            if (element == null)
              return;
            if (result.push(element), this.eat(12)) {
              trailingCommaPos = this.state.lastTokStartLoc.index;
              continue;
            }
            if (this.tsIsListTerminator(kind))
              break;
            expectSuccess && this.expect(12);
            return;
          }
          return refTrailingCommaPos && (refTrailingCommaPos.value = trailingCommaPos), result;
        }
        tsParseBracketedList(kind, parseElement, bracket, skipFirstToken, refTrailingCommaPos) {
          skipFirstToken || (bracket ? this.expect(0) : this.expect(47));
          let result = this.tsParseDelimitedList(kind, parseElement, refTrailingCommaPos);
          return bracket ? this.expect(3) : this.expect(48), result;
        }
        tsParseImportType() {
          let node = this.startNode();
          return this.expect(83), this.expect(10), this.match(134) ? node.argument = this.parseStringLiteral(this.state.value) : (this.raise(TSErrors.UnsupportedImportTypeArgument, this.state.startLoc), node.argument = super.parseExprAtom()), this.eat(12) ? node.options = this.tsParseImportTypeOptions() : node.options = null, this.expect(11), this.eat(16) && (node.qualifier = this.tsParseEntityName(3)), this.match(47) && (node.typeParameters = this.tsParseTypeArguments()), this.finishNode(node, "TSImportType");
        }
        tsParseImportTypeOptions() {
          let node = this.startNode();
          this.expect(5);
          let withProperty = this.startNode();
          return this.isContextual(76) ? (withProperty.method = !1, withProperty.key = this.parseIdentifier(!0), withProperty.computed = !1, withProperty.shorthand = !1) : this.unexpected(null, 76), this.expect(14), withProperty.value = this.tsParseImportTypeWithPropertyValue(), node.properties = [this.finishObjectProperty(withProperty)], this.eat(12), this.expect(8), this.finishNode(node, "ObjectExpression");
        }
        tsParseImportTypeWithPropertyValue() {
          let node = this.startNode(), properties = [];
          for (this.expect(5); !this.match(8); ) {
            let type = this.state.type;
            tokenIsIdentifier(type) || type === 134 ? properties.push(super.parsePropertyDefinition(null)) : this.unexpected(), this.eat(12);
          }
          return node.properties = properties, this.next(), this.finishNode(node, "ObjectExpression");
        }
        tsParseEntityName(flags) {
          let entity;
          if (flags & 1 && this.match(78))
            if (flags & 2)
              entity = this.parseIdentifier(!0);
            else {
              let node = this.startNode();
              this.next(), entity = this.finishNode(node, "ThisExpression");
            }
          else
            entity = this.parseIdentifier(!!(flags & 1));
          for (; this.eat(16); ) {
            let node = this.startNodeAtNode(entity);
            node.left = entity, node.right = this.parseIdentifier(!!(flags & 1)), entity = this.finishNode(node, "TSQualifiedName");
          }
          return entity;
        }
        tsParseTypeReference() {
          let node = this.startNode();
          return node.typeName = this.tsParseEntityName(1), !this.hasPrecedingLineBreak() && this.match(47) && (node.typeParameters = this.tsParseTypeArguments()), this.finishNode(node, "TSTypeReference");
        }
        tsParseThisTypePredicate(lhs) {
          this.next();
          let node = this.startNodeAtNode(lhs);
          return node.parameterName = lhs, node.typeAnnotation = this.tsParseTypeAnnotation(!1), node.asserts = !1, this.finishNode(node, "TSTypePredicate");
        }
        tsParseThisTypeNode() {
          let node = this.startNode();
          return this.next(), this.finishNode(node, "TSThisType");
        }
        tsParseTypeQuery() {
          let node = this.startNode();
          return this.expect(87), this.match(83) ? node.exprName = this.tsParseImportType() : node.exprName = this.tsParseEntityName(3), !this.hasPrecedingLineBreak() && this.match(47) && (node.typeParameters = this.tsParseTypeArguments()), this.finishNode(node, "TSTypeQuery");
        }
        tsParseTypeParameter(parseModifiers) {
          let node = this.startNode();
          return parseModifiers(node), node.name = this.tsParseTypeParameterName(), node.constraint = this.tsEatThenParseType(81), node.default = this.tsEatThenParseType(29), this.finishNode(node, "TSTypeParameter");
        }
        tsTryParseTypeParameters(parseModifiers) {
          if (this.match(47))
            return this.tsParseTypeParameters(parseModifiers);
        }
        tsParseTypeParameters(parseModifiers) {
          let node = this.startNode();
          this.match(47) || this.match(143) ? this.next() : this.unexpected();
          let refTrailingCommaPos = {
            value: -1
          };
          return node.params = this.tsParseBracketedList("TypeParametersOrArguments", this.tsParseTypeParameter.bind(this, parseModifiers), !1, !0, refTrailingCommaPos), node.params.length === 0 && this.raise(TSErrors.EmptyTypeParameters, node), refTrailingCommaPos.value !== -1 && this.addExtra(node, "trailingComma", refTrailingCommaPos.value), this.finishNode(node, "TSTypeParameterDeclaration");
        }
        tsFillSignature(returnToken, signature) {
          let returnTokenRequired = returnToken === 19, paramsKey = "parameters", returnTypeKey = "typeAnnotation";
          signature.typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier), this.expect(10), signature[paramsKey] = this.tsParseBindingListForSignature(), returnTokenRequired ? signature[returnTypeKey] = this.tsParseTypeOrTypePredicateAnnotation(returnToken) : this.match(returnToken) && (signature[returnTypeKey] = this.tsParseTypeOrTypePredicateAnnotation(returnToken));
        }
        tsParseBindingListForSignature() {
          let list = super.parseBindingList(11, 41, 2);
          for (let pattern of list) {
            let {
              type
            } = pattern;
            (type === "AssignmentPattern" || type === "TSParameterProperty") && this.raise(TSErrors.UnsupportedSignatureParameterKind, pattern, {
              type
            });
          }
          return list;
        }
        tsParseTypeMemberSemicolon() {
          !this.eat(12) && !this.isLineTerminator() && this.expect(13);
        }
        tsParseSignatureMember(kind, node) {
          return this.tsFillSignature(14, node), this.tsParseTypeMemberSemicolon(), this.finishNode(node, kind);
        }
        tsIsUnambiguouslyIndexSignature() {
          return this.next(), tokenIsIdentifier(this.state.type) ? (this.next(), this.match(14)) : !1;
        }
        tsTryParseIndexSignature(node) {
          if (!(this.match(0) && this.tsLookAhead(this.tsIsUnambiguouslyIndexSignature.bind(this))))
            return;
          this.expect(0);
          let id = this.parseIdentifier();
          id.typeAnnotation = this.tsParseTypeAnnotation(), this.resetEndLocation(id), this.expect(3), node.parameters = [id];
          let type = this.tsTryParseTypeAnnotation();
          return type && (node.typeAnnotation = type), this.tsParseTypeMemberSemicolon(), this.finishNode(node, "TSIndexSignature");
        }
        tsParsePropertyOrMethodSignature(node, readonly) {
          if (this.eat(17) && (node.optional = !0), this.match(10) || this.match(47)) {
            readonly && this.raise(TSErrors.ReadonlyForMethodSignature, node);
            let method = node;
            method.kind && this.match(47) && this.raise(TSErrors.AccessorCannotHaveTypeParameters, this.state.curPosition()), this.tsFillSignature(14, method), this.tsParseTypeMemberSemicolon();
            let paramsKey = "parameters", returnTypeKey = "typeAnnotation";
            if (method.kind === "get")
              method[paramsKey].length > 0 && (this.raise(Errors.BadGetterArity, this.state.curPosition()), this.isThisParam(method[paramsKey][0]) && this.raise(TSErrors.AccessorCannotDeclareThisParameter, this.state.curPosition()));
            else if (method.kind === "set") {
              if (method[paramsKey].length !== 1)
                this.raise(Errors.BadSetterArity, this.state.curPosition());
              else {
                let firstParameter = method[paramsKey][0];
                this.isThisParam(firstParameter) && this.raise(TSErrors.AccessorCannotDeclareThisParameter, this.state.curPosition()), firstParameter.type === "Identifier" && firstParameter.optional && this.raise(TSErrors.SetAccessorCannotHaveOptionalParameter, this.state.curPosition()), firstParameter.type === "RestElement" && this.raise(TSErrors.SetAccessorCannotHaveRestParameter, this.state.curPosition());
              }
              method[returnTypeKey] && this.raise(TSErrors.SetAccessorCannotHaveReturnType, method[returnTypeKey]);
            } else
              method.kind = "method";
            return this.finishNode(method, "TSMethodSignature");
          } else {
            let property = node;
            readonly && (property.readonly = !0);
            let type = this.tsTryParseTypeAnnotation();
            return type && (property.typeAnnotation = type), this.tsParseTypeMemberSemicolon(), this.finishNode(property, "TSPropertySignature");
          }
        }
        tsParseTypeMember() {
          let node = this.startNode();
          if (this.match(10) || this.match(47))
            return this.tsParseSignatureMember("TSCallSignatureDeclaration", node);
          if (this.match(77)) {
            let id = this.startNode();
            return this.next(), this.match(10) || this.match(47) ? this.tsParseSignatureMember("TSConstructSignatureDeclaration", node) : (node.key = this.createIdentifier(id, "new"), this.tsParsePropertyOrMethodSignature(node, !1));
          }
          this.tsParseModifiers({
            allowedModifiers: ["readonly"],
            disallowedModifiers: ["declare", "abstract", "private", "protected", "public", "static", "override"]
          }, node);
          let idx = this.tsTryParseIndexSignature(node);
          return idx || (super.parsePropertyName(node), !node.computed && node.key.type === "Identifier" && (node.key.name === "get" || node.key.name === "set") && this.tsTokenCanFollowModifier() && (node.kind = node.key.name, super.parsePropertyName(node), !this.match(10) && !this.match(47) && this.unexpected(null, 10)), this.tsParsePropertyOrMethodSignature(node, !!node.readonly));
        }
        tsParseTypeLiteral() {
          let node = this.startNode();
          return node.members = this.tsParseObjectTypeMembers(), this.finishNode(node, "TSTypeLiteral");
        }
        tsParseObjectTypeMembers() {
          this.expect(5);
          let members = this.tsParseList("TypeMembers", this.tsParseTypeMember.bind(this));
          return this.expect(8), members;
        }
        tsIsStartOfMappedType() {
          return this.next(), this.eat(53) ? this.isContextual(122) : (this.isContextual(122) && this.next(), !this.match(0) || (this.next(), !this.tsIsIdentifier()) ? !1 : (this.next(), this.match(58)));
        }
        tsParseMappedType() {
          let node = this.startNode();
          this.expect(5), this.match(53) ? (node.readonly = this.state.value, this.next(), this.expectContextual(122)) : this.eatContextual(122) && (node.readonly = !0), this.expect(0);
          let typeParameter = this.startNode();
          return typeParameter.name = this.tsParseTypeParameterName(), typeParameter.constraint = this.tsExpectThenParseType(58), node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter"), node.nameType = this.eatContextual(93) ? this.tsParseType() : null, this.expect(3), this.match(53) ? (node.optional = this.state.value, this.next(), this.expect(17)) : this.eat(17) && (node.optional = !0), node.typeAnnotation = this.tsTryParseType(), this.semicolon(), this.expect(8), this.finishNode(node, "TSMappedType");
        }
        tsParseTupleType() {
          let node = this.startNode();
          node.elementTypes = this.tsParseBracketedList("TupleElementTypes", this.tsParseTupleElementType.bind(this), !0, !1);
          let seenOptionalElement = !1;
          return node.elementTypes.forEach((elementNode) => {
            let {
              type
            } = elementNode;
            seenOptionalElement && type !== "TSRestType" && type !== "TSOptionalType" && !(type === "TSNamedTupleMember" && elementNode.optional) && this.raise(TSErrors.OptionalTypeBeforeRequired, elementNode), seenOptionalElement || (seenOptionalElement = type === "TSNamedTupleMember" && elementNode.optional || type === "TSOptionalType");
          }), this.finishNode(node, "TSTupleType");
        }
        tsParseTupleElementType() {
          let restStartLoc = this.state.startLoc, rest = this.eat(21), {
            startLoc
          } = this.state, labeled, label, optional, type, chAfterWord = tokenIsKeywordOrIdentifier(this.state.type) ? this.lookaheadCharCode() : null;
          if (chAfterWord === 58)
            labeled = !0, optional = !1, label = this.parseIdentifier(!0), this.expect(14), type = this.tsParseType();
          else if (chAfterWord === 63) {
            optional = !0;
            let wordName = this.state.value, typeOrLabel = this.tsParseNonArrayType();
            this.lookaheadCharCode() === 58 ? (labeled = !0, label = this.createIdentifier(this.startNodeAt(startLoc), wordName), this.expect(17), this.expect(14), type = this.tsParseType()) : (labeled = !1, type = typeOrLabel, this.expect(17));
          } else
            type = this.tsParseType(), optional = this.eat(17), labeled = this.eat(14);
          if (labeled) {
            let labeledNode;
            label ? (labeledNode = this.startNodeAt(startLoc), labeledNode.optional = optional, labeledNode.label = label, labeledNode.elementType = type, this.eat(17) && (labeledNode.optional = !0, this.raise(TSErrors.TupleOptionalAfterType, this.state.lastTokStartLoc))) : (labeledNode = this.startNodeAt(startLoc), labeledNode.optional = optional, this.raise(TSErrors.InvalidTupleMemberLabel, type), labeledNode.label = type, labeledNode.elementType = this.tsParseType()), type = this.finishNode(labeledNode, "TSNamedTupleMember");
          } else if (optional) {
            let optionalTypeNode = this.startNodeAt(startLoc);
            optionalTypeNode.typeAnnotation = type, type = this.finishNode(optionalTypeNode, "TSOptionalType");
          }
          if (rest) {
            let restNode = this.startNodeAt(restStartLoc);
            restNode.typeAnnotation = type, type = this.finishNode(restNode, "TSRestType");
          }
          return type;
        }
        tsParseParenthesizedType() {
          let node = this.startNode();
          return this.expect(10), node.typeAnnotation = this.tsParseType(), this.expect(11), this.finishNode(node, "TSParenthesizedType");
        }
        tsParseFunctionOrConstructorType(type, abstract) {
          let node = this.startNode();
          return type === "TSConstructorType" && (node.abstract = !!abstract, abstract && this.next(), this.next()), this.tsInAllowConditionalTypesContext(() => this.tsFillSignature(19, node)), this.finishNode(node, type);
        }
        tsParseLiteralTypeNode() {
          let node = this.startNode();
          switch (this.state.type) {
            case 135:
            case 136:
            case 134:
            case 85:
            case 86:
              node.literal = super.parseExprAtom();
              break;
            default:
              this.unexpected();
          }
          return this.finishNode(node, "TSLiteralType");
        }
        tsParseTemplateLiteralType() {
          let node = this.startNode();
          return node.literal = super.parseTemplate(!1), this.finishNode(node, "TSLiteralType");
        }
        parseTemplateSubstitution() {
          return this.state.inType ? this.tsParseType() : super.parseTemplateSubstitution();
        }
        tsParseThisTypeOrThisTypePredicate() {
          let thisKeyword = this.tsParseThisTypeNode();
          return this.isContextual(116) && !this.hasPrecedingLineBreak() ? this.tsParseThisTypePredicate(thisKeyword) : thisKeyword;
        }
        tsParseNonArrayType() {
          switch (this.state.type) {
            case 134:
            case 135:
            case 136:
            case 85:
            case 86:
              return this.tsParseLiteralTypeNode();
            case 53:
              if (this.state.value === "-") {
                let node = this.startNode(), nextToken = this.lookahead();
                return nextToken.type !== 135 && nextToken.type !== 136 && this.unexpected(), node.literal = this.parseMaybeUnary(), this.finishNode(node, "TSLiteralType");
              }
              break;
            case 78:
              return this.tsParseThisTypeOrThisTypePredicate();
            case 87:
              return this.tsParseTypeQuery();
            case 83:
              return this.tsParseImportType();
            case 5:
              return this.tsLookAhead(this.tsIsStartOfMappedType.bind(this)) ? this.tsParseMappedType() : this.tsParseTypeLiteral();
            case 0:
              return this.tsParseTupleType();
            case 10:
              return this.tsParseParenthesizedType();
            case 25:
            case 24:
              return this.tsParseTemplateLiteralType();
            default: {
              let {
                type
              } = this.state;
              if (tokenIsIdentifier(type) || type === 88 || type === 84) {
                let nodeType = type === 88 ? "TSVoidKeyword" : type === 84 ? "TSNullKeyword" : keywordTypeFromName(this.state.value);
                if (nodeType !== void 0 && this.lookaheadCharCode() !== 46) {
                  let node = this.startNode();
                  return this.next(), this.finishNode(node, nodeType);
                }
                return this.tsParseTypeReference();
              }
            }
          }
          throw this.unexpected();
        }
        tsParseArrayTypeOrHigher() {
          let {
            startLoc
          } = this.state, type = this.tsParseNonArrayType();
          for (; !this.hasPrecedingLineBreak() && this.eat(0); )
            if (this.match(3)) {
              let node = this.startNodeAt(startLoc);
              node.elementType = type, this.expect(3), type = this.finishNode(node, "TSArrayType");
            } else {
              let node = this.startNodeAt(startLoc);
              node.objectType = type, node.indexType = this.tsParseType(), this.expect(3), type = this.finishNode(node, "TSIndexedAccessType");
            }
          return type;
        }
        tsParseTypeOperator() {
          let node = this.startNode(), operator = this.state.value;
          return this.next(), node.operator = operator, node.typeAnnotation = this.tsParseTypeOperatorOrHigher(), operator === "readonly" && this.tsCheckTypeAnnotationForReadOnly(node), this.finishNode(node, "TSTypeOperator");
        }
        tsCheckTypeAnnotationForReadOnly(node) {
          switch (node.typeAnnotation.type) {
            case "TSTupleType":
            case "TSArrayType":
              return;
            default:
              this.raise(TSErrors.UnexpectedReadonly, node);
          }
        }
        tsParseInferType() {
          let node = this.startNode();
          this.expectContextual(115);
          let typeParameter = this.startNode();
          return typeParameter.name = this.tsParseTypeParameterName(), typeParameter.constraint = this.tsTryParse(() => this.tsParseConstraintForInferType()), node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter"), this.finishNode(node, "TSInferType");
        }
        tsParseConstraintForInferType() {
          if (this.eat(81)) {
            let constraint = this.tsInDisallowConditionalTypesContext(() => this.tsParseType());
            if (this.state.inDisallowConditionalTypesContext || !this.match(17))
              return constraint;
          }
        }
        tsParseTypeOperatorOrHigher() {
          return tokenIsTSTypeOperator(this.state.type) && !this.state.containsEsc ? this.tsParseTypeOperator() : this.isContextual(115) ? this.tsParseInferType() : this.tsInAllowConditionalTypesContext(() => this.tsParseArrayTypeOrHigher());
        }
        tsParseUnionOrIntersectionType(kind, parseConstituentType, operator) {
          let node = this.startNode(), hasLeadingOperator = this.eat(operator), types2 = [];
          do
            types2.push(parseConstituentType());
          while (this.eat(operator));
          return types2.length === 1 && !hasLeadingOperator ? types2[0] : (node.types = types2, this.finishNode(node, kind));
        }
        tsParseIntersectionTypeOrHigher() {
          return this.tsParseUnionOrIntersectionType("TSIntersectionType", this.tsParseTypeOperatorOrHigher.bind(this), 45);
        }
        tsParseUnionTypeOrHigher() {
          return this.tsParseUnionOrIntersectionType("TSUnionType", this.tsParseIntersectionTypeOrHigher.bind(this), 43);
        }
        tsIsStartOfFunctionType() {
          return this.match(47) ? !0 : this.match(10) && this.tsLookAhead(this.tsIsUnambiguouslyStartOfFunctionType.bind(this));
        }
        tsSkipParameterStart() {
          if (tokenIsIdentifier(this.state.type) || this.match(78))
            return this.next(), !0;
          if (this.match(5)) {
            let {
              errors
            } = this.state, previousErrorCount = errors.length;
            try {
              return this.parseObjectLike(8, !0), errors.length === previousErrorCount;
            } catch {
              return !1;
            }
          }
          if (this.match(0)) {
            this.next();
            let {
              errors
            } = this.state, previousErrorCount = errors.length;
            try {
              return super.parseBindingList(3, 93, 1), errors.length === previousErrorCount;
            } catch {
              return !1;
            }
          }
          return !1;
        }
        tsIsUnambiguouslyStartOfFunctionType() {
          return this.next(), !!(this.match(11) || this.match(21) || this.tsSkipParameterStart() && (this.match(14) || this.match(12) || this.match(17) || this.match(29) || this.match(11) && (this.next(), this.match(19))));
        }
        tsParseTypeOrTypePredicateAnnotation(returnToken) {
          return this.tsInType(() => {
            let t = this.startNode();
            this.expect(returnToken);
            let node = this.startNode(), asserts = !!this.tsTryParse(this.tsParseTypePredicateAsserts.bind(this));
            if (asserts && this.match(78)) {
              let thisTypePredicate = this.tsParseThisTypeOrThisTypePredicate();
              return thisTypePredicate.type === "TSThisType" ? (node.parameterName = thisTypePredicate, node.asserts = !0, node.typeAnnotation = null, thisTypePredicate = this.finishNode(node, "TSTypePredicate")) : (this.resetStartLocationFromNode(thisTypePredicate, node), thisTypePredicate.asserts = !0), t.typeAnnotation = thisTypePredicate, this.finishNode(t, "TSTypeAnnotation");
            }
            let typePredicateVariable = this.tsIsIdentifier() && this.tsTryParse(this.tsParseTypePredicatePrefix.bind(this));
            if (!typePredicateVariable)
              return asserts ? (node.parameterName = this.parseIdentifier(), node.asserts = asserts, node.typeAnnotation = null, t.typeAnnotation = this.finishNode(node, "TSTypePredicate"), this.finishNode(t, "TSTypeAnnotation")) : this.tsParseTypeAnnotation(!1, t);
            let type = this.tsParseTypeAnnotation(!1);
            return node.parameterName = typePredicateVariable, node.typeAnnotation = type, node.asserts = asserts, t.typeAnnotation = this.finishNode(node, "TSTypePredicate"), this.finishNode(t, "TSTypeAnnotation");
          });
        }
        tsTryParseTypeOrTypePredicateAnnotation() {
          if (this.match(14))
            return this.tsParseTypeOrTypePredicateAnnotation(14);
        }
        tsTryParseTypeAnnotation() {
          if (this.match(14))
            return this.tsParseTypeAnnotation();
        }
        tsTryParseType() {
          return this.tsEatThenParseType(14);
        }
        tsParseTypePredicatePrefix() {
          let id = this.parseIdentifier();
          if (this.isContextual(116) && !this.hasPrecedingLineBreak())
            return this.next(), id;
        }
        tsParseTypePredicateAsserts() {
          if (this.state.type !== 109)
            return !1;
          let containsEsc = this.state.containsEsc;
          return this.next(), !tokenIsIdentifier(this.state.type) && !this.match(78) ? !1 : (containsEsc && this.raise(Errors.InvalidEscapedReservedWord, this.state.lastTokStartLoc, {
            reservedWord: "asserts"
          }), !0);
        }
        tsParseTypeAnnotation(eatColon = !0, t = this.startNode()) {
          return this.tsInType(() => {
            eatColon && this.expect(14), t.typeAnnotation = this.tsParseType();
          }), this.finishNode(t, "TSTypeAnnotation");
        }
        tsParseType() {
          assert(this.state.inType);
          let type = this.tsParseNonConditionalType();
          if (this.state.inDisallowConditionalTypesContext || this.hasPrecedingLineBreak() || !this.eat(81))
            return type;
          let node = this.startNodeAtNode(type);
          return node.checkType = type, node.extendsType = this.tsInDisallowConditionalTypesContext(() => this.tsParseNonConditionalType()), this.expect(17), node.trueType = this.tsInAllowConditionalTypesContext(() => this.tsParseType()), this.expect(14), node.falseType = this.tsInAllowConditionalTypesContext(() => this.tsParseType()), this.finishNode(node, "TSConditionalType");
        }
        isAbstractConstructorSignature() {
          return this.isContextual(124) && this.isLookaheadContextual("new");
        }
        tsParseNonConditionalType() {
          return this.tsIsStartOfFunctionType() ? this.tsParseFunctionOrConstructorType("TSFunctionType") : this.match(77) ? this.tsParseFunctionOrConstructorType("TSConstructorType") : this.isAbstractConstructorSignature() ? this.tsParseFunctionOrConstructorType("TSConstructorType", !0) : this.tsParseUnionTypeOrHigher();
        }
        tsParseTypeAssertion() {
          this.getPluginOption("typescript", "disallowAmbiguousJSXLike") && this.raise(TSErrors.ReservedTypeAssertion, this.state.startLoc);
          let node = this.startNode();
          return node.typeAnnotation = this.tsInType(() => (this.next(), this.match(75) ? this.tsParseTypeReference() : this.tsParseType())), this.expect(48), node.expression = this.parseMaybeUnary(), this.finishNode(node, "TSTypeAssertion");
        }
        tsParseHeritageClause(token) {
          let originalStartLoc = this.state.startLoc, delimitedList = this.tsParseDelimitedList("HeritageClauseElement", () => {
            let node = this.startNode();
            return node.expression = this.tsParseEntityName(3), this.match(47) && (node.typeParameters = this.tsParseTypeArguments()), this.finishNode(node, "TSExpressionWithTypeArguments");
          });
          return delimitedList.length || this.raise(TSErrors.EmptyHeritageClauseType, originalStartLoc, {
            token
          }), delimitedList;
        }
        tsParseInterfaceDeclaration(node, properties = {}) {
          if (this.hasFollowingLineBreak()) return null;
          this.expectContextual(129), properties.declare && (node.declare = !0), tokenIsIdentifier(this.state.type) ? (node.id = this.parseIdentifier(), this.checkIdentifier(node.id, 130)) : (node.id = null, this.raise(TSErrors.MissingInterfaceName, this.state.startLoc)), node.typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutConstModifiers), this.eat(81) && (node.extends = this.tsParseHeritageClause("extends"));
          let body = this.startNode();
          return body.body = this.tsInType(this.tsParseObjectTypeMembers.bind(this)), node.body = this.finishNode(body, "TSInterfaceBody"), this.finishNode(node, "TSInterfaceDeclaration");
        }
        tsParseTypeAliasDeclaration(node) {
          return node.id = this.parseIdentifier(), this.checkIdentifier(node.id, 2), node.typeAnnotation = this.tsInType(() => {
            if (node.typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutModifiers), this.expect(29), this.isContextual(114) && this.lookaheadCharCode() !== 46) {
              let node2 = this.startNode();
              return this.next(), this.finishNode(node2, "TSIntrinsicKeyword");
            }
            return this.tsParseType();
          }), this.semicolon(), this.finishNode(node, "TSTypeAliasDeclaration");
        }
        tsInTopLevelContext(cb) {
          if (this.curContext() !== types.brace) {
            let oldContext = this.state.context;
            this.state.context = [oldContext[0]];
            try {
              return cb();
            } finally {
              this.state.context = oldContext;
            }
          } else
            return cb();
        }
        tsInType(cb) {
          let oldInType = this.state.inType;
          this.state.inType = !0;
          try {
            return cb();
          } finally {
            this.state.inType = oldInType;
          }
        }
        tsInDisallowConditionalTypesContext(cb) {
          let oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
          this.state.inDisallowConditionalTypesContext = !0;
          try {
            return cb();
          } finally {
            this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
          }
        }
        tsInAllowConditionalTypesContext(cb) {
          let oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
          this.state.inDisallowConditionalTypesContext = !1;
          try {
            return cb();
          } finally {
            this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
          }
        }
        tsEatThenParseType(token) {
          if (this.match(token))
            return this.tsNextThenParseType();
        }
        tsExpectThenParseType(token) {
          return this.tsInType(() => (this.expect(token), this.tsParseType()));
        }
        tsNextThenParseType() {
          return this.tsInType(() => (this.next(), this.tsParseType()));
        }
        tsParseEnumMember() {
          let node = this.startNode();
          return node.id = this.match(134) ? super.parseStringLiteral(this.state.value) : this.parseIdentifier(!0), this.eat(29) && (node.initializer = super.parseMaybeAssignAllowIn()), this.finishNode(node, "TSEnumMember");
        }
        tsParseEnumDeclaration(node, properties = {}) {
          return properties.const && (node.const = !0), properties.declare && (node.declare = !0), this.expectContextual(126), node.id = this.parseIdentifier(), this.checkIdentifier(node.id, node.const ? 8971 : 8459), this.expect(5), node.members = this.tsParseDelimitedList("EnumMembers", this.tsParseEnumMember.bind(this)), this.expect(8), this.finishNode(node, "TSEnumDeclaration");
        }
        tsParseEnumBody() {
          let node = this.startNode();
          return this.expect(5), node.members = this.tsParseDelimitedList("EnumMembers", this.tsParseEnumMember.bind(this)), this.expect(8), this.finishNode(node, "TSEnumBody");
        }
        tsParseModuleBlock() {
          let node = this.startNode();
          return this.scope.enter(0), this.expect(5), super.parseBlockOrModuleBlockBody(node.body = [], void 0, !0, 8), this.scope.exit(), this.finishNode(node, "TSModuleBlock");
        }
        tsParseModuleOrNamespaceDeclaration(node, nested = !1) {
          if (node.id = this.parseIdentifier(), nested || this.checkIdentifier(node.id, 1024), this.eat(16)) {
            let inner = this.startNode();
            this.tsParseModuleOrNamespaceDeclaration(inner, !0), node.body = inner;
          } else
            this.scope.enter(1024), this.prodParam.enter(0), node.body = this.tsParseModuleBlock(), this.prodParam.exit(), this.scope.exit();
          return this.finishNode(node, "TSModuleDeclaration");
        }
        tsParseAmbientExternalModuleDeclaration(node) {
          return this.isContextual(112) ? (node.kind = "global", node.global = !0, node.id = this.parseIdentifier()) : this.match(134) ? (node.kind = "module", node.id = super.parseStringLiteral(this.state.value)) : this.unexpected(), this.match(5) ? (this.scope.enter(1024), this.prodParam.enter(0), node.body = this.tsParseModuleBlock(), this.prodParam.exit(), this.scope.exit()) : this.semicolon(), this.finishNode(node, "TSModuleDeclaration");
        }
        tsParseImportEqualsDeclaration(node, maybeDefaultIdentifier, isExport) {
          node.isExport = isExport || !1, node.id = maybeDefaultIdentifier || this.parseIdentifier(), this.checkIdentifier(node.id, 4096), this.expect(29);
          let moduleReference = this.tsParseModuleReference();
          return node.importKind === "type" && moduleReference.type !== "TSExternalModuleReference" && this.raise(TSErrors.ImportAliasHasImportType, moduleReference), node.moduleReference = moduleReference, this.semicolon(), this.finishNode(node, "TSImportEqualsDeclaration");
        }
        tsIsExternalModuleReference() {
          return this.isContextual(119) && this.lookaheadCharCode() === 40;
        }
        tsParseModuleReference() {
          return this.tsIsExternalModuleReference() ? this.tsParseExternalModuleReference() : this.tsParseEntityName(0);
        }
        tsParseExternalModuleReference() {
          let node = this.startNode();
          return this.expectContextual(119), this.expect(10), this.match(134) || this.unexpected(), node.expression = super.parseExprAtom(), this.expect(11), this.sawUnambiguousESM = !0, this.finishNode(node, "TSExternalModuleReference");
        }
        tsLookAhead(f) {
          let state = this.state.clone(), res = f();
          return this.state = state, res;
        }
        tsTryParseAndCatch(f) {
          let result = this.tryParse((abort) => f() || abort());
          if (!(result.aborted || !result.node))
            return result.error && (this.state = result.failState), result.node;
        }
        tsTryParse(f) {
          let state = this.state.clone(), result = f();
          if (result !== void 0 && result !== !1)
            return result;
          this.state = state;
        }
        tsTryParseDeclare(node) {
          if (this.isLineTerminator())
            return;
          let startType = this.state.type;
          return this.tsInAmbientContext(() => {
            switch (startType) {
              case 68:
                return node.declare = !0, super.parseFunctionStatement(node, !1, !1);
              case 80:
                return node.declare = !0, this.parseClass(node, !0, !1);
              case 126:
                return this.tsParseEnumDeclaration(node, {
                  declare: !0
                });
              case 112:
                return this.tsParseAmbientExternalModuleDeclaration(node);
              case 100:
                if (this.state.containsEsc)
                  return;
              case 75:
              case 74:
                return !this.match(75) || !this.isLookaheadContextual("enum") ? (node.declare = !0, this.parseVarStatement(node, this.state.value, !0)) : (this.expect(75), this.tsParseEnumDeclaration(node, {
                  const: !0,
                  declare: !0
                }));
              case 107:
                if (this.isUsing())
                  return this.raise(TSErrors.InvalidModifierOnUsingDeclaration, this.state.startLoc, "declare"), node.declare = !0, this.parseVarStatement(node, "using", !0);
                break;
              case 96:
                if (this.isAwaitUsing())
                  return this.raise(TSErrors.InvalidModifierOnAwaitUsingDeclaration, this.state.startLoc, "declare"), node.declare = !0, this.next(), this.parseVarStatement(node, "await using", !0);
                break;
              case 129: {
                let result = this.tsParseInterfaceDeclaration(node, {
                  declare: !0
                });
                if (result) return result;
              }
              default:
                if (tokenIsIdentifier(startType))
                  return this.tsParseDeclaration(node, this.state.type, !0, null);
            }
          });
        }
        tsTryParseExportDeclaration() {
          return this.tsParseDeclaration(this.startNode(), this.state.type, !0, null);
        }
        tsParseDeclaration(node, type, next, decorators) {
          switch (type) {
            case 124:
              if (this.tsCheckLineTerminator(next) && (this.match(80) || tokenIsIdentifier(this.state.type)))
                return this.tsParseAbstractDeclaration(node, decorators);
              break;
            case 127:
              if (this.tsCheckLineTerminator(next)) {
                if (this.match(134))
                  return this.tsParseAmbientExternalModuleDeclaration(node);
                if (tokenIsIdentifier(this.state.type))
                  return node.kind = "module", this.tsParseModuleOrNamespaceDeclaration(node);
              }
              break;
            case 128:
              if (this.tsCheckLineTerminator(next) && tokenIsIdentifier(this.state.type))
                return node.kind = "namespace", this.tsParseModuleOrNamespaceDeclaration(node);
              break;
            case 130:
              if (this.tsCheckLineTerminator(next) && tokenIsIdentifier(this.state.type))
                return this.tsParseTypeAliasDeclaration(node);
              break;
          }
        }
        tsCheckLineTerminator(next) {
          return next ? this.hasFollowingLineBreak() ? !1 : (this.next(), !0) : !this.isLineTerminator();
        }
        tsTryParseGenericAsyncArrowFunction(startLoc) {
          if (!this.match(47)) return;
          let oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
          this.state.maybeInArrowParameters = !0;
          let res = this.tsTryParseAndCatch(() => {
            let node = this.startNodeAt(startLoc);
            return node.typeParameters = this.tsParseTypeParameters(this.tsParseConstModifier), super.parseFunctionParams(node), node.returnType = this.tsTryParseTypeOrTypePredicateAnnotation(), this.expect(19), node;
          });
          if (this.state.maybeInArrowParameters = oldMaybeInArrowParameters, !!res)
            return super.parseArrowExpression(res, null, !0);
        }
        tsParseTypeArgumentsInExpression() {
          if (this.reScan_lt() === 47)
            return this.tsParseTypeArguments();
        }
        tsParseTypeArguments() {
          let node = this.startNode();
          return node.params = this.tsInType(() => this.tsInTopLevelContext(() => (this.expect(47), this.tsParseDelimitedList("TypeParametersOrArguments", this.tsParseType.bind(this))))), node.params.length === 0 ? this.raise(TSErrors.EmptyTypeArguments, node) : !this.state.inType && this.curContext() === types.brace && this.reScan_lt_gt(), this.expect(48), this.finishNode(node, "TSTypeParameterInstantiation");
        }
        tsIsDeclarationStart() {
          return tokenIsTSDeclarationStart(this.state.type);
        }
        isExportDefaultSpecifier() {
          return this.tsIsDeclarationStart() ? !1 : super.isExportDefaultSpecifier();
        }
        parseBindingElement(flags, decorators) {
          let startLoc = decorators.length ? decorators[0].loc.start : this.state.startLoc, modified = {};
          this.tsParseModifiers({
            allowedModifiers: ["public", "private", "protected", "override", "readonly"]
          }, modified);
          let accessibility = modified.accessibility, override = modified.override, readonly = modified.readonly;
          !(flags & 4) && (accessibility || readonly || override) && this.raise(TSErrors.UnexpectedParameterModifier, startLoc);
          let left = this.parseMaybeDefault();
          flags & 2 && this.parseFunctionParamType(left);
          let elt = this.parseMaybeDefault(left.loc.start, left);
          if (accessibility || readonly || override) {
            let pp = this.startNodeAt(startLoc);
            return decorators.length && (pp.decorators = decorators), accessibility && (pp.accessibility = accessibility), readonly && (pp.readonly = readonly), override && (pp.override = override), elt.type !== "Identifier" && elt.type !== "AssignmentPattern" && this.raise(TSErrors.UnsupportedParameterPropertyKind, pp), pp.parameter = elt, this.finishNode(pp, "TSParameterProperty");
          }
          return decorators.length && (left.decorators = decorators), elt;
        }
        isSimpleParameter(node) {
          return node.type === "TSParameterProperty" && super.isSimpleParameter(node.parameter) || super.isSimpleParameter(node);
        }
        tsDisallowOptionalPattern(node) {
          for (let param of node.params)
            param.type !== "Identifier" && param.optional && !this.state.isAmbientContext && this.raise(TSErrors.PatternIsOptional, param);
        }
        setArrowFunctionParameters(node, params, trailingCommaLoc) {
          super.setArrowFunctionParameters(node, params, trailingCommaLoc), this.tsDisallowOptionalPattern(node);
        }
        parseFunctionBodyAndFinish(node, type, isMethod = !1) {
          this.match(14) && (node.returnType = this.tsParseTypeOrTypePredicateAnnotation(14));
          let bodilessType = type === "FunctionDeclaration" ? "TSDeclareFunction" : type === "ClassMethod" || type === "ClassPrivateMethod" ? "TSDeclareMethod" : void 0;
          return bodilessType && !this.match(5) && this.isLineTerminator() ? this.finishNode(node, bodilessType) : bodilessType === "TSDeclareFunction" && this.state.isAmbientContext && (this.raise(TSErrors.DeclareFunctionHasImplementation, node), node.declare) ? super.parseFunctionBodyAndFinish(node, bodilessType, isMethod) : (this.tsDisallowOptionalPattern(node), super.parseFunctionBodyAndFinish(node, type, isMethod));
        }
        registerFunctionStatementId(node) {
          !node.body && node.id ? this.checkIdentifier(node.id, 1024) : super.registerFunctionStatementId(node);
        }
        tsCheckForInvalidTypeCasts(items) {
          items.forEach((node) => {
            node?.type === "TSTypeCastExpression" && this.raise(TSErrors.UnexpectedTypeAnnotation, node.typeAnnotation);
          });
        }
        toReferencedList(exprList, isInParens) {
          return this.tsCheckForInvalidTypeCasts(exprList), exprList;
        }
        parseArrayLike(close, isTuple, refExpressionErrors) {
          let node = super.parseArrayLike(close, isTuple, refExpressionErrors);
          return node.type === "ArrayExpression" && this.tsCheckForInvalidTypeCasts(node.elements), node;
        }
        parseSubscript(base, startLoc, noCalls, state) {
          if (!this.hasPrecedingLineBreak() && this.match(35)) {
            this.state.canStartJSXElement = !1, this.next();
            let nonNullExpression = this.startNodeAt(startLoc);
            return nonNullExpression.expression = base, this.finishNode(nonNullExpression, "TSNonNullExpression");
          }
          let isOptionalCall = !1;
          if (this.match(18) && this.lookaheadCharCode() === 60) {
            if (noCalls)
              return state.stop = !0, base;
            state.optionalChainMember = isOptionalCall = !0, this.next();
          }
          if (this.match(47) || this.match(51)) {
            let missingParenErrorLoc, result = this.tsTryParseAndCatch(() => {
              if (!noCalls && this.atPossibleAsyncArrow(base)) {
                let asyncArrowFn = this.tsTryParseGenericAsyncArrowFunction(startLoc);
                if (asyncArrowFn)
                  return state.stop = !0, asyncArrowFn;
              }
              let typeArguments = this.tsParseTypeArgumentsInExpression();
              if (!typeArguments) return;
              if (isOptionalCall && !this.match(10)) {
                missingParenErrorLoc = this.state.curPosition();
                return;
              }
              if (tokenIsTemplate(this.state.type)) {
                let result2 = super.parseTaggedTemplateExpression(base, startLoc, state);
                return result2.typeParameters = typeArguments, result2;
              }
              if (!noCalls && this.eat(10)) {
                let node2 = this.startNodeAt(startLoc);
                return node2.callee = base, node2.arguments = this.parseCallExpressionArguments(), this.tsCheckForInvalidTypeCasts(node2.arguments), node2.typeParameters = typeArguments, state.optionalChainMember && (node2.optional = isOptionalCall), this.finishCallExpression(node2, state.optionalChainMember);
              }
              let tokenType = this.state.type;
              if (tokenType === 48 || tokenType === 52 || tokenType !== 10 && tokenType !== 93 && tokenType !== 120 && tokenCanStartExpression(tokenType) && !this.hasPrecedingLineBreak())
                return;
              let node = this.startNodeAt(startLoc);
              return node.expression = base, node.typeParameters = typeArguments, this.finishNode(node, "TSInstantiationExpression");
            });
            if (missingParenErrorLoc && this.unexpected(missingParenErrorLoc, 10), result)
              return result.type === "TSInstantiationExpression" && ((this.match(16) || this.match(18) && this.lookaheadCharCode() !== 40) && this.raise(TSErrors.InvalidPropertyAccessAfterInstantiationExpression, this.state.startLoc), !this.match(16) && !this.match(18) && (result.expression = super.stopParseSubscript(base, state))), result;
          }
          return super.parseSubscript(base, startLoc, noCalls, state);
        }
        parseNewCallee(node) {
          var _callee$extra;
          super.parseNewCallee(node);
          let {
            callee
          } = node;
          callee.type === "TSInstantiationExpression" && !((_callee$extra = callee.extra) != null && _callee$extra.parenthesized) && (node.typeParameters = callee.typeParameters, node.callee = callee.expression);
        }
        parseExprOp(left, leftStartLoc, minPrec) {
          let isSatisfies;
          if (tokenOperatorPrecedence(58) > minPrec && !this.hasPrecedingLineBreak() && (this.isContextual(93) || (isSatisfies = this.isContextual(120)))) {
            let node = this.startNodeAt(leftStartLoc);
            return node.expression = left, node.typeAnnotation = this.tsInType(() => (this.next(), this.match(75) ? (isSatisfies && this.raise(Errors.UnexpectedKeyword, this.state.startLoc, {
              keyword: "const"
            }), this.tsParseTypeReference()) : this.tsParseType())), this.finishNode(node, isSatisfies ? "TSSatisfiesExpression" : "TSAsExpression"), this.reScan_lt_gt(), this.parseExprOp(node, leftStartLoc, minPrec);
          }
          return super.parseExprOp(left, leftStartLoc, minPrec);
        }
        checkReservedWord(word, startLoc, checkKeywords, isBinding) {
          this.state.isAmbientContext || super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
        }
        checkImportReflection(node) {
          super.checkImportReflection(node), node.module && node.importKind !== "value" && this.raise(TSErrors.ImportReflectionHasImportType, node.specifiers[0].loc.start);
        }
        checkDuplicateExports() {
        }
        isPotentialImportPhase(isExport) {
          if (super.isPotentialImportPhase(isExport)) return !0;
          if (this.isContextual(130)) {
            let ch = this.lookaheadCharCode();
            return isExport ? ch === 123 || ch === 42 : ch !== 61;
          }
          return !isExport && this.isContextual(87);
        }
        applyImportPhase(node, isExport, phase, loc) {
          super.applyImportPhase(node, isExport, phase, loc), isExport ? node.exportKind = phase === "type" ? "type" : "value" : node.importKind = phase === "type" || phase === "typeof" ? phase : "value";
        }
        parseImport(node) {
          if (this.match(134))
            return node.importKind = "value", super.parseImport(node);
          let importNode;
          if (tokenIsIdentifier(this.state.type) && this.lookaheadCharCode() === 61)
            return node.importKind = "value", this.tsParseImportEqualsDeclaration(node);
          if (this.isContextual(130)) {
            let maybeDefaultIdentifier = this.parseMaybeImportPhase(node, !1);
            if (this.lookaheadCharCode() === 61)
              return this.tsParseImportEqualsDeclaration(node, maybeDefaultIdentifier);
            importNode = super.parseImportSpecifiersAndAfter(node, maybeDefaultIdentifier);
          } else
            importNode = super.parseImport(node);
          return importNode.importKind === "type" && importNode.specifiers.length > 1 && importNode.specifiers[0].type === "ImportDefaultSpecifier" && this.raise(TSErrors.TypeImportCannotSpecifyDefaultAndNamed, importNode), importNode;
        }
        parseExport(node, decorators) {
          if (this.match(83)) {
            let nodeImportEquals = node;
            this.next();
            let maybeDefaultIdentifier = null;
            return this.isContextual(130) && this.isPotentialImportPhase(!1) ? maybeDefaultIdentifier = this.parseMaybeImportPhase(nodeImportEquals, !1) : nodeImportEquals.importKind = "value", this.tsParseImportEqualsDeclaration(nodeImportEquals, maybeDefaultIdentifier, !0);
          } else if (this.eat(29)) {
            let assign = node;
            return assign.expression = super.parseExpression(), this.semicolon(), this.sawUnambiguousESM = !0, this.finishNode(assign, "TSExportAssignment");
          } else if (this.eatContextual(93)) {
            let decl = node;
            return this.expectContextual(128), decl.id = this.parseIdentifier(), this.semicolon(), this.finishNode(decl, "TSNamespaceExportDeclaration");
          } else
            return super.parseExport(node, decorators);
        }
        isAbstractClass() {
          return this.isContextual(124) && this.isLookaheadContextual("class");
        }
        parseExportDefaultExpression() {
          if (this.isAbstractClass()) {
            let cls = this.startNode();
            return this.next(), cls.abstract = !0, this.parseClass(cls, !0, !0);
          }
          if (this.match(129)) {
            let result = this.tsParseInterfaceDeclaration(this.startNode());
            if (result) return result;
          }
          return super.parseExportDefaultExpression();
        }
        parseVarStatement(node, kind, allowMissingInitializer = !1) {
          let {
            isAmbientContext
          } = this.state, declaration2 = super.parseVarStatement(node, kind, allowMissingInitializer || isAmbientContext);
          if (!isAmbientContext) return declaration2;
          if (!node.declare && (kind === "using" || kind === "await using"))
            return this.raiseOverwrite(TSErrors.UsingDeclarationInAmbientContext, node, kind), declaration2;
          for (let {
            id,
            init
          } of declaration2.declarations)
            init && (kind === "var" || kind === "let" || id.typeAnnotation ? this.raise(TSErrors.InitializerNotAllowedInAmbientContext, init) : isValidAmbientConstInitializer(init, this.hasPlugin("estree")) || this.raise(TSErrors.ConstInitializerMustBeStringOrNumericLiteralOrLiteralEnumReference, init));
          return declaration2;
        }
        parseStatementContent(flags, decorators) {
          if (!this.state.containsEsc)
            switch (this.state.type) {
              case 75: {
                if (this.isLookaheadContextual("enum")) {
                  let node = this.startNode();
                  return this.expect(75), this.tsParseEnumDeclaration(node, {
                    const: !0
                  });
                }
                break;
              }
              case 124:
              case 125: {
                if (this.nextTokenIsIdentifierAndNotTSRelationalOperatorOnSameLine()) {
                  let token = this.state.type, node = this.startNode();
                  this.next();
                  let declaration2 = token === 125 ? this.tsTryParseDeclare(node) : this.tsParseAbstractDeclaration(node, decorators);
                  return declaration2 ? (token === 125 && (declaration2.declare = !0), declaration2) : (node.expression = this.createIdentifier(this.startNodeAt(node.loc.start), token === 125 ? "declare" : "abstract"), this.semicolon(!1), this.finishNode(node, "ExpressionStatement"));
                }
                break;
              }
              case 126:
                return this.tsParseEnumDeclaration(this.startNode());
              case 112: {
                if (this.lookaheadCharCode() === 123) {
                  let node = this.startNode();
                  return this.tsParseAmbientExternalModuleDeclaration(node);
                }
                break;
              }
              case 129: {
                let result = this.tsParseInterfaceDeclaration(this.startNode());
                if (result) return result;
                break;
              }
              case 127: {
                if (this.nextTokenIsIdentifierOrStringLiteralOnSameLine()) {
                  let node = this.startNode();
                  return this.next(), this.tsParseDeclaration(node, 127, !1, decorators);
                }
                break;
              }
              case 128: {
                if (this.nextTokenIsIdentifierOnSameLine()) {
                  let node = this.startNode();
                  return this.next(), this.tsParseDeclaration(node, 128, !1, decorators);
                }
                break;
              }
              case 130: {
                if (this.nextTokenIsIdentifierOnSameLine()) {
                  let node = this.startNode();
                  return this.next(), this.tsParseTypeAliasDeclaration(node);
                }
                break;
              }
            }
          return super.parseStatementContent(flags, decorators);
        }
        parseAccessModifier() {
          return this.tsParseModifier(["public", "protected", "private"]);
        }
        tsHasSomeModifiers(member, modifiers) {
          return modifiers.some((modifier) => tsIsAccessModifier(modifier) ? member.accessibility === modifier : !!member[modifier]);
        }
        tsIsStartOfStaticBlocks() {
          return this.isContextual(106) && this.lookaheadCharCode() === 123;
        }
        parseClassMember(classBody, member, state) {
          let modifiers = ["declare", "private", "public", "protected", "override", "abstract", "readonly", "static"];
          this.tsParseModifiers({
            allowedModifiers: modifiers,
            disallowedModifiers: ["in", "out"],
            stopOnStartOfClassStaticBlock: !0,
            errorTemplate: TSErrors.InvalidModifierOnTypeParameterPositions
          }, member);
          let callParseClassMemberWithIsStatic = () => {
            this.tsIsStartOfStaticBlocks() ? (this.next(), this.next(), this.tsHasSomeModifiers(member, modifiers) && this.raise(TSErrors.StaticBlockCannotHaveModifier, this.state.curPosition()), super.parseClassStaticBlock(classBody, member)) : this.parseClassMemberWithIsStatic(classBody, member, state, !!member.static);
          };
          member.declare ? this.tsInAmbientContext(callParseClassMemberWithIsStatic) : callParseClassMemberWithIsStatic();
        }
        parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
          let idx = this.tsTryParseIndexSignature(member);
          if (idx) {
            classBody.body.push(idx), member.abstract && this.raise(TSErrors.IndexSignatureHasAbstract, member), member.accessibility && this.raise(TSErrors.IndexSignatureHasAccessibility, member, {
              modifier: member.accessibility
            }), member.declare && this.raise(TSErrors.IndexSignatureHasDeclare, member), member.override && this.raise(TSErrors.IndexSignatureHasOverride, member);
            return;
          }
          !this.state.inAbstractClass && member.abstract && this.raise(TSErrors.NonAbstractClassHasAbstractMethod, member), member.override && (state.hadSuperClass || this.raise(TSErrors.OverrideNotInSubClass, member)), super.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
        }
        parsePostMemberNameModifiers(methodOrProp) {
          this.eat(17) && (methodOrProp.optional = !0), methodOrProp.readonly && this.match(10) && this.raise(TSErrors.ClassMethodHasReadonly, methodOrProp), methodOrProp.declare && this.match(10) && this.raise(TSErrors.ClassMethodHasDeclare, methodOrProp);
        }
        shouldParseExportDeclaration() {
          return this.tsIsDeclarationStart() ? !0 : super.shouldParseExportDeclaration();
        }
        parseConditional(expr, startLoc, refExpressionErrors) {
          if (!this.match(17)) return expr;
          if (this.state.maybeInArrowParameters) {
            let nextCh = this.lookaheadCharCode();
            if (nextCh === 44 || nextCh === 61 || nextCh === 58 || nextCh === 41)
              return this.setOptionalParametersError(refExpressionErrors), expr;
          }
          return super.parseConditional(expr, startLoc, refExpressionErrors);
        }
        parseParenItem(node, startLoc) {
          let newNode = super.parseParenItem(node, startLoc);
          if (this.eat(17) && (newNode.optional = !0, this.resetEndLocation(node)), this.match(14)) {
            let typeCastNode = this.startNodeAt(startLoc);
            return typeCastNode.expression = node, typeCastNode.typeAnnotation = this.tsParseTypeAnnotation(), this.finishNode(typeCastNode, "TSTypeCastExpression");
          }
          return node;
        }
        parseExportDeclaration(node) {
          if (!this.state.isAmbientContext && this.isContextual(125))
            return this.tsInAmbientContext(() => this.parseExportDeclaration(node));
          let startLoc = this.state.startLoc, isDeclare = this.eatContextual(125);
          if (isDeclare && (this.isContextual(125) || !this.shouldParseExportDeclaration()))
            throw this.raise(TSErrors.ExpectedAmbientAfterExportDeclare, this.state.startLoc);
          let declaration2 = tokenIsIdentifier(this.state.type) && this.tsTryParseExportDeclaration() || super.parseExportDeclaration(node);
          return declaration2 ? ((declaration2.type === "TSInterfaceDeclaration" || declaration2.type === "TSTypeAliasDeclaration" || isDeclare) && (node.exportKind = "type"), isDeclare && declaration2.type !== "TSImportEqualsDeclaration" && (this.resetStartLocation(declaration2, startLoc), declaration2.declare = !0), declaration2) : null;
        }
        parseClassId(node, isStatement, optionalId, bindingType) {
          if ((!isStatement || optionalId) && this.isContextual(113))
            return;
          super.parseClassId(node, isStatement, optionalId, node.declare ? 1024 : 8331);
          let typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutConstModifiers);
          typeParameters && (node.typeParameters = typeParameters);
        }
        parseClassPropertyAnnotation(node) {
          node.optional || (this.eat(35) ? node.definite = !0 : this.eat(17) && (node.optional = !0));
          let type = this.tsTryParseTypeAnnotation();
          type && (node.typeAnnotation = type);
        }
        parseClassProperty(node) {
          if (this.parseClassPropertyAnnotation(node), this.state.isAmbientContext && !(node.readonly && !node.typeAnnotation) && this.match(29) && this.raise(TSErrors.DeclareClassFieldHasInitializer, this.state.startLoc), node.abstract && this.match(29)) {
            let {
              key
            } = node;
            this.raise(TSErrors.AbstractPropertyHasInitializer, this.state.startLoc, {
              propertyName: key.type === "Identifier" && !node.computed ? key.name : `[${this.input.slice(this.offsetToSourcePos(key.start), this.offsetToSourcePos(key.end))}]`
            });
          }
          return super.parseClassProperty(node);
        }
        parseClassPrivateProperty(node) {
          return node.abstract && this.raise(TSErrors.PrivateElementHasAbstract, node), node.accessibility && this.raise(TSErrors.PrivateElementHasAccessibility, node, {
            modifier: node.accessibility
          }), this.parseClassPropertyAnnotation(node), super.parseClassPrivateProperty(node);
        }
        parseClassAccessorProperty(node) {
          return this.parseClassPropertyAnnotation(node), node.optional && this.raise(TSErrors.AccessorCannotBeOptional, node), super.parseClassAccessorProperty(node);
        }
        pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
          let typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
          typeParameters && isConstructor && this.raise(TSErrors.ConstructorHasTypeParameters, typeParameters);
          let {
            declare = !1,
            kind
          } = method;
          declare && (kind === "get" || kind === "set") && this.raise(TSErrors.DeclareAccessor, method, {
            kind
          }), typeParameters && (method.typeParameters = typeParameters), super.pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper);
        }
        pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
          let typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
          typeParameters && (method.typeParameters = typeParameters), super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
        }
        declareClassPrivateMethodInScope(node, kind) {
          node.type !== "TSDeclareMethod" && (node.type === "MethodDefinition" && node.value.body == null || super.declareClassPrivateMethodInScope(node, kind));
        }
        parseClassSuper(node) {
          if (super.parseClassSuper(node), node.superClass)
            if (node.superClass.type === "TSInstantiationExpression") {
              let tsInstantiationExpression = node.superClass, superClass2 = tsInstantiationExpression.expression;
              this.takeSurroundingComments(superClass2, superClass2.start, superClass2.end);
              let superTypeArguments = tsInstantiationExpression.typeParameters;
              this.takeSurroundingComments(superTypeArguments, superTypeArguments.start, superTypeArguments.end), node.superClass = superClass2, node.superTypeParameters = superTypeArguments;
            } else (this.match(47) || this.match(51)) && (node.superTypeParameters = this.tsParseTypeArgumentsInExpression());
          this.eatContextual(113) && (node.implements = this.tsParseHeritageClause("implements"));
        }
        parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
          let typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
          return typeParameters && (prop.typeParameters = typeParameters), super.parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors);
        }
        parseFunctionParams(node, isConstructor) {
          let typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
          typeParameters && (node.typeParameters = typeParameters), super.parseFunctionParams(node, isConstructor);
        }
        parseVarId(decl, kind) {
          super.parseVarId(decl, kind), decl.id.type === "Identifier" && !this.hasPrecedingLineBreak() && this.eat(35) && (decl.definite = !0);
          let type = this.tsTryParseTypeAnnotation();
          type && (decl.id.typeAnnotation = type, this.resetEndLocation(decl.id));
        }
        parseAsyncArrowFromCallExpression(node, call) {
          return this.match(14) && (node.returnType = this.tsParseTypeAnnotation()), super.parseAsyncArrowFromCallExpression(node, call);
        }
        parseMaybeAssign(refExpressionErrors, afterLeftParse) {
          var _jsx, _jsx2, _typeCast, _jsx3, _typeCast2;
          let state, jsx2, typeCast;
          if (this.hasPlugin("jsx") && (this.match(143) || this.match(47))) {
            if (state = this.state.clone(), jsx2 = this.tryParse(() => super.parseMaybeAssign(refExpressionErrors, afterLeftParse), state), !jsx2.error) return jsx2.node;
            let {
              context
            } = this.state, currentContext = context[context.length - 1];
            (currentContext === types.j_oTag || currentContext === types.j_expr) && context.pop();
          }
          if (!((_jsx = jsx2) != null && _jsx.error) && !this.match(47))
            return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
          (!state || state === this.state) && (state = this.state.clone());
          let typeParameters, arrow = this.tryParse((abort) => {
            var _expr$extra, _typeParameters;
            typeParameters = this.tsParseTypeParameters(this.tsParseConstModifier);
            let expr = super.parseMaybeAssign(refExpressionErrors, afterLeftParse);
            return (expr.type !== "ArrowFunctionExpression" || (_expr$extra = expr.extra) != null && _expr$extra.parenthesized) && abort(), ((_typeParameters = typeParameters) == null ? void 0 : _typeParameters.params.length) !== 0 && this.resetStartLocationFromNode(expr, typeParameters), expr.typeParameters = typeParameters, expr;
          }, state);
          if (!arrow.error && !arrow.aborted)
            return typeParameters && this.reportReservedArrowTypeParam(typeParameters), arrow.node;
          if (!jsx2 && (assert(!this.hasPlugin("jsx")), typeCast = this.tryParse(() => super.parseMaybeAssign(refExpressionErrors, afterLeftParse), state), !typeCast.error))
            return typeCast.node;
          if ((_jsx2 = jsx2) != null && _jsx2.node)
            return this.state = jsx2.failState, jsx2.node;
          if (arrow.node)
            return this.state = arrow.failState, typeParameters && this.reportReservedArrowTypeParam(typeParameters), arrow.node;
          if ((_typeCast = typeCast) != null && _typeCast.node)
            return this.state = typeCast.failState, typeCast.node;
          throw ((_jsx3 = jsx2) == null ? void 0 : _jsx3.error) || arrow.error || ((_typeCast2 = typeCast) == null ? void 0 : _typeCast2.error);
        }
        reportReservedArrowTypeParam(node) {
          var _node$extra2;
          node.params.length === 1 && !node.params[0].constraint && !((_node$extra2 = node.extra) != null && _node$extra2.trailingComma) && this.getPluginOption("typescript", "disallowAmbiguousJSXLike") && this.raise(TSErrors.ReservedArrowTypeParam, node);
        }
        parseMaybeUnary(refExpressionErrors, sawUnary) {
          return !this.hasPlugin("jsx") && this.match(47) ? this.tsParseTypeAssertion() : super.parseMaybeUnary(refExpressionErrors, sawUnary);
        }
        parseArrow(node) {
          if (this.match(14)) {
            let result = this.tryParse((abort) => {
              let returnType = this.tsParseTypeOrTypePredicateAnnotation(14);
              return (this.canInsertSemicolon() || !this.match(19)) && abort(), returnType;
            });
            if (result.aborted) return;
            result.thrown || (result.error && (this.state = result.failState), node.returnType = result.node);
          }
          return super.parseArrow(node);
        }
        parseFunctionParamType(param) {
          this.eat(17) && (param.optional = !0);
          let type = this.tsTryParseTypeAnnotation();
          return type && (param.typeAnnotation = type), this.resetEndLocation(param), param;
        }
        isAssignable(node, isBinding) {
          switch (node.type) {
            case "TSTypeCastExpression":
              return this.isAssignable(node.expression, isBinding);
            case "TSParameterProperty":
              return !0;
            default:
              return super.isAssignable(node, isBinding);
          }
        }
        toAssignable(node, isLHS = !1) {
          switch (node.type) {
            case "ParenthesizedExpression":
              this.toAssignableParenthesizedExpression(node, isLHS);
              break;
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSNonNullExpression":
            case "TSTypeAssertion":
              isLHS ? this.expressionScope.recordArrowParameterBindingError(TSErrors.UnexpectedTypeCastInParameter, node) : this.raise(TSErrors.UnexpectedTypeCastInParameter, node), this.toAssignable(node.expression, isLHS);
              break;
            case "AssignmentExpression":
              !isLHS && node.left.type === "TSTypeCastExpression" && (node.left = this.typeCastToParameter(node.left));
            default:
              super.toAssignable(node, isLHS);
          }
        }
        toAssignableParenthesizedExpression(node, isLHS) {
          switch (node.expression.type) {
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSNonNullExpression":
            case "TSTypeAssertion":
            case "ParenthesizedExpression":
              this.toAssignable(node.expression, isLHS);
              break;
            default:
              super.toAssignable(node, isLHS);
          }
        }
        checkToRestConversion(node, allowPattern) {
          switch (node.type) {
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSTypeAssertion":
            case "TSNonNullExpression":
              this.checkToRestConversion(node.expression, !1);
              break;
            default:
              super.checkToRestConversion(node, allowPattern);
          }
        }
        isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding) {
          switch (type) {
            case "TSTypeCastExpression":
              return !0;
            case "TSParameterProperty":
              return "parameter";
            case "TSNonNullExpression":
              return "expression";
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSTypeAssertion":
              return (binding !== 64 || !isUnparenthesizedInAssign) && ["expression", !0];
            default:
              return super.isValidLVal(type, disallowCallExpression, isUnparenthesizedInAssign, binding);
          }
        }
        parseBindingAtom() {
          return this.state.type === 78 ? this.parseIdentifier(!0) : super.parseBindingAtom();
        }
        parseMaybeDecoratorArguments(expr, startLoc) {
          if (this.match(47) || this.match(51)) {
            let typeArguments = this.tsParseTypeArgumentsInExpression();
            if (this.match(10)) {
              let call = super.parseMaybeDecoratorArguments(expr, startLoc);
              return call.typeParameters = typeArguments, call;
            }
            this.unexpected(null, 10);
          }
          return super.parseMaybeDecoratorArguments(expr, startLoc);
        }
        checkCommaAfterRest(close) {
          return this.state.isAmbientContext && this.match(12) && this.lookaheadCharCode() === close ? (this.next(), !1) : super.checkCommaAfterRest(close);
        }
        isClassMethod() {
          return this.match(47) || super.isClassMethod();
        }
        isClassProperty() {
          return this.match(35) || this.match(14) || super.isClassProperty();
        }
        parseMaybeDefault(startLoc, left) {
          let node = super.parseMaybeDefault(startLoc, left);
          return node.type === "AssignmentPattern" && node.typeAnnotation && node.right.start < node.typeAnnotation.start && this.raise(TSErrors.TypeAnnotationAfterAssign, node.typeAnnotation), node;
        }
        getTokenFromCode(code2) {
          if (this.state.inType) {
            if (code2 === 62) {
              this.finishOp(48, 1);
              return;
            }
            if (code2 === 60) {
              this.finishOp(47, 1);
              return;
            }
          }
          super.getTokenFromCode(code2);
        }
        reScan_lt_gt() {
          let {
            type
          } = this.state;
          type === 47 ? (this.state.pos -= 1, this.readToken_lt()) : type === 48 && (this.state.pos -= 1, this.readToken_gt());
        }
        reScan_lt() {
          let {
            type
          } = this.state;
          return type === 51 ? (this.state.pos -= 2, this.finishOp(47, 1), 47) : type;
        }
        toAssignableListItem(exprList, index, isLHS) {
          let node = exprList[index];
          node.type === "TSTypeCastExpression" && (exprList[index] = this.typeCastToParameter(node)), super.toAssignableListItem(exprList, index, isLHS);
        }
        typeCastToParameter(node) {
          return node.expression.typeAnnotation = node.typeAnnotation, this.resetEndLocation(node.expression, node.typeAnnotation.loc.end), node.expression;
        }
        shouldParseArrow(params) {
          return this.match(14) ? params.every((expr) => this.isAssignable(expr, !0)) : super.shouldParseArrow(params);
        }
        shouldParseAsyncArrow() {
          return this.match(14) || super.shouldParseAsyncArrow();
        }
        canHaveLeadingDecorator() {
          return super.canHaveLeadingDecorator() || this.isAbstractClass();
        }
        jsxParseOpeningElementAfterName(node) {
          if (this.match(47) || this.match(51)) {
            let typeArguments = this.tsTryParseAndCatch(() => this.tsParseTypeArgumentsInExpression());
            typeArguments && (node.typeParameters = typeArguments);
          }
          return super.jsxParseOpeningElementAfterName(node);
        }
        getGetterSetterExpectedParamCount(method) {
          let baseCount = super.getGetterSetterExpectedParamCount(method), firstParam = this.getObjectOrClassMethodParams(method)[0];
          return firstParam && this.isThisParam(firstParam) ? baseCount + 1 : baseCount;
        }
        parseCatchClauseParam() {
          let param = super.parseCatchClauseParam(), type = this.tsTryParseTypeAnnotation();
          return type && (param.typeAnnotation = type, this.resetEndLocation(param)), param;
        }
        tsInAmbientContext(cb) {
          let {
            isAmbientContext: oldIsAmbientContext,
            strict: oldStrict
          } = this.state;
          this.state.isAmbientContext = !0, this.state.strict = !1;
          try {
            return cb();
          } finally {
            this.state.isAmbientContext = oldIsAmbientContext, this.state.strict = oldStrict;
          }
        }
        parseClass(node, isStatement, optionalId) {
          let oldInAbstractClass = this.state.inAbstractClass;
          this.state.inAbstractClass = !!node.abstract;
          try {
            return super.parseClass(node, isStatement, optionalId);
          } finally {
            this.state.inAbstractClass = oldInAbstractClass;
          }
        }
        tsParseAbstractDeclaration(node, decorators) {
          if (this.match(80))
            return node.abstract = !0, this.maybeTakeDecorators(decorators, this.parseClass(node, !0, !1));
          if (this.isContextual(129))
            return this.hasFollowingLineBreak() ? null : (node.abstract = !0, this.raise(TSErrors.NonClassMethodPropertyHasAbstractModifier, node), this.tsParseInterfaceDeclaration(node));
          throw this.unexpected(null, 80);
        }
        parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope) {
          let method = super.parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope);
          if ((method.abstract || method.type === "TSAbstractMethodDefinition") && (this.hasPlugin("estree") ? method.value : method).body) {
            let {
              key
            } = method;
            this.raise(TSErrors.AbstractMethodHasImplementation, method, {
              methodName: key.type === "Identifier" && !method.computed ? key.name : `[${this.input.slice(this.offsetToSourcePos(key.start), this.offsetToSourcePos(key.end))}]`
            });
          }
          return method;
        }
        tsParseTypeParameterName() {
          return this.parseIdentifier().name;
        }
        shouldParseAsAmbientContext() {
          return !!this.getPluginOption("typescript", "dts");
        }
        parse() {
          return this.shouldParseAsAmbientContext() && (this.state.isAmbientContext = !0), super.parse();
        }
        getExpression() {
          return this.shouldParseAsAmbientContext() && (this.state.isAmbientContext = !0), super.getExpression();
        }
        parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly) {
          return !isString && isMaybeTypeOnly ? (this.parseTypeOnlyImportExportSpecifier(node, !1, isInTypeExport), this.finishNode(node, "ExportSpecifier")) : (node.exportKind = "value", super.parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly));
        }
        parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
          return !importedIsString && isMaybeTypeOnly ? (this.parseTypeOnlyImportExportSpecifier(specifier, !0, isInTypeOnlyImport), this.finishNode(specifier, "ImportSpecifier")) : (specifier.importKind = "value", super.parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, isInTypeOnlyImport ? 4098 : 4096));
        }
        parseTypeOnlyImportExportSpecifier(node, isImport, isInTypeOnlyImportExport) {
          let leftOfAsKey = isImport ? "imported" : "local", rightOfAsKey = isImport ? "local" : "exported", leftOfAs = node[leftOfAsKey], rightOfAs, hasTypeSpecifier = !1, canParseAsKeyword = !0, loc = leftOfAs.loc.start;
          if (this.isContextual(93)) {
            let firstAs = this.parseIdentifier();
            if (this.isContextual(93)) {
              let secondAs = this.parseIdentifier();
              tokenIsKeywordOrIdentifier(this.state.type) ? (hasTypeSpecifier = !0, leftOfAs = firstAs, rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName(), canParseAsKeyword = !1) : (rightOfAs = secondAs, canParseAsKeyword = !1);
            } else tokenIsKeywordOrIdentifier(this.state.type) ? (canParseAsKeyword = !1, rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName()) : (hasTypeSpecifier = !0, leftOfAs = firstAs);
          } else tokenIsKeywordOrIdentifier(this.state.type) && (hasTypeSpecifier = !0, isImport ? (leftOfAs = this.parseIdentifier(!0), this.isContextual(93) || this.checkReservedWord(leftOfAs.name, leftOfAs.loc.start, !0, !0)) : leftOfAs = this.parseModuleExportName());
          hasTypeSpecifier && isInTypeOnlyImportExport && this.raise(isImport ? TSErrors.TypeModifierIsUsedInTypeImports : TSErrors.TypeModifierIsUsedInTypeExports, loc), node[leftOfAsKey] = leftOfAs, node[rightOfAsKey] = rightOfAs;
          let kindKey = isImport ? "importKind" : "exportKind";
          node[kindKey] = hasTypeSpecifier ? "type" : "value", canParseAsKeyword && this.eatContextual(93) && (node[rightOfAsKey] = isImport ? this.parseIdentifier() : this.parseModuleExportName()), node[rightOfAsKey] || (node[rightOfAsKey] = this.cloneIdentifier(node[leftOfAsKey])), isImport && this.checkIdentifier(node[rightOfAsKey], hasTypeSpecifier ? 4098 : 4096);
        }
        fillOptionalPropertiesForTSESLint(node) {
          var _node$phase, _node$directive, _node$decorators, _node$optional, _node$typeAnnotation, _node$accessibility, _node$decorators2, _node$override, _node$readonly, _node$static, _node$declare, _node$returnType, _node$typeParameters, _node$optional2, _node$optional3, _node$accessibility2, _node$readonly2, _node$static2, _node$declare2, _node$definite, _node$readonly3, _node$typeAnnotation2, _node$accessibility3, _node$decorators3, _node$override2, _node$optional4, _node$id, _node$abstract, _node$declare3, _node$decorators4, _node$implements, _node$superTypeArgume, _node$typeParameters2, _node$declare4, _node$definite2, _node$const, _node$declare5, _node$computed, _node$qualifier, _node$options, _node$declare6, _node$extends, _node$optional5, _node$readonly4, _node$declare7, _node$global, _node$const2, _node$in, _node$out;
          switch (node.type) {
            case "ImportDeclaration":
              (_node$phase = node.phase) != null || (node.phase = null);
              return;
            case "ExpressionStatement":
              (_node$directive = node.directive) != null || (node.directive = void 0);
              return;
            case "RestElement":
              node.value = void 0;
            case "Identifier":
            case "ArrayPattern":
            case "AssignmentPattern":
            case "ObjectPattern":
              (_node$decorators = node.decorators) != null || (node.decorators = []), (_node$optional = node.optional) != null || (node.optional = !1), (_node$typeAnnotation = node.typeAnnotation) != null || (node.typeAnnotation = void 0);
              return;
            case "TSParameterProperty":
              (_node$accessibility = node.accessibility) != null || (node.accessibility = void 0), (_node$decorators2 = node.decorators) != null || (node.decorators = []), (_node$override = node.override) != null || (node.override = !1), (_node$readonly = node.readonly) != null || (node.readonly = !1), (_node$static = node.static) != null || (node.static = !1);
              return;
            case "TSEmptyBodyFunctionExpression":
              node.body = null;
            case "TSDeclareFunction":
            case "FunctionDeclaration":
            case "FunctionExpression":
            case "ClassMethod":
            case "ClassPrivateMethod":
              (_node$declare = node.declare) != null || (node.declare = !1), (_node$returnType = node.returnType) != null || (node.returnType = void 0), (_node$typeParameters = node.typeParameters) != null || (node.typeParameters = void 0);
              return;
            case "Property":
              (_node$optional2 = node.optional) != null || (node.optional = !1);
              return;
            case "TSMethodSignature":
            case "TSPropertySignature":
              (_node$optional3 = node.optional) != null || (node.optional = !1);
            case "TSIndexSignature":
              (_node$accessibility2 = node.accessibility) != null || (node.accessibility = void 0), (_node$readonly2 = node.readonly) != null || (node.readonly = !1), (_node$static2 = node.static) != null || (node.static = !1);
              return;
            case "TSAbstractPropertyDefinition":
            case "PropertyDefinition":
            case "TSAbstractAccessorProperty":
            case "AccessorProperty":
              (_node$declare2 = node.declare) != null || (node.declare = !1), (_node$definite = node.definite) != null || (node.definite = !1), (_node$readonly3 = node.readonly) != null || (node.readonly = !1), (_node$typeAnnotation2 = node.typeAnnotation) != null || (node.typeAnnotation = void 0);
            case "TSAbstractMethodDefinition":
            case "MethodDefinition":
              (_node$accessibility3 = node.accessibility) != null || (node.accessibility = void 0), (_node$decorators3 = node.decorators) != null || (node.decorators = []), (_node$override2 = node.override) != null || (node.override = !1), (_node$optional4 = node.optional) != null || (node.optional = !1);
              return;
            case "ClassExpression":
              (_node$id = node.id) != null || (node.id = null);
            case "ClassDeclaration":
              (_node$abstract = node.abstract) != null || (node.abstract = !1), (_node$declare3 = node.declare) != null || (node.declare = !1), (_node$decorators4 = node.decorators) != null || (node.decorators = []), (_node$implements = node.implements) != null || (node.implements = []), (_node$superTypeArgume = node.superTypeArguments) != null || (node.superTypeArguments = void 0), (_node$typeParameters2 = node.typeParameters) != null || (node.typeParameters = void 0);
              return;
            case "TSTypeAliasDeclaration":
            case "VariableDeclaration":
              (_node$declare4 = node.declare) != null || (node.declare = !1);
              return;
            case "VariableDeclarator":
              (_node$definite2 = node.definite) != null || (node.definite = !1);
              return;
            case "TSEnumDeclaration":
              (_node$const = node.const) != null || (node.const = !1), (_node$declare5 = node.declare) != null || (node.declare = !1);
              return;
            case "TSEnumMember":
              (_node$computed = node.computed) != null || (node.computed = !1);
              return;
            case "TSImportType":
              (_node$qualifier = node.qualifier) != null || (node.qualifier = null), (_node$options = node.options) != null || (node.options = null);
              return;
            case "TSInterfaceDeclaration":
              (_node$declare6 = node.declare) != null || (node.declare = !1), (_node$extends = node.extends) != null || (node.extends = []);
              return;
            case "TSMappedType":
              (_node$optional5 = node.optional) != null || (node.optional = !1), (_node$readonly4 = node.readonly) != null || (node.readonly = void 0);
              return;
            case "TSModuleDeclaration":
              (_node$declare7 = node.declare) != null || (node.declare = !1), (_node$global = node.global) != null || (node.global = node.kind === "global");
              return;
            case "TSTypeParameter":
              (_node$const2 = node.const) != null || (node.const = !1), (_node$in = node.in) != null || (node.in = !1), (_node$out = node.out) != null || (node.out = !1);
              return;
          }
        }
        chStartsBindingIdentifierAndNotRelationalOperator(ch, pos) {
          if (isIdentifierStart(ch)) {
            if (keywordAndTSRelationalOperator.lastIndex = pos, keywordAndTSRelationalOperator.test(this.input)) {
              let endCh = this.codePointAtPos(keywordAndTSRelationalOperator.lastIndex);
              if (!isIdentifierChar(endCh) && endCh !== 92)
                return !1;
            }
            return !0;
          } else return ch === 92;
        }
        nextTokenIsIdentifierAndNotTSRelationalOperatorOnSameLine() {
          let next = this.nextTokenInLineStart(), nextCh = this.codePointAtPos(next);
          return this.chStartsBindingIdentifierAndNotRelationalOperator(nextCh, next);
        }
        nextTokenIsIdentifierOrStringLiteralOnSameLine() {
          let next = this.nextTokenInLineStart(), nextCh = this.codePointAtPos(next);
          return this.chStartsBindingIdentifier(nextCh, next) || nextCh === 34 || nextCh === 39;
        }
      };
      function isPossiblyLiteralEnum(expression) {
        if (expression.type !== "MemberExpression") return !1;
        let {
          computed,
          property
        } = expression;
        return computed && property.type !== "StringLiteral" && (property.type !== "TemplateLiteral" || property.expressions.length > 0) ? !1 : isUncomputedMemberExpressionChain(expression.object);
      }
      function isValidAmbientConstInitializer(expression, estree2) {
        var _expression$extra;
        let {
          type
        } = expression;
        if ((_expression$extra = expression.extra) != null && _expression$extra.parenthesized)
          return !1;
        if (estree2) {
          if (type === "Literal") {
            let {
              value
            } = expression;
            if (typeof value == "string" || typeof value == "boolean")
              return !0;
          }
        } else if (type === "StringLiteral" || type === "BooleanLiteral")
          return !0;
        return !!(isNumber(expression, estree2) || isNegativeNumber(expression, estree2) || type === "TemplateLiteral" && expression.expressions.length === 0 || isPossiblyLiteralEnum(expression));
      }
      function isNumber(expression, estree2) {
        return estree2 ? expression.type === "Literal" && (typeof expression.value == "number" || "bigint" in expression) : expression.type === "NumericLiteral" || expression.type === "BigIntLiteral";
      }
      function isNegativeNumber(expression, estree2) {
        if (expression.type === "UnaryExpression") {
          let {
            operator,
            argument
          } = expression;
          if (operator === "-" && isNumber(argument, estree2))
            return !0;
        }
        return !1;
      }
      function isUncomputedMemberExpressionChain(expression) {
        return expression.type === "Identifier" ? !0 : expression.type !== "MemberExpression" || expression.computed ? !1 : isUncomputedMemberExpressionChain(expression.object);
      }
      var PlaceholderErrors = ParseErrorEnum`placeholders`({
        ClassNameIsRequired: "A class name is required.",
        UnexpectedSpace: "Unexpected space in placeholder."
      }), placeholders = (superClass) => class extends superClass {
        parsePlaceholder(expectedNode) {
          if (this.match(133)) {
            let node = this.startNode();
            return this.next(), this.assertNoSpace(), node.name = super.parseIdentifier(!0), this.assertNoSpace(), this.expect(133), this.finishPlaceholder(node, expectedNode);
          }
        }
        finishPlaceholder(node, expectedNode) {
          let placeholder = node;
          return (!placeholder.expectedNode || !placeholder.type) && (placeholder = this.finishNode(placeholder, "Placeholder")), placeholder.expectedNode = expectedNode, placeholder;
        }
        getTokenFromCode(code2) {
          code2 === 37 && this.input.charCodeAt(this.state.pos + 1) === 37 ? this.finishOp(133, 2) : super.getTokenFromCode(code2);
        }
        parseExprAtom(refExpressionErrors) {
          return this.parsePlaceholder("Expression") || super.parseExprAtom(refExpressionErrors);
        }
        parseIdentifier(liberal) {
          return this.parsePlaceholder("Identifier") || super.parseIdentifier(liberal);
        }
        checkReservedWord(word, startLoc, checkKeywords, isBinding) {
          word !== void 0 && super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
        }
        cloneIdentifier(node) {
          let cloned = super.cloneIdentifier(node);
          return cloned.type === "Placeholder" && (cloned.expectedNode = node.expectedNode), cloned;
        }
        cloneStringLiteral(node) {
          return node.type === "Placeholder" ? this.cloneIdentifier(node) : super.cloneStringLiteral(node);
        }
        parseBindingAtom() {
          return this.parsePlaceholder("Pattern") || super.parseBindingAtom();
        }
        isValidLVal(type, disallowCallExpression, isParenthesized, binding) {
          return type === "Placeholder" || super.isValidLVal(type, disallowCallExpression, isParenthesized, binding);
        }
        toAssignable(node, isLHS) {
          node && node.type === "Placeholder" && node.expectedNode === "Expression" ? node.expectedNode = "Pattern" : super.toAssignable(node, isLHS);
        }
        chStartsBindingIdentifier(ch, pos) {
          if (super.chStartsBindingIdentifier(ch, pos))
            return !0;
          let next = this.nextTokenStart();
          return this.input.charCodeAt(next) === 37 && this.input.charCodeAt(next + 1) === 37;
        }
        verifyBreakContinue(node, isBreak) {
          var _node$label;
          ((_node$label = node.label) == null ? void 0 : _node$label.type) !== "Placeholder" && super.verifyBreakContinue(node, isBreak);
        }
        parseExpressionStatement(node, expr) {
          var _expr$extra;
          if (expr.type !== "Placeholder" || (_expr$extra = expr.extra) != null && _expr$extra.parenthesized)
            return super.parseExpressionStatement(node, expr);
          if (this.match(14)) {
            let stmt = node;
            return stmt.label = this.finishPlaceholder(expr, "Identifier"), this.next(), stmt.body = super.parseStatementOrSloppyAnnexBFunctionDeclaration(), this.finishNode(stmt, "LabeledStatement");
          }
          this.semicolon();
          let stmtPlaceholder = node;
          return stmtPlaceholder.name = expr.name, this.finishPlaceholder(stmtPlaceholder, "Statement");
        }
        parseBlock(allowDirectives, createNewLexicalScope, afterBlockParse) {
          return this.parsePlaceholder("BlockStatement") || super.parseBlock(allowDirectives, createNewLexicalScope, afterBlockParse);
        }
        parseFunctionId(requireId) {
          return this.parsePlaceholder("Identifier") || super.parseFunctionId(requireId);
        }
        parseClass(node, isStatement, optionalId) {
          let type = isStatement ? "ClassDeclaration" : "ClassExpression";
          this.next();
          let oldStrict = this.state.strict, placeholder = this.parsePlaceholder("Identifier");
          if (placeholder)
            if (this.match(81) || this.match(133) || this.match(5))
              node.id = placeholder;
            else {
              if (optionalId || !isStatement)
                return node.id = null, node.body = this.finishPlaceholder(placeholder, "ClassBody"), this.finishNode(node, type);
              throw this.raise(PlaceholderErrors.ClassNameIsRequired, this.state.startLoc);
            }
          else
            this.parseClassId(node, isStatement, optionalId);
          return super.parseClassSuper(node), node.body = this.parsePlaceholder("ClassBody") || super.parseClassBody(!!node.superClass, oldStrict), this.finishNode(node, type);
        }
        parseExport(node, decorators) {
          let placeholder = this.parsePlaceholder("Identifier");
          if (!placeholder) return super.parseExport(node, decorators);
          let node2 = node;
          if (!this.isContextual(98) && !this.match(12))
            return node2.specifiers = [], node2.source = null, node2.declaration = this.finishPlaceholder(placeholder, "Declaration"), this.finishNode(node2, "ExportNamedDeclaration");
          this.expectPlugin("exportDefaultFrom");
          let specifier = this.startNode();
          return specifier.exported = placeholder, node2.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")], super.parseExport(node2, decorators);
        }
        isExportDefaultSpecifier() {
          if (this.match(65)) {
            let next = this.nextTokenStart();
            if (this.isUnparsedContextual(next, "from") && this.input.startsWith(tokenLabelName(133), this.nextTokenStartSince(next + 4)))
              return !0;
          }
          return super.isExportDefaultSpecifier();
        }
        maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
          var _specifiers;
          return (_specifiers = node.specifiers) != null && _specifiers.length ? !0 : super.maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier);
        }
        checkExport(node) {
          let {
            specifiers
          } = node;
          specifiers != null && specifiers.length && (node.specifiers = specifiers.filter((node2) => node2.exported.type === "Placeholder")), super.checkExport(node), node.specifiers = specifiers;
        }
        parseImport(node) {
          let placeholder = this.parsePlaceholder("Identifier");
          if (!placeholder) return super.parseImport(node);
          if (node.specifiers = [], !this.isContextual(98) && !this.match(12))
            return node.source = this.finishPlaceholder(placeholder, "StringLiteral"), this.semicolon(), this.finishNode(node, "ImportDeclaration");
          let specifier = this.startNodeAtNode(placeholder);
          return specifier.local = placeholder, node.specifiers.push(this.finishNode(specifier, "ImportDefaultSpecifier")), this.eat(12) && (this.maybeParseStarImportSpecifier(node) || this.parseNamedImportSpecifiers(node)), this.expectContextual(98), node.source = this.parseImportSource(), this.semicolon(), this.finishNode(node, "ImportDeclaration");
        }
        parseImportSource() {
          return this.parsePlaceholder("StringLiteral") || super.parseImportSource();
        }
        assertNoSpace() {
          this.state.start > this.offsetToSourcePos(this.state.lastTokEndLoc.index) && this.raise(PlaceholderErrors.UnexpectedSpace, this.state.lastTokEndLoc);
        }
      }, v8intrinsic = (superClass) => class extends superClass {
        parseV8Intrinsic() {
          if (this.match(54)) {
            let v8IntrinsicStartLoc = this.state.startLoc, node = this.startNode();
            if (this.next(), tokenIsIdentifier(this.state.type)) {
              let name = this.parseIdentifierName(), identifier = this.createIdentifier(node, name);
              if (this.castNodeTo(identifier, "V8IntrinsicIdentifier"), this.match(10))
                return identifier;
            }
            this.unexpected(v8IntrinsicStartLoc);
          }
        }
        parseExprAtom(refExpressionErrors) {
          return this.parseV8Intrinsic() || super.parseExprAtom(refExpressionErrors);
        }
      }, PIPELINE_PROPOSALS = ["minimal", "fsharp", "hack", "smart"], TOPIC_TOKENS = ["^^", "@@", "^", "%", "#"];
      function validatePlugins(pluginsMap) {
        if (pluginsMap.has("decorators")) {
          if (pluginsMap.has("decorators-legacy"))
            throw new Error("Cannot use the decorators and decorators-legacy plugin together");
          let decoratorsBeforeExport = pluginsMap.get("decorators").decoratorsBeforeExport;
          if (decoratorsBeforeExport != null && typeof decoratorsBeforeExport != "boolean")
            throw new Error("'decoratorsBeforeExport' must be a boolean, if specified.");
          let allowCallParenthesized = pluginsMap.get("decorators").allowCallParenthesized;
          if (allowCallParenthesized != null && typeof allowCallParenthesized != "boolean")
            throw new Error("'allowCallParenthesized' must be a boolean.");
        }
        if (pluginsMap.has("flow") && pluginsMap.has("typescript"))
          throw new Error("Cannot combine flow and typescript plugins.");
        if (pluginsMap.has("placeholders") && pluginsMap.has("v8intrinsic"))
          throw new Error("Cannot combine placeholders and v8intrinsic plugins.");
        if (pluginsMap.has("pipelineOperator")) {
          var _pluginsMap$get2;
          let proposal = pluginsMap.get("pipelineOperator").proposal;
          if (!PIPELINE_PROPOSALS.includes(proposal)) {
            let proposalList = PIPELINE_PROPOSALS.map((p) => `"${p}"`).join(", ");
            throw new Error(`"pipelineOperator" requires "proposal" option whose value must be one of: ${proposalList}.`);
          }
          if (proposal === "hack") {
            var _pluginsMap$get;
            if (pluginsMap.has("placeholders"))
              throw new Error("Cannot combine placeholders plugin and Hack-style pipes.");
            if (pluginsMap.has("v8intrinsic"))
              throw new Error("Cannot combine v8intrinsic plugin and Hack-style pipes.");
            let topicToken = pluginsMap.get("pipelineOperator").topicToken;
            if (!TOPIC_TOKENS.includes(topicToken)) {
              let tokenList = TOPIC_TOKENS.map((t) => `"${t}"`).join(", ");
              throw new Error(`"pipelineOperator" in "proposal": "hack" mode also requires a "topicToken" option whose value must be one of: ${tokenList}.`);
            }
            if (topicToken === "#" && ((_pluginsMap$get = pluginsMap.get("recordAndTuple")) == null ? void 0 : _pluginsMap$get.syntaxType) === "hash")
              throw new Error(`Plugin conflict between \`["pipelineOperator", { proposal: "hack", topicToken: "#" }]\` and \`${JSON.stringify(["recordAndTuple", pluginsMap.get("recordAndTuple")])}\`.`);
          } else if (proposal === "smart" && ((_pluginsMap$get2 = pluginsMap.get("recordAndTuple")) == null ? void 0 : _pluginsMap$get2.syntaxType) === "hash")
            throw new Error(`Plugin conflict between \`["pipelineOperator", { proposal: "smart" }]\` and \`${JSON.stringify(["recordAndTuple", pluginsMap.get("recordAndTuple")])}\`.`);
        }
        if (pluginsMap.has("moduleAttributes")) {
          if (pluginsMap.has("deprecatedImportAssert") || pluginsMap.has("importAssertions"))
            throw new Error("Cannot combine importAssertions, deprecatedImportAssert and moduleAttributes plugins.");
          if (pluginsMap.get("moduleAttributes").version !== "may-2020")
            throw new Error("The 'moduleAttributes' plugin requires a 'version' option, representing the last proposal update. Currently, the only supported value is 'may-2020'.");
        }
        if (pluginsMap.has("importAssertions") && pluginsMap.has("deprecatedImportAssert"))
          throw new Error("Cannot combine importAssertions and deprecatedImportAssert plugins.");
        if (pluginsMap.has("deprecatedImportAssert") || pluginsMap.has("importAttributes") && pluginsMap.get("importAttributes").deprecatedAssertSyntax && pluginsMap.set("deprecatedImportAssert", {}), pluginsMap.has("recordAndTuple")) {
          let syntaxType = pluginsMap.get("recordAndTuple").syntaxType;
          if (syntaxType != null) {
            let RECORD_AND_TUPLE_SYNTAX_TYPES = ["hash", "bar"];
            if (!RECORD_AND_TUPLE_SYNTAX_TYPES.includes(syntaxType))
              throw new Error("The 'syntaxType' option of the 'recordAndTuple' plugin must be one of: " + RECORD_AND_TUPLE_SYNTAX_TYPES.map((p) => `'${p}'`).join(", "));
          }
        }
        if (pluginsMap.has("asyncDoExpressions") && !pluginsMap.has("doExpressions")) {
          let error = new Error("'asyncDoExpressions' requires 'doExpressions', please add 'doExpressions' to parser plugins.");
          throw error.missingPlugins = "doExpressions", error;
        }
        if (pluginsMap.has("optionalChainingAssign") && pluginsMap.get("optionalChainingAssign").version !== "2023-07")
          throw new Error("The 'optionalChainingAssign' plugin requires a 'version' option, representing the last proposal update. Currently, the only supported value is '2023-07'.");
        if (pluginsMap.has("discardBinding") && pluginsMap.get("discardBinding").syntaxType !== "void")
          throw new Error("The 'discardBinding' plugin requires a 'syntaxType' option. Currently the only supported value is 'void'.");
      }
      var mixinPlugins = {
        estree,
        jsx,
        flow,
        typescript,
        v8intrinsic,
        placeholders
      }, mixinPluginNames = Object.keys(mixinPlugins), ExpressionParser = class extends LValParser {
        checkProto(prop, isRecord, sawProto, refExpressionErrors) {
          if (prop.type === "SpreadElement" || this.isObjectMethod(prop) || prop.computed || prop.shorthand)
            return sawProto;
          let key = prop.key;
          return (key.type === "Identifier" ? key.name : key.value) === "__proto__" ? isRecord ? (this.raise(Errors.RecordNoProto, key), !0) : (sawProto && (refExpressionErrors ? refExpressionErrors.doubleProtoLoc === null && (refExpressionErrors.doubleProtoLoc = key.loc.start) : this.raise(Errors.DuplicateProto, key)), !0) : sawProto;
        }
        shouldExitDescending(expr, potentialArrowAt) {
          return expr.type === "ArrowFunctionExpression" && this.offsetToSourcePos(expr.start) === potentialArrowAt;
        }
        getExpression() {
          if (this.enterInitialScopes(), this.nextToken(), this.match(140))
            throw this.raise(Errors.ParseExpressionEmptyInput, this.state.startLoc);
          let expr = this.parseExpression();
          if (!this.match(140))
            throw this.raise(Errors.ParseExpressionExpectsEOF, this.state.startLoc, {
              unexpected: this.input.codePointAt(this.state.start)
            });
          return this.finalizeRemainingComments(), expr.comments = this.comments, expr.errors = this.state.errors, this.optionFlags & 256 && (expr.tokens = this.tokens), expr;
        }
        parseExpression(disallowIn, refExpressionErrors) {
          return disallowIn ? this.disallowInAnd(() => this.parseExpressionBase(refExpressionErrors)) : this.allowInAnd(() => this.parseExpressionBase(refExpressionErrors));
        }
        parseExpressionBase(refExpressionErrors) {
          let startLoc = this.state.startLoc, expr = this.parseMaybeAssign(refExpressionErrors);
          if (this.match(12)) {
            let node = this.startNodeAt(startLoc);
            for (node.expressions = [expr]; this.eat(12); )
              node.expressions.push(this.parseMaybeAssign(refExpressionErrors));
            return this.toReferencedList(node.expressions), this.finishNode(node, "SequenceExpression");
          }
          return expr;
        }
        parseMaybeAssignDisallowIn(refExpressionErrors, afterLeftParse) {
          return this.disallowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
        }
        parseMaybeAssignAllowIn(refExpressionErrors, afterLeftParse) {
          return this.allowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
        }
        setOptionalParametersError(refExpressionErrors) {
          refExpressionErrors.optionalParametersLoc = this.state.startLoc;
        }
        parseMaybeAssign(refExpressionErrors, afterLeftParse) {
          let startLoc = this.state.startLoc, isYield = this.isContextual(108);
          if (isYield && this.prodParam.hasYield) {
            this.next();
            let left2 = this.parseYield(startLoc);
            return afterLeftParse && (left2 = afterLeftParse.call(this, left2, startLoc)), left2;
          }
          let ownExpressionErrors;
          refExpressionErrors ? ownExpressionErrors = !1 : (refExpressionErrors = new ExpressionErrors(), ownExpressionErrors = !0);
          let {
            type
          } = this.state;
          (type === 10 || tokenIsIdentifier(type)) && (this.state.potentialArrowAt = this.state.start);
          let left = this.parseMaybeConditional(refExpressionErrors);
          if (afterLeftParse && (left = afterLeftParse.call(this, left, startLoc)), tokenIsAssignment(this.state.type)) {
            let node = this.startNodeAt(startLoc), operator = this.state.value;
            if (node.operator = operator, this.match(29)) {
              this.toAssignable(left, !0), node.left = left;
              let startIndex = startLoc.index;
              refExpressionErrors.doubleProtoLoc != null && refExpressionErrors.doubleProtoLoc.index >= startIndex && (refExpressionErrors.doubleProtoLoc = null), refExpressionErrors.shorthandAssignLoc != null && refExpressionErrors.shorthandAssignLoc.index >= startIndex && (refExpressionErrors.shorthandAssignLoc = null), refExpressionErrors.privateKeyLoc != null && refExpressionErrors.privateKeyLoc.index >= startIndex && (this.checkDestructuringPrivate(refExpressionErrors), refExpressionErrors.privateKeyLoc = null), refExpressionErrors.voidPatternLoc != null && refExpressionErrors.voidPatternLoc.index >= startIndex && (refExpressionErrors.voidPatternLoc = null);
            } else
              node.left = left;
            return this.next(), node.right = this.parseMaybeAssign(), this.checkLVal(left, this.finishNode(node, "AssignmentExpression"), void 0, void 0, void 0, void 0, operator === "||=" || operator === "&&=" || operator === "??="), node;
          } else ownExpressionErrors && this.checkExpressionErrors(refExpressionErrors, !0);
          if (isYield) {
            let {
              type: type2
            } = this.state;
            if ((this.hasPlugin("v8intrinsic") ? tokenCanStartExpression(type2) : tokenCanStartExpression(type2) && !this.match(54)) && !this.isAmbiguousPrefixOrIdentifier())
              return this.raiseOverwrite(Errors.YieldNotInGeneratorFunction, startLoc), this.parseYield(startLoc);
          }
          return left;
        }
        parseMaybeConditional(refExpressionErrors) {
          let startLoc = this.state.startLoc, potentialArrowAt = this.state.potentialArrowAt, expr = this.parseExprOps(refExpressionErrors);
          return this.shouldExitDescending(expr, potentialArrowAt) ? expr : this.parseConditional(expr, startLoc, refExpressionErrors);
        }
        parseConditional(expr, startLoc, refExpressionErrors) {
          if (this.eat(17)) {
            let node = this.startNodeAt(startLoc);
            return node.test = expr, node.consequent = this.parseMaybeAssignAllowIn(), this.expect(14), node.alternate = this.parseMaybeAssign(), this.finishNode(node, "ConditionalExpression");
          }
          return expr;
        }
        parseMaybeUnaryOrPrivate(refExpressionErrors) {
          return this.match(139) ? this.parsePrivateName() : this.parseMaybeUnary(refExpressionErrors);
        }
        parseExprOps(refExpressionErrors) {
          let startLoc = this.state.startLoc, potentialArrowAt = this.state.potentialArrowAt, expr = this.parseMaybeUnaryOrPrivate(refExpressionErrors);
          return this.shouldExitDescending(expr, potentialArrowAt) ? expr : this.parseExprOp(expr, startLoc, -1);
        }
        parseExprOp(left, leftStartLoc, minPrec) {
          if (this.isPrivateName(left)) {
            let value = this.getPrivateNameSV(left);
            (minPrec >= tokenOperatorPrecedence(58) || !this.prodParam.hasIn || !this.match(58)) && this.raise(Errors.PrivateInExpectedIn, left, {
              identifierName: value
            }), this.classScope.usePrivateName(value, left.loc.start);
          }
          let op = this.state.type;
          if (tokenIsOperator(op) && (this.prodParam.hasIn || !this.match(58))) {
            let prec = tokenOperatorPrecedence(op);
            if (prec > minPrec) {
              if (op === 39) {
                if (this.expectPlugin("pipelineOperator"), this.state.inFSharpPipelineDirectBody)
                  return left;
                this.checkPipelineAtInfixOperator(left, leftStartLoc);
              }
              let node = this.startNodeAt(leftStartLoc);
              node.left = left, node.operator = this.state.value;
              let logical = op === 41 || op === 42, coalesce = op === 40;
              if (coalesce && (prec = tokenOperatorPrecedence(42)), this.next(), op === 39 && this.hasPlugin(["pipelineOperator", {
                proposal: "minimal"
              }]) && this.state.type === 96 && this.prodParam.hasAwait)
                throw this.raise(Errors.UnexpectedAwaitAfterPipelineBody, this.state.startLoc);
              node.right = this.parseExprOpRightExpr(op, prec);
              let finishedNode = this.finishNode(node, logical || coalesce ? "LogicalExpression" : "BinaryExpression"), nextOp = this.state.type;
              if (coalesce && (nextOp === 41 || nextOp === 42) || logical && nextOp === 40)
                throw this.raise(Errors.MixingCoalesceWithLogical, this.state.startLoc);
              return this.parseExprOp(finishedNode, leftStartLoc, minPrec);
            }
          }
          return left;
        }
        parseExprOpRightExpr(op, prec) {
          let startLoc = this.state.startLoc;
          switch (op) {
            case 39:
              switch (this.getPluginOption("pipelineOperator", "proposal")) {
                case "hack":
                  return this.withTopicBindingContext(() => this.parseHackPipeBody());
                case "fsharp":
                  return this.withSoloAwaitPermittingContext(() => this.parseFSharpPipelineBody(prec));
              }
              if (this.getPluginOption("pipelineOperator", "proposal") === "smart")
                return this.withTopicBindingContext(() => {
                  if (this.prodParam.hasYield && this.isContextual(108))
                    throw this.raise(Errors.PipeBodyIsTighter, this.state.startLoc);
                  return this.parseSmartPipelineBodyInStyle(this.parseExprOpBaseRightExpr(op, prec), startLoc);
                });
            default:
              return this.parseExprOpBaseRightExpr(op, prec);
          }
        }
        parseExprOpBaseRightExpr(op, prec) {
          let startLoc = this.state.startLoc;
          return this.parseExprOp(this.parseMaybeUnaryOrPrivate(), startLoc, tokenIsRightAssociative(op) ? prec - 1 : prec);
        }
        parseHackPipeBody() {
          var _body$extra;
          let {
            startLoc
          } = this.state, body = this.parseMaybeAssign();
          return UnparenthesizedPipeBodyDescriptions.has(body.type) && !((_body$extra = body.extra) != null && _body$extra.parenthesized) && this.raise(Errors.PipeUnparenthesizedBody, startLoc, {
            type: body.type
          }), this.topicReferenceWasUsedInCurrentContext() || this.raise(Errors.PipeTopicUnused, startLoc), body;
        }
        checkExponentialAfterUnary(node) {
          this.match(57) && this.raise(Errors.UnexpectedTokenUnaryExponentiation, node.argument);
        }
        parseMaybeUnary(refExpressionErrors, sawUnary) {
          let startLoc = this.state.startLoc, isAwait = this.isContextual(96);
          if (isAwait && this.recordAwaitIfAllowed()) {
            this.next();
            let expr2 = this.parseAwait(startLoc);
            return sawUnary || this.checkExponentialAfterUnary(expr2), expr2;
          }
          let update = this.match(34), node = this.startNode();
          if (tokenIsPrefix(this.state.type)) {
            node.operator = this.state.value, node.prefix = !0, this.match(72) && this.expectPlugin("throwExpressions");
            let isDelete = this.match(89);
            if (this.next(), node.argument = this.parseMaybeUnary(null, !0), this.checkExpressionErrors(refExpressionErrors, !0), this.state.strict && isDelete) {
              let arg = node.argument;
              arg.type === "Identifier" ? this.raise(Errors.StrictDelete, node) : this.hasPropertyAsPrivateName(arg) && this.raise(Errors.DeletePrivateField, node);
            }
            if (!update)
              return sawUnary || this.checkExponentialAfterUnary(node), this.finishNode(node, "UnaryExpression");
          }
          let expr = this.parseUpdate(node, update, refExpressionErrors);
          if (isAwait) {
            let {
              type
            } = this.state;
            if ((this.hasPlugin("v8intrinsic") ? tokenCanStartExpression(type) : tokenCanStartExpression(type) && !this.match(54)) && !this.isAmbiguousPrefixOrIdentifier())
              return this.raiseOverwrite(Errors.AwaitNotInAsyncContext, startLoc), this.parseAwait(startLoc);
          }
          return expr;
        }
        parseUpdate(node, update, refExpressionErrors) {
          if (update) {
            let updateExpressionNode = node;
            return this.checkLVal(updateExpressionNode.argument, this.finishNode(updateExpressionNode, "UpdateExpression")), node;
          }
          let startLoc = this.state.startLoc, expr = this.parseExprSubscripts(refExpressionErrors);
          if (this.checkExpressionErrors(refExpressionErrors, !1)) return expr;
          for (; tokenIsPostfix(this.state.type) && !this.canInsertSemicolon(); ) {
            let node2 = this.startNodeAt(startLoc);
            node2.operator = this.state.value, node2.prefix = !1, node2.argument = expr, this.next(), this.checkLVal(expr, expr = this.finishNode(node2, "UpdateExpression"));
          }
          return expr;
        }
        parseExprSubscripts(refExpressionErrors) {
          let startLoc = this.state.startLoc, potentialArrowAt = this.state.potentialArrowAt, expr = this.parseExprAtom(refExpressionErrors);
          return this.shouldExitDescending(expr, potentialArrowAt) ? expr : this.parseSubscripts(expr, startLoc);
        }
        parseSubscripts(base, startLoc, noCalls) {
          let state = {
            optionalChainMember: !1,
            maybeAsyncArrow: this.atPossibleAsyncArrow(base),
            stop: !1
          };
          do
            base = this.parseSubscript(base, startLoc, noCalls, state), state.maybeAsyncArrow = !1;
          while (!state.stop);
          return base;
        }
        parseSubscript(base, startLoc, noCalls, state) {
          let {
            type
          } = this.state;
          if (!noCalls && type === 15)
            return this.parseBind(base, startLoc, state);
          if (tokenIsTemplate(type))
            return this.parseTaggedTemplateExpression(base, startLoc, state);
          let optional = !1;
          if (type === 18) {
            if (noCalls && (this.raise(Errors.OptionalChainingNoNew, this.state.startLoc), this.lookaheadCharCode() === 40))
              return this.stopParseSubscript(base, state);
            state.optionalChainMember = optional = !0, this.next();
          }
          if (!noCalls && this.match(10))
            return this.parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional);
          {
            let computed = this.eat(0);
            return computed || optional || this.eat(16) ? this.parseMember(base, startLoc, state, computed, optional) : this.stopParseSubscript(base, state);
          }
        }
        stopParseSubscript(base, state) {
          return state.stop = !0, base;
        }
        parseMember(base, startLoc, state, computed, optional) {
          let node = this.startNodeAt(startLoc);
          return node.object = base, node.computed = computed, computed ? (node.property = this.parseExpression(), this.expect(3)) : this.match(139) ? (base.type === "Super" && this.raise(Errors.SuperPrivateField, startLoc), this.classScope.usePrivateName(this.state.value, this.state.startLoc), node.property = this.parsePrivateName()) : node.property = this.parseIdentifier(!0), state.optionalChainMember ? (node.optional = optional, this.finishNode(node, "OptionalMemberExpression")) : this.finishNode(node, "MemberExpression");
        }
        parseBind(base, startLoc, state) {
          let node = this.startNodeAt(startLoc);
          node.object = base, this.next();
          let isImport = this.match(83), callee = this.parseNoCallExpr();
          if (callee.type === "Super" || isImport && callee.type === "ImportExpression" || callee.type === "Import")
            throw this.raise(Errors.UnsupportedBindRHS, callee);
          return node.callee = callee, state.stop = !0, this.parseSubscripts(this.finishNode(node, "BindExpression"), startLoc, !1);
        }
        parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional) {
          let oldMaybeInArrowParameters = this.state.maybeInArrowParameters, refExpressionErrors = null;
          this.state.maybeInArrowParameters = !0, this.next();
          let node = this.startNodeAt(startLoc);
          node.callee = base;
          let {
            maybeAsyncArrow,
            optionalChainMember
          } = state;
          maybeAsyncArrow && (this.expressionScope.enter(newAsyncArrowScope()), refExpressionErrors = new ExpressionErrors()), optionalChainMember && (node.optional = optional), optional ? node.arguments = this.parseCallExpressionArguments() : node.arguments = this.parseCallExpressionArguments(base.type !== "Super", node, refExpressionErrors);
          let finishedNode = this.finishCallExpression(node, optionalChainMember);
          return maybeAsyncArrow && this.shouldParseAsyncArrow() && !optional ? (state.stop = !0, this.checkDestructuringPrivate(refExpressionErrors), this.expressionScope.validateAsPattern(), this.expressionScope.exit(), finishedNode = this.parseAsyncArrowFromCallExpression(this.startNodeAt(startLoc), finishedNode)) : (maybeAsyncArrow && (this.checkExpressionErrors(refExpressionErrors, !0), this.expressionScope.exit()), this.toReferencedArguments(finishedNode)), this.state.maybeInArrowParameters = oldMaybeInArrowParameters, finishedNode;
        }
        toReferencedArguments(node, isParenthesizedExpr) {
          this.toReferencedListDeep(node.arguments, isParenthesizedExpr);
        }
        parseTaggedTemplateExpression(base, startLoc, state) {
          let node = this.startNodeAt(startLoc);
          return node.tag = base, node.quasi = this.parseTemplate(!0), state.optionalChainMember && this.raise(Errors.OptionalChainingNoTemplate, startLoc), this.finishNode(node, "TaggedTemplateExpression");
        }
        atPossibleAsyncArrow(base) {
          return base.type === "Identifier" && base.name === "async" && this.state.lastTokEndLoc.index === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 && this.offsetToSourcePos(base.start) === this.state.potentialArrowAt;
        }
        finishCallExpression(node, optional) {
          if (node.callee.type === "Import")
            if (node.arguments.length === 0 || node.arguments.length > 2)
              this.raise(Errors.ImportCallArity, node);
            else
              for (let arg of node.arguments)
                arg.type === "SpreadElement" && this.raise(Errors.ImportCallSpreadArgument, arg);
          return this.finishNode(node, optional ? "OptionalCallExpression" : "CallExpression");
        }
        parseCallExpressionArguments(allowPlaceholder, nodeForExtra, refExpressionErrors) {
          let elts = [], first = !0, oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
          for (this.state.inFSharpPipelineDirectBody = !1; !this.eat(11); ) {
            if (first)
              first = !1;
            else if (this.expect(12), this.match(11)) {
              nodeForExtra && this.addTrailingCommaExtraToNode(nodeForExtra), this.next();
              break;
            }
            elts.push(this.parseExprListItem(11, !1, refExpressionErrors, allowPlaceholder));
          }
          return this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody, elts;
        }
        shouldParseAsyncArrow() {
          return this.match(19) && !this.canInsertSemicolon();
        }
        parseAsyncArrowFromCallExpression(node, call) {
          var _call$extra;
          return this.resetPreviousNodeTrailingComments(call), this.expect(19), this.parseArrowExpression(node, call.arguments, !0, (_call$extra = call.extra) == null ? void 0 : _call$extra.trailingCommaLoc), call.innerComments && setInnerComments(node, call.innerComments), call.callee.trailingComments && setInnerComments(node, call.callee.trailingComments), node;
        }
        parseNoCallExpr() {
          let startLoc = this.state.startLoc;
          return this.parseSubscripts(this.parseExprAtom(), startLoc, !0);
        }
        parseExprAtom(refExpressionErrors) {
          let node, decorators = null, {
            type
          } = this.state;
          switch (type) {
            case 79:
              return this.parseSuper();
            case 83:
              return node = this.startNode(), this.next(), this.match(16) ? this.parseImportMetaPropertyOrPhaseCall(node) : this.match(10) ? this.optionFlags & 512 ? this.parseImportCall(node) : this.finishNode(node, "Import") : (this.raise(Errors.UnsupportedImport, this.state.lastTokStartLoc), this.finishNode(node, "Import"));
            case 78:
              return node = this.startNode(), this.next(), this.finishNode(node, "ThisExpression");
            case 90:
              return this.parseDo(this.startNode(), !1);
            case 56:
            case 31:
              return this.readRegexp(), this.parseRegExpLiteral(this.state.value);
            case 135:
              return this.parseNumericLiteral(this.state.value);
            case 136:
              return this.parseBigIntLiteral(this.state.value);
            case 134:
              return this.parseStringLiteral(this.state.value);
            case 84:
              return this.parseNullLiteral();
            case 85:
              return this.parseBooleanLiteral(!0);
            case 86:
              return this.parseBooleanLiteral(!1);
            case 10: {
              let canBeArrow = this.state.potentialArrowAt === this.state.start;
              return this.parseParenAndDistinguishExpression(canBeArrow);
            }
            case 0:
              return this.parseArrayLike(3, !1, refExpressionErrors);
            case 5:
              return this.parseObjectLike(8, !1, !1, refExpressionErrors);
            case 68:
              return this.parseFunctionOrFunctionSent();
            case 26:
              decorators = this.parseDecorators();
            case 80:
              return this.parseClass(this.maybeTakeDecorators(decorators, this.startNode()), !1);
            case 77:
              return this.parseNewOrNewTarget();
            case 25:
            case 24:
              return this.parseTemplate(!1);
            case 15: {
              node = this.startNode(), this.next(), node.object = null;
              let callee = node.callee = this.parseNoCallExpr();
              if (callee.type === "MemberExpression")
                return this.finishNode(node, "BindExpression");
              throw this.raise(Errors.UnsupportedBind, callee);
            }
            case 139:
              return this.raise(Errors.PrivateInExpectedIn, this.state.startLoc, {
                identifierName: this.state.value
              }), this.parsePrivateName();
            case 33:
              return this.parseTopicReferenceThenEqualsSign(54, "%");
            case 32:
              return this.parseTopicReferenceThenEqualsSign(44, "^");
            case 37:
            case 38:
              return this.parseTopicReference("hack");
            case 44:
            case 54:
            case 27: {
              let pipeProposal = this.getPluginOption("pipelineOperator", "proposal");
              if (pipeProposal)
                return this.parseTopicReference(pipeProposal);
              throw this.unexpected();
            }
            case 47: {
              let lookaheadCh = this.input.codePointAt(this.nextTokenStart());
              throw isIdentifierStart(lookaheadCh) || lookaheadCh === 62 ? this.expectOnePlugin(["jsx", "flow", "typescript"]) : this.unexpected();
            }
            default:
              if (type === 137)
                return this.parseDecimalLiteral(this.state.value);
              if (type === 2 || type === 1)
                return this.parseArrayLike(this.state.type === 2 ? 4 : 3, !0);
              if (type === 6 || type === 7)
                return this.parseObjectLike(this.state.type === 6 ? 9 : 8, !1, !0);
              if (tokenIsIdentifier(type)) {
                if (this.isContextual(127) && this.lookaheadInLineCharCode() === 123)
                  return this.parseModuleExpression();
                let canBeArrow = this.state.potentialArrowAt === this.state.start, containsEsc = this.state.containsEsc, id = this.parseIdentifier();
                if (!containsEsc && id.name === "async" && !this.canInsertSemicolon()) {
                  let {
                    type: type2
                  } = this.state;
                  if (type2 === 68)
                    return this.resetPreviousNodeTrailingComments(id), this.next(), this.parseAsyncFunctionExpression(this.startNodeAtNode(id));
                  if (tokenIsIdentifier(type2))
                    return canBeArrow && this.lookaheadCharCode() === 61 ? this.parseAsyncArrowUnaryFunction(this.startNodeAtNode(id)) : id;
                  if (type2 === 90)
                    return this.resetPreviousNodeTrailingComments(id), this.parseDo(this.startNodeAtNode(id), !0);
                }
                return canBeArrow && this.match(19) && !this.canInsertSemicolon() ? (this.next(), this.parseArrowExpression(this.startNodeAtNode(id), [id], !1)) : id;
              } else
                throw this.unexpected();
          }
        }
        parseTopicReferenceThenEqualsSign(topicTokenType, topicTokenValue) {
          let pipeProposal = this.getPluginOption("pipelineOperator", "proposal");
          if (pipeProposal)
            return this.state.type = topicTokenType, this.state.value = topicTokenValue, this.state.pos--, this.state.end--, this.state.endLoc = createPositionWithColumnOffset(this.state.endLoc, -1), this.parseTopicReference(pipeProposal);
          throw this.unexpected();
        }
        parseTopicReference(pipeProposal) {
          let node = this.startNode(), startLoc = this.state.startLoc, tokenType = this.state.type;
          return this.next(), this.finishTopicReference(node, startLoc, pipeProposal, tokenType);
        }
        finishTopicReference(node, startLoc, pipeProposal, tokenType) {
          if (this.testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType))
            return pipeProposal === "hack" ? (this.topicReferenceIsAllowedInCurrentContext() || this.raise(Errors.PipeTopicUnbound, startLoc), this.registerTopicReference(), this.finishNode(node, "TopicReference")) : (this.topicReferenceIsAllowedInCurrentContext() || this.raise(Errors.PrimaryTopicNotAllowed, startLoc), this.registerTopicReference(), this.finishNode(node, "PipelinePrimaryTopicReference"));
          throw this.raise(Errors.PipeTopicUnconfiguredToken, startLoc, {
            token: tokenLabelName(tokenType)
          });
        }
        testTopicReferenceConfiguration(pipeProposal, startLoc, tokenType) {
          switch (pipeProposal) {
            case "hack":
              return this.hasPlugin(["pipelineOperator", {
                topicToken: tokenLabelName(tokenType)
              }]);
            case "smart":
              return tokenType === 27;
            default:
              throw this.raise(Errors.PipeTopicRequiresHackPipes, startLoc);
          }
        }
        parseAsyncArrowUnaryFunction(node) {
          this.prodParam.enter(functionFlags(!0, this.prodParam.hasYield));
          let params = [this.parseIdentifier()];
          return this.prodParam.exit(), this.hasPrecedingLineBreak() && this.raise(Errors.LineTerminatorBeforeArrow, this.state.curPosition()), this.expect(19), this.parseArrowExpression(node, params, !0);
        }
        parseDo(node, isAsync) {
          this.expectPlugin("doExpressions"), isAsync && this.expectPlugin("asyncDoExpressions"), node.async = isAsync, this.next();
          let oldLabels = this.state.labels;
          return this.state.labels = [], isAsync ? (this.prodParam.enter(2), node.body = this.parseBlock(), this.prodParam.exit()) : node.body = this.parseBlock(), this.state.labels = oldLabels, this.finishNode(node, "DoExpression");
        }
        parseSuper() {
          let node = this.startNode();
          return this.next(), this.match(10) && !this.scope.allowDirectSuper ? this.optionFlags & 16 || this.raise(Errors.SuperNotAllowed, node) : this.scope.allowSuper || this.optionFlags & 16 || this.raise(Errors.UnexpectedSuper, node), !this.match(10) && !this.match(0) && !this.match(16) && this.raise(Errors.UnsupportedSuper, node), this.finishNode(node, "Super");
        }
        parsePrivateName() {
          let node = this.startNode(), id = this.startNodeAt(createPositionWithColumnOffset(this.state.startLoc, 1)), name = this.state.value;
          return this.next(), node.id = this.createIdentifier(id, name), this.finishNode(node, "PrivateName");
        }
        parseFunctionOrFunctionSent() {
          let node = this.startNode();
          if (this.next(), this.prodParam.hasYield && this.match(16)) {
            let meta = this.createIdentifier(this.startNodeAtNode(node), "function");
            return this.next(), this.match(103) ? this.expectPlugin("functionSent") : this.hasPlugin("functionSent") || this.unexpected(), this.parseMetaProperty(node, meta, "sent");
          }
          return this.parseFunction(node);
        }
        parseMetaProperty(node, meta, propertyName) {
          node.meta = meta;
          let containsEsc = this.state.containsEsc;
          return node.property = this.parseIdentifier(!0), (node.property.name !== propertyName || containsEsc) && this.raise(Errors.UnsupportedMetaProperty, node.property, {
            target: meta.name,
            onlyValidPropertyName: propertyName
          }), this.finishNode(node, "MetaProperty");
        }
        parseImportMetaPropertyOrPhaseCall(node) {
          if (this.next(), this.isContextual(105) || this.isContextual(97)) {
            let isSource = this.isContextual(105);
            return this.expectPlugin(isSource ? "sourcePhaseImports" : "deferredImportEvaluation"), this.next(), node.phase = isSource ? "source" : "defer", this.parseImportCall(node);
          } else {
            let id = this.createIdentifierAt(this.startNodeAtNode(node), "import", this.state.lastTokStartLoc);
            return this.isContextual(101) && (this.inModule || this.raise(Errors.ImportMetaOutsideModule, id), this.sawUnambiguousESM = !0), this.parseMetaProperty(node, id, "meta");
          }
        }
        parseLiteralAtNode(value, type, node) {
          return this.addExtra(node, "rawValue", value), this.addExtra(node, "raw", this.input.slice(this.offsetToSourcePos(node.start), this.state.end)), node.value = value, this.next(), this.finishNode(node, type);
        }
        parseLiteral(value, type) {
          let node = this.startNode();
          return this.parseLiteralAtNode(value, type, node);
        }
        parseStringLiteral(value) {
          return this.parseLiteral(value, "StringLiteral");
        }
        parseNumericLiteral(value) {
          return this.parseLiteral(value, "NumericLiteral");
        }
        parseBigIntLiteral(value) {
          return this.parseLiteral(value, "BigIntLiteral");
        }
        parseDecimalLiteral(value) {
          return this.parseLiteral(value, "DecimalLiteral");
        }
        parseRegExpLiteral(value) {
          let node = this.startNode();
          return this.addExtra(node, "raw", this.input.slice(this.offsetToSourcePos(node.start), this.state.end)), node.pattern = value.pattern, node.flags = value.flags, this.next(), this.finishNode(node, "RegExpLiteral");
        }
        parseBooleanLiteral(value) {
          let node = this.startNode();
          return node.value = value, this.next(), this.finishNode(node, "BooleanLiteral");
        }
        parseNullLiteral() {
          let node = this.startNode();
          return this.next(), this.finishNode(node, "NullLiteral");
        }
        parseParenAndDistinguishExpression(canBeArrow) {
          let startLoc = this.state.startLoc, val;
          this.next(), this.expressionScope.enter(newArrowHeadScope());
          let oldMaybeInArrowParameters = this.state.maybeInArrowParameters, oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
          this.state.maybeInArrowParameters = !0, this.state.inFSharpPipelineDirectBody = !1;
          let innerStartLoc = this.state.startLoc, exprList = [], refExpressionErrors = new ExpressionErrors(), first = !0, spreadStartLoc, optionalCommaStartLoc;
          for (; !this.match(11); ) {
            if (first)
              first = !1;
            else if (this.expect(12, refExpressionErrors.optionalParametersLoc === null ? null : refExpressionErrors.optionalParametersLoc), this.match(11)) {
              optionalCommaStartLoc = this.state.startLoc;
              break;
            }
            if (this.match(21)) {
              let spreadNodeStartLoc = this.state.startLoc;
              if (spreadStartLoc = this.state.startLoc, exprList.push(this.parseParenItem(this.parseRestBinding(), spreadNodeStartLoc)), !this.checkCommaAfterRest(41))
                break;
            } else
              exprList.push(this.parseMaybeAssignAllowInOrVoidPattern(11, refExpressionErrors, this.parseParenItem));
          }
          let innerEndLoc = this.state.lastTokEndLoc;
          this.expect(11), this.state.maybeInArrowParameters = oldMaybeInArrowParameters, this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
          let arrowNode = this.startNodeAt(startLoc);
          return canBeArrow && this.shouldParseArrow(exprList) && (arrowNode = this.parseArrow(arrowNode)) ? (this.checkDestructuringPrivate(refExpressionErrors), this.expressionScope.validateAsPattern(), this.expressionScope.exit(), this.parseArrowExpression(arrowNode, exprList, !1), arrowNode) : (this.expressionScope.exit(), exprList.length || this.unexpected(this.state.lastTokStartLoc), optionalCommaStartLoc && this.unexpected(optionalCommaStartLoc), spreadStartLoc && this.unexpected(spreadStartLoc), this.checkExpressionErrors(refExpressionErrors, !0), this.toReferencedListDeep(exprList, !0), exprList.length > 1 ? (val = this.startNodeAt(innerStartLoc), val.expressions = exprList, this.finishNode(val, "SequenceExpression"), this.resetEndLocation(val, innerEndLoc)) : val = exprList[0], this.wrapParenthesis(startLoc, val));
        }
        wrapParenthesis(startLoc, expression) {
          if (!(this.optionFlags & 1024))
            return this.addExtra(expression, "parenthesized", !0), this.addExtra(expression, "parenStart", startLoc.index), this.takeSurroundingComments(expression, startLoc.index, this.state.lastTokEndLoc.index), expression;
          let parenExpression = this.startNodeAt(startLoc);
          return parenExpression.expression = expression, this.finishNode(parenExpression, "ParenthesizedExpression");
        }
        shouldParseArrow(params) {
          return !this.canInsertSemicolon();
        }
        parseArrow(node) {
          if (this.eat(19))
            return node;
        }
        parseParenItem(node, startLoc) {
          return node;
        }
        parseNewOrNewTarget() {
          let node = this.startNode();
          if (this.next(), this.match(16)) {
            let meta = this.createIdentifier(this.startNodeAtNode(node), "new");
            this.next();
            let metaProp = this.parseMetaProperty(node, meta, "target");
            return this.scope.allowNewTarget || this.raise(Errors.UnexpectedNewTarget, metaProp), metaProp;
          }
          return this.parseNew(node);
        }
        parseNew(node) {
          if (this.parseNewCallee(node), this.eat(10)) {
            let args = this.parseExprList(11);
            this.toReferencedList(args), node.arguments = args;
          } else
            node.arguments = [];
          return this.finishNode(node, "NewExpression");
        }
        parseNewCallee(node) {
          let isImport = this.match(83), callee = this.parseNoCallExpr();
          node.callee = callee, (isImport && callee.type === "ImportExpression" || callee.type === "Import") && this.raise(Errors.ImportCallNotNewExpression, callee), callee.type === "Super" && this.raise(Errors.SuperCallNotNewExpression, callee);
        }
        parseTemplateElement(isTagged) {
          let {
            start,
            startLoc,
            end,
            value
          } = this.state, elemStart = start + 1, elem = this.startNodeAt(createPositionWithColumnOffset(startLoc, 1));
          value === null && (isTagged || this.raise(Errors.InvalidEscapeSequenceTemplate, createPositionWithColumnOffset(this.state.firstInvalidTemplateEscapePos, 1)));
          let isTail = this.match(24), endOffset = isTail ? -1 : -2, elemEnd = end + endOffset;
          elem.value = {
            raw: this.input.slice(elemStart, elemEnd).replace(/\r\n?/g, `
`),
            cooked: value === null ? null : value.slice(1, endOffset)
          }, elem.tail = isTail, this.next();
          let finishedNode = this.finishNode(elem, "TemplateElement");
          return this.resetEndLocation(finishedNode, createPositionWithColumnOffset(this.state.lastTokEndLoc, endOffset)), finishedNode;
        }
        parseTemplate(isTagged) {
          let node = this.startNode(), curElt = this.parseTemplateElement(isTagged), quasis = [curElt], substitutions = [];
          for (; !curElt.tail; )
            substitutions.push(this.parseTemplateSubstitution()), this.readTemplateContinuation(), quasis.push(curElt = this.parseTemplateElement(isTagged));
          return node.expressions = substitutions, node.quasis = quasis, this.finishNode(node, "TemplateLiteral");
        }
        parseTemplateSubstitution() {
          return this.parseExpression();
        }
        parseObjectLike(close, isPattern, isRecord, refExpressionErrors) {
          isRecord && this.expectPlugin("recordAndTuple");
          let oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
          this.state.inFSharpPipelineDirectBody = !1;
          let sawProto = !1, first = !0, node = this.startNode();
          for (node.properties = [], this.next(); !this.match(close); ) {
            if (first)
              first = !1;
            else if (this.expect(12), this.match(close)) {
              this.addTrailingCommaExtraToNode(node);
              break;
            }
            let prop;
            isPattern ? prop = this.parseBindingProperty() : (prop = this.parsePropertyDefinition(refExpressionErrors), sawProto = this.checkProto(prop, isRecord, sawProto, refExpressionErrors)), isRecord && !this.isObjectProperty(prop) && prop.type !== "SpreadElement" && this.raise(Errors.InvalidRecordProperty, prop), prop.shorthand && this.addExtra(prop, "shorthand", !0), node.properties.push(prop);
          }
          this.next(), this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
          let type = "ObjectExpression";
          return isPattern ? type = "ObjectPattern" : isRecord && (type = "RecordExpression"), this.finishNode(node, type);
        }
        addTrailingCommaExtraToNode(node) {
          this.addExtra(node, "trailingComma", this.state.lastTokStartLoc.index), this.addExtra(node, "trailingCommaLoc", this.state.lastTokStartLoc, !1);
        }
        maybeAsyncOrAccessorProp(prop) {
          return !prop.computed && prop.key.type === "Identifier" && (this.isLiteralPropertyName() || this.match(0) || this.match(55));
        }
        parsePropertyDefinition(refExpressionErrors) {
          let decorators = [];
          if (this.match(26))
            for (this.hasPlugin("decorators") && this.raise(Errors.UnsupportedPropertyDecorator, this.state.startLoc); this.match(26); )
              decorators.push(this.parseDecorator());
          let prop = this.startNode(), isAsync = !1, isAccessor = !1, startLoc;
          if (this.match(21))
            return decorators.length && this.unexpected(), this.parseSpread();
          decorators.length && (prop.decorators = decorators, decorators = []), prop.method = !1, refExpressionErrors && (startLoc = this.state.startLoc);
          let isGenerator = this.eat(55);
          this.parsePropertyNamePrefixOperator(prop);
          let containsEsc = this.state.containsEsc;
          if (this.parsePropertyName(prop, refExpressionErrors), !isGenerator && !containsEsc && this.maybeAsyncOrAccessorProp(prop)) {
            let {
              key
            } = prop, keyName2 = key.name;
            keyName2 === "async" && !this.hasPrecedingLineBreak() && (isAsync = !0, this.resetPreviousNodeTrailingComments(key), isGenerator = this.eat(55), this.parsePropertyName(prop)), (keyName2 === "get" || keyName2 === "set") && (isAccessor = !0, this.resetPreviousNodeTrailingComments(key), prop.kind = keyName2, this.match(55) && (isGenerator = !0, this.raise(Errors.AccessorIsGenerator, this.state.curPosition(), {
              kind: keyName2
            }), this.next()), this.parsePropertyName(prop));
          }
          return this.parseObjPropValue(prop, startLoc, isGenerator, isAsync, !1, isAccessor, refExpressionErrors);
        }
        getGetterSetterExpectedParamCount(method) {
          return method.kind === "get" ? 0 : 1;
        }
        getObjectOrClassMethodParams(method) {
          return method.params;
        }
        checkGetterSetterParams(method) {
          var _params;
          let paramCount = this.getGetterSetterExpectedParamCount(method), params = this.getObjectOrClassMethodParams(method);
          params.length !== paramCount && this.raise(method.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity, method), method.kind === "set" && ((_params = params[params.length - 1]) == null ? void 0 : _params.type) === "RestElement" && this.raise(Errors.BadSetterRestParameter, method);
        }
        parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) {
          if (isAccessor) {
            let finishedProp = this.parseMethod(prop, isGenerator, !1, !1, !1, "ObjectMethod");
            return this.checkGetterSetterParams(finishedProp), finishedProp;
          }
          if (isAsync || isGenerator || this.match(10))
            return isPattern && this.unexpected(), prop.kind = "method", prop.method = !0, this.parseMethod(prop, isGenerator, isAsync, !1, !1, "ObjectMethod");
        }
        parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors) {
          if (prop.shorthand = !1, this.eat(14))
            return prop.value = isPattern ? this.parseMaybeDefault(this.state.startLoc) : this.parseMaybeAssignAllowInOrVoidPattern(8, refExpressionErrors), this.finishObjectProperty(prop);
          if (!prop.computed && prop.key.type === "Identifier") {
            if (this.checkReservedWord(prop.key.name, prop.key.loc.start, !0, !1), isPattern)
              prop.value = this.parseMaybeDefault(startLoc, this.cloneIdentifier(prop.key));
            else if (this.match(29)) {
              let shorthandAssignLoc = this.state.startLoc;
              refExpressionErrors != null ? refExpressionErrors.shorthandAssignLoc === null && (refExpressionErrors.shorthandAssignLoc = shorthandAssignLoc) : this.raise(Errors.InvalidCoverInitializedName, shorthandAssignLoc), prop.value = this.parseMaybeDefault(startLoc, this.cloneIdentifier(prop.key));
            } else
              prop.value = this.cloneIdentifier(prop.key);
            return prop.shorthand = !0, this.finishObjectProperty(prop);
          }
        }
        finishObjectProperty(node) {
          return this.finishNode(node, "ObjectProperty");
        }
        parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors) {
          let node = this.parseObjectMethod(prop, isGenerator, isAsync, isPattern, isAccessor) || this.parseObjectProperty(prop, startLoc, isPattern, refExpressionErrors);
          return node || this.unexpected(), node;
        }
        parsePropertyName(prop, refExpressionErrors) {
          if (this.eat(0))
            prop.computed = !0, prop.key = this.parseMaybeAssignAllowIn(), this.expect(3);
          else {
            let {
              type,
              value
            } = this.state, key;
            if (tokenIsKeywordOrIdentifier(type))
              key = this.parseIdentifier(!0);
            else
              switch (type) {
                case 135:
                  key = this.parseNumericLiteral(value);
                  break;
                case 134:
                  key = this.parseStringLiteral(value);
                  break;
                case 136:
                  key = this.parseBigIntLiteral(value);
                  break;
                case 139: {
                  let privateKeyLoc = this.state.startLoc;
                  refExpressionErrors != null ? refExpressionErrors.privateKeyLoc === null && (refExpressionErrors.privateKeyLoc = privateKeyLoc) : this.raise(Errors.UnexpectedPrivateField, privateKeyLoc), key = this.parsePrivateName();
                  break;
                }
                default:
                  if (type === 137) {
                    key = this.parseDecimalLiteral(value);
                    break;
                  }
                  this.unexpected();
              }
            prop.key = key, type !== 139 && (prop.computed = !1);
          }
        }
        initFunction(node, isAsync) {
          node.id = null, node.generator = !1, node.async = isAsync;
        }
        parseMethod(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope = !1) {
          this.initFunction(node, isAsync), node.generator = isGenerator, this.scope.enter(530 | (inClassScope ? 576 : 0) | (allowDirectSuper ? 32 : 0)), this.prodParam.enter(functionFlags(isAsync, node.generator)), this.parseFunctionParams(node, isConstructor);
          let finishedNode = this.parseFunctionBodyAndFinish(node, type, !0);
          return this.prodParam.exit(), this.scope.exit(), finishedNode;
        }
        parseArrayLike(close, isTuple, refExpressionErrors) {
          isTuple && this.expectPlugin("recordAndTuple");
          let oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
          this.state.inFSharpPipelineDirectBody = !1;
          let node = this.startNode();
          return this.next(), node.elements = this.parseExprList(close, !isTuple, refExpressionErrors, node), this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody, this.finishNode(node, isTuple ? "TupleExpression" : "ArrayExpression");
        }
        parseArrowExpression(node, params, isAsync, trailingCommaLoc) {
          this.scope.enter(518);
          let flags = functionFlags(isAsync, !1);
          !this.match(5) && this.prodParam.hasIn && (flags |= 8), this.prodParam.enter(flags), this.initFunction(node, isAsync);
          let oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
          return params && (this.state.maybeInArrowParameters = !0, this.setArrowFunctionParameters(node, params, trailingCommaLoc)), this.state.maybeInArrowParameters = !1, this.parseFunctionBody(node, !0), this.prodParam.exit(), this.scope.exit(), this.state.maybeInArrowParameters = oldMaybeInArrowParameters, this.finishNode(node, "ArrowFunctionExpression");
        }
        setArrowFunctionParameters(node, params, trailingCommaLoc) {
          this.toAssignableList(params, trailingCommaLoc, !1), node.params = params;
        }
        parseFunctionBodyAndFinish(node, type, isMethod = !1) {
          return this.parseFunctionBody(node, !1, isMethod), this.finishNode(node, type);
        }
        parseFunctionBody(node, allowExpression, isMethod = !1) {
          let isExpression = allowExpression && !this.match(5);
          if (this.expressionScope.enter(newExpressionScope()), isExpression)
            node.body = this.parseMaybeAssign(), this.checkParams(node, !1, allowExpression, !1);
          else {
            let oldStrict = this.state.strict, oldLabels = this.state.labels;
            this.state.labels = [], this.prodParam.enter(this.prodParam.currentFlags() | 4), node.body = this.parseBlock(!0, !1, (hasStrictModeDirective) => {
              let nonSimple = !this.isSimpleParamList(node.params);
              hasStrictModeDirective && nonSimple && this.raise(Errors.IllegalLanguageModeDirective, (node.kind === "method" || node.kind === "constructor") && node.key ? node.key.loc.end : node);
              let strictModeChanged = !oldStrict && this.state.strict;
              this.checkParams(node, !this.state.strict && !allowExpression && !isMethod && !nonSimple, allowExpression, strictModeChanged), this.state.strict && node.id && this.checkIdentifier(node.id, 65, strictModeChanged);
            }), this.prodParam.exit(), this.state.labels = oldLabels;
          }
          this.expressionScope.exit();
        }
        isSimpleParameter(node) {
          return node.type === "Identifier";
        }
        isSimpleParamList(params) {
          for (let i = 0, len = params.length; i < len; i++)
            if (!this.isSimpleParameter(params[i])) return !1;
          return !0;
        }
        checkParams(node, allowDuplicates, isArrowFunction, strictModeChanged = !0) {
          let checkClashes = !allowDuplicates && /* @__PURE__ */ new Set(), formalParameters = {
            type: "FormalParameters"
          };
          for (let param of node.params)
            this.checkLVal(param, formalParameters, 5, checkClashes, strictModeChanged);
        }
        parseExprList(close, allowEmpty, refExpressionErrors, nodeForExtra) {
          let elts = [], first = !0;
          for (; !this.eat(close); ) {
            if (first)
              first = !1;
            else if (this.expect(12), this.match(close)) {
              nodeForExtra && this.addTrailingCommaExtraToNode(nodeForExtra), this.next();
              break;
            }
            elts.push(this.parseExprListItem(close, allowEmpty, refExpressionErrors));
          }
          return elts;
        }
        parseExprListItem(close, allowEmpty, refExpressionErrors, allowPlaceholder) {
          let elt;
          if (this.match(12))
            allowEmpty || this.raise(Errors.UnexpectedToken, this.state.curPosition(), {
              unexpected: ","
            }), elt = null;
          else if (this.match(21)) {
            let spreadNodeStartLoc = this.state.startLoc;
            elt = this.parseParenItem(this.parseSpread(refExpressionErrors), spreadNodeStartLoc);
          } else if (this.match(17)) {
            this.expectPlugin("partialApplication"), allowPlaceholder || this.raise(Errors.UnexpectedArgumentPlaceholder, this.state.startLoc);
            let node = this.startNode();
            this.next(), elt = this.finishNode(node, "ArgumentPlaceholder");
          } else
            elt = this.parseMaybeAssignAllowInOrVoidPattern(close, refExpressionErrors, this.parseParenItem);
          return elt;
        }
        parseIdentifier(liberal) {
          let node = this.startNode(), name = this.parseIdentifierName(liberal);
          return this.createIdentifier(node, name);
        }
        createIdentifier(node, name) {
          return node.name = name, node.loc.identifierName = name, this.finishNode(node, "Identifier");
        }
        createIdentifierAt(node, name, endLoc) {
          return node.name = name, node.loc.identifierName = name, this.finishNodeAt(node, "Identifier", endLoc);
        }
        parseIdentifierName(liberal) {
          let name, {
            startLoc,
            type
          } = this.state;
          tokenIsKeywordOrIdentifier(type) ? name = this.state.value : this.unexpected();
          let tokenIsKeyword2 = tokenKeywordOrIdentifierIsKeyword(type);
          return liberal ? tokenIsKeyword2 && this.replaceToken(132) : this.checkReservedWord(name, startLoc, tokenIsKeyword2, !1), this.next(), name;
        }
        checkReservedWord(word, startLoc, checkKeywords, isBinding) {
          if (word.length > 10 || !canBeReservedWord(word))
            return;
          if (checkKeywords && isKeyword(word)) {
            this.raise(Errors.UnexpectedKeyword, startLoc, {
              keyword: word
            });
            return;
          }
          if ((this.state.strict ? isBinding ? isStrictBindReservedWord : isStrictReservedWord : isReservedWord)(word, this.inModule)) {
            this.raise(Errors.UnexpectedReservedWord, startLoc, {
              reservedWord: word
            });
            return;
          } else if (word === "yield") {
            if (this.prodParam.hasYield) {
              this.raise(Errors.YieldBindingIdentifier, startLoc);
              return;
            }
          } else if (word === "await") {
            if (this.prodParam.hasAwait) {
              this.raise(Errors.AwaitBindingIdentifier, startLoc);
              return;
            }
            if (this.scope.inStaticBlock) {
              this.raise(Errors.AwaitBindingIdentifierInStaticBlock, startLoc);
              return;
            }
            this.expressionScope.recordAsyncArrowParametersError(startLoc);
          } else if (word === "arguments" && this.scope.inClassAndNotInNonArrowFunction) {
            this.raise(Errors.ArgumentsInClass, startLoc);
            return;
          }
        }
        recordAwaitIfAllowed() {
          let isAwaitAllowed = this.prodParam.hasAwait;
          return isAwaitAllowed && !this.scope.inFunction && (this.state.hasTopLevelAwait = !0), isAwaitAllowed;
        }
        parseAwait(startLoc) {
          let node = this.startNodeAt(startLoc);
          return this.expressionScope.recordParameterInitializerError(Errors.AwaitExpressionFormalParameter, node), this.eat(55) && this.raise(Errors.ObsoleteAwaitStar, node), !this.scope.inFunction && !(this.optionFlags & 1) && (this.isAmbiguousPrefixOrIdentifier() ? this.ambiguousScriptDifferentAst = !0 : this.sawUnambiguousESM = !0), this.state.soloAwait || (node.argument = this.parseMaybeUnary(null, !0)), this.finishNode(node, "AwaitExpression");
        }
        isAmbiguousPrefixOrIdentifier() {
          if (this.hasPrecedingLineBreak()) return !0;
          let {
            type
          } = this.state;
          return type === 53 || type === 10 || type === 0 || tokenIsTemplate(type) || type === 102 && !this.state.containsEsc || type === 138 || type === 56 || this.hasPlugin("v8intrinsic") && type === 54;
        }
        parseYield(startLoc) {
          let node = this.startNodeAt(startLoc);
          this.expressionScope.recordParameterInitializerError(Errors.YieldInParameter, node);
          let delegating = !1, argument = null;
          if (!this.hasPrecedingLineBreak())
            switch (delegating = this.eat(55), this.state.type) {
              case 13:
              case 140:
              case 8:
              case 11:
              case 3:
              case 9:
              case 14:
              case 12:
                if (!delegating) break;
              default:
                argument = this.parseMaybeAssign();
            }
          return node.delegate = delegating, node.argument = argument, this.finishNode(node, "YieldExpression");
        }
        parseImportCall(node) {
          if (this.next(), node.source = this.parseMaybeAssignAllowIn(), node.options = null, this.eat(12)) {
            if (this.match(11))
              this.addTrailingCommaExtraToNode(node.source);
            else if (node.options = this.parseMaybeAssignAllowIn(), this.eat(12) && (this.addTrailingCommaExtraToNode(node.options), !this.match(11))) {
              do
                this.parseMaybeAssignAllowIn();
              while (this.eat(12) && !this.match(11));
              this.raise(Errors.ImportCallArity, node);
            }
          }
          return this.expect(11), this.finishNode(node, "ImportExpression");
        }
        checkPipelineAtInfixOperator(left, leftStartLoc) {
          this.hasPlugin(["pipelineOperator", {
            proposal: "smart"
          }]) && left.type === "SequenceExpression" && this.raise(Errors.PipelineHeadSequenceExpression, leftStartLoc);
        }
        parseSmartPipelineBodyInStyle(childExpr, startLoc) {
          if (this.isSimpleReference(childExpr)) {
            let bodyNode = this.startNodeAt(startLoc);
            return bodyNode.callee = childExpr, this.finishNode(bodyNode, "PipelineBareFunction");
          } else {
            let bodyNode = this.startNodeAt(startLoc);
            return this.checkSmartPipeTopicBodyEarlyErrors(startLoc), bodyNode.expression = childExpr, this.finishNode(bodyNode, "PipelineTopicExpression");
          }
        }
        isSimpleReference(expression) {
          switch (expression.type) {
            case "MemberExpression":
              return !expression.computed && this.isSimpleReference(expression.object);
            case "Identifier":
              return !0;
            default:
              return !1;
          }
        }
        checkSmartPipeTopicBodyEarlyErrors(startLoc) {
          if (this.match(19))
            throw this.raise(Errors.PipelineBodyNoArrow, this.state.startLoc);
          this.topicReferenceWasUsedInCurrentContext() || this.raise(Errors.PipelineTopicUnused, startLoc);
        }
        withTopicBindingContext(callback) {
          let outerContextTopicState = this.state.topicContext;
          this.state.topicContext = {
            maxNumOfResolvableTopics: 1,
            maxTopicIndex: null
          };
          try {
            return callback();
          } finally {
            this.state.topicContext = outerContextTopicState;
          }
        }
        withSmartMixTopicForbiddingContext(callback) {
          if (this.hasPlugin(["pipelineOperator", {
            proposal: "smart"
          }])) {
            let outerContextTopicState = this.state.topicContext;
            this.state.topicContext = {
              maxNumOfResolvableTopics: 0,
              maxTopicIndex: null
            };
            try {
              return callback();
            } finally {
              this.state.topicContext = outerContextTopicState;
            }
          } else
            return callback();
        }
        withSoloAwaitPermittingContext(callback) {
          let outerContextSoloAwaitState = this.state.soloAwait;
          this.state.soloAwait = !0;
          try {
            return callback();
          } finally {
            this.state.soloAwait = outerContextSoloAwaitState;
          }
        }
        allowInAnd(callback) {
          let flags = this.prodParam.currentFlags();
          if (8 & ~flags) {
            this.prodParam.enter(flags | 8);
            try {
              return callback();
            } finally {
              this.prodParam.exit();
            }
          }
          return callback();
        }
        disallowInAnd(callback) {
          let flags = this.prodParam.currentFlags();
          if (8 & flags) {
            this.prodParam.enter(flags & -9);
            try {
              return callback();
            } finally {
              this.prodParam.exit();
            }
          }
          return callback();
        }
        registerTopicReference() {
          this.state.topicContext.maxTopicIndex = 0;
        }
        topicReferenceIsAllowedInCurrentContext() {
          return this.state.topicContext.maxNumOfResolvableTopics >= 1;
        }
        topicReferenceWasUsedInCurrentContext() {
          return this.state.topicContext.maxTopicIndex != null && this.state.topicContext.maxTopicIndex >= 0;
        }
        parseFSharpPipelineBody(prec) {
          let startLoc = this.state.startLoc;
          this.state.potentialArrowAt = this.state.start;
          let oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
          this.state.inFSharpPipelineDirectBody = !0;
          let ret = this.parseExprOp(this.parseMaybeUnaryOrPrivate(), startLoc, prec);
          return this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody, ret;
        }
        parseModuleExpression() {
          this.expectPlugin("moduleBlocks");
          let node = this.startNode();
          this.next(), this.match(5) || this.unexpected(null, 5);
          let program = this.startNodeAt(this.state.endLoc);
          this.next();
          let revertScopes = this.initializeScopes(!0);
          this.enterInitialScopes();
          try {
            node.body = this.parseProgram(program, 8, "module");
          } finally {
            revertScopes();
          }
          return this.finishNode(node, "ModuleExpression");
        }
        parseVoidPattern(refExpressionErrors) {
          this.expectPlugin("discardBinding");
          let node = this.startNode();
          return refExpressionErrors != null && (refExpressionErrors.voidPatternLoc = this.state.startLoc), this.next(), this.finishNode(node, "VoidPattern");
        }
        parseMaybeAssignAllowInOrVoidPattern(close, refExpressionErrors, afterLeftParse) {
          if (refExpressionErrors != null && this.match(88)) {
            let nextCode = this.lookaheadCharCode();
            if (nextCode === 44 || nextCode === (close === 3 ? 93 : close === 8 ? 125 : 41) || nextCode === 61)
              return this.parseMaybeDefault(this.state.startLoc, this.parseVoidPattern(refExpressionErrors));
          }
          return this.parseMaybeAssignAllowIn(refExpressionErrors, afterLeftParse);
        }
        parsePropertyNamePrefixOperator(prop) {
        }
      }, loopLabel = {
        kind: 1
      }, switchLabel = {
        kind: 2
      }, loneSurrogate = /[\uD800-\uDFFF]/u, keywordRelationalOperator = /in(?:stanceof)?/y;
      function babel7CompatTokens(tokens, input, startIndex) {
        for (let i = 0; i < tokens.length; i++) {
          let token = tokens[i], {
            type
          } = token;
          if (typeof type == "number") {
            if (type === 139) {
              let {
                loc,
                start,
                value,
                end
              } = token, hashEndPos = start + 1, hashEndLoc = createPositionWithColumnOffset(loc.start, 1);
              tokens.splice(i, 1, new Token({
                type: getExportedToken(27),
                value: "#",
                start,
                end: hashEndPos,
                startLoc: loc.start,
                endLoc: hashEndLoc
              }), new Token({
                type: getExportedToken(132),
                value,
                start: hashEndPos,
                end,
                startLoc: hashEndLoc,
                endLoc: loc.end
              })), i++;
              continue;
            }
            if (tokenIsTemplate(type)) {
              let {
                loc,
                start,
                value,
                end
              } = token, backquoteEnd = start + 1, backquoteEndLoc = createPositionWithColumnOffset(loc.start, 1), startToken;
              input.charCodeAt(start - startIndex) === 96 ? startToken = new Token({
                type: getExportedToken(22),
                value: "`",
                start,
                end: backquoteEnd,
                startLoc: loc.start,
                endLoc: backquoteEndLoc
              }) : startToken = new Token({
                type: getExportedToken(8),
                value: "}",
                start,
                end: backquoteEnd,
                startLoc: loc.start,
                endLoc: backquoteEndLoc
              });
              let templateValue, templateElementEnd, templateElementEndLoc, endToken;
              type === 24 ? (templateElementEnd = end - 1, templateElementEndLoc = createPositionWithColumnOffset(loc.end, -1), templateValue = value === null ? null : value.slice(1, -1), endToken = new Token({
                type: getExportedToken(22),
                value: "`",
                start: templateElementEnd,
                end,
                startLoc: templateElementEndLoc,
                endLoc: loc.end
              })) : (templateElementEnd = end - 2, templateElementEndLoc = createPositionWithColumnOffset(loc.end, -2), templateValue = value === null ? null : value.slice(1, -2), endToken = new Token({
                type: getExportedToken(23),
                value: "${",
                start: templateElementEnd,
                end,
                startLoc: templateElementEndLoc,
                endLoc: loc.end
              })), tokens.splice(i, 1, startToken, new Token({
                type: getExportedToken(20),
                value: templateValue,
                start: backquoteEnd,
                end: templateElementEnd,
                startLoc: backquoteEndLoc,
                endLoc: templateElementEndLoc
              }), endToken), i += 2;
              continue;
            }
            token.type = getExportedToken(type);
          }
        }
        return tokens;
      }
      var StatementParser = class extends ExpressionParser {
        parseTopLevel(file, program) {
          return file.program = this.parseProgram(program, 140, this.options.sourceType === "module" ? "module" : "script"), file.comments = this.comments, this.optionFlags & 256 && (file.tokens = babel7CompatTokens(this.tokens, this.input, this.startIndex)), this.finishNode(file, "File");
        }
        parseProgram(program, end, sourceType) {
          if (program.sourceType = sourceType, program.interpreter = this.parseInterpreterDirective(), this.parseBlockBody(program, !0, !0, end), this.inModule) {
            if (!(this.optionFlags & 64) && this.scope.undefinedExports.size > 0)
              for (let [localName, at] of Array.from(this.scope.undefinedExports))
                this.raise(Errors.ModuleExportUndefined, at, {
                  localName
                });
            this.addExtra(program, "topLevelAwait", this.state.hasTopLevelAwait);
          }
          let finishedProgram;
          return end === 140 ? finishedProgram = this.finishNode(program, "Program") : finishedProgram = this.finishNodeAt(program, "Program", createPositionWithColumnOffset(this.state.startLoc, -1)), finishedProgram;
        }
        stmtToDirective(stmt) {
          let directive = this.castNodeTo(stmt, "Directive"), directiveLiteral = this.castNodeTo(stmt.expression, "DirectiveLiteral"), expressionValue = directiveLiteral.value, raw = this.input.slice(this.offsetToSourcePos(directiveLiteral.start), this.offsetToSourcePos(directiveLiteral.end)), val = directiveLiteral.value = raw.slice(1, -1);
          return this.addExtra(directiveLiteral, "raw", raw), this.addExtra(directiveLiteral, "rawValue", val), this.addExtra(directiveLiteral, "expressionValue", expressionValue), directive.value = directiveLiteral, delete stmt.expression, directive;
        }
        parseInterpreterDirective() {
          if (!this.match(28))
            return null;
          let node = this.startNode();
          return node.value = this.state.value, this.next(), this.finishNode(node, "InterpreterDirective");
        }
        isLet() {
          return this.isContextual(100) ? this.hasFollowingBindingAtom() : !1;
        }
        isUsing() {
          return this.isContextual(107) ? this.nextTokenIsIdentifierOnSameLine() : !1;
        }
        isForUsing() {
          if (!this.isContextual(107))
            return !1;
          let next = this.nextTokenInLineStart(), nextCh = this.codePointAtPos(next);
          if (this.isUnparsedContextual(next, "of")) {
            let nextCharAfterOf = this.lookaheadCharCodeSince(next + 2);
            if (nextCharAfterOf !== 61 && nextCharAfterOf !== 58 && nextCharAfterOf !== 59)
              return !1;
          }
          return !!(this.chStartsBindingIdentifier(nextCh, next) || this.isUnparsedContextual(next, "void"));
        }
        nextTokenIsIdentifierOnSameLine() {
          let next = this.nextTokenInLineStart(), nextCh = this.codePointAtPos(next);
          return this.chStartsBindingIdentifier(nextCh, next);
        }
        isAwaitUsing() {
          if (!this.isContextual(96))
            return !1;
          let next = this.nextTokenInLineStart();
          if (this.isUnparsedContextual(next, "using")) {
            next = this.nextTokenInLineStartSince(next + 5);
            let nextCh = this.codePointAtPos(next);
            if (this.chStartsBindingIdentifier(nextCh, next))
              return !0;
          }
          return !1;
        }
        chStartsBindingIdentifier(ch, pos) {
          if (isIdentifierStart(ch)) {
            if (keywordRelationalOperator.lastIndex = pos, keywordRelationalOperator.test(this.input)) {
              let endCh = this.codePointAtPos(keywordRelationalOperator.lastIndex);
              if (!isIdentifierChar(endCh) && endCh !== 92)
                return !1;
            }
            return !0;
          } else return ch === 92;
        }
        chStartsBindingPattern(ch) {
          return ch === 91 || ch === 123;
        }
        hasFollowingBindingAtom() {
          let next = this.nextTokenStart(), nextCh = this.codePointAtPos(next);
          return this.chStartsBindingPattern(nextCh) || this.chStartsBindingIdentifier(nextCh, next);
        }
        hasInLineFollowingBindingIdentifierOrBrace() {
          let next = this.nextTokenInLineStart(), nextCh = this.codePointAtPos(next);
          return nextCh === 123 || this.chStartsBindingIdentifier(nextCh, next);
        }
        allowsUsing() {
          return (this.scope.inModule || !this.scope.inTopLevel) && !this.scope.inBareCaseStatement;
        }
        parseModuleItem() {
          return this.parseStatementLike(15);
        }
        parseStatementListItem() {
          return this.parseStatementLike(6 | (!this.options.annexB || this.state.strict ? 0 : 8));
        }
        parseStatementOrSloppyAnnexBFunctionDeclaration(allowLabeledFunction = !1) {
          let flags = 0;
          return this.options.annexB && !this.state.strict && (flags |= 4, allowLabeledFunction && (flags |= 8)), this.parseStatementLike(flags);
        }
        parseStatement() {
          return this.parseStatementLike(0);
        }
        parseStatementLike(flags) {
          let decorators = null;
          return this.match(26) && (decorators = this.parseDecorators(!0)), this.parseStatementContent(flags, decorators);
        }
        parseStatementContent(flags, decorators) {
          let startType = this.state.type, node = this.startNode(), allowDeclaration = !!(flags & 2), allowFunctionDeclaration = !!(flags & 4), topLevel = flags & 1;
          switch (startType) {
            case 60:
              return this.parseBreakContinueStatement(node, !0);
            case 63:
              return this.parseBreakContinueStatement(node, !1);
            case 64:
              return this.parseDebuggerStatement(node);
            case 90:
              return this.parseDoWhileStatement(node);
            case 91:
              return this.parseForStatement(node);
            case 68:
              if (this.lookaheadCharCode() === 46) break;
              return allowFunctionDeclaration || this.raise(this.state.strict ? Errors.StrictFunction : this.options.annexB ? Errors.SloppyFunctionAnnexB : Errors.SloppyFunction, this.state.startLoc), this.parseFunctionStatement(node, !1, !allowDeclaration && allowFunctionDeclaration);
            case 80:
              return allowDeclaration || this.unexpected(), this.parseClass(this.maybeTakeDecorators(decorators, node), !0);
            case 69:
              return this.parseIfStatement(node);
            case 70:
              return this.parseReturnStatement(node);
            case 71:
              return this.parseSwitchStatement(node);
            case 72:
              return this.parseThrowStatement(node);
            case 73:
              return this.parseTryStatement(node);
            case 96:
              if (this.isAwaitUsing())
                return this.allowsUsing() ? allowDeclaration ? this.recordAwaitIfAllowed() || this.raise(Errors.AwaitUsingNotInAsyncContext, node) : this.raise(Errors.UnexpectedLexicalDeclaration, node) : this.raise(Errors.UnexpectedUsingDeclaration, node), this.next(), this.parseVarStatement(node, "await using");
              break;
            case 107:
              if (this.state.containsEsc || !this.hasInLineFollowingBindingIdentifierOrBrace())
                break;
              return this.allowsUsing() ? allowDeclaration || this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc) : this.raise(Errors.UnexpectedUsingDeclaration, this.state.startLoc), this.parseVarStatement(node, "using");
            case 100: {
              if (this.state.containsEsc)
                break;
              let next = this.nextTokenStart(), nextCh = this.codePointAtPos(next);
              if (nextCh !== 91 && (!allowDeclaration && this.hasFollowingLineBreak() || !this.chStartsBindingIdentifier(nextCh, next) && nextCh !== 123))
                break;
            }
            case 75:
              allowDeclaration || this.raise(Errors.UnexpectedLexicalDeclaration, this.state.startLoc);
            case 74: {
              let kind = this.state.value;
              return this.parseVarStatement(node, kind);
            }
            case 92:
              return this.parseWhileStatement(node);
            case 76:
              return this.parseWithStatement(node);
            case 5:
              return this.parseBlock();
            case 13:
              return this.parseEmptyStatement(node);
            case 83: {
              let nextTokenCharCode = this.lookaheadCharCode();
              if (nextTokenCharCode === 40 || nextTokenCharCode === 46)
                break;
            }
            case 82: {
              !(this.optionFlags & 8) && !topLevel && this.raise(Errors.UnexpectedImportExport, this.state.startLoc), this.next();
              let result;
              return startType === 83 ? result = this.parseImport(node) : result = this.parseExport(node, decorators), this.assertModuleNodeAllowed(result), result;
            }
            default:
              if (this.isAsyncFunction())
                return allowDeclaration || this.raise(Errors.AsyncFunctionInSingleStatementContext, this.state.startLoc), this.next(), this.parseFunctionStatement(node, !0, !allowDeclaration && allowFunctionDeclaration);
          }
          let maybeName = this.state.value, expr = this.parseExpression();
          return tokenIsIdentifier(startType) && expr.type === "Identifier" && this.eat(14) ? this.parseLabeledStatement(node, maybeName, expr, flags) : this.parseExpressionStatement(node, expr, decorators);
        }
        assertModuleNodeAllowed(node) {
          !(this.optionFlags & 8) && !this.inModule && this.raise(Errors.ImportOutsideModule, node);
        }
        decoratorsEnabledBeforeExport() {
          return this.hasPlugin("decorators-legacy") ? !0 : this.hasPlugin("decorators") && this.getPluginOption("decorators", "decoratorsBeforeExport") !== !1;
        }
        maybeTakeDecorators(maybeDecorators, classNode, exportNode) {
          if (maybeDecorators) {
            var _classNode$decorators;
            (_classNode$decorators = classNode.decorators) != null && _classNode$decorators.length ? (typeof this.getPluginOption("decorators", "decoratorsBeforeExport") != "boolean" && this.raise(Errors.DecoratorsBeforeAfterExport, classNode.decorators[0]), classNode.decorators.unshift(...maybeDecorators)) : classNode.decorators = maybeDecorators, this.resetStartLocationFromNode(classNode, maybeDecorators[0]), exportNode && this.resetStartLocationFromNode(exportNode, classNode);
          }
          return classNode;
        }
        canHaveLeadingDecorator() {
          return this.match(80);
        }
        parseDecorators(allowExport) {
          let decorators = [];
          do
            decorators.push(this.parseDecorator());
          while (this.match(26));
          if (this.match(82))
            allowExport || this.unexpected(), this.decoratorsEnabledBeforeExport() || this.raise(Errors.DecoratorExportClass, this.state.startLoc);
          else if (!this.canHaveLeadingDecorator())
            throw this.raise(Errors.UnexpectedLeadingDecorator, this.state.startLoc);
          return decorators;
        }
        parseDecorator() {
          this.expectOnePlugin(["decorators", "decorators-legacy"]);
          let node = this.startNode();
          if (this.next(), this.hasPlugin("decorators")) {
            let startLoc = this.state.startLoc, expr;
            if (this.match(10)) {
              let startLoc2 = this.state.startLoc;
              this.next(), expr = this.parseExpression(), this.expect(11), expr = this.wrapParenthesis(startLoc2, expr);
              let paramsStartLoc = this.state.startLoc;
              node.expression = this.parseMaybeDecoratorArguments(expr, startLoc2), this.getPluginOption("decorators", "allowCallParenthesized") === !1 && node.expression !== expr && this.raise(Errors.DecoratorArgumentsOutsideParentheses, paramsStartLoc);
            } else {
              for (expr = this.parseIdentifier(!1); this.eat(16); ) {
                let node2 = this.startNodeAt(startLoc);
                node2.object = expr, this.match(139) ? (this.classScope.usePrivateName(this.state.value, this.state.startLoc), node2.property = this.parsePrivateName()) : node2.property = this.parseIdentifier(!0), node2.computed = !1, expr = this.finishNode(node2, "MemberExpression");
              }
              node.expression = this.parseMaybeDecoratorArguments(expr, startLoc);
            }
          } else
            node.expression = this.parseExprSubscripts();
          return this.finishNode(node, "Decorator");
        }
        parseMaybeDecoratorArguments(expr, startLoc) {
          if (this.eat(10)) {
            let node = this.startNodeAt(startLoc);
            return node.callee = expr, node.arguments = this.parseCallExpressionArguments(), this.toReferencedList(node.arguments), this.finishNode(node, "CallExpression");
          }
          return expr;
        }
        parseBreakContinueStatement(node, isBreak) {
          return this.next(), this.isLineTerminator() ? node.label = null : (node.label = this.parseIdentifier(), this.semicolon()), this.verifyBreakContinue(node, isBreak), this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
        }
        verifyBreakContinue(node, isBreak) {
          let i;
          for (i = 0; i < this.state.labels.length; ++i) {
            let lab = this.state.labels[i];
            if ((node.label == null || lab.name === node.label.name) && (lab.kind != null && (isBreak || lab.kind === 1) || node.label && isBreak))
              break;
          }
          if (i === this.state.labels.length) {
            let type = isBreak ? "BreakStatement" : "ContinueStatement";
            this.raise(Errors.IllegalBreakContinue, node, {
              type
            });
          }
        }
        parseDebuggerStatement(node) {
          return this.next(), this.semicolon(), this.finishNode(node, "DebuggerStatement");
        }
        parseHeaderExpression() {
          this.expect(10);
          let val = this.parseExpression();
          return this.expect(11), val;
        }
        parseDoWhileStatement(node) {
          return this.next(), this.state.labels.push(loopLabel), node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement()), this.state.labels.pop(), this.expect(92), node.test = this.parseHeaderExpression(), this.eat(13), this.finishNode(node, "DoWhileStatement");
        }
        parseForStatement(node) {
          this.next(), this.state.labels.push(loopLabel);
          let awaitAt = null;
          if (this.isContextual(96) && this.recordAwaitIfAllowed() && (awaitAt = this.state.startLoc, this.next()), this.scope.enter(0), this.expect(10), this.match(13))
            return awaitAt !== null && this.unexpected(awaitAt), this.parseFor(node, null);
          let startsWithLet = this.isContextual(100);
          {
            let startsWithAwaitUsing = this.isAwaitUsing(), starsWithUsingDeclaration = startsWithAwaitUsing || this.isForUsing(), isLetOrUsing = startsWithLet && this.hasFollowingBindingAtom() || starsWithUsingDeclaration;
            if (this.match(74) || this.match(75) || isLetOrUsing) {
              let initNode = this.startNode(), kind;
              startsWithAwaitUsing ? (kind = "await using", this.recordAwaitIfAllowed() || this.raise(Errors.AwaitUsingNotInAsyncContext, this.state.startLoc), this.next()) : kind = this.state.value, this.next(), this.parseVar(initNode, !0, kind);
              let init2 = this.finishNode(initNode, "VariableDeclaration"), isForIn = this.match(58);
              return isForIn && starsWithUsingDeclaration && this.raise(Errors.ForInUsing, init2), (isForIn || this.isContextual(102)) && init2.declarations.length === 1 ? this.parseForIn(node, init2, awaitAt) : (awaitAt !== null && this.unexpected(awaitAt), this.parseFor(node, init2));
            }
          }
          let startsWithAsync = this.isContextual(95), refExpressionErrors = new ExpressionErrors(), init = this.parseExpression(!0, refExpressionErrors), isForOf = this.isContextual(102);
          if (isForOf && (startsWithLet && this.raise(Errors.ForOfLet, init), awaitAt === null && startsWithAsync && init.type === "Identifier" && this.raise(Errors.ForOfAsync, init)), isForOf || this.match(58)) {
            this.checkDestructuringPrivate(refExpressionErrors), this.toAssignable(init, !0);
            let type = isForOf ? "ForOfStatement" : "ForInStatement";
            return this.checkLVal(init, {
              type
            }), this.parseForIn(node, init, awaitAt);
          } else
            this.checkExpressionErrors(refExpressionErrors, !0);
          return awaitAt !== null && this.unexpected(awaitAt), this.parseFor(node, init);
        }
        parseFunctionStatement(node, isAsync, isHangingDeclaration) {
          return this.next(), this.parseFunction(node, 1 | (isHangingDeclaration ? 2 : 0) | (isAsync ? 8 : 0));
        }
        parseIfStatement(node) {
          return this.next(), node.test = this.parseHeaderExpression(), node.consequent = this.parseStatementOrSloppyAnnexBFunctionDeclaration(), node.alternate = this.eat(66) ? this.parseStatementOrSloppyAnnexBFunctionDeclaration() : null, this.finishNode(node, "IfStatement");
        }
        parseReturnStatement(node) {
          return this.prodParam.hasReturn || this.raise(Errors.IllegalReturn, this.state.startLoc), this.next(), this.isLineTerminator() ? node.argument = null : (node.argument = this.parseExpression(), this.semicolon()), this.finishNode(node, "ReturnStatement");
        }
        parseSwitchStatement(node) {
          this.next(), node.discriminant = this.parseHeaderExpression();
          let cases = node.cases = [];
          this.expect(5), this.state.labels.push(switchLabel), this.scope.enter(256);
          let cur;
          for (let sawDefault; !this.match(8); )
            if (this.match(61) || this.match(65)) {
              let isCase = this.match(61);
              cur && this.finishNode(cur, "SwitchCase"), cases.push(cur = this.startNode()), cur.consequent = [], this.next(), isCase ? cur.test = this.parseExpression() : (sawDefault && this.raise(Errors.MultipleDefaultsInSwitch, this.state.lastTokStartLoc), sawDefault = !0, cur.test = null), this.expect(14);
            } else
              cur ? cur.consequent.push(this.parseStatementListItem()) : this.unexpected();
          return this.scope.exit(), cur && this.finishNode(cur, "SwitchCase"), this.next(), this.state.labels.pop(), this.finishNode(node, "SwitchStatement");
        }
        parseThrowStatement(node) {
          return this.next(), this.hasPrecedingLineBreak() && this.raise(Errors.NewlineAfterThrow, this.state.lastTokEndLoc), node.argument = this.parseExpression(), this.semicolon(), this.finishNode(node, "ThrowStatement");
        }
        parseCatchClauseParam() {
          let param = this.parseBindingAtom();
          return this.scope.enter(this.options.annexB && param.type === "Identifier" ? 8 : 0), this.checkLVal(param, {
            type: "CatchClause"
          }, 9), param;
        }
        parseTryStatement(node) {
          if (this.next(), node.block = this.parseBlock(), node.handler = null, this.match(62)) {
            let clause = this.startNode();
            this.next(), this.match(10) ? (this.expect(10), clause.param = this.parseCatchClauseParam(), this.expect(11)) : (clause.param = null, this.scope.enter(0)), clause.body = this.withSmartMixTopicForbiddingContext(() => this.parseBlock(!1, !1)), this.scope.exit(), node.handler = this.finishNode(clause, "CatchClause");
          }
          return node.finalizer = this.eat(67) ? this.parseBlock() : null, !node.handler && !node.finalizer && this.raise(Errors.NoCatchOrFinally, node), this.finishNode(node, "TryStatement");
        }
        parseVarStatement(node, kind, allowMissingInitializer = !1) {
          return this.next(), this.parseVar(node, !1, kind, allowMissingInitializer), this.semicolon(), this.finishNode(node, "VariableDeclaration");
        }
        parseWhileStatement(node) {
          return this.next(), node.test = this.parseHeaderExpression(), this.state.labels.push(loopLabel), node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement()), this.state.labels.pop(), this.finishNode(node, "WhileStatement");
        }
        parseWithStatement(node) {
          return this.state.strict && this.raise(Errors.StrictWith, this.state.startLoc), this.next(), node.object = this.parseHeaderExpression(), node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement()), this.finishNode(node, "WithStatement");
        }
        parseEmptyStatement(node) {
          return this.next(), this.finishNode(node, "EmptyStatement");
        }
        parseLabeledStatement(node, maybeName, expr, flags) {
          for (let label of this.state.labels)
            label.name === maybeName && this.raise(Errors.LabelRedeclaration, expr, {
              labelName: maybeName
            });
          let kind = tokenIsLoop(this.state.type) ? 1 : this.match(71) ? 2 : null;
          for (let i = this.state.labels.length - 1; i >= 0; i--) {
            let label = this.state.labels[i];
            if (label.statementStart === node.start)
              label.statementStart = this.sourceToOffsetPos(this.state.start), label.kind = kind;
            else
              break;
          }
          return this.state.labels.push({
            name: maybeName,
            kind,
            statementStart: this.sourceToOffsetPos(this.state.start)
          }), node.body = flags & 8 ? this.parseStatementOrSloppyAnnexBFunctionDeclaration(!0) : this.parseStatement(), this.state.labels.pop(), node.label = expr, this.finishNode(node, "LabeledStatement");
        }
        parseExpressionStatement(node, expr, decorators) {
          return node.expression = expr, this.semicolon(), this.finishNode(node, "ExpressionStatement");
        }
        parseBlock(allowDirectives = !1, createNewLexicalScope = !0, afterBlockParse) {
          let node = this.startNode();
          return allowDirectives && this.state.strictErrors.clear(), this.expect(5), createNewLexicalScope && this.scope.enter(0), this.parseBlockBody(node, allowDirectives, !1, 8, afterBlockParse), createNewLexicalScope && this.scope.exit(), this.finishNode(node, "BlockStatement");
        }
        isValidDirective(stmt) {
          return stmt.type === "ExpressionStatement" && stmt.expression.type === "StringLiteral" && !stmt.expression.extra.parenthesized;
        }
        parseBlockBody(node, allowDirectives, topLevel, end, afterBlockParse) {
          let body = node.body = [], directives = node.directives = [];
          this.parseBlockOrModuleBlockBody(body, allowDirectives ? directives : void 0, topLevel, end, afterBlockParse);
        }
        parseBlockOrModuleBlockBody(body, directives, topLevel, end, afterBlockParse) {
          let oldStrict = this.state.strict, hasStrictModeDirective = !1, parsedNonDirective = !1;
          for (; !this.match(end); ) {
            let stmt = topLevel ? this.parseModuleItem() : this.parseStatementListItem();
            if (directives && !parsedNonDirective) {
              if (this.isValidDirective(stmt)) {
                let directive = this.stmtToDirective(stmt);
                directives.push(directive), !hasStrictModeDirective && directive.value.value === "use strict" && (hasStrictModeDirective = !0, this.setStrict(!0));
                continue;
              }
              parsedNonDirective = !0, this.state.strictErrors.clear();
            }
            body.push(stmt);
          }
          afterBlockParse?.call(this, hasStrictModeDirective), oldStrict || this.setStrict(!1), this.next();
        }
        parseFor(node, init) {
          return node.init = init, this.semicolon(!1), node.test = this.match(13) ? null : this.parseExpression(), this.semicolon(!1), node.update = this.match(11) ? null : this.parseExpression(), this.expect(11), node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement()), this.scope.exit(), this.state.labels.pop(), this.finishNode(node, "ForStatement");
        }
        parseForIn(node, init, awaitAt) {
          let isForIn = this.match(58);
          return this.next(), isForIn ? awaitAt !== null && this.unexpected(awaitAt) : node.await = awaitAt !== null, init.type === "VariableDeclaration" && init.declarations[0].init != null && (!isForIn || !this.options.annexB || this.state.strict || init.kind !== "var" || init.declarations[0].id.type !== "Identifier") && this.raise(Errors.ForInOfLoopInitializer, init, {
            type: isForIn ? "ForInStatement" : "ForOfStatement"
          }), init.type === "AssignmentPattern" && this.raise(Errors.InvalidLhs, init, {
            ancestor: {
              type: "ForStatement"
            }
          }), node.left = init, node.right = isForIn ? this.parseExpression() : this.parseMaybeAssignAllowIn(), this.expect(11), node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement()), this.scope.exit(), this.state.labels.pop(), this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
        }
        parseVar(node, isFor, kind, allowMissingInitializer = !1) {
          let declarations = node.declarations = [];
          for (node.kind = kind; ; ) {
            let decl = this.startNode();
            if (this.parseVarId(decl, kind), decl.init = this.eat(29) ? isFor ? this.parseMaybeAssignDisallowIn() : this.parseMaybeAssignAllowIn() : null, decl.init === null && !allowMissingInitializer && (decl.id.type !== "Identifier" && !(isFor && (this.match(58) || this.isContextual(102))) ? this.raise(Errors.DeclarationMissingInitializer, this.state.lastTokEndLoc, {
              kind: "destructuring"
            }) : (kind === "const" || kind === "using" || kind === "await using") && !(this.match(58) || this.isContextual(102)) && this.raise(Errors.DeclarationMissingInitializer, this.state.lastTokEndLoc, {
              kind
            })), declarations.push(this.finishNode(decl, "VariableDeclarator")), !this.eat(12)) break;
          }
          return node;
        }
        parseVarId(decl, kind) {
          let id = this.parseBindingAtom();
          kind === "using" || kind === "await using" ? (id.type === "ArrayPattern" || id.type === "ObjectPattern") && this.raise(Errors.UsingDeclarationHasBindingPattern, id.loc.start) : id.type === "VoidPattern" && this.raise(Errors.UnexpectedVoidPattern, id.loc.start), this.checkLVal(id, {
            type: "VariableDeclarator"
          }, kind === "var" ? 5 : 8201), decl.id = id;
        }
        parseAsyncFunctionExpression(node) {
          return this.parseFunction(node, 8);
        }
        parseFunction(node, flags = 0) {
          let hangingDeclaration = flags & 2, isDeclaration = !!(flags & 1), requireId = isDeclaration && !(flags & 4), isAsync = !!(flags & 8);
          this.initFunction(node, isAsync), this.match(55) && (hangingDeclaration && this.raise(Errors.GeneratorInSingleStatementContext, this.state.startLoc), this.next(), node.generator = !0), isDeclaration && (node.id = this.parseFunctionId(requireId));
          let oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
          return this.state.maybeInArrowParameters = !1, this.scope.enter(514), this.prodParam.enter(functionFlags(isAsync, node.generator)), isDeclaration || (node.id = this.parseFunctionId()), this.parseFunctionParams(node, !1), this.withSmartMixTopicForbiddingContext(() => {
            this.parseFunctionBodyAndFinish(node, isDeclaration ? "FunctionDeclaration" : "FunctionExpression");
          }), this.prodParam.exit(), this.scope.exit(), isDeclaration && !hangingDeclaration && this.registerFunctionStatementId(node), this.state.maybeInArrowParameters = oldMaybeInArrowParameters, node;
        }
        parseFunctionId(requireId) {
          return requireId || tokenIsIdentifier(this.state.type) ? this.parseIdentifier() : null;
        }
        parseFunctionParams(node, isConstructor) {
          this.expect(10), this.expressionScope.enter(newParameterDeclarationScope()), node.params = this.parseBindingList(11, 41, 2 | (isConstructor ? 4 : 0)), this.expressionScope.exit();
        }
        registerFunctionStatementId(node) {
          node.id && this.scope.declareName(node.id.name, !this.options.annexB || this.state.strict || node.generator || node.async ? this.scope.treatFunctionsAsVar ? 5 : 8201 : 17, node.id.loc.start);
        }
        parseClass(node, isStatement, optionalId) {
          this.next();
          let oldStrict = this.state.strict;
          return this.state.strict = !0, this.parseClassId(node, isStatement, optionalId), this.parseClassSuper(node), node.body = this.parseClassBody(!!node.superClass, oldStrict), this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
        }
        isClassProperty() {
          return this.match(29) || this.match(13) || this.match(8);
        }
        isClassMethod() {
          return this.match(10);
        }
        nameIsConstructor(key) {
          return key.type === "Identifier" && key.name === "constructor" || key.type === "StringLiteral" && key.value === "constructor";
        }
        isNonstaticConstructor(method) {
          return !method.computed && !method.static && this.nameIsConstructor(method.key);
        }
        parseClassBody(hadSuperClass, oldStrict) {
          this.classScope.enter();
          let state = {
            hadConstructor: !1,
            hadSuperClass
          }, decorators = [], classBody = this.startNode();
          if (classBody.body = [], this.expect(5), this.withSmartMixTopicForbiddingContext(() => {
            for (; !this.match(8); ) {
              if (this.eat(13)) {
                if (decorators.length > 0)
                  throw this.raise(Errors.DecoratorSemicolon, this.state.lastTokEndLoc);
                continue;
              }
              if (this.match(26)) {
                decorators.push(this.parseDecorator());
                continue;
              }
              let member = this.startNode();
              decorators.length && (member.decorators = decorators, this.resetStartLocationFromNode(member, decorators[0]), decorators = []), this.parseClassMember(classBody, member, state), member.kind === "constructor" && member.decorators && member.decorators.length > 0 && this.raise(Errors.DecoratorConstructor, member);
            }
          }), this.state.strict = oldStrict, this.next(), decorators.length)
            throw this.raise(Errors.TrailingDecorator, this.state.startLoc);
          return this.classScope.exit(), this.finishNode(classBody, "ClassBody");
        }
        parseClassMemberFromModifier(classBody, member) {
          let key = this.parseIdentifier(!0);
          if (this.isClassMethod()) {
            let method = member;
            return method.kind = "method", method.computed = !1, method.key = key, method.static = !1, this.pushClassMethod(classBody, method, !1, !1, !1, !1), !0;
          } else if (this.isClassProperty()) {
            let prop = member;
            return prop.computed = !1, prop.key = key, prop.static = !1, classBody.body.push(this.parseClassProperty(prop)), !0;
          }
          return this.resetPreviousNodeTrailingComments(key), !1;
        }
        parseClassMember(classBody, member, state) {
          let isStatic = this.isContextual(106);
          if (isStatic) {
            if (this.parseClassMemberFromModifier(classBody, member))
              return;
            if (this.eat(5)) {
              this.parseClassStaticBlock(classBody, member);
              return;
            }
          }
          this.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
        }
        parseClassMemberWithIsStatic(classBody, member, state, isStatic) {
          let publicMethod = member, privateMethod = member, publicProp = member, privateProp = member, accessorProp = member, method = publicMethod, publicMember = publicMethod;
          if (member.static = isStatic, this.parsePropertyNamePrefixOperator(member), this.eat(55)) {
            method.kind = "method";
            let isPrivateName = this.match(139);
            if (this.parseClassElementName(method), this.parsePostMemberNameModifiers(method), isPrivateName) {
              this.pushClassPrivateMethod(classBody, privateMethod, !0, !1);
              return;
            }
            this.isNonstaticConstructor(publicMethod) && this.raise(Errors.ConstructorIsGenerator, publicMethod.key), this.pushClassMethod(classBody, publicMethod, !0, !1, !1, !1);
            return;
          }
          let isContextual = !this.state.containsEsc && tokenIsIdentifier(this.state.type), key = this.parseClassElementName(member), maybeContextualKw = isContextual ? key.name : null, isPrivate = this.isPrivateName(key), maybeQuestionTokenStartLoc = this.state.startLoc;
          if (this.parsePostMemberNameModifiers(publicMember), this.isClassMethod()) {
            if (method.kind = "method", isPrivate) {
              this.pushClassPrivateMethod(classBody, privateMethod, !1, !1);
              return;
            }
            let isConstructor = this.isNonstaticConstructor(publicMethod), allowsDirectSuper = !1;
            isConstructor && (publicMethod.kind = "constructor", state.hadConstructor && !this.hasPlugin("typescript") && this.raise(Errors.DuplicateConstructor, key), isConstructor && this.hasPlugin("typescript") && member.override && this.raise(Errors.OverrideOnConstructor, key), state.hadConstructor = !0, allowsDirectSuper = state.hadSuperClass), this.pushClassMethod(classBody, publicMethod, !1, !1, isConstructor, allowsDirectSuper);
          } else if (this.isClassProperty())
            isPrivate ? this.pushClassPrivateProperty(classBody, privateProp) : this.pushClassProperty(classBody, publicProp);
          else if (maybeContextualKw === "async" && !this.isLineTerminator()) {
            this.resetPreviousNodeTrailingComments(key);
            let isGenerator = this.eat(55);
            publicMember.optional && this.unexpected(maybeQuestionTokenStartLoc), method.kind = "method";
            let isPrivate2 = this.match(139);
            this.parseClassElementName(method), this.parsePostMemberNameModifiers(publicMember), isPrivate2 ? this.pushClassPrivateMethod(classBody, privateMethod, isGenerator, !0) : (this.isNonstaticConstructor(publicMethod) && this.raise(Errors.ConstructorIsAsync, publicMethod.key), this.pushClassMethod(classBody, publicMethod, isGenerator, !0, !1, !1));
          } else if ((maybeContextualKw === "get" || maybeContextualKw === "set") && !(this.match(55) && this.isLineTerminator())) {
            this.resetPreviousNodeTrailingComments(key), method.kind = maybeContextualKw;
            let isPrivate2 = this.match(139);
            this.parseClassElementName(publicMethod), isPrivate2 ? this.pushClassPrivateMethod(classBody, privateMethod, !1, !1) : (this.isNonstaticConstructor(publicMethod) && this.raise(Errors.ConstructorIsAccessor, publicMethod.key), this.pushClassMethod(classBody, publicMethod, !1, !1, !1, !1)), this.checkGetterSetterParams(publicMethod);
          } else if (maybeContextualKw === "accessor" && !this.isLineTerminator()) {
            this.expectPlugin("decoratorAutoAccessors"), this.resetPreviousNodeTrailingComments(key);
            let isPrivate2 = this.match(139);
            this.parseClassElementName(publicProp), this.pushClassAccessorProperty(classBody, accessorProp, isPrivate2);
          } else this.isLineTerminator() ? isPrivate ? this.pushClassPrivateProperty(classBody, privateProp) : this.pushClassProperty(classBody, publicProp) : this.unexpected();
        }
        parseClassElementName(member) {
          let {
            type,
            value
          } = this.state;
          if ((type === 132 || type === 134) && member.static && value === "prototype" && this.raise(Errors.StaticPrototype, this.state.startLoc), type === 139) {
            value === "constructor" && this.raise(Errors.ConstructorClassPrivateField, this.state.startLoc);
            let key = this.parsePrivateName();
            return member.key = key, key;
          }
          return this.parsePropertyName(member), member.key;
        }
        parseClassStaticBlock(classBody, member) {
          var _member$decorators;
          this.scope.enter(720);
          let oldLabels = this.state.labels;
          this.state.labels = [], this.prodParam.enter(0);
          let body = member.body = [];
          this.parseBlockOrModuleBlockBody(body, void 0, !1, 8), this.prodParam.exit(), this.scope.exit(), this.state.labels = oldLabels, classBody.body.push(this.finishNode(member, "StaticBlock")), (_member$decorators = member.decorators) != null && _member$decorators.length && this.raise(Errors.DecoratorStaticBlock, member);
        }
        pushClassProperty(classBody, prop) {
          !prop.computed && this.nameIsConstructor(prop.key) && this.raise(Errors.ConstructorClassField, prop.key), classBody.body.push(this.parseClassProperty(prop));
        }
        pushClassPrivateProperty(classBody, prop) {
          let node = this.parseClassPrivateProperty(prop);
          classBody.body.push(node), this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), 0, node.key.loc.start);
        }
        pushClassAccessorProperty(classBody, prop, isPrivate) {
          !isPrivate && !prop.computed && this.nameIsConstructor(prop.key) && this.raise(Errors.ConstructorClassField, prop.key);
          let node = this.parseClassAccessorProperty(prop);
          classBody.body.push(node), isPrivate && this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), 0, node.key.loc.start);
        }
        pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper) {
          classBody.body.push(this.parseMethod(method, isGenerator, isAsync, isConstructor, allowsDirectSuper, "ClassMethod", !0));
        }
        pushClassPrivateMethod(classBody, method, isGenerator, isAsync) {
          let node = this.parseMethod(method, isGenerator, isAsync, !1, !1, "ClassPrivateMethod", !0);
          classBody.body.push(node);
          let kind = node.kind === "get" ? node.static ? 6 : 2 : node.kind === "set" ? node.static ? 5 : 1 : 0;
          this.declareClassPrivateMethodInScope(node, kind);
        }
        declareClassPrivateMethodInScope(node, kind) {
          this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), kind, node.key.loc.start);
        }
        parsePostMemberNameModifiers(methodOrProp) {
        }
        parseClassPrivateProperty(node) {
          return this.parseInitializer(node), this.semicolon(), this.finishNode(node, "ClassPrivateProperty");
        }
        parseClassProperty(node) {
          return this.parseInitializer(node), this.semicolon(), this.finishNode(node, "ClassProperty");
        }
        parseClassAccessorProperty(node) {
          return this.parseInitializer(node), this.semicolon(), this.finishNode(node, "ClassAccessorProperty");
        }
        parseInitializer(node) {
          this.scope.enter(592), this.expressionScope.enter(newExpressionScope()), this.prodParam.enter(0), node.value = this.eat(29) ? this.parseMaybeAssignAllowIn() : null, this.expressionScope.exit(), this.prodParam.exit(), this.scope.exit();
        }
        parseClassId(node, isStatement, optionalId, bindingType = 8331) {
          if (tokenIsIdentifier(this.state.type))
            node.id = this.parseIdentifier(), isStatement && this.declareNameFromIdentifier(node.id, bindingType);
          else if (optionalId || !isStatement)
            node.id = null;
          else
            throw this.raise(Errors.MissingClassName, this.state.startLoc);
        }
        parseClassSuper(node) {
          node.superClass = this.eat(81) ? this.parseExprSubscripts() : null;
        }
        parseExport(node, decorators) {
          let maybeDefaultIdentifier = this.parseMaybeImportPhase(node, !0), hasDefault = this.maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier), parseAfterDefault = !hasDefault || this.eat(12), hasStar = parseAfterDefault && this.eatExportStar(node), hasNamespace = hasStar && this.maybeParseExportNamespaceSpecifier(node), parseAfterNamespace = parseAfterDefault && (!hasNamespace || this.eat(12)), isFromRequired = hasDefault || hasStar;
          if (hasStar && !hasNamespace) {
            if (hasDefault && this.unexpected(), decorators)
              throw this.raise(Errors.UnsupportedDecoratorExport, node);
            return this.parseExportFrom(node, !0), this.sawUnambiguousESM = !0, this.finishNode(node, "ExportAllDeclaration");
          }
          let hasSpecifiers = this.maybeParseExportNamedSpecifiers(node);
          hasDefault && parseAfterDefault && !hasStar && !hasSpecifiers && this.unexpected(null, 5), hasNamespace && parseAfterNamespace && this.unexpected(null, 98);
          let hasDeclaration;
          if (isFromRequired || hasSpecifiers) {
            if (hasDeclaration = !1, decorators)
              throw this.raise(Errors.UnsupportedDecoratorExport, node);
            this.parseExportFrom(node, isFromRequired);
          } else
            hasDeclaration = this.maybeParseExportDeclaration(node);
          if (isFromRequired || hasSpecifiers || hasDeclaration) {
            var _node2$declaration;
            let node2 = node;
            if (this.checkExport(node2, !0, !1, !!node2.source), ((_node2$declaration = node2.declaration) == null ? void 0 : _node2$declaration.type) === "ClassDeclaration")
              this.maybeTakeDecorators(decorators, node2.declaration, node2);
            else if (decorators)
              throw this.raise(Errors.UnsupportedDecoratorExport, node);
            return this.sawUnambiguousESM = !0, this.finishNode(node2, "ExportNamedDeclaration");
          }
          if (this.eat(65)) {
            let node2 = node, decl = this.parseExportDefaultExpression();
            if (node2.declaration = decl, decl.type === "ClassDeclaration")
              this.maybeTakeDecorators(decorators, decl, node2);
            else if (decorators)
              throw this.raise(Errors.UnsupportedDecoratorExport, node);
            return this.checkExport(node2, !0, !0), this.sawUnambiguousESM = !0, this.finishNode(node2, "ExportDefaultDeclaration");
          }
          throw this.unexpected(null, 5);
        }
        eatExportStar(node) {
          return this.eat(55);
        }
        maybeParseExportDefaultSpecifier(node, maybeDefaultIdentifier) {
          if (maybeDefaultIdentifier || this.isExportDefaultSpecifier()) {
            this.expectPlugin("exportDefaultFrom", maybeDefaultIdentifier?.loc.start);
            let id = maybeDefaultIdentifier || this.parseIdentifier(!0), specifier = this.startNodeAtNode(id);
            return specifier.exported = id, node.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")], !0;
          }
          return !1;
        }
        maybeParseExportNamespaceSpecifier(node) {
          if (this.isContextual(93)) {
            var _ref, _ref$specifiers;
            (_ref$specifiers = (_ref = node).specifiers) != null || (_ref.specifiers = []);
            let specifier = this.startNodeAt(this.state.lastTokStartLoc);
            return this.next(), specifier.exported = this.parseModuleExportName(), node.specifiers.push(this.finishNode(specifier, "ExportNamespaceSpecifier")), !0;
          }
          return !1;
        }
        maybeParseExportNamedSpecifiers(node) {
          if (this.match(5)) {
            let node2 = node;
            node2.specifiers || (node2.specifiers = []);
            let isTypeExport = node2.exportKind === "type";
            return node2.specifiers.push(...this.parseExportSpecifiers(isTypeExport)), node2.source = null, this.hasPlugin("importAssertions") ? node2.assertions = [] : node2.attributes = [], node2.declaration = null, !0;
          }
          return !1;
        }
        maybeParseExportDeclaration(node) {
          return this.shouldParseExportDeclaration() ? (node.specifiers = [], node.source = null, this.hasPlugin("importAssertions") ? node.assertions = [] : node.attributes = [], node.declaration = this.parseExportDeclaration(node), !0) : !1;
        }
        isAsyncFunction() {
          if (!this.isContextual(95)) return !1;
          let next = this.nextTokenInLineStart();
          return this.isUnparsedContextual(next, "function");
        }
        parseExportDefaultExpression() {
          let expr = this.startNode();
          if (this.match(68))
            return this.next(), this.parseFunction(expr, 5);
          if (this.isAsyncFunction())
            return this.next(), this.next(), this.parseFunction(expr, 13);
          if (this.match(80))
            return this.parseClass(expr, !0, !0);
          if (this.match(26))
            return this.hasPlugin("decorators") && this.getPluginOption("decorators", "decoratorsBeforeExport") === !0 && this.raise(Errors.DecoratorBeforeExport, this.state.startLoc), this.parseClass(this.maybeTakeDecorators(this.parseDecorators(!1), this.startNode()), !0, !0);
          if (this.match(75) || this.match(74) || this.isLet() || this.isUsing() || this.isAwaitUsing())
            throw this.raise(Errors.UnsupportedDefaultExport, this.state.startLoc);
          let res = this.parseMaybeAssignAllowIn();
          return this.semicolon(), res;
        }
        parseExportDeclaration(node) {
          return this.match(80) ? this.parseClass(this.startNode(), !0, !1) : this.parseStatementListItem();
        }
        isExportDefaultSpecifier() {
          let {
            type
          } = this.state;
          if (tokenIsIdentifier(type)) {
            if (type === 95 && !this.state.containsEsc || type === 100)
              return !1;
            if ((type === 130 || type === 129) && !this.state.containsEsc) {
              let next2 = this.nextTokenStart(), nextChar = this.input.charCodeAt(next2);
              if (nextChar === 123 || this.chStartsBindingIdentifier(nextChar, next2) && !this.input.startsWith("from", next2))
                return this.expectOnePlugin(["flow", "typescript"]), !1;
            }
          } else if (!this.match(65))
            return !1;
          let next = this.nextTokenStart(), hasFrom = this.isUnparsedContextual(next, "from");
          if (this.input.charCodeAt(next) === 44 || tokenIsIdentifier(this.state.type) && hasFrom)
            return !0;
          if (this.match(65) && hasFrom) {
            let nextAfterFrom = this.input.charCodeAt(this.nextTokenStartSince(next + 4));
            return nextAfterFrom === 34 || nextAfterFrom === 39;
          }
          return !1;
        }
        parseExportFrom(node, expect) {
          this.eatContextual(98) ? (node.source = this.parseImportSource(), this.checkExport(node), this.maybeParseImportAttributes(node), this.checkJSONModuleImport(node)) : expect && this.unexpected(), this.semicolon();
        }
        shouldParseExportDeclaration() {
          let {
            type
          } = this.state;
          return type === 26 && (this.expectOnePlugin(["decorators", "decorators-legacy"]), this.hasPlugin("decorators")) ? (this.getPluginOption("decorators", "decoratorsBeforeExport") === !0 && this.raise(Errors.DecoratorBeforeExport, this.state.startLoc), !0) : this.isUsing() ? (this.raise(Errors.UsingDeclarationExport, this.state.startLoc), !0) : this.isAwaitUsing() ? (this.raise(Errors.UsingDeclarationExport, this.state.startLoc), !0) : type === 74 || type === 75 || type === 68 || type === 80 || this.isLet() || this.isAsyncFunction();
        }
        checkExport(node, checkNames, isDefault, isFrom) {
          if (checkNames) {
            var _node$specifiers;
            if (isDefault) {
              if (this.checkDuplicateExports(node, "default"), this.hasPlugin("exportDefaultFrom")) {
                var _declaration$extra;
                let declaration2 = node.declaration;
                declaration2.type === "Identifier" && declaration2.name === "from" && declaration2.end - declaration2.start === 4 && !((_declaration$extra = declaration2.extra) != null && _declaration$extra.parenthesized) && this.raise(Errors.ExportDefaultFromAsIdentifier, declaration2);
              }
            } else if ((_node$specifiers = node.specifiers) != null && _node$specifiers.length)
              for (let specifier of node.specifiers) {
                let {
                  exported
                } = specifier, exportName = exported.type === "Identifier" ? exported.name : exported.value;
                if (this.checkDuplicateExports(specifier, exportName), !isFrom && specifier.local) {
                  let {
                    local
                  } = specifier;
                  local.type !== "Identifier" ? this.raise(Errors.ExportBindingIsString, specifier, {
                    localName: local.value,
                    exportName
                  }) : (this.checkReservedWord(local.name, local.loc.start, !0, !1), this.scope.checkLocalExport(local));
                }
              }
            else if (node.declaration) {
              let decl = node.declaration;
              if (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") {
                let {
                  id
                } = decl;
                if (!id) throw new Error("Assertion failure");
                this.checkDuplicateExports(node, id.name);
              } else if (decl.type === "VariableDeclaration")
                for (let declaration2 of decl.declarations)
                  this.checkDeclaration(declaration2.id);
            }
          }
        }
        checkDeclaration(node) {
          if (node.type === "Identifier")
            this.checkDuplicateExports(node, node.name);
          else if (node.type === "ObjectPattern")
            for (let prop of node.properties)
              this.checkDeclaration(prop);
          else if (node.type === "ArrayPattern")
            for (let elem of node.elements)
              elem && this.checkDeclaration(elem);
          else node.type === "ObjectProperty" ? this.checkDeclaration(node.value) : node.type === "RestElement" ? this.checkDeclaration(node.argument) : node.type === "AssignmentPattern" && this.checkDeclaration(node.left);
        }
        checkDuplicateExports(node, exportName) {
          this.exportedIdentifiers.has(exportName) && (exportName === "default" ? this.raise(Errors.DuplicateDefaultExport, node) : this.raise(Errors.DuplicateExport, node, {
            exportName
          })), this.exportedIdentifiers.add(exportName);
        }
        parseExportSpecifiers(isInTypeExport) {
          let nodes = [], first = !0;
          for (this.expect(5); !this.eat(8); ) {
            if (first)
              first = !1;
            else if (this.expect(12), this.eat(8)) break;
            let isMaybeTypeOnly = this.isContextual(130), isString = this.match(134), node = this.startNode();
            node.local = this.parseModuleExportName(), nodes.push(this.parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly));
          }
          return nodes;
        }
        parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly) {
          return this.eatContextual(93) ? node.exported = this.parseModuleExportName() : isString ? node.exported = this.cloneStringLiteral(node.local) : node.exported || (node.exported = this.cloneIdentifier(node.local)), this.finishNode(node, "ExportSpecifier");
        }
        parseModuleExportName() {
          if (this.match(134)) {
            let result = this.parseStringLiteral(this.state.value), surrogate = loneSurrogate.exec(result.value);
            return surrogate && this.raise(Errors.ModuleExportNameHasLoneSurrogate, result, {
              surrogateCharCode: surrogate[0].charCodeAt(0)
            }), result;
          }
          return this.parseIdentifier(!0);
        }
        isJSONModuleImport(node) {
          return node.assertions != null ? node.assertions.some(({
            key,
            value
          }) => value.value === "json" && (key.type === "Identifier" ? key.name === "type" : key.value === "type")) : !1;
        }
        checkImportReflection(node) {
          let {
            specifiers
          } = node, singleBindingType = specifiers.length === 1 ? specifiers[0].type : null;
          if (node.phase === "source")
            singleBindingType !== "ImportDefaultSpecifier" && this.raise(Errors.SourcePhaseImportRequiresDefault, specifiers[0].loc.start);
          else if (node.phase === "defer")
            singleBindingType !== "ImportNamespaceSpecifier" && this.raise(Errors.DeferImportRequiresNamespace, specifiers[0].loc.start);
          else if (node.module) {
            var _node$assertions;
            singleBindingType !== "ImportDefaultSpecifier" && this.raise(Errors.ImportReflectionNotBinding, specifiers[0].loc.start), ((_node$assertions = node.assertions) == null ? void 0 : _node$assertions.length) > 0 && this.raise(Errors.ImportReflectionHasAssertion, specifiers[0].loc.start);
          }
        }
        checkJSONModuleImport(node) {
          if (this.isJSONModuleImport(node) && node.type !== "ExportAllDeclaration") {
            let {
              specifiers
            } = node;
            if (specifiers != null) {
              let nonDefaultNamedSpecifier = specifiers.find((specifier) => {
                let imported;
                if (specifier.type === "ExportSpecifier" ? imported = specifier.local : specifier.type === "ImportSpecifier" && (imported = specifier.imported), imported !== void 0)
                  return imported.type === "Identifier" ? imported.name !== "default" : imported.value !== "default";
              });
              nonDefaultNamedSpecifier !== void 0 && this.raise(Errors.ImportJSONBindingNotDefault, nonDefaultNamedSpecifier.loc.start);
            }
          }
        }
        isPotentialImportPhase(isExport) {
          return isExport ? !1 : this.isContextual(105) || this.isContextual(97) || this.isContextual(127);
        }
        applyImportPhase(node, isExport, phase, loc) {
          isExport || (phase === "module" ? (this.expectPlugin("importReflection", loc), node.module = !0) : this.hasPlugin("importReflection") && (node.module = !1), phase === "source" ? (this.expectPlugin("sourcePhaseImports", loc), node.phase = "source") : phase === "defer" ? (this.expectPlugin("deferredImportEvaluation", loc), node.phase = "defer") : this.hasPlugin("sourcePhaseImports") && (node.phase = null));
        }
        parseMaybeImportPhase(node, isExport) {
          if (!this.isPotentialImportPhase(isExport))
            return this.applyImportPhase(node, isExport, null), null;
          let phaseIdentifier = this.startNode(), phaseIdentifierName = this.parseIdentifierName(!0), {
            type
          } = this.state;
          return (tokenIsKeywordOrIdentifier(type) ? type !== 98 || this.lookaheadCharCode() === 102 : type !== 12) ? (this.applyImportPhase(node, isExport, phaseIdentifierName, phaseIdentifier.loc.start), null) : (this.applyImportPhase(node, isExport, null), this.createIdentifier(phaseIdentifier, phaseIdentifierName));
        }
        isPrecedingIdImportPhase(phase) {
          let {
            type
          } = this.state;
          return tokenIsIdentifier(type) ? type !== 98 || this.lookaheadCharCode() === 102 : type !== 12;
        }
        parseImport(node) {
          return this.match(134) ? this.parseImportSourceAndAttributes(node) : this.parseImportSpecifiersAndAfter(node, this.parseMaybeImportPhase(node, !1));
        }
        parseImportSpecifiersAndAfter(node, maybeDefaultIdentifier) {
          node.specifiers = [];
          let parseNext = !this.maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier) || this.eat(12), hasStar = parseNext && this.maybeParseStarImportSpecifier(node);
          return parseNext && !hasStar && this.parseNamedImportSpecifiers(node), this.expectContextual(98), this.parseImportSourceAndAttributes(node);
        }
        parseImportSourceAndAttributes(node) {
          var _node$specifiers2;
          return (_node$specifiers2 = node.specifiers) != null || (node.specifiers = []), node.source = this.parseImportSource(), this.maybeParseImportAttributes(node), this.checkImportReflection(node), this.checkJSONModuleImport(node), this.semicolon(), this.sawUnambiguousESM = !0, this.finishNode(node, "ImportDeclaration");
        }
        parseImportSource() {
          return this.match(134) || this.unexpected(), this.parseExprAtom();
        }
        parseImportSpecifierLocal(node, specifier, type) {
          specifier.local = this.parseIdentifier(), node.specifiers.push(this.finishImportSpecifier(specifier, type));
        }
        finishImportSpecifier(specifier, type, bindingType = 8201) {
          return this.checkLVal(specifier.local, {
            type
          }, bindingType), this.finishNode(specifier, type);
        }
        parseImportAttributes() {
          this.expect(5);
          let attrs = [], attrNames = /* @__PURE__ */ new Set();
          do {
            if (this.match(8))
              break;
            let node = this.startNode(), keyName2 = this.state.value;
            if (attrNames.has(keyName2) && this.raise(Errors.ModuleAttributesWithDuplicateKeys, this.state.startLoc, {
              key: keyName2
            }), attrNames.add(keyName2), this.match(134) ? node.key = this.parseStringLiteral(keyName2) : node.key = this.parseIdentifier(!0), this.expect(14), !this.match(134))
              throw this.raise(Errors.ModuleAttributeInvalidValue, this.state.startLoc);
            node.value = this.parseStringLiteral(this.state.value), attrs.push(this.finishNode(node, "ImportAttribute"));
          } while (this.eat(12));
          return this.expect(8), attrs;
        }
        parseModuleAttributes() {
          let attrs = [], attributes = /* @__PURE__ */ new Set();
          do {
            let node = this.startNode();
            if (node.key = this.parseIdentifier(!0), node.key.name !== "type" && this.raise(Errors.ModuleAttributeDifferentFromType, node.key), attributes.has(node.key.name) && this.raise(Errors.ModuleAttributesWithDuplicateKeys, node.key, {
              key: node.key.name
            }), attributes.add(node.key.name), this.expect(14), !this.match(134))
              throw this.raise(Errors.ModuleAttributeInvalidValue, this.state.startLoc);
            node.value = this.parseStringLiteral(this.state.value), attrs.push(this.finishNode(node, "ImportAttribute"));
          } while (this.eat(12));
          return attrs;
        }
        maybeParseImportAttributes(node) {
          let attributes;
          var useWith = !1;
          if (this.match(76)) {
            if (this.hasPrecedingLineBreak() && this.lookaheadCharCode() === 40)
              return;
            this.next(), this.hasPlugin("moduleAttributes") ? (attributes = this.parseModuleAttributes(), this.addExtra(node, "deprecatedWithLegacySyntax", !0)) : attributes = this.parseImportAttributes(), useWith = !0;
          } else this.isContextual(94) && !this.hasPrecedingLineBreak() ? (!this.hasPlugin("deprecatedImportAssert") && !this.hasPlugin("importAssertions") && this.raise(Errors.ImportAttributesUseAssert, this.state.startLoc), this.hasPlugin("importAssertions") || this.addExtra(node, "deprecatedAssertSyntax", !0), this.next(), attributes = this.parseImportAttributes()) : attributes = [];
          !useWith && this.hasPlugin("importAssertions") ? node.assertions = attributes : node.attributes = attributes;
        }
        maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier) {
          if (maybeDefaultIdentifier) {
            let specifier = this.startNodeAtNode(maybeDefaultIdentifier);
            return specifier.local = maybeDefaultIdentifier, node.specifiers.push(this.finishImportSpecifier(specifier, "ImportDefaultSpecifier")), !0;
          } else if (tokenIsKeywordOrIdentifier(this.state.type))
            return this.parseImportSpecifierLocal(node, this.startNode(), "ImportDefaultSpecifier"), !0;
          return !1;
        }
        maybeParseStarImportSpecifier(node) {
          if (this.match(55)) {
            let specifier = this.startNode();
            return this.next(), this.expectContextual(93), this.parseImportSpecifierLocal(node, specifier, "ImportNamespaceSpecifier"), !0;
          }
          return !1;
        }
        parseNamedImportSpecifiers(node) {
          let first = !0;
          for (this.expect(5); !this.eat(8); ) {
            if (first)
              first = !1;
            else {
              if (this.eat(14))
                throw this.raise(Errors.DestructureNamedImport, this.state.startLoc);
              if (this.expect(12), this.eat(8)) break;
            }
            let specifier = this.startNode(), importedIsString = this.match(134), isMaybeTypeOnly = this.isContextual(130);
            specifier.imported = this.parseModuleExportName();
            let importSpecifier = this.parseImportSpecifier(specifier, importedIsString, node.importKind === "type" || node.importKind === "typeof", isMaybeTypeOnly, void 0);
            node.specifiers.push(importSpecifier);
          }
        }
        parseImportSpecifier(specifier, importedIsString, isInTypeOnlyImport, isMaybeTypeOnly, bindingType) {
          if (this.eatContextual(93))
            specifier.local = this.parseIdentifier();
          else {
            let {
              imported
            } = specifier;
            if (importedIsString)
              throw this.raise(Errors.ImportBindingIsString, specifier, {
                importName: imported.value
              });
            this.checkReservedWord(imported.name, specifier.loc.start, !0, !0), specifier.local || (specifier.local = this.cloneIdentifier(imported));
          }
          return this.finishImportSpecifier(specifier, "ImportSpecifier", bindingType);
        }
        isThisParam(param) {
          return param.type === "Identifier" && param.name === "this";
        }
      }, Parser = class extends StatementParser {
        constructor(options, input, pluginsMap) {
          let normalizedOptions = getOptions(options);
          super(normalizedOptions, input), this.options = normalizedOptions, this.initializeScopes(), this.plugins = pluginsMap, this.filename = normalizedOptions.sourceFilename, this.startIndex = normalizedOptions.startIndex;
          let optionFlags = 0;
          normalizedOptions.allowAwaitOutsideFunction && (optionFlags |= 1), normalizedOptions.allowReturnOutsideFunction && (optionFlags |= 2), normalizedOptions.allowImportExportEverywhere && (optionFlags |= 8), normalizedOptions.allowSuperOutsideMethod && (optionFlags |= 16), normalizedOptions.allowUndeclaredExports && (optionFlags |= 64), normalizedOptions.allowNewTargetOutsideFunction && (optionFlags |= 4), normalizedOptions.allowYieldOutsideFunction && (optionFlags |= 32), normalizedOptions.ranges && (optionFlags |= 128), normalizedOptions.tokens && (optionFlags |= 256), normalizedOptions.createImportExpressions && (optionFlags |= 512), normalizedOptions.createParenthesizedExpressions && (optionFlags |= 1024), normalizedOptions.errorRecovery && (optionFlags |= 2048), normalizedOptions.attachComment && (optionFlags |= 4096), normalizedOptions.annexB && (optionFlags |= 8192), this.optionFlags = optionFlags;
        }
        getScopeHandler() {
          return ScopeHandler;
        }
        parse() {
          this.enterInitialScopes();
          let file = this.startNode(), program = this.startNode();
          this.nextToken(), file.errors = null;
          let result = this.parseTopLevel(file, program);
          return result.errors = this.state.errors, result.comments.length = this.state.commentsLen, result;
        }
      };
      function parse2(input, options) {
        var _options;
        if (((_options = options) == null ? void 0 : _options.sourceType) === "unambiguous") {
          options = Object.assign({}, options);
          try {
            options.sourceType = "module";
            let parser = getParser(options, input), ast = parser.parse();
            if (parser.sawUnambiguousESM)
              return ast;
            if (parser.ambiguousScriptDifferentAst)
              try {
                return options.sourceType = "script", getParser(options, input).parse();
              } catch {
              }
            else
              ast.program.sourceType = "script";
            return ast;
          } catch (moduleError) {
            try {
              return options.sourceType = "script", getParser(options, input).parse();
            } catch {
            }
            throw moduleError;
          }
        } else
          return getParser(options, input).parse();
      }
      function parseExpression(input, options) {
        let parser = getParser(options, input);
        return parser.options.strictMode && (parser.state.strict = !0), parser.getExpression();
      }
      function generateExportedTokenTypes(internalTokenTypes) {
        let tokenTypes2 = {};
        for (let typeName of Object.keys(internalTokenTypes))
          tokenTypes2[typeName] = getExportedToken(internalTokenTypes[typeName]);
        return tokenTypes2;
      }
      var tokTypes = generateExportedTokenTypes(tt);
      function getParser(options, input) {
        let cls = Parser, pluginsMap = /* @__PURE__ */ new Map();
        if (options != null && options.plugins) {
          for (let plugin of options.plugins) {
            let name, opts;
            typeof plugin == "string" ? name = plugin : [name, opts] = plugin, pluginsMap.has(name) || pluginsMap.set(name, opts || {});
          }
          validatePlugins(pluginsMap), cls = getParserClass(pluginsMap);
        }
        return new cls(options, input, pluginsMap);
      }
      var parserClassCache = /* @__PURE__ */ new Map();
      function getParserClass(pluginsMap) {
        let pluginList = [];
        for (let name of mixinPluginNames)
          pluginsMap.has(name) && pluginList.push(name);
        let key = pluginList.join("|"), cls = parserClassCache.get(key);
        if (!cls) {
          cls = Parser;
          for (let plugin of pluginList)
            cls = mixinPlugins[plugin](cls);
          parserClassCache.set(key, cls);
        }
        return cls;
      }
      exports.parse = parse2;
      exports.parseExpression = parseExpression;
      exports.tokTypes = tokTypes;
    }
  });

  // src/ui/spec-frame.ts
  var import_parser = __toESM(require_lib(), 1);

  // src/ui/sandbox-frame.ts
  var queue = Promise.resolve();
  function serve(port, accept, handle) {
    port.onmessage = ({ data }) => {
      accept(data) && (queue = queue.then(async () => {
        let reply;
        try {
          reply = { ...await handle(data), id: data.id };
        } catch {
          reply = { id: data.id, error: !0 };
        }
        port.postMessage(reply);
      }));
    };
  }
  function listen(onPort) {
    addEventListener("message", (event) => {
      let [port] = event.ports;
      port && onPort(port);
    });
  }

  // src/ui/spec-frame.ts
  var MAX_SOURCE = 2e5, MAX_SYMBOLS = 1e3, HOOKS = {
    beforeEach: "Before each test",
    afterEach: "After each test",
    beforeAll: "Before the suite",
    afterAll: "After the suite",
    before: "Before the suite",
    after: "After the suite"
  }, MODIFIERS = /* @__PURE__ */ new Set(["only", "skip", "todo", "concurrent", "sequential", "fails", "failing", "each", "parallel", "serial"]);
  function callName(node) {
    return node.type === "Identifier" ? [node.name] : node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier" ? [...callName(node.object), node.property.name] : node.type === "CallExpression" ? callName(node.callee) : node.type === "TaggedTemplateExpression" ? callName(node.tag) : [];
  }
  function declaration(node, text, depth) {
    let parts = callName(node.callee);
    parts[0] === "Deno" && parts.shift();
    let kind;
    parts[0] === "test" && Object.hasOwn(HOOKS, parts[1]) && parts.shift();
    let root = parts.shift();
    if (root === "test" && parts[0] === "describe")
      parts.shift(), kind = "suite";
    else if (["describe", "context", "suite"].includes(root)) kind = "suite";
    else if (["it", "test", "specify"].includes(root)) kind = "case";
    else if (Object.hasOwn(HOOKS, root)) kind = "setup";
    else return null;
    if (parts.some((part) => !MODIFIERS.has(part))) return null;
    let title = node.arguments[0], name = kind === "setup" ? HOOKS[root] : title?.type === "StringLiteral" ? title.value : title?.type === "TemplateLiteral" && !title.expressions.length ? title.quasis[0].value.cooked : title ? text.slice(title.start, title.end) : "Unnamed test";
    return {
      kind,
      title: name,
      start: node.loc.start.line - 1,
      end: node.loc.end.line - 1,
      depth,
      flag: parts.filter((part) => ["skip", "only", "todo", "each"].includes(part)).join(" · ")
    };
  }
  function parseSpecs(text, jsx = !1) {
    if (text.length > MAX_SOURCE) return null;
    try {
      let tree = (0, import_parser.parse)(text, { sourceType: "unambiguous", plugins: jsx ? ["typescript", "jsx"] : ["typescript"], attachComment: !1 }), definitions = [], pending = tree.program.body.map((node) => ({ node, depth: 0 })).reverse();
      for (; pending.length; ) {
        let { node, depth } = pending.pop();
        if (node.type === "ExpressionStatement" && node.expression.type === "CallExpression") {
          let call = node.expression, definition = declaration(call, text, depth);
          if (definition) {
            if (definitions.push(definition), definitions.length > 500) return null;
            let callback = call.arguments.at(-1);
            definition.kind === "suite" && (callback?.type === "ArrowFunctionExpression" || callback?.type === "FunctionExpression") && pending.push({ node: callback.body, depth: depth + 1 });
          }
          continue;
        }
        let children = node.type === "BlockStatement" ? node.body : node.type === "IfStatement" ? [node.consequent, ...node.alternate ? [node.alternate] : []] : node.type === "ForOfStatement" || node.type === "ForInStatement" || node.type === "ForStatement" ? [node.body] : [];
        for (let child of children.reverse()) pending.push({ node: child, depth });
      }
      return definitions;
    } catch {
      return null;
    }
  }
  var isFunction = (node) => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
  function keyName(key) {
    return key.type === "Identifier" ? key.name : key.type === "PrivateName" ? `#${key.id.name}` : key.type === "StringLiteral" ? key.value : null;
  }
  function parseSymbols(text, jsx = !1) {
    if (text.length > MAX_SOURCE) return null;
    try {
      let tree = (0, import_parser.parse)(text, { sourceType: "unambiguous", plugins: jsx ? ["typescript", "jsx"] : ["typescript"] }), symbols = [], lines = (node) => ({
        start: Math.min(node.loc.start.line, ...(node.leadingComments ?? []).map((comment) => comment.loc.start.line)) - 1,
        end: node.loc.end.line - 1
      }), add = (kind, name, at, parent = "") => {
        let last = symbols.at(-1);
        last?.kind === kind && last.name === name && last.parent === parent ? last.end = at.end : symbols.push({ kind, name, ...at, parent });
      };
      for (let statement of tree.program.body) {
        let node = (statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration") && statement.declaration ? statement.declaration : statement, at = lines(statement);
        if (node.type === "FunctionDeclaration" || node.type === "TSDeclareFunction") add("function", node.id?.name ?? "default", at);
        else if (node.type === "ClassDeclaration") {
          let name = node.id?.name ?? "default";
          add("class", name, at);
          for (let member of node.body.body) {
            let method = member.type === "ClassMethod" || member.type === "ClassPrivateMethod" || member.type === "TSDeclareMethod" || (member.type === "ClassProperty" || member.type === "ClassPrivateProperty") && isFunction(member.value), key = "key" in member ? "computed" in member && member.computed ? `[${text.slice(member.key.start, member.key.end)}]` : keyName(member.key) : null;
            method && key && add("method", key, lines(member), name);
          }
        } else if (node.type === "VariableDeclaration")
          for (let declarator of node.declarations) {
            let init = declarator.init;
            declarator.id.type !== "Identifier" || !init || (isFunction(init) || init.type === "CallExpression" && init.arguments.some(isFunction) ? add("function", declarator.id.name, node.declarations.length === 1 ? at : lines(declarator)) : init.type === "ClassExpression" && add("class", declarator.id.name, node.declarations.length === 1 ? at : lines(declarator)));
          }
        else node.type === "TSInterfaceDeclaration" ? add("interface", node.id.name, at) : node.type === "TSTypeAliasDeclaration" ? add("type", node.id.name, at) : node.type === "TSEnumDeclaration" && add("enum", node.id.name, at);
        if (symbols.length > MAX_SYMBOLS) return null;
      }
      return symbols;
    } catch {
      return null;
    }
  }
  function isSpecRequest(data) {
    let request = data;
    return typeof request?.id == "number" && typeof request.base == "string" && typeof request.head == "string" && typeof request.jsx == "boolean" && (request.symbols === void 0 || typeof request.symbols == "boolean") && request.base.length <= MAX_SOURCE && request.head.length <= MAX_SOURCE;
  }
  function serveSpecs(port) {
    serve(
      port,
      isSpecRequest,
      async ({ base, head, jsx, symbols }) => symbols ? { base: parseSymbols(base, jsx), head: parseSymbols(head, jsx) } : { base: parseSpecs(base, jsx), head: parseSpecs(head, jsx) }
    );
  }
  listen(serveSpecs);
})();
