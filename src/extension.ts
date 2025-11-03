// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "regex-pattern-checker" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('regex-pattern-checker.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Regex Pattern Checker!');
	});

	context.subscriptions.push(disposable);

	// Register the sidebar webview view provider
	const provider = new RegexViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(RegexViewProvider.viewId, provider)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class RegexViewProvider implements vscode.WebviewViewProvider {
		public static readonly viewId = 'regexPatternChecker';

		constructor(private readonly context: vscode.ExtensionContext) {}

		resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
				webviewView.webview.options = {
						enableScripts: true,
						localResourceRoots: [this.context.extensionUri],
				};

				webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
		}

		private getHtmlForWebview(webview: vscode.Webview): string {
				const nonce = getNonce();
				const csp = [
						"default-src 'none'",
						"img-src https: data:",
						`style-src 'unsafe-inline' ${webview.cspSource}`,
						`script-src 'nonce-${nonce}'`,
				].join('; ');

				return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Regex Checker</title>
	<style>
		:root {
			--vscode-foreground: var(--vscode-editor-foreground);
			--vscode-input-background: var(--vscode-input-background);
			--vscode-input-foreground: var(--vscode-input-foreground);
			--vscode-button-background: var(--vscode-button-background);
			--vscode-button-foreground: var(--vscode-button-foreground);
			--vscode-button-hoverBackground: var(--vscode-button-hoverBackground);
			--vscode-badge-background: var(--vscode-badge-background);
			--vscode-badge-foreground: var(--vscode-badge-foreground);
			--border: 1px solid var(--vscode-panel-border);
		}
		body { color: var(--vscode-foreground); font-family: var(--vscode-font-family, sans-serif); padding: 0.75rem; }
		.field { margin-bottom: 0.75rem; }
		label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
		input[type="text"], textarea {
			width: 100%; box-sizing: border-box; padding: 0.5rem; background: var(--vscode-input-background);
			color: var(--vscode-input-foreground); border: var(--border); border-radius: 4px; font-family: inherit;
		}
		.row { display: flex; gap: 0.5rem; align-items: center; }
		.row .grow { flex: 1 1 auto; }
		.muted { opacity: 0.8; font-size: 0.9em; }
		.result { margin-top: 0.75rem; padding: 0.5rem; border: var(--border); border-radius: 4px; }
		.bad { color: #f14c4c; }
		.good { color: #28ea1eff; }
		.preview { margin-top: 0.5rem; padding: 0.5rem; background: var(--vscode-editor-inactiveSelectionBackground, rgba(128,128,128,0.15)); border-radius: 4px; white-space: pre-wrap; word-break: break-word; }
		mark { background: #c5e47866; border-bottom: 2px solid #c5e478; }
		.badge { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 0 6px; border-radius: 10px; margin-left: 6px; }
	</style>
	</head>
	<body>
		<div class="field">
			<label for="pattern">Pattern</label>
			<div class="row">
				<input class="grow" id="pattern" type="text" placeholder="e.g. ^[a-z]+$" />
				<input id="flags" type="text" placeholder="flags (e.g. gim)" style="width: 9ch" aria-label="Regex flags" />
			</div>
			<div class="muted">Use JavaScript RegExp syntax. Slashes not required. Flags optional.</div>
		</div>
		<div class="field">
			<label for="input">Input</label>
			<textarea id="input" rows="6" placeholder="Type or paste the text to test..."></textarea>
		</div>
		<div id="status" class="result muted">Waiting for input…</div>
		<div id="preview" class="preview" hidden></div>

		<script nonce="${nonce}">
			const $ = (sel) => document.querySelector(sel);
			const patternEl = $('#pattern');
			const flagsEl = $('#flags');
			const inputEl = $('#input');
			const statusEl = $('#status');
			const previewEl = $('#preview');

			function escapeHtml(str) {
				return str
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#39;');
			}

			function update() {
				const pattern = patternEl.value;
				const flags = flagsEl.value.replace(/[^gimsuyd]/g, '');
				const text = inputEl.value ?? '';
				if (!pattern && !text) {
					statusEl.textContent = 'Waiting for input…';
					previewEl.hidden = true;
					return;
				}
				let re;
				try {
					re = new RegExp(pattern, flags);
				} catch (e) {
					statusEl.innerHTML = '<span class="bad">Invalid pattern:</span> ' + escapeHtml(String(e.message || e));
					previewEl.hidden = true;
					return;
				}

				if (!text) {
					statusEl.textContent = 'Enter input text to test the pattern.';
					previewEl.hidden = true;
					return;
				}

						const matches = [...text.matchAll(re)];
						if (matches.length === 0) {
							const badge = flags ? ' <span class="badge">/' + escapeHtml(pattern) + '/' + escapeHtml(flags) + '</span>' : '';
							statusEl.innerHTML = '<span class="bad">No match</span>' + badge;
							previewEl.hidden = true;
							return;
						}

						const badge = flags ? ' <span class="badge">/' + escapeHtml(pattern) + '/' + escapeHtml(flags) + '</span>' : '';
						statusEl.innerHTML = '<span class="good">' + matches.length + ' match' + (matches.length === 1 ? '' : 'es') + '</span>' + badge;

				// Build highlighted preview
				let html = '';
				let lastIndex = 0;
				for (const m of matches) {
					const start = m.index ?? 0;
					const end = start + (m[0]?.length ?? 0);
					if (start > lastIndex) html += escapeHtml(text.slice(lastIndex, start));
					html += '<mark>' + escapeHtml(text.slice(start, end)) + '</mark>';
					lastIndex = end;
					if (!re.global && m[0] !== '') break; // prevent infinite loop if no /g
				}
				if (lastIndex < text.length) html += escapeHtml(text.slice(lastIndex));
				previewEl.innerHTML = html;
				previewEl.hidden = false;
			}

			patternEl.addEventListener('input', update);
			flagsEl.addEventListener('input', update);
			inputEl.addEventListener('input', update);

			// Defaults for convenience
			flagsEl.value = 'g';
		</script>
	</body>
</html>`;
		}
}

function getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
}
