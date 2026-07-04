# Copy with Context

VS Code extension that copies selected code with file and line-number context as Markdown.

## Command

`Copy with context` appears in the editor context menu, VS Code code-action list, hover popup, and status bar when text is selected.

The default keybinding is `Ctrl+Alt+Z`.

The copied format is:

````markdown
File: src/components/Block.svelte
Lines: 6-20

```svelte
<selected code here>
```
````
