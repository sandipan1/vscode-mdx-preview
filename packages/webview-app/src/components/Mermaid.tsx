/**
 * Renders a Mermaid diagram from a code string.
 *
 * Used by the MDX `code`/`pre` component overrides (see VscodeMarkdownLayout)
 * to turn ```mermaid fenced code blocks into rendered SVG diagrams.
 */
import React, { useEffect, useState, useRef } from 'react';
// Import the UMD bundle directly. The package's `module` field points at an
// ESM build with re-exports that webpack 4 (react-scripts 2) can't handle, so
// we bypass field resolution and load the prebuilt UMD bundle instead.
const mermaidModule = require('mermaid/dist/mermaid.js');
const mermaid = mermaidModule.default || mermaidModule;

// Each diagram needs a unique DOM id for mermaid.render. A module-level
// counter keeps ids stable across re-renders without relying on Math.random.
let diagramCounter = 0;

const inferTheme = (): string => {
  if (typeof document !== 'undefined' && document.body) {
    if (
      document.body.classList.contains('vscode-dark') ||
      document.body.classList.contains('vscode-high-contrast')
    ) {
      return 'dark';
    }
  }
  return 'default';
};

const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<string>(`mermaid-diagram-${diagramCounter++}`);

  useEffect(() => {
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: inferTheme(),
    });

    try {
      // mermaid v9: render(id, text, cb) — cb receives the SVG string.
      // (Later versions return a Promise<{svg}>; handle that too for safety.)
      const result = mermaid.render(
        idRef.current,
        chart,
        (renderedSvg: string) => {
          if (!cancelled) {
            setSvg(renderedSvg);
            setError(null);
          }
        }
      );
      if (result && typeof result.then === 'function') {
        result
          .then(({ svg: renderedSvg }: { svg: string }) => {
            if (!cancelled) {
              setSvg(renderedSvg);
              setError(null);
            }
          })
          .catch((err: any) => {
            if (!cancelled) {
              setError(err && err.message ? err.message : String(err));
            }
          });
      } else if (typeof result === 'string') {
        if (!cancelled) {
          setSvg(result);
          setError(null);
        }
      }
    } catch (err) {
      if (!cancelled) {
        setError(err && (err as any).message ? (err as any).message : String(err));
      }
    }

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <pre style={{ color: 'var(--vscode-errorForeground, #f48771)' }}>
        Mermaid error: {error}
      </pre>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      style={{ textAlign: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default Mermaid;
